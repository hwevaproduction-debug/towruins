import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

export type WalletTransaction = {
  id: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  label: string;
  timestamp: string;
  reason?: string;
  balanceAfter?: number;
};

type WalletState = {
  activeUserId: string | null;
  tokenBalance: number;
  transactions: WalletTransaction[];
};

type PersistedWalletState = Omit<WalletState, "activeUserId">;

const STORAGE_KEY_PREFIX = "tr_wallet";

const createTransaction = (
  type: WalletTransaction["type"],
  amount: number,
  label: string
): WalletTransaction => ({
  id:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  type,
  amount,
  label,
  timestamp: new Date().toISOString(),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTransaction = (value: unknown): value is WalletTransaction => {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    (value.type === "DEBIT" || value.type === "CREDIT") &&
    typeof value.amount === "number" &&
    typeof value.label === "string" &&
    typeof value.timestamp === "string"
  );
};

const isWalletState = (value: unknown): value is PersistedWalletState => {
  if (!isRecord(value)) return false;

  return (
    typeof value.tokenBalance === "number" &&
    Array.isArray(value.transactions) &&
    value.transactions.every(isTransaction)
  );
};

const getDefaultWallet = (): WalletState => ({
  activeUserId: null,
  tokenBalance: 0,
  transactions: [],
});

const getEmptyWallet = (): WalletState => ({
  activeUserId: null,
  tokenBalance: 0,
  transactions: [],
});

const getWalletStorageKey = (userId: string) => `${STORAGE_KEY_PREFIX}:${userId}`;

const readWalletForUser = (userId: string | null): WalletState => {
  if (!userId) {
    return getEmptyWallet();
  }

  const storedWallet = localStorage.getItem(getWalletStorageKey(userId));

  if (!storedWallet) {
    return { ...getDefaultWallet(), activeUserId: userId };
  }

  try {
    const parsedWallet: unknown = JSON.parse(storedWallet);
    return isWalletState(parsedWallet)
      ? { ...parsedWallet, activeUserId: userId }
      : { ...getDefaultWallet(), activeUserId: userId };
  } catch {
    return { ...getDefaultWallet(), activeUserId: userId };
  }
};

const persistWallet = (state: WalletState) => {
  if (!state.activeUserId) return;

  localStorage.setItem(
    getWalletStorageKey(state.activeUserId),
    JSON.stringify(toPersistableState(state))
  );
};

const toPersistableState = (state: WalletState): PersistedWalletState => ({
  tokenBalance: state.tokenBalance,
  transactions: state.transactions.map((transaction) => ({ ...transaction })),
});

const walletSlice = createSlice({
  name: "wallet",
  initialState: getEmptyWallet(),
  reducers: {
    setActiveWalletUser(state, action: PayloadAction<string | null>) {
      const nextWallet = readWalletForUser(action.payload);

      state.activeUserId = nextWallet.activeUserId;
      state.tokenBalance = nextWallet.tokenBalance;
      state.transactions = nextWallet.transactions;
    },
    initWallet(state, action: PayloadAction<number>) {
      const nextBalance = action.payload;
      const difference = nextBalance - state.tokenBalance;

      state.tokenBalance = nextBalance;
      state.transactions.push(
        createTransaction(
          difference >= 0 ? "CREDIT" : "DEBIT",
          Math.abs(difference),
          "Wallet initialized"
        )
      );
      persistWallet(state);
    },
    deductTokens(state, action: PayloadAction<{ amount: number; label: string }>) {
      state.tokenBalance -= action.payload.amount;
      state.transactions.push(
        createTransaction("DEBIT", action.payload.amount, action.payload.label)
      );
      persistWallet(state);
    },
    addTokens(state, action: PayloadAction<{ amount: number; label: string }>) {
      state.tokenBalance += action.payload.amount;
      state.transactions.push(
        createTransaction("CREDIT", action.payload.amount, action.payload.label)
      );
      persistWallet(state);
    },
    syncWalletFromServer(
      state,
      action: PayloadAction<{ tokenBalance: number; transactions?: WalletTransaction[] }>
    ) {
      state.tokenBalance = action.payload.tokenBalance;
      if (action.payload.transactions !== undefined) {
        state.transactions = action.payload.transactions;
      }
      persistWallet(state);
    },
  },
});

export const { initWallet, deductTokens, addTokens, setActiveWalletUser, syncWalletFromServer } =
  walletSlice.actions;
export default walletSlice.reducer;

export const selectTokenBalance = (state: RootState) => state.wallet.tokenBalance;
export const selectTransactions = (state: RootState) => state.wallet.transactions;
