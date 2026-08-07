import { useState } from "react";
import { Box, Collapse, IconButton, Stack, Tooltip } from "@mui/material";
import { useSelector } from "react-redux";
import AppButton from "../ui/AppButton";
import TokenExplainerModal from "./TokenExplainerModal";
import TokenPurchaseModal from "./TokenPurchaseModal";
import TransactionList from "./TransactionList";
import {
  selectTokenBalance,
  selectTransactions,
} from "../../redux/wallet/walletSlice";

type WalletCardProps = {
  compact?: boolean;
};

const WalletCard = ({ compact = false }: WalletCardProps) => {
  const tokenBalance = useSelector(selectTokenBalance);
  const transactions = useSelector(selectTransactions);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  return (
    <>
      <Box
        sx={{
          background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)",
          borderRadius: "20px",
          p: compact ? 2 : "28px",
          color: "#fff",
          boxShadow: "0 20px 60px rgba(31,77,58,0.25)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            color: "rgba(255,255,255,0.68)",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          TR TOKEN BALANCE
          <Tooltip title="How TR Tokens work">
            <IconButton
              size="small"
              onClick={() => setExplainerOpen(true)}
              sx={{
                width: 22,
                height: 22,
                color: "#B8975A",
                border: "1px solid rgba(184,151,90,0.55)",
              }}
            >
              ?
            </IconButton>
          </Tooltip>
        </Box>
        <Box
          sx={{
            color: "#B8975A",
            fontSize: compact ? "32px" : "48px",
            fontWeight: 800,
            lineHeight: 1.05,
            mt: 0.75,
          }}
        >
          {tokenBalance}
        </Box>
        <Box sx={{ color: "rgba(255,255,255,0.75)", fontSize: "14px", mt: 0.25 }}>
          TR Tokens
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
          <AppButton
            size={compact ? "small" : "medium"}
            onClick={() => setPurchaseOpen(true)}
            sx={{
              background: "#B8975A",
              color: "#fff",
              "&:hover": { background: "#9E7E45" },
            }}
          >
            Buy Tokens
          </AppButton>
          <AppButton
            size={compact ? "small" : "medium"}
            variant="outlined"
            aria-label={`Toggle ${transactions.length} wallet transactions`}
            onClick={() => setShowTransactions((value) => !value)}
            sx={{
              borderColor: "rgba(255,255,255,0.5)",
              color: "#fff",
              "&:hover": {
                borderColor: "#fff",
                background: "rgba(255,255,255,0.08)",
              },
            }}
          >
            Transactions ↓
          </AppButton>
        </Stack>
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: "14px",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.65)",
            fontSize: "12px",
            lineHeight: 1.8,
          }}
        >
          <Box sx={{ color: "#fff", fontWeight: 800, mb: 0.5 }}>
            TR Tokens unlock:
          </Box>
          <Box><Box component="span" sx={{ color: "#B8975A", fontWeight: 800 }}>{"\u2713"}</Box> Contact landlords - 5 TR</Box>
          <Box><Box component="span" sx={{ color: "#B8975A", fontWeight: 800 }}>{"\u2713"}</Box> Landlord approves contact - 5 TR (charged to tenant)</Box>
        </Box>
        <Collapse in={showTransactions}>
          <Box
            sx={{
              background: "background.paper",
              borderRadius: "14px",
              color: "text.primary",
              mt: 2,
              p: 1.5,
            }}
          >
            <TransactionList maxItems={compact ? 4 : 6} />
          </Box>
        </Collapse>
      </Box>
      <TokenPurchaseModal
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
      />
      <TokenExplainerModal
        open={explainerOpen}
        onClose={() => setExplainerOpen(false)}
      />
    </>
  );
};

export default WalletCard;
