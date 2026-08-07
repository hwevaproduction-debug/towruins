import { useState, useMemo, useEffect } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
  CircularProgress,
} from "@mui/material";
import AppButton from "../ui/AppButton";
import useTypedSelector from "../../hooks/useTypedSelector";
import { selectTokenBalance } from "../../redux/wallet/walletSlice";
import { useRestoreListingMutation, useGetRestorationConfigQuery } from "../../redux/api/listingApiSlice";

type RestorationOption = {
  days: number;
  label: string;
};

type ListingRestoreModalProps = {
  open: boolean;
  listingId: string | null;
  listingName: string;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

const ListingRestoreModal = ({
  open,
  listingId,
  listingName,
  onClose,
  onSuccess,
}: ListingRestoreModalProps) => {
  const [selectedDays, setSelectedDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tokenBalance = useTypedSelector(selectTokenBalance);
  const [restoreListing] = useRestoreListingMutation();

  const { data: configData, isLoading: isLoadingConfig } = useGetRestorationConfigQuery(undefined, {
    skip: !open,
  });

  const restorationOptions: RestorationOption[] = configData?.data?.durations || [
    { days: 1, label: "1 day" },
    { days: 3, label: "3 days" },
    { days: 7, label: "7 days" },
    { days: 14, label: "14 days" },
  ];

  const minTokensPerDay = configData?.data?.minTokensPerDay || 1;
  const tokensToDeduct = selectedDays * minTokensPerDay;
  const afterBalance = useMemo(() => tokenBalance - tokensToDeduct, [tokensToDeduct, tokenBalance]);
  const canConfirm = Boolean(listingId) && !isSubmitting && afterBalance >= 0;

  const handleConfirm = async () => {
    if (!listingId || afterBalance < 0) return;

    setIsSubmitting(true);
    try {
      await restoreListing({ id: listingId, days: selectedDays }).unwrap();
      await onSuccess();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDaysChange = (event: any) => {
    setSelectedDays(Number(event.target.value));
  };

  useEffect(() => {
    if (open && restorationOptions.length > 0) {
      setSelectedDays(restorationOptions[0].days);
    }
  }, [open, restorationOptions]);

  if (isLoadingConfig) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Restore Listing</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedOption = restorationOptions.find((o) => o.days === selectedDays) || restorationOptions[0];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Restore Listing</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{listingName}</Typography>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              Restore this expired listing using TR tokens.
            </Typography>
          </Box>

          <Box>
            <FormControl fullWidth>
              <InputLabel>Restoration Duration</InputLabel>
              <Select
                value={selectedDays}
                label="Restoration Duration"
                onChange={handleDaysChange}
              >
                {restorationOptions.map((option) => (
                  <MenuItem key={option.days} value={option.days}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>
              Cost Preview
            </Typography>
            <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1 }}>
              {tokensToDeduct} TR token{minTokensPerDay > 1 ? "s" : ""} for {selectedOption.label}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: "rgba(31,77,58,0.06)",
            }}
          >
            <Typography sx={{ fontSize: 13 }}>
              Your balance: {tokenBalance} TR → After:{" "}
              <Box
                component="span"
                sx={{ color: afterBalance < 0 ? "#dc2626" : "inherit", fontWeight: 800 }}
              >
                {afterBalance} TR
              </Box>
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <AppButton variant="outlined" onClick={onClose}>
          Cancel
        </AppButton>
        <AppButton
          onClick={handleConfirm}
          disabled={!canConfirm}
          loading={isSubmitting}
          sx={{ background: "#1F4D3A", color: "#fff", "&:hover": { background: "#173B2C" } }}
        >
          Confirm
        </AppButton>
      </DialogActions>
    </Dialog>
  );
};

export default ListingRestoreModal;