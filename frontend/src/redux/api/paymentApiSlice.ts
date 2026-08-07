import { apiSlice } from "./apiSlice";

export const paymentApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyPayments: builder.query({
      query: () => {
        return {
          url: "payments/mine",
          method: "GET",
        };
      },
      providesTags: ["Payment"],
    }),
    initiateListingFee: builder.mutation({
      query: ({ listingId, earlyAccess = false }) => {
        return {
          url: "payments/listing-fee",
          method: "POST",
          body: { listingId, earlyAccess },
        };
      },
      invalidatesTags: [
        "Payment",
        { type: "WalletTransaction", id: "BALANCE" },
        { type: "WalletTransaction", id: "LIST" },
      ],
    }),
    initiateTenantPremium: builder.mutation({
      query: () => {
        return {
          url: "payments/tenant-premium",
          method: "POST",
        };
      },
      invalidatesTags: [
        "Payment",
        { type: "WalletTransaction", id: "BALANCE" },
        { type: "WalletTransaction", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetMyPaymentsQuery,
  useInitiateListingFeeMutation,
  useInitiateTenantPremiumMutation,
} = paymentApiSlice;
