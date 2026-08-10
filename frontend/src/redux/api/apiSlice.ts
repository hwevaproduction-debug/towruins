import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { RootState } from "../store";
import { getApiBaseUrl } from "../../utils";

export const apiSlice = createApi({
  reducerPath: "api",

  baseQuery: fetchBaseQuery({
    baseUrl: getApiBaseUrl(),
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth?.user?.token;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: [
    "Listing",
    "Payment",
    "AdminListing",
    "Stay",
    "StayBooking",
    "Provider",
    "AdminBooking",
    "Room",
    "ProviderBooking",
    "ProviderProfile",
    "ProviderAvailability",
    "ProviderSettlement",
    "PricingQuote",
    "Accommodation",
    "ListingDraft",
    "ProviderAnalytics",
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
