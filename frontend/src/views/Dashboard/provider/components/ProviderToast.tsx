import { Alert, Snackbar } from "@mui/material";

type ProviderToastProps = {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info";
  onClose: () => void;
};

const ProviderToast = ({ open, message, severity, onClose }: ProviderToastProps) => (
  <Snackbar open={open} autoHideDuration={4000} onClose={onClose}>
    <Alert onClose={onClose} severity={severity} variant="filled" sx={{ width: "100%" }}>
      {message}
    </Alert>
  </Snackbar>
);

export default ProviderToast;
