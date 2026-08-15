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

const toEntityObject = (response: any, keys: string[]) => {
  for (const key of keys) {
    if (response?.data?.[key]) {
      return response.data[key];
    }

    if (response?.[key]) {
      return response[key];
    }
  }

  return response?.data || response || null;
};

export const providerApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    registerProvider: builder.mutation({
      query: (data) => ({
        url: "providers/register",
        method: "POST",
        body: data,
      }),
    }),
    getMyRooms: builder.query({
      query: () => ({
        url: "rooms/mine",
        method: "GET",
      }),
      providesTags: (result) => {
        const rooms = toEntityArray(result, ["rooms", "data"]);
        return [
          { type: "Room", id: "LIST" },
          ...rooms.map((room: any) => ({ type: "Room" as const, id: room?._id })),
        ];
      },
    }),
    getProviderRoom: builder.query({
      query: (roomId) => ({
        url: `rooms/${roomId}`,
        method: "GET",
      }),
      providesTags: (result, error, roomId) => [
        { type: "Room", id: roomId },
        { type: "ProviderAvailability", id: roomId },
      ],
    }),
    createRoom: builder.mutation({
      query: (data) => ({
        url: "rooms",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Room", id: "LIST" }],
    }),
    updateRoom: builder.mutation({
      query: ({ id, payload }) => ({
        url: `rooms/${id}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Room", id },
        { type: "Room", id: "LIST" },
        { type: "ProviderAvailability", id },
      ],
    }),
    deleteRoom: builder.mutation({
      query: (roomId) => ({
        url: `rooms/${roomId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, roomId) => [
        { type: "Room", id: roomId },
        { type: "Room", id: "LIST" },
        { type: "ProviderAvailability", id: roomId },
        { type: "ProviderBooking", id: "LIST" },
      ],
    }),
    blockRoomDates: builder.mutation({
      async queryFn(
        { roomId, payload },
        _api,
        _extraOptions,
        fetchWithBQ
      ) {
        const primaryResult = await fetchWithBQ({
          url: `rooms/${roomId}/blocks`,
          method: "POST",
          body: payload,
        });

        if (!primaryResult.error) {
          return { data: primaryResult.data };
        }

        const fallbackResult = await fetchWithBQ({
          url: `rooms/${roomId}/block`,
          method: "POST",
          body: payload,
        });

        if (fallbackResult.error) {
          return { error: fallbackResult.error };
        }

        return { data: fallbackResult.data };
      },
      invalidatesTags: (result, error, { roomId }) => [
        { type: "Room", id: roomId },
        { type: "Room", id: "LIST" },
        { type: "ProviderAvailability", id: roomId },
      ],
    }),
    getRoomAvailability: builder.query({
      query: ({ roomId, checkIn, checkOut }) => ({
        url: `rooms/${roomId}/availability?checkIn=${encodeURIComponent(
          checkIn
        )}&checkOut=${encodeURIComponent(checkOut)}`,
        method: "GET",
      }),
      providesTags: (result, error, { roomId }) => [
        { type: "ProviderAvailability", id: roomId },
      ],
    }),
    getProviderBookings: builder.query({
      query: () => ({
        url: "bookings/provider",
        method: "GET",
      }),
      providesTags: (result) => {
        const bookings = toEntityArray(result, ["bookings", "data"]);
        return [
          { type: "ProviderBooking", id: "LIST" },
          ...bookings.map((booking: any) => ({
            type: "ProviderBooking" as const,
            id: booking?._id,
          })),
        ];
      },
    }),
    confirmBooking: builder.mutation({
      query: (bookingId) => ({
        url: `bookings/${bookingId}/confirm`,
        method: "POST",
      }),
      invalidatesTags: (result, error, bookingId) => [
        { type: "ProviderBooking", id: bookingId },
        { type: "ProviderBooking", id: "LIST" },
        { type: "ProviderSettlement", id: "SUMMARY" },
      ],
    }),
    declineBooking: builder.mutation({
      query: (args) => {
        const id = typeof args === "string" ? args : args?.id;
        const reason = typeof args === "string" ? undefined : args?.reason;
        return {
        url: `bookings/${id}/decline`,
        method: "POST",
          body: reason ? { reason } : undefined,
        };
      },
      invalidatesTags: (result, error, args) => [
        { type: "ProviderBooking", id: typeof args === "string" ? args : args?.id },
        { type: "ProviderBooking", id: "LIST" },
        { type: "ProviderSettlement", id: "SUMMARY" },
      ],
    }),
    cancelBooking: builder.mutation({
      query: ({ id, body }) => ({
        url: `bookings/${id}/cancel`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ProviderBooking", id },
        { type: "ProviderBooking", id: "LIST" },
        { type: "ProviderSettlement", id: "SUMMARY" },
      ],
    }),
    getProviderProfile: builder.query({
      query: () => ({
        url: "providers/me",
        method: "GET",
      }),
      providesTags: [{ type: "ProviderProfile", id: "ME" }],
    }),
    updateProviderProfile: builder.mutation({
      query: (payload) => ({
        url: "providers/me",
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: [
        { type: "ProviderProfile", id: "ME" },
        { type: "ProviderSettlement", id: "SUMMARY" },
      ],
    }),
    getProviderSettlementsSummary: builder.query({
      query: () => ({
        url: "providers/me/settlements",
        method: "GET",
      }),
      providesTags: [{ type: "ProviderSettlement", id: "SUMMARY" }],
    }),
    getMyAccommodation: builder.query({
      query: () => ({
        url: "accommodations/mine",
        method: "GET",
      }),
      providesTags: [{ type: "Accommodation", id: "MINE" }],
    }),
    createAccommodation: builder.mutation({
      query: (data) => ({
        url: "accommodations",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Accommodation", id: "MINE" }],
    }),
    updateAccommodation: builder.mutation({
      query: ({ id, payload }) => ({
        url: `accommodations/${id}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: [{ type: "Accommodation", id: "MINE" }],
    }),
    addAccommodationImage: builder.mutation({
      query: ({ id, payload }) => ({
        url: `accommodations/${id}/images`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "Accommodation", id: "MINE" }],
    }),
    deleteAccommodationImage: builder.mutation({
      query: ({ id, imageId }) => ({
        url: `accommodations/${id}/images/${imageId}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Accommodation", id: "MINE" }],
    }),
    addRoomImage: builder.mutation({
      query: ({ id, payload }) => ({
        url: `rooms/${id}/images`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Room", id },
        { type: "Room", id: "LIST" },
      ],
    }),
    deleteRoomImage: builder.mutation({
      query: ({ id, imageId }) => ({
        url: `rooms/${id}/images/${imageId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Room", id },
        { type: "Room", id: "LIST" },
      ],
    }),
    updateRoomImage: builder.mutation({
      query: ({ id, imageId, payload }) => ({
        url: `rooms/${id}/images/${imageId}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Room", id }],
    }),
    upsertCancellationPolicy: builder.mutation({
      query: ({ id, payload }) => ({
        url: `accommodations/${id}/cancellation-policy`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: [{ type: "Accommodation", id: "MINE" }],
    }),
    upsertCheckInRules: builder.mutation({
      query: ({ id, payload }) => ({
        url: `accommodations/${id}/checkin-rules`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: [{ type: "Accommodation", id: "MINE" }],
    }),
    getMyAnalytics: builder.query({
      query: (args: any = {}) => {
        const { from, to, roomId } = args;
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (roomId) params.set("roomId", roomId);
        const query = params.toString();
        return {
          url: query ? `providers/me/analytics?${query}` : "providers/me/analytics",
          method: "GET",
        };
      },
      providesTags: [{ type: "ProviderAnalytics", id: "SUMMARY" }],
    }),
    getRoomCalendar: builder.query({
      query: ({ roomId, year, month }) => ({
        url: `rooms/${roomId}/calendar?year=${year}&month=${month}`,
        method: "GET",
      }),
      providesTags: (result, error, { roomId, year, month }) => [
        { type: "RoomCalendar", id: `${roomId}-${year}-${month}` },
      ],
    }),
    listRoomBlocks: builder.query({
      query: (roomId) => ({
        url: `rooms/${roomId}/blocks`,
        method: "GET",
      }),
      providesTags: (result, error, roomId) => [{ type: "ProviderAvailability", id: roomId }],
    }),
    deleteRoomBlock: builder.mutation({
      query: ({ roomId, blockId }) => ({
        url: `rooms/${roomId}/blocks/${blockId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { roomId }) => [
        { type: "Room", id: roomId },
        { type: "ProviderAvailability", id: roomId },
      ],
    }),
    listSeasonalRates: builder.query({
      query: (roomId) => ({
        url: `rooms/${roomId}/seasonal-rates`,
        method: "GET",
      }),
      providesTags: (result, error, roomId) => [{ type: "SeasonalRate", id: roomId }],
    }),
    createSeasonalRate: builder.mutation({
      query: ({ roomId, payload }) => ({
        url: `rooms/${roomId}/seasonal-rates`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (result, error, { roomId }) => [{ type: "SeasonalRate", id: roomId }],
    }),
    updateSeasonalRate: builder.mutation({
      query: ({ roomId, rateId, payload }) => ({
        url: `rooms/${roomId}/seasonal-rates/${rateId}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (result, error, { roomId }) => [{ type: "SeasonalRate", id: roomId }],
    }),
    deleteSeasonalRate: builder.mutation({
      query: ({ roomId, rateId }) => ({
        url: `rooms/${roomId}/seasonal-rates/${rateId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { roomId }) => [{ type: "SeasonalRate", id: roomId }],
    }),
    listRoomFees: builder.query({
      query: (roomId) => ({
        url: `rooms/${roomId}/fees`,
        method: "GET",
      }),
      providesTags: (result, error, roomId) => [{ type: "RoomFee", id: roomId }],
    }),
    createRoomFee: builder.mutation({
      query: ({ roomId, payload }) => ({
        url: `rooms/${roomId}/fees`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (result, error, { roomId }) => [{ type: "RoomFee", id: roomId }],
    }),
    updateRoomFee: builder.mutation({
      query: ({ roomId, feeId, payload }) => ({
        url: `rooms/${roomId}/fees/${feeId}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (result, error, { roomId }) => [{ type: "RoomFee", id: roomId }],
    }),
    deleteRoomFee: builder.mutation({
      query: ({ roomId, feeId }) => ({
        url: `rooms/${roomId}/fees/${feeId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { roomId }) => [{ type: "RoomFee", id: roomId }],
    }),
    getAccommodationTax: builder.query({
      query: (accommodationId) => ({
        url: `accommodations/${accommodationId}/tax`,
        method: "GET",
      }),
      providesTags: (result, error, accommodationId) => [
        { type: "AccommodationTax", id: accommodationId },
      ],
    }),
    upsertAccommodationTax: builder.mutation({
      query: ({ accommodationId, payload }) => ({
        url: `accommodations/${accommodationId}/tax`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (result, error, { accommodationId }) => [
        { type: "AccommodationTax", id: accommodationId },
      ],
    }),
    checkInBooking: builder.mutation({
      query: (bookingId) => ({
        url: `bookings/${bookingId}/check-in`,
        method: "POST",
      }),
      invalidatesTags: (result, error, bookingId) => [
        { type: "ProviderBooking", id: bookingId },
        { type: "ProviderBooking", id: "LIST" },
      ],
    }),
    createPromotion: builder.mutation({
      query: (data) => ({
        url: "promotions",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Promotion", id: "LIST" }],
    }),
    updatePromotion: builder.mutation({
      query: ({ id, payload }) => ({
        url: `promotions/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Promotion", id },
        { type: "Promotion", id: "LIST" },
      ],
    }),
    deactivatePromotion: builder.mutation({
      query: (id) => ({
        url: `promotions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Promotion", id },
        { type: "Promotion", id: "LIST" },
      ],
    }),
    listPromotionCoupons: builder.query({
      query: (promotionId) => ({
        url: `promotions/${promotionId}/coupons`,
        method: "GET",
      }),
      providesTags: (result, error, promotionId) => [
        { type: "Promotion", id: promotionId, relation: "coupons" },
      ],
    }),
    generateCoupons: builder.mutation({
      query: ({ promotionId, payload }) => ({
        url: `promotions/${promotionId}/coupons`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (result, error, { promotionId }) => [
        { type: "Promotion", id: promotionId, relation: "coupons" },
      ],
    }),
    getOccupancyPricingRule: builder.query({
      query: (roomId) => ({
        url: `rooms/${roomId}/occupancy-pricing`,
        method: "GET",
      }),
      providesTags: (result, error, roomId) => [{ type: "OccupancyPricingRule", id: roomId }],
    }),
    upsertOccupancyPricingRule: builder.mutation({
      query: ({ roomId, payload }) => ({
        url: `rooms/${roomId}/occupancy-pricing`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (result, error, { roomId }) => [
        { type: "OccupancyPricingRule", id: roomId },
      ],
    }),
    deleteOccupancyPricingRule: builder.mutation({
      query: (roomId) => ({
        url: `rooms/${roomId}/occupancy-pricing`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, roomId) => [
        { type: "OccupancyPricingRule", id: roomId },
      ],
    }),
    getProviderReviews: builder.query({
      query: (args: any = {}) => {
        const { accommodationId } = args;
        const params = new URLSearchParams();
        if (accommodationId) params.set("accommodationId", accommodationId);
        const query = params.toString();
        return {
          url: query ? `reviews/provider?${query}` : "reviews/provider",
          method: "GET",
        };
      },
      providesTags: [{ type: "ProviderReview", id: "LIST" }],
    }),
    respondToReview: builder.mutation({
      query: ({ id, payload }) => ({
        url: `reviews/${id}/response`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "ProviderReview", id: "LIST" }],
    }),
  }),
});

export const {
  useRegisterProviderMutation,
  useGetMyRoomsQuery,
  useGetProviderRoomQuery,
  useCreateRoomMutation,
  useUpdateRoomMutation,
  useDeleteRoomMutation,
  useBlockRoomDatesMutation,
  useGetRoomAvailabilityQuery,
  useGetProviderBookingsQuery,
  useConfirmBookingMutation,
  useDeclineBookingMutation,
  useCancelBookingMutation,
  useCheckInBookingMutation,
  useGetProviderProfileQuery,
  useUpdateProviderProfileMutation,
  useGetProviderSettlementsSummaryQuery,
  useGetMyAccommodationQuery,
  useCreateAccommodationMutation,
  useUpdateAccommodationMutation,
  useAddAccommodationImageMutation,
  useDeleteAccommodationImageMutation,
  useAddRoomImageMutation,
  useDeleteRoomImageMutation,
  useUpdateRoomImageMutation,
  useUpsertCancellationPolicyMutation,
  useUpsertCheckInRulesMutation,
  useGetMyAnalyticsQuery,
  useGetRoomCalendarQuery,
  useListRoomBlocksQuery,
  useDeleteRoomBlockMutation,
  useListSeasonalRatesQuery,
  useCreateSeasonalRateMutation,
  useUpdateSeasonalRateMutation,
  useDeleteSeasonalRateMutation,
  useListRoomFeesQuery,
  useCreateRoomFeeMutation,
  useUpdateRoomFeeMutation,
  useDeleteRoomFeeMutation,
  useGetAccommodationTaxQuery,
  useUpsertAccommodationTaxMutation,
  useCreatePromotionMutation,
  useUpdatePromotionMutation,
  useDeactivatePromotionMutation,
  useListPromotionCouponsQuery,
  useGenerateCouponsMutation,
  useGetOccupancyPricingRuleQuery,
  useUpsertOccupancyPricingRuleMutation,
  useDeleteOccupancyPricingRuleMutation,
  useGetProviderReviewsQuery,
  useRespondToReviewMutation,
} = providerApiSlice;

export { toEntityArray, toEntityObject };
