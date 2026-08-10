import { apiSlice } from "./apiSlice";

export interface AdminStayFilters {
  provider?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminStayRecord {
  _id: string;
  id?: string;
  name?: string;
  description?: string;
  basePricePerNight?: number;
  capacity?: number;
  roomType?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  provider?: { _id?: string; username?: string; email?: string } | null;
  accommodation?: { id?: string; name?: string; isPublished?: boolean } | null;
  coverImage?: string | null;
}

interface AdminStaysResponse {
  data: AdminStayRecord[];
  total: number;
  pagination?: { page: number; limit: number; total: number; hasMore: boolean };
}

export const adminStayApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTemporaryStays: builder.query<AdminStaysResponse, AdminStayFilters | void>({
      query: (params) => ({ url: `admin/temporary-stays${params ? `?${new URLSearchParams(params as any).toString()}` : ""}`, method: "GET" }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((item) => ({ type: "TemporaryStay" as const, id: item._id })),
              { type: "TemporaryStay" as const, id: "LIST" },
            ]
          : [{ type: "TemporaryStay" as const, id: "LIST" }],
    }),
    getTemporaryStayById: builder.query<AdminStayRecord, string>({
      query: (id) => ({ url: `admin/temporary-stays/${id}`, method: "GET" }),
      transformResponse: (response: any) => response.data.room,
      providesTags: (_result, _error, id) => [{ type: "TemporaryStay", id }],
    }),
    createTemporaryStay: builder.mutation<AdminStayRecord, Partial<AdminStayRecord>>({
      query: (body) => ({ url: `admin/temporary-stays`, method: "POST", body }),
      transformResponse: (response: any) => response.data.room,
      invalidatesTags: [{ type: "TemporaryStay", id: "LIST" }],
    }),
    updateTemporaryStay: builder.mutation<AdminStayRecord, { id: string; body: Partial<AdminStayRecord> }>({
      query: ({ id, body }) => ({ url: `admin/temporary-stays/${id}`, method: "PUT", body }),
      transformResponse: (response: any) => response.data.room,
      invalidatesTags: (_result, _error, { id }) => [{ type: "TemporaryStay", id }, { type: "TemporaryStay", id: "LIST" }],
    }),
    publishTemporaryStay: builder.mutation<AdminStayRecord, string>({
      query: (id) => ({ url: `admin/temporary-stays/${id}/publish`, method: "POST" }),
      transformResponse: (response: any) => response.data.room,
      invalidatesTags: (_result, _error, id) => [{ type: "TemporaryStay", id }, { type: "TemporaryStay", id: "LIST" }],
    }),
    unpublishTemporaryStay: builder.mutation<AdminStayRecord, string>({
      query: (id) => ({ url: `admin/temporary-stays/${id}/unpublish`, method: "POST" }),
      transformResponse: (response: any) => response.data.room,
      invalidatesTags: (_result, _error, id) => [{ type: "TemporaryStay", id }, { type: "TemporaryStay", id: "LIST" }],
    }),
    deleteTemporaryStay: builder.mutation<{ deletedId: string }, string>({
      query: (id) => ({ url: `admin/temporary-stays/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [{ type: "TemporaryStay", id }, { type: "TemporaryStay", id: "LIST" }],
    }),
    restoreTemporaryStay: builder.mutation<AdminStayRecord, string>({
      query: (id) => ({ url: `admin/temporary-stays/${id}/restore`, method: "POST" }),
      transformResponse: (response: any) => response.data.room,
      invalidatesTags: (_result, _error, id) => [{ type: "TemporaryStay", id }, { type: "TemporaryStay", id: "LIST" }],
    }),
  }),
});

export const {
  useGetTemporaryStaysQuery,
  useGetTemporaryStayByIdQuery,
  useCreateTemporaryStayMutation,
  useUpdateTemporaryStayMutation,
  usePublishTemporaryStayMutation,
  useUnpublishTemporaryStayMutation,
  useDeleteTemporaryStayMutation,
  useRestoreTemporaryStayMutation,
} = adminStayApi;
