import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import useTypedSelector from "../../../hooks/useTypedSelector";
import AppButton from "../../../components/ui/AppButton";
import TokenExplainerModal from "../../../components/wallet/TokenExplainerModal";
import { selectTokenBalance } from "../../../redux/wallet/walletSlice";
import { getAuthUserId } from "../../../redux/auth/authSlice";

const STORAGE_KEY = "tr_token_onboarding_seen";

const TRTokenOnboarding = () => {
  const tokenBalance = useTypedSelector(selectTokenBalance);
  const userId = useTypedSelector((state) => getAuthUserId(state.auth?.user));
  const [visible, setVisible] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const storageKey = userId ? `${STORAGE_KEY}:${userId}` : null;

  useEffect(() => {
    setVisible(storageKey ? localStorage.getItem(storageKey) !== "true" : false);
  }, [storageKey]);

  const handleDismiss = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, "true");
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <Box
        sx={{
          borderLeft: "4px solid #B8975A",
          background:
            "linear-gradient(135deg, rgba(184,151,90,0.12), rgba(184,151,90,0.04))",
          borderRadius: "16px",
          p: 2.5,
          mb: 3,
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 2,
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Box sx={{ fontSize: "28px", lineHeight: 1 }}>{"\u{1FA99}"}</Box>
          <Box>
            <Box sx={{ fontWeight: 800, color: "text.primary" }}>
              You have TR Tokens
            </Box>
            <Box sx={{ color: "text.secondary", fontSize: "14px", mt: 0.5 }}>
              TR Tokens power your interactions on Town Ruins. Balance: {tokenBalance} TR.
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <AppButton variant="outlined" size="small" onClick={() => setExplainerOpen(true)}>
            Learn how tokens work {"\u2192"}
          </AppButton>
          <AppButton size="small" onClick={handleDismiss}>
            Got it {"\u2713"}
          </AppButton>
        </Box>
      </Box>
      <TokenExplainerModal
        open={explainerOpen}
        onClose={() => setExplainerOpen(false)}
      />
    </>
  );
};

export default TRTokenOnboarding;
