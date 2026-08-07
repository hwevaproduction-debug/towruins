import { apiSlice } from "./apiSlice";

export interface LegalDocument {
  id: string;
  slug: string;
  title: string;
  version: number;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const legalApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPublicLegalDoc: builder.query<{ status: string; data: LegalDocument }, string>({
      query: (slug) => ({
        url: `legal-docs/${slug}`,
        method: "GET",
      }),
      providesTags: ["LegalDoc"],
    }),
  }),
});

export const { useGetPublicLegalDocQuery } = legalApiSlice;
