import { configureStore } from "@reduxjs/toolkit";
import authReducer, { setUser } from "../auth/authSlice";
import { apiSlice, isAccountSuspendedError } from "./apiSlice";

const sessionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProtectedSession: builder.query<unknown, void>({
      query: () => "https://api.example.test/api/v1/users/me",
    }),
  }),
});

const createStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });

const loggedInUser = {
  token: "test-session-token",
  data: {
    token: "test-session-token",
    user: { id: "user-1", role: "tenant" },
  },
};

describe("account suspension API errors", () => {
  it("recognizes the backend account-suspension response", () => {
    expect(
      isAccountSuspendedError({
        status: 403,
        data: { message: "This account is suspended. Contact support for assistance." },
      })
    ).toBe(true);
  });

  it("does not treat unrelated authorization failures as account suspension", () => {
    expect(
      isAccountSuspendedError({
        status: 403,
        data: { message: "You do not have permission to access this resource." },
      })
    ).toBe(false);
    expect(
      isAccountSuspendedError({
        status: 401,
        data: { message: "This account is suspended." },
      })
    ).toBe(false);
  });

  it("clears the stored session and provides a login notice on a suspension response", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "fail",
          message: "This account is suspended. Contact support for assistance.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    );
    localStorage.setItem("user", JSON.stringify(loggedInUser));
    sessionStorage.clear();
    const store = createStore();
    store.dispatch(setUser(loggedInUser));

    try {
      await store.dispatch(sessionApi.endpoints.getProtectedSession.initiate());

      expect(store.getState().auth.user).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
      expect(sessionStorage.getItem("authNotice")).toContain("account is suspended");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("retains the session for unrelated 403 responses", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "fail",
          message: "You do not have permission to access this resource.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    );
    localStorage.setItem("user", JSON.stringify(loggedInUser));
    sessionStorage.clear();
    const store = createStore();
    store.dispatch(setUser(loggedInUser));

    try {
      await store.dispatch(sessionApi.endpoints.getProtectedSession.initiate());

      expect(store.getState().auth.user).toEqual(loggedInUser);
      expect(localStorage.getItem("user")).toEqual(JSON.stringify(loggedInUser));
      expect(sessionStorage.getItem("authNotice")).toBeNull();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("does not queue a suspension notice for an unauthenticated login failure", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "fail",
          message: "This account is suspended. Contact support for assistance.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    );
    localStorage.clear();
    sessionStorage.clear();
    const store = createStore();

    try {
      await store.dispatch(sessionApi.endpoints.getProtectedSession.initiate());

      expect(store.getState().auth.user).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
      expect(sessionStorage.getItem("authNotice")).toBeNull();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
