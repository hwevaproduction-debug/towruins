import { useEffect, useRef, useState } from "react";
import { Box, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useDispatch } from "react-redux";
import AppButton from "../ui/AppButton";
import { addTokens } from "../../redux/wallet/walletSlice";

type TokenPurchaseModalProps = {
  open: boolean;
  onClose: () => void;
};

const TOKEN_TIERS = [
  { label: "$5", tokens: 50, description: "50 TR Tokens" },
  { label: "$10", tokens: 100, description: "100 TR Tokens" },
  { label: "$25", tokens: 300, description: "300 TR Tokens" },
];

const TokenPurchaseModal = ({ open, onClose }: TokenPurchaseModalProps) => {
  const dispatch = useDispatch();
  const [selectedTier, setSelectedTier] = useState(TOKEN_TIERS[1]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const paymentTimeoutRef = useRef<number | null>(null);
  const successTimeoutRef = useRef<number | null>(null);
  const activePurchaseRef = useRef(false);

  const clearPurchaseTimers = () => {
    if (paymentTimeoutRef.current !== null) {
      window.clearTimeout(paymentTimeoutRef.current);
      paymentTimeoutRef.current = null;
    }

    if (successTimeoutRef.current !== null) {
      window.clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      clearPurchaseTimers();
      activePurchaseRef.current = false;
      setSelectedTier(TOKEN_TIERS[1]);
      setLoading(false);
      setSuccess(false);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      clearPurchaseTimers();
      activePurchaseRef.current = false;
    };
  }, []);

  const handlePayment = () => {
    if (loading || success) return;

    clearPurchaseTimers();
    activePurchaseRef.current = true;
    setLoading(true);

    paymentTimeoutRef.current = window.setTimeout(() => {
      paymentTimeoutRef.current = null;

      if (!activePurchaseRef.current) return;

      dispatch(
        addTokens({
          amount: selectedTier.tokens,
          label: `Token purchase \u2014 ${selectedTier.label} (${selectedTier.tokens} TR)`,
        })
      );
      setLoading(false);
      setSuccess(true);

      successTimeoutRef.current = window.setTimeout(() => {
        successTimeoutRef.current = null;
        activePurchaseRef.current = false;
        setSuccess(false);
        onClose();
      }, 1500);
    }, 1500);
  };

  const handleClose = () => {
    if (loading || success) return;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: "rgba(15,20,30,0.92)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "24px",
          color: "#fff",
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, color: "#fff" }}>
        Buy TR Tokens
      </DialogTitle>
      <DialogContent>
        <Box sx={{ color: "rgba(255,255,255,0.68)", fontSize: "13px", mb: 2 }}>
          Select a package. Demo payment completes instantly after confirmation.
        </Box>
        <Box sx={{ display: "grid", gap: 1.5 }}>
          {TOKEN_TIERS.map((tier) => {
            const selected = selectedTier.label === tier.label;
            return (
              <Box
                key={tier.label}
                onClick={() => !loading && !success && setSelectedTier(tier)}
                sx={{
                  border: "2px solid",
                  borderColor: selected ? "#B8975A" : "rgba(255,255,255,0.12)",
                  borderRadius: "16px",
                  p: 2,
                  cursor: loading || success ? "default" : "pointer",
                  background: selected
                    ? "rgba(184,151,90,0.12)"
                    : "rgba(255,255,255,0.04)",
                  transition: "all 0.2s ease",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Box sx={{ fontWeight: 800, fontSize: "22px", color: "#B8975A" }}>
                    {tier.label}
                  </Box>
                  <Box sx={{ color: "#fff", fontWeight: 800 }}>
                    {tier.tokens} TR
                  </Box>
                </Box>
                <Box sx={{ color: "rgba(255,255,255,0.66)", fontSize: "13px", mt: 0.5 }}>
                  {tier.description}
                </Box>
              </Box>
            );
          })}
        </Box>
        {success ? (
          <Box
            sx={{
              background: "rgba(209,234,224,0.14)",
              border: "1px solid rgba(184,151,90,0.4)",
              borderRadius: "12px",
              color: "#D1EAE0",
              fontWeight: 800,
              p: 2,
              textAlign: "center",
              mt: 2,
            }}
          >
            {"\u2713"} {selectedTier.tokens} TR Tokens added!
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <AppButton variant="outlined" disabled={loading || success} onClick={handleClose}>
          Cancel
        </AppButton>
        <AppButton loading={loading} disabled={loading || success} onClick={handlePayment}>
          Pay {selectedTier.label} (Demo)
        </AppButton>
      </DialogActions>
    </Dialog>
  );
};

export default TokenPurchaseModal;
