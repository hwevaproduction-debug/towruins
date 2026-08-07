import { apiSlice } from "./apiSlice";

export interface WalletTransactionRecord {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  label: string;
  reason: string;
  balanceAfter: number;
  createdAt: string;
}

const walletApi = apiSlice.enhanceEndpoints({ addTagTypes: ["WalletTransaction"] });

export const walletApiSlice = walletApi.injectEndpoints({
  endpoints: (builder) => ({
    getWalletBalance: builder.query<{ status: string; data: { tokenBalance: number } }, void>({
      query: () => ({ url: "users/wallet/balance", method: "GET" }),
      providesTags: [{ type: "WalletTransaction", id: "BALANCE" }],
    }),
    getWalletTransactions: builder.query<
      { status: string; data: { transactions: WalletTransactionRecord[] } },
      { limit?: number } | void
    >({
      query: (params) => {
        const limit = params?.limit || 50;
        return { url: `users/wallet/transactions?limit=${limit}`, method: "GET" };
      },
      providesTags: [{ type: "WalletTransaction", id: "LIST" }],
    }),
  }),
});

export const { useGetWalletBalanceQuery, useGetWalletTransactionsQuery } = walletApiSlice;
