import { Box, Stack } from "@mui/material";
import { useSelector } from "react-redux";
import { useGetWalletTransactionsQuery } from "../../redux/api/walletApiSlice";
import { selectTransactions } from "../../redux/wallet/walletSlice";

type TransactionListProps = {
  maxItems?: number;
};

const reasonLabels: Record<string, string> = {
  welcome_bonus: "Welcome Bonus",
  engagement_charge: "Engagement Fee",
  listing_activation: "Listing Activation",
  listing_renewal: "Listing Renewal",
  premium_access: "Premium Membership",
  token_purchase: "Token Purchase",
  refund: "Refund",
  promo_grant: "Promo Grant",
};

const formatTimestamp = (timestamp: string) =>
  new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const TransactionList = ({ maxItems = 10 }: TransactionListProps) => {
  const localTransactions = useSelector(selectTransactions);
  const { data } = useGetWalletTransactionsQuery({ limit: maxItems * 2 });
  const serverTransactions = data?.data?.transactions;
  const transactions = Array.isArray(serverTransactions) ? serverTransactions : localTransactions;

  const visibleTransactions = [...transactions]
    .sort((left, right) => {
      const leftTime = new Date((left as any).createdAt || (left as any).timestamp).getTime();
      const rightTime = new Date((right as any).createdAt || (right as any).timestamp).getTime();
      return rightTime - leftTime;
    })
    .slice(0, maxItems);

  if (visibleTransactions.length === 0) {
    return (
      <Box sx={{ color: "text.secondary", fontSize: "14px", py: 1 }}>
        No transactions yet
      </Box>
    );
  }

  return (
    <Stack spacing={1}>
      {visibleTransactions.map((transaction: any) => {
        const isCredit = transaction.type === "CREDIT";
        const reason = transaction.reason || "";
        const reasonLabel = reasonLabels[reason] || reason || transaction.label;
        const timestamp = transaction.createdAt || transaction.timestamp;

        return (
          <Box
            key={transaction.id}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              borderBottom: "1px solid rgba(148,163,184,0.2)",
              pb: 1,
              "&:last-child": {
                borderBottom: 0,
                pb: 0,
              },
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ fontWeight: 700, fontSize: "14px" }}>{transaction.label}</Box>
              <Box
                sx={{
                  fontSize: "10px",
                  borderRadius: "999px",
                  padding: "1px 7px",
                  background: "rgba(184,151,90,0.15)",
                  color: "#B8975A",
                  fontWeight: 700,
                  display: "inline-block",
                  mt: 0.25,
                }}
              >
                {reasonLabel}
              </Box>
              <Box sx={{ color: "text.secondary", fontSize: "12px", mt: 0.5 }}>
                {formatTimestamp(timestamp)}
              </Box>
              <Box sx={{ color: "text.secondary", fontSize: "12px", mt: 0.25 }}>
                Balance: {transaction.balanceAfter ?? "—"} TR
              </Box>
            </Box>
            <Box
              sx={{
                color: isCredit ? "success.main" : "error.main",
                fontWeight: 800,
                fontSize: "14px",
                whiteSpace: "nowrap",
              }}
            >
              {isCredit ? "+" : "−"}
              {transaction.amount} TR
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
};

export default TransactionList;
