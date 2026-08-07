import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from "@mui/material";
import { CheckCircle2, X } from "lucide-react";
import AppButton from "../ui/AppButton";
import ToastAlert from "../ToastAlert/ToastAlert";
import TokenPurchaseModal from "../wallet/TokenPurchaseModal";
import { useCreateEngagementMutation } from "../../redux/api/engagementApiSlice";
import {
  deductTokens,
  selectTokenBalance,
} from "../../redux/wallet/walletSlice";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  listing: {
    id: string;
    name: string;
    monthlyRent?: number;
    imageUrls?: string[];
  };
}

const ContactModal = ({ open, onClose, listing }: ContactModalProps) => {
  const dispatch = useDispatch();
  const tokenBalance = useSelector(selectTokenBalance);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [insufficientTokens, setInsufficientTokens] = useState(false);
  const [toast, setToast] = useState({
    message: "",
    appearence: false,
    type: "",
  });
  const [createEngagement, { isLoading }] = useCreateEngagementMutation();

  const image = useMemo(
    () => (Array.isArray(listing?.imageUrls) ? listing.imageUrls[0] : undefined),
    [listing?.imageUrls]
  );

  useEffect(() => {
    if (!open) {
      setMessage("");
      setSubmitted(false);
      setInsufficientTokens(false);
    }
  }, [open]);

  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, appearence: false }));
  };

  const handleSubmit = async () => {
    if (tokenBalance < 5) {
      setInsufficientTokens(true);
      return;
    }

    try {
      await createEngagement({
        listingId: listing.id,
        message,
      }).unwrap();
      dispatch(
        deductTokens({
          amount: 5,
          label: `Contacted landlord — ${listing.name}`,
        })
      );
      setSubmitted(true);
    } catch (error: any) {
      setToast({
        message:
          error?.data?.message || error?.message || "Unable to send message.",
        appearence: true,
        type: "error",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            fontWeight: 800,
          }}
        >
          <Box>Reach Out to Landlord</Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label="5 TR"
              size="small"
              sx={{ background: "#D1EAE0", color: "#1F4D3A", fontWeight: 800 }}
            />
            <IconButton onClick={onClose} aria-label="Close">
              <X size={18} />
            </IconButton>
          </Box>
        </DialogTitle>
        {submitted ? (
          <DialogContent>
            <Box
              sx={{
                py: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 1.5,
              }}
            >
              <CheckCircle2 size={54} color="#1F4D3A" />
              <Box sx={{ fontSize: "24px", fontWeight: 800 }}>Message sent!</Box>
              <Box sx={{ color: "text.secondary" }}>
                The landlord will be notified and will respond soon.
              </Box>
              <AppButton sx={{ mt: 1 }} onClick={onClose}>
                Close
              </AppButton>
            </Box>
          </DialogContent>
        ) : (
          <>
            <DialogContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  mb: 2,
                  p: 1.25,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "12px",
                }}
              >
                <Box
                  component="img"
                  src={image || "/app-logo.png"}
                  alt={listing.name}
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "10px",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                    {listing.name}
                  </Box>
                  {listing.monthlyRent ? (
                    <Box sx={{ color: "#B8975A", fontWeight: 700, mt: 0.5 }}>
                      USD {listing.monthlyRent.toLocaleString()} / month
                    </Box>
                  ) : null}
                </Box>
              </Box>
              <TextField
                fullWidth
                multiline
                minRows={4}
                maxRows={8}
                label="Your message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                inputProps={{ maxLength: 500 }}
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#B8975A",
                  },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#B8975A" },
                }}
              />
              <Box
                sx={{
                  textAlign: "right",
                  fontSize: "12px",
                  color: "text.secondary",
                  mt: 0.75,
                }}
              >
                {message.length} / 500
              </Box>
              <Box
                sx={{
                  background: "#F0F7F4",
                  borderRadius: "10px",
                  p: "12px",
                  color: "#1F4D3A",
                  fontSize: "13px",
                  mt: 1.5,
                }}
              >
                Your contact details are kept private. Address and contact are
                shared only after the landlord approves your request.
              </Box>
              {insufficientTokens ? (
                <Box
                  sx={{
                    color: "#991B1B",
                    background: "#FEE2E2",
                    borderRadius: "10px",
                    p: "12px",
                    fontSize: "13px",
                    mt: 1.5,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Box>You need at least 5 TR Tokens to contact a landlord.</Box>
                  <AppButton size="small" onClick={() => setPurchaseOpen(true)}>
                    Buy Tokens
                  </AppButton>
                </Box>
              ) : null}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <AppButton
                fullWidth
                disabled={message.trim().length < 10 || isLoading}
                loading={isLoading}
                onClick={handleSubmit}
              >
                Send Message
              </AppButton>
            </DialogActions>
          </>
        )}
      </Dialog>
      <ToastAlert
        appearence={toast.appearence}
        type={toast.type}
        message={toast.message}
        handleClose={handleCloseToast}
      />
      <TokenPurchaseModal
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
      />
    </>
  );
};

export default ContactModal;
