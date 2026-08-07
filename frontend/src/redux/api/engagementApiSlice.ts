import { apiSlice } from "./apiSlice";

export const engagementApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createEngagement: builder.mutation({
      query: (data) => ({ url: "engagements", method: "POST", body: data }),
      invalidatesTags: ["Engagement"],
    }),
    getMyEngagements: builder.query({
      query: () => ({ url: "engagements/mine", method: "GET" }),
      providesTags: ["Engagement"],
    }),
    getIncomingEngagements: builder.query({
      query: () => ({ url: "engagements/incoming", method: "GET" }),
      providesTags: ["Engagement"],
    }),
    respondToEngagement: builder.mutation({
      query: ({ id, action }) => ({
        url: `engagements/${id}`,
        method: "PATCH",
        body: { action },
      }),
      invalidatesTags: ["Engagement"],
    }),
  }),
});

export const {
  useCreateEngagementMutation,
  useGetMyEngagementsQuery,
  useGetIncomingEngagementsQuery,
  useRespondToEngagementMutation,
} = engagementApiSlice;
