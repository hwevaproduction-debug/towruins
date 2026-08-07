import { useState } from "react";
import { Box, Dialog, DialogActions, DialogContent, Fade, IconButton } from "@mui/material";
import { Coins, CreditCard, Gift, X } from "lucide-react";
import AppButton from "../ui/AppButton";

type TokenExplainerModalProps = {
  open: boolean;
  onClose: () => void;
};

const slides = [
  {
    title: "What are TR Tokens?",
    icon: <Coins size={48} color="#B8975A" />,
    body: "TR Tokens are Town Ruins' in-app currency. They power premium interactions on the platform.",
  },
  {
    title: "How do you get them?",
    icon: <Gift size={48} color="#B8975A" />,
    body: "Every new account starts with 100 TR free. Buy more anytime from your wallet.",
  },
  {
    title: "What do they unlock?",
    cards: ["Contact Landlords - 5 TR", "Approve Tenants - 5 TR", "Featured Listings - coming soon"],
  },
  {
    title: "Purchasing",
    icon: <CreditCard size={48} color="#B8975A" />,
    body: "$10 = 100 TR. Secure, instant, no subscription required.",
  },
];

const TokenExplainerModal = ({ open, onClose }: TokenExplainerModalProps) => {
  const [step, setStep] = useState(0);
  const slide = slides[step];

  const handleClose = () => {
    setStep(0);
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
          background: "rgba(15,20,30,0.95)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "24px",
          color: "#fff",
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 3, md: 4 }, minHeight: 330 }}>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <IconButton onClick={handleClose} size="small" sx={{ color: "#fff" }}>
            <X size={18} />
          </IconButton>
        </Box>
        <Fade in key={step} timeout={250}>
          <Box sx={{ textAlign: "center" }}>
            {slide.icon ? <Box sx={{ mb: 2 }}>{slide.icon}</Box> : null}
            <Box sx={{ fontSize: "28px", fontWeight: 800, mb: 1 }}>
              {slide.title}
            </Box>
            {slide.body ? (
              <Box sx={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
                {slide.body}
              </Box>
            ) : null}
            {slide.cards ? (
              <Box sx={{ display: "grid", gap: 1.25, mt: 3 }}>
                {slide.cards.map((card) => (
                  <Box
                    key={card}
                    sx={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "14px",
                      p: 1.5,
                      fontWeight: 700,
                    }}
                  >
                    {card}
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>
        </Fade>
      </DialogContent>
      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.75, pb: 2 }}>
        {slides.map((item, index) => (
          <Box
            key={item.title}
            sx={{
              width: index === step ? 18 : 8,
              height: 8,
              borderRadius: "999px",
              background: index === step ? "#B8975A" : "rgba(255,255,255,0.3)",
              transition: "all 0.2s ease",
            }}
          />
        ))}
      </Box>
      <DialogActions sx={{ px: 3, pb: 3, justifyContent: "space-between" }}>
        <AppButton
          variant="outlined"
          disabled={step === 0}
          onClick={() => setStep((value) => Math.max(value - 1, 0))}
        >
          Back
        </AppButton>
        {step === slides.length - 1 ? (
          <AppButton onClick={handleClose}>Got it - Open Wallet</AppButton>
        ) : (
          <AppButton onClick={() => setStep((value) => Math.min(value + 1, slides.length - 1))}>
            Next
          </AppButton>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TokenExplainerModal;
