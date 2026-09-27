import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { RootState } from "../store";
import { getApiBaseUrl } from "../../utils";
import { setUser } from "../auth/authSlice";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: getApiBaseUrl(),
  prepareHeaders: (headers, { getState }) => {
    const authState = (getState() as RootState).auth?.user;
    const token = authState?.token ?? authState?.data?.token;
    if (token) {
      headers.set("authorization", "Bearer " + token);
    }
    return headers;
  },
});

export const isAccountSuspendedError = (
  error: { status: number | string; data?: unknown } | undefined
) => {
  if (error?.status !== 403 || typeof error.data !== "object" || error.data === null) {
    return false;
  }

  return (
    "message" in error.data &&
    typeof error.data.message === "string" &&
    error.data.message.toLowerCase().includes("account is suspended")
  );
};

const baseQuery: typeof rawBaseQuery = async (...args) => {
  const result = await rawBaseQuery(...args);
  const authUser = (args[1].getState() as RootState).auth?.user;
  if (authUser && isAccountSuspendedError(result.error)) {
    args[1].dispatch(setUser(null));
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("user");
      window.sessionStorage.setItem(
        "authNotice",
        "Your account is suspended. Contact support for assistance."
      );
    }
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: [
    "Listing",
    "Payment",
    "AdminListing",
    "Stay",
    "StayBooking",
    "Provider",
    "AdminBooking",
    "Room",
    "TemporaryStay",
    "ProviderBooking",
    "ProviderProfile",
    "ProviderAvailability",
    "ProviderSettlement",
    "PricingQuote",
    "Accommodation",
    "ListingDraft",
    "ProviderAnalytics",
    "TemporaryStay",
    "RoomCalendar",
    "SeasonalRate",
    "RoomFee",
    "AccommodationTax",
    "AdminAccommodation",
    "AdminReview",
    "Dispute",
    "Report",
    "AuditLog",
    "Engagement",
    "Promotion",
    "OccupancyPricingRule",
    "ProviderReview",
    "LegalDoc",
    "WalletTransaction",

    // Admin/onboarding tags
    "Invitation",
    "User",
    "AuditLog",
    "AdminAccommodation",
    "AdminReview",
    "Dispute",
    "Report",
  ],
  endpoints: (builder) => ({}),
});
