import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import AppButton from "../../../../components/ui/AppButton";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
};

const ConfirmDialog = ({
  open,
  title,
  message,
  onConfirm,
  onClose,
  loading,
}: ConfirmDialogProps) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="xs"
    PaperProps={{ sx: { borderRadius: "20px", p: 1 } }}
  >
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText>{message}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <AppButton onClick={onConfirm} disabled={loading}>
        {loading ? "Working..." : "Confirm"}
      </AppButton>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
