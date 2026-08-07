import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import AppButton from "../../../../components/ui/AppButton";

type DeclineDialogProps = {
  open: boolean;
  onDecline: (reason: string) => void;
  onClose: () => void;
  loading?: boolean;
};

const DeclineDialog = ({ open, onDecline, onClose, loading }: DeclineDialogProps) => {
  const [reason, setReason] = useState("");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    PaperProps={{ sx: { borderRadius: "20px", p: 1 } }}
    >
      <DialogTitle>Decline Booking</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <AppButton
          color="error"
          variant="outlined"
          disabled={loading}
          onClick={() => onDecline(reason)}
        >
          {loading ? "Declining..." : "Decline"}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
};

export default DeclineDialog;
