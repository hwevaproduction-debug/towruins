import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  selectTokenBalance,
  selectTransactions,
} from "../redux/wallet/walletSlice";

type TokenToast = {
  message: string;
  appearence: boolean;
  type: "success" | "info" | "warning";
};

const useTokenNotifications = () => {
  const transactions = useSelector(selectTransactions);
  const tokenBalance = useSelector(selectTokenBalance);
  const previousTransactionCountRef = useRef(transactions.length);
  const previousTokenBalanceRef = useRef(tokenBalance);
  const [toast, setToast] = useState<TokenToast>({
    message: "",
    appearence: false,
    type: "info",
  });

  useEffect(() => {
    const previousCount = previousTransactionCountRef.current;
    const previousBalance = previousTokenBalanceRef.current;
    const countIncreased = transactions.length > previousCount;
    const balanceChanged = tokenBalance !== previousBalance;

    if (countIncreased) {
      const latestTransaction = transactions[transactions.length - 1];
      if (latestTransaction?.type === "CREDIT") {
        setToast({
          message: `\u2713 +${latestTransaction.amount} TR Tokens added`,
          appearence: true,
          type: "success",
        });
      } else if (latestTransaction?.type === "DEBIT") {
        setToast({
          message: `\u2212${latestTransaction.amount} TR used for ${latestTransaction.label}`,
          appearence: true,
          type: "info",
        });
      }
    }

    if (tokenBalance < 20 && balanceChanged) {
      setToast({
        message: "\u26A0 Low TR balance \u2014 top up to continue engaging",
        appearence: true,
        type: "warning",
      });
    }

    previousTransactionCountRef.current = transactions.length;
    previousTokenBalanceRef.current = tokenBalance;
  }, [tokenBalance, transactions]);

  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, appearence: false }));
  };

  return { toast, handleCloseToast };
};

export default useTokenNotifications;
