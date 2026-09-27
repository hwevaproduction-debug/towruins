import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AdminUsers from "./AdminUsers";
import * as adminApi from "../../../redux/api/adminApiSlice";

jest.mock("../../../redux/api/adminApiSlice", () => ({
  useGetAdminUsersQuery: jest.fn(),
  useGetAdminUserQuery: jest.fn(),
  useGetAdminUserActivityQuery: jest.fn(),
  useCreateAdminUserMutation: jest.fn(),
  useUpdateAdminUserMutation: jest.fn(),
  useResetAdminUserPasswordMutation: jest.fn(),
  useSuspendAdminUserMutation: jest.fn(),
  useReactivateAdminUserMutation: jest.fn(),
}));

const user = {
  id: "user-1",
  _id: "user-1",
  username: "Jordan Tenant",
  email: "jordan@example.com",
  phoneNumber: "+263771234567",
  role: "tenant",
  isEmailVerified: true,
  isPhoneVerified: false,
  verificationStatus: "UNVERIFIED",
  accountSuspendedAt: null,
  onboardingStatus: "completed",
  createdAt: "2026-01-01T00:00:00.000Z",
  providerProfile: null,
  _count: {
    listings: 0,
    accommodations: 0,
    rooms: 0,
    guestBookings: 0,
    providerBookings: 0,
    tenantEngagements: 0,
    landlordEngagements: 0,
  },
};

const mutation = () =>
  [jest.fn().mockReturnValue({ unwrap: () => Promise.resolve({ data: user }) }), { isLoading: false }] as any;

describe("AdminUsers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (adminApi.useGetAdminUsersQuery as jest.Mock).mockReturnValue({
      data: { data: [user], total: 1 },
      isFetching: false,
      isError: false,
    });
    (adminApi.useGetAdminUserQuery as jest.Mock).mockReturnValue({
      data: { data: user },
      isFetching: false,
      isError: false,
    });
    (adminApi.useGetAdminUserActivityQuery as jest.Mock).mockReturnValue({
      data: { data: [], total: 0 },
      isFetching: false,
      isError: false,
    });
    (adminApi.useCreateAdminUserMutation as jest.Mock).mockReturnValue(mutation());
    (adminApi.useUpdateAdminUserMutation as jest.Mock).mockReturnValue(mutation());
    (adminApi.useResetAdminUserPasswordMutation as jest.Mock).mockReturnValue(mutation());
    (adminApi.useSuspendAdminUserMutation as jest.Mock).mockReturnValue(mutation());
    (adminApi.useReactivateAdminUserMutation as jest.Mock).mockReturnValue(mutation());
  });

  test("shows account, verification, and contact fields with a manage action", () => {
    render(<AdminUsers />);

    expect(screen.getByText("Jordan Tenant")).toBeInTheDocument();
    expect(screen.getByText("jordan@example.com")).toBeInTheDocument();
    expect(screen.getByText("+263771234567")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Email verified")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View / Manage" })).toBeInTheDocument();
  });

  test("opens the user details tabs and shows an empty activity state", async () => {
    render(<AdminUsers />);

    fireEvent.click(screen.getByRole("button", { name: "View / Manage" }));
    expect(await screen.findByText("Related activity")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /engagements \/ requests/i }));
    expect(await screen.findByText("No engagements found for this user.")).toBeInTheDocument();
  });

  test("creates an admin user and opens the new user", async () => {
    const create = jest.fn().mockReturnValue({ unwrap: () => Promise.resolve({ data: { ...user, id: "new-user" } }) });
    (adminApi.useCreateAdminUserMutation as jest.Mock).mockReturnValue([create, { isLoading: false }]);
    render(<AdminUsers />);

    fireEvent.click(screen.getByRole("button", { name: "Add User" }));
    const addDialog = await screen.findByRole("dialog");
    fireEvent.change(within(addDialog).getByLabelText(/name/i), { target: { value: "New Tenant" } });
    fireEvent.change(within(addDialog).getByLabelText(/email/i), { target: { value: "new@example.com" } });
    fireEvent.change(within(addDialog).getByLabelText(/initial password/i), { target: { value: "StrongPass1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));

    await waitFor(() => expect(create).toHaveBeenCalledWith({
      username: "New Tenant",
      email: "new@example.com",
      phoneNumber: "",
      role: "tenant",
      password: "StrongPass1!",
    }));
    expect(await screen.findByText("User created.")).toBeInTheDocument();
  });

  test("confirms before suspending an account", async () => {
    const suspend = jest.fn().mockReturnValue({ unwrap: () => Promise.resolve({ data: user }) });
    (adminApi.useSuspendAdminUserMutation as jest.Mock).mockReturnValue([suspend, { isLoading: false }]);
    render(<AdminUsers />);

    fireEvent.click(screen.getByRole("button", { name: "View / Manage" }));
    fireEvent.click(await screen.findByRole("button", { name: "Suspend account" }));
    expect(screen.getByText(/Existing listings, engagements, bookings, and other records will remain unchanged/)).toBeInTheDocument();
    const confirmButtons = screen.getAllByRole("button", { name: "Suspend account" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(suspend).toHaveBeenCalledWith("user-1"));
  });
});
