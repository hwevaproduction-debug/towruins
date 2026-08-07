import { apiSlice } from "./apiSlice";

export interface StaySearchParams {
  location?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number | string;
  minPrice?: number | string;
  maxPrice?: number | string;
  searchTerm?: string;
  businessType?: string;
  bookingMode?: string;
  amenities?: string[] | string;
  sort?: string;
  roomType?: string;
  minRating?: number | string;
  lat?: number | string;
  lng?: number | string;
  radius?: number | string;
  selfCheckIn?: boolean | string;
  page?: number | string;
  limit?: number | string;
}

export interface StaySearchPagination {
  page: number;
  limit: number;
  hasMore: boolean;
  total: number;
}

export interface StaySearchResponse {
  status: string;
  data: {
    stays: any[];
  };
  pagination: StaySearchPagination;
}

export interface StayAvailabilityParams {
  roomId: string;
  checkIn: string;
  checkOut: string;
  adultCount?: number;
  childCount?: number;
  infantCount?: number;
}

export interface RoomCalendarParams {
  roomId: string;
  year: number;
  month: number;
}

export interface RoomCalendarResponse {
  status: string;
  data: {
    year: number;
    month: number;
    timezone: string;
    currentDate: string;
    unavailableDates: string[];
    pricingByDate: Record<string, number>;
    minNights: number;
    maxNights: number | null;
    checkInFrom: string | null;
    checkOutBy: string | null;
  };
}

export interface CreateBookingPayload {
  room: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  adultCount?: number;
  childCount?: number;
  infantCount?: number;
  specialRequests?: string;
  totalPrice?: number;
  couponCode?: string;
}

export interface InitiateBookingPaymentPayload {
  bookingId?: string;
  phone?: string;
  amount?: number;
  [key: string]: any;
}

type FetchWithBQ = (arg: any) => any;

const buildSearchQuery = (params?: StaySearchParams | void) => {
  const searchParams = new URLSearchParams();

  Object.entries(params || {})
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value
        .filter((item) => item !== undefined && item !== null && item !== "")
        .forEach((item) => searchParams.append(key, String(item)));
      return;
    }

    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  return searchParams.toString();
};

const getStayId = (stay: any) => stay?.id || stay?._id;

const getSearchCacheKey = (params?: StaySearchParams | void) => {
  const normalizedParams = { ...(params || {}) };
  delete normalizedParams.page;

  return buildSearchQuery(normalizedParams);
};

const getSearchPage = (params?: StaySearchParams | void) => Number(params?.page || 1);

const extractCollection = <T>(response: any, keys: string[]): T[] => {
  if (Array.isArray(response)) return response;

  for (const key of keys) {
    const directValue = response?.[key];
    if (Array.isArray(directValue)) return directValue;

    const nestedValue = response?.data?.[key];
    if (Array.isArray(nestedValue)) return nestedValue;
  }

  if (Array.isArray(response?.data)) return response.data;

  return [];
};

const extractEntity = <T>(response: any, keys: string[]): T | null => {
  for (const key of keys) {
    const directValue = response?.[key];
    if (directValue) return directValue;

    const nestedValue = response?.data?.[key];
    if (nestedValue) return nestedValue;
  }

  return response?.data || response || null;
};

const tryCollectionEndpoints = async (
  fetchWithBQ: FetchWithBQ,
  candidates: Array<{ url: string; method?: "GET" | "POST"; body?: unknown }>,
  keys: string[]
): Promise<{ data: any[] } | { error: any }> => {
  let lastError: any;

  for (const candidate of candidates) {
    const result = await fetchWithBQ(candidate);

    if (!result.error) {
      return { data: extractCollection<any>(result.data, keys) };
    }

    lastError = result.error;
    const status = Number((result.error as any)?.status);

    if (status && ![404, 405].includes(status)) {
      return { error: result.error };
    }
  }

  return { error: lastError || { status: 404, data: { message: "Stay endpoint not found" } } };
};

const tryEntityEndpoints = async (
  fetchWithBQ: FetchWithBQ,
  candidates: Array<{ url: string; method?: "GET" | "POST"; body?: unknown }>,
  keys: string[]
): Promise<{ data: any } | { error: any }> => {
  let lastError: any;

  for (const candidate of candidates) {
    const result = await fetchWithBQ(candidate);

    if (!result.error) {
      return { data: extractEntity<any>(result.data, keys) || result.data || {} };
    }

    lastError = result.error;
    const status = Number((result.error as any)?.status);

    if (status && ![404, 405].includes(status)) {
      return { error: result.error };
    }
  }

  return { error: lastError || { status: 404, data: { message: "Stay endpoint not found" } } };
};

export const stayApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    searchStays: builder.query<StaySearchResponse, StaySearchParams | void>({
      query: (params) => {
        const query = buildSearchQuery(params);

        return {
          url: query ? `stays?${query}` : "stays",
          method: "GET",
        };
      },
      serializeQueryArgs: ({ endpointName, queryArgs }) =>
        `${endpointName}:${getSearchCacheKey(queryArgs)}`,
      merge: (currentCache, incomingResponse, { arg }) => {
        const incomingPage = Number(incomingResponse?.pagination?.page || arg?.page || 1);

        if (incomingPage <= 1) {
          currentCache.status = incomingResponse.status;
          currentCache.data = incomingResponse.data;
          currentCache.pagination = incomingResponse.pagination;
          return;
        }

        const currentStays = currentCache.data?.stays || [];
        const seenIds = new Set(currentStays.map(getStayId).filter(Boolean));
        const nextStays = (incomingResponse.data?.stays || []).filter((stay) => {
          const stayId = getStayId(stay);

          if (!stayId) {
            return true;
          }

          if (seenIds.has(stayId)) {
            return false;
          }

          seenIds.add(stayId);
          return true;
        });

        currentCache.status = incomingResponse.status;
        currentCache.data = {
          stays: [...currentStays, ...nextStays],
        };
        currentCache.pagination = incomingResponse.pagination;
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        getSearchPage(currentArg) !== getSearchPage(previousArg),
      providesTags: ["Stay"],
    }),
    getStayById: builder.query<any, string>({
      async queryFn(roomId, _api, _extraOptions, fetchWithBQ) {
        return tryEntityEndpoints(
          fetchWithBQ,
          [
            { url: `rooms/public/${roomId}` },
            { url: `rooms/${roomId}` },
            { url: `stays/rooms/${roomId}` },
            { url: `stays/${roomId}` },
          ],
          ["room", "stay"]
        );
      },
      providesTags: (_result, _error, roomId) => [{ type: "Stay", id: roomId }],
    }),
    getRoomAvailability: builder.query<any, StayAvailabilityParams>({
      query: ({ roomId, checkIn, checkOut, adultCount, childCount, infantCount }) => {
        const params = new URLSearchParams({
          checkIn,
          checkOut,
        });

        if (adultCount != null) params.set("adultCount", String(adultCount));
        if (childCount != null) params.set("childCount", String(childCount));
        if (infantCount != null) params.set("infantCount", String(infantCount));

        return {
          url: `rooms/${roomId}/availability?${params.toString()}`,
          method: "GET",
        };
      },
      providesTags: (_result, _error, arg) => [{ type: "Stay", id: arg.roomId }],
    }),
    getRoomCalendar: builder.query<RoomCalendarResponse, RoomCalendarParams>({
      query: ({ roomId, year, month }) =>
        `rooms/${roomId}/calendar?year=${year}&month=${month}`,
      providesTags: (_result, _error, arg) => [{ type: "Stay", id: arg.roomId }],
    }),
    getPricingQuote: builder.query<any, {
      roomId: string; checkIn: string; checkOut: string;
      adultCount?: number; childCount?: number; infantCount?: number; couponCode?: string;
    }>({
      query: (body) => ({ url: "pricing/quote", method: "POST", body }),
      providesTags: ["PricingQuote"],
    }),
    validateCoupon: builder.mutation<any, {
      roomId: string; couponCode: string; checkIn: string; checkOut: string;
      adultCount?: number; childCount?: number;
    }>({
      query: (body) => ({ url: "pricing/validate-coupon", method: "POST", body }),
    }),
    getCancellationPreview: builder.query<any, string>({
      query: (id) => ({ url: `bookings/${id}/cancellation-preview`, method: "GET" }),
    }),
    getProviderProfile: builder.query<any, string>({
      query: (providerId) => ({
        url: `stays/${providerId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, providerId) => [{ type: "Stay", id: providerId }],
    }),
    createBooking: builder.mutation<any, CreateBookingPayload>({
      async queryFn(payload, _api, _extraOptions, fetchWithBQ) {
        return tryEntityEndpoints(
          fetchWithBQ,
          [
            { url: "bookings", method: "POST", body: payload },
            { url: "stays/bookings", method: "POST", body: payload },
            { url: `rooms/${payload.room}/bookings`, method: "POST", body: payload },
          ],
          ["booking"]
        );
      },
      async onQueryStarted(payload, { dispatch, getState, queryFulfilled }) {
        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticBooking = {
          id: optimisticId,
          _id: optimisticId,
          roomId: payload.room,
          room: payload.room,
          checkIn: payload.checkIn,
          checkOut: payload.checkOut,
          checkInDate: payload.checkIn,
          checkOutDate: payload.checkOut,
          adultCount: payload.adultCount ?? payload.guests ?? 1,
          childCount: payload.childCount ?? 0,
          infantCount: payload.infantCount ?? 0,
          totalPrice: payload.totalPrice,
          status: "PENDING_CONFIRMATION",
          paymentStatus: "UNPAID",
          specialRequests: payload.specialRequests || "",
          isOptimistic: true,
        };
        const getBookingsCache = () =>
          stayApiSlice.endpoints.getMyBookings.select(undefined)(getState() as any);
        const hasBookingsCache = Array.isArray(getBookingsCache()?.data);
        const seededBookingsCache = !hasBookingsCache;
        const patch = hasBookingsCache
          ? dispatch(
              stayApiSlice.util.updateQueryData("getMyBookings", undefined, (draft) => {
                draft.unshift(optimisticBooking);
              })
            )
          : null;

        if (seededBookingsCache) {
          dispatch(
            stayApiSlice.util.upsertQueryData("getMyBookings", undefined, [
              optimisticBooking,
            ])
          );
        }

        const removeOptimisticBooking = () => {
          dispatch(
            stayApiSlice.util.updateQueryData("getMyBookings", undefined, (draft) => {
              const index = draft.findIndex(
                (booking: any) => (booking?.id || booking?._id) === optimisticId
              );

              if (index >= 0) {
                draft.splice(index, 1);
              }
            })
          );
        };

        try {
          const { data } = await queryFulfilled;
          const createdBooking = extractEntity<any>(data, ["booking"]);

          if (createdBooking) {
            dispatch(
              stayApiSlice.util.updateQueryData("getMyBookings", undefined, (draft) => {
                const index = draft.findIndex(
                  (booking: any) => (booking?.id || booking?._id) === optimisticId
                );

                if (index >= 0) {
                  draft[index] = createdBooking;
                  return;
                }

                draft.unshift(createdBooking);
              })
            );
          }
        } catch {
          patch?.undo();
          removeOptimisticBooking();
          if (seededBookingsCache) {
            dispatch(stayApiSlice.util.invalidateTags(["StayBooking"]));
          }
        }
      },
      invalidatesTags: ["StayBooking", "Stay"],
    }),
    initiateBookingPayment: builder.mutation<any, InitiateBookingPaymentPayload>({
      query: (body) => ({
        url: "bookings/initiate-payment",
        method: "POST",
        body,
      }),
      invalidatesTags: ["StayBooking"],
    }),
    cancelBooking: builder.mutation<any, { id: string; body: { reason?: string } }>({
      query: ({ id, body }) => ({
        url: `bookings/${id}/cancel`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["StayBooking", "Stay"],
    }),
    getMyBookings: builder.query<any[], void>({
      async queryFn(_arg, _api, _extraOptions, fetchWithBQ) {
        return tryCollectionEndpoints(
          fetchWithBQ,
          [
            { url: "bookings/mine" },
            { url: "stays/bookings/mine" },
            { url: "bookings" },
          ],
          ["bookings", "results"]
        );
      },
      providesTags: ["StayBooking"],
    }),
    getProviderBookings: builder.query<any[], void>({
      query: () => ({
        url: "bookings/provider",
        method: "GET",
      }),
      transformResponse: (response: any) => extractCollection<any>(response, ["bookings"]),
      providesTags: ["StayBooking"],
    }),
    getBookingById: builder.query<any, string>({
      query: (id) => ({
        url: `bookings/${id}`,
        method: "GET",
      }),
      transformResponse: (response: any) => extractEntity<any>(response, ["booking"]),
      providesTags: (_result, _error, id) => [{ type: "StayBooking", id }],
    }),
    submitGuestInfo: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `bookings/${id}/guest-info`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "StayBooking", id }],
    }),
    modifyBooking: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `bookings/${id}/modify`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["StayBooking"],
    }),
    confirmBooking: builder.mutation<any, string>({
      query: (id) => ({
        url: `bookings/${id}/confirm`,
        method: "POST",
      }),
      invalidatesTags: ["StayBooking"],
    }),
    declineBooking: builder.mutation<any, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `bookings/${id}/decline`,
        method: "POST",
        body: reason ? { reason } : {},
      }),
      invalidatesTags: ["StayBooking"],
    }),
  }),
});

export const {
  useSearchStaysQuery,
  useGetStayByIdQuery,
  useGetRoomAvailabilityQuery,
  useGetRoomCalendarQuery,
  useGetPricingQuoteQuery,
  useValidateCouponMutation,
  useGetCancellationPreviewQuery,
  useGetProviderProfileQuery,
  useCreateBookingMutation,
  useInitiateBookingPaymentMutation,
  useCancelBookingMutation,
  useGetMyBookingsQuery,
  useGetProviderBookingsQuery,
  useGetBookingByIdQuery,
  useSubmitGuestInfoMutation,
  useModifyBookingMutation,
  useConfirmBookingMutation,
  useDeclineBookingMutation,
} = stayApiSlice;
