import { apiSlice } from "./apiSlice";

const toEntityArray = (response: any, keys: string[]) => {
  for (const key of keys) {
    if (Array.isArray(response?.data?.[key])) {
      return response.data[key];
    }

    if (Array.isArray(response?.[key])) {
      return response[key];
    }
  }

  return [];
};

export const listingApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createListing: builder.mutation({
      query: (data) => {
        return {
          url: "listings",
          method: "POST",
          body: data,
        };
      },
      invalidatesTags: ["Listing"],
    }),
    getListing: builder.query({
      query: (userId) => {
        return {
          url: `listings/user/${userId}`,
          method: "GET",
        };
      },
      providesTags: ["Listing"],
    }),
    getSingleListing: builder.query({
      query: (listingId) => {
        return {
          url: `listings/listing/${listingId}`,
          method: "GET",
        };
      },
      providesTags: ["Listing"],
    }),
    getPublicStats: builder.query({
      query: () => ({ url: "listings/stats", method: "GET" }),
      providesTags: ["Listing"],
    }),
    deleteListing: builder.mutation({
      query: (listingId) => {
        return {
          url: `listings/${listingId}`,
          method: "DELETE",
        };
      },
      invalidatesTags: ["Listing"],
    }),
    updateListing: builder.mutation({
      query: (data) => {
        return {
          url: `listings/${data.id}`,
          method: "PUT",
          body: data.payload,
        };
      },
      invalidatesTags: ["Listing"],
    }),
    restoreListing: builder.mutation({
      query: ({ id, days }: { id: string; days: number }) => ({
        url: `listings/${id}/restore`,
        method: "POST",
        body: { days },
      }),
      invalidatesTags: ["Listing"],
    }),
    searchListings: builder.query({
      query: (searchTerm) => {
        return {
          // Express route is GET /api/v1/listings/get?...
          url: `listings/get?${searchTerm}`,
          method: "GET",
        };
      },
      providesTags: ["Listing"],
    }),
    getHomeHighlighted: builder.query({
      query: (limit = 9) => {
        return {
          url: `listings/home/highlighted?limit=${limit}`,
          method: "GET",
        };
      },
      providesTags: ["Listing"],
    }),
    getHomeGroupedByLocation: builder.query({
      query: (
        params?: { locationsLimit?: number; perLocation?: number }
      ) => {
        const { locationsLimit = 6, perLocation = 6 } = params || {};
        return {
          url: `listings/home/grouped-by-location?locationsLimit=${locationsLimit}&perLocation=${perLocation}`,
          method: "GET",
        };
      },
      providesTags: ["Listing"],
    }),
    getListingDraft: builder.query({
      query: () => ({
        url: "listing-drafts/mine",
        method: "GET",
      }),
      transformResponse: (response: any) => {
        const drafts = toEntityArray(response, ["drafts", "data"]);
        return drafts[0] || null;
      },
      providesTags: [{ type: "ListingDraft", id: "MINE" }],
    }),
    updateListingDraft: builder.mutation({
      async queryFn({ id, payload }, _api, _extraOptions, fetchWithBQ) {
        const body = { data: payload };

        if (id) {
          const updateResult = await fetchWithBQ({
            url: `listing-drafts/${id}`,
            method: "PUT",
            body,
          });

          if (!updateResult.error) {
            return { data: updateResult.data };
          }
        }

        const createResult = await fetchWithBQ({
          url: "listing-drafts",
          method: "POST",
          body,
        });

        if (createResult.error) {
          return { error: createResult.error };
        }

        return { data: createResult.data };
      },
      invalidatesTags: [{ type: "ListingDraft", id: "MINE" }],
    }),
    autosaveListingDraft: builder.mutation({
      async queryFn({ id, payload }, _api, _extraOptions, fetchWithBQ) {
        const body = { data: payload };

        if (id) {
          const updateResult = await fetchWithBQ({
            url: `listing-drafts/${id}`,
            method: "PUT",
            body,
          });

          if (!updateResult.error) {
            return { data: updateResult.data };
          }
        }

        const createResult = await fetchWithBQ({
          url: "listing-drafts",
          method: "POST",
          body,
        });

        if (createResult.error) {
          return { error: createResult.error };
        }

        return { data: createResult.data };
      },
      // Intentionally do not invalidate ListingDraft tag to avoid triggering a refetch on autosave
    }),
deleteListingDraft: builder.mutation({
      query: (id) => ({
        url: `listing-drafts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "ListingDraft", id: "MINE" }],
    }),
    getRestorationConfig: builder.query<{ status: string; data: { durations: { days: number; label: string }[]; minTokensPerDay: number } }, void>({
      query: () => ({
        url: "pricing/restoration-config",
        method: "GET",
      }),
      providesTags: ["Listing"],
    }),
  }),
});

export const {
  useCreateListingMutation,
  useGetListingQuery,
  useDeleteListingMutation,
  useUpdateListingMutation,
  useRestoreListingMutation,
  useGetSingleListingQuery,
  useGetPublicStatsQuery,
  useSearchListingsQuery,
  useGetHomeHighlightedQuery,
  useGetHomeGroupedByLocationQuery,
  useGetListingDraftQuery,
  useUpdateListingDraftMutation,
  useAutosaveListingDraftMutation,
  useDeleteListingDraftMutation,
  useGetRestorationConfigQuery,
} = listingApiSlice;
