import React, { useState } from "react";
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, LinearProgress } from "@mui/material";
import AppButton from "../../../components/ui/AppButton";
import AppCard from "../../../components/ui/AppCard";
import { useValidateImportMutation, useCreateImportMutation } from "../../../redux/api/adminApiSlice";

const BulkImportDialog: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validateImport] = useValidateImportMutation();
  const [createImport] = useCreateImportMutation();

  const handleFileChange = async (f: File | null) => {
    setFile(f);
    setPreview(null);
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    setIsLoading(true);
    try {
      const res: any = await validateImport(fd).unwrap();
      setPreview(res?.data ?? res);
    } catch (err) {
      setPreview({ error: err });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChoose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    handleFileChange(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setIsLoading(true);
    try {
      await createImport(fd).unwrap();
      onClose();
    } catch (err) {
      console.error(err);
      // show error toast in parent if needed
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Bulk Import Users</DialogTitle>
      <DialogContent>
        <AppCard>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <input type="file" accept=".csv" onChange={handleChoose} />
            {isLoading && <LinearProgress />}
            {preview && (
              <Box>
                <Typography variant="subtitle2">Preview</Typography>
                <pre style={{ maxHeight: 240, overflow: "auto" }}>{JSON.stringify(preview, null, 2)}</pre>
              </Box>
            )}
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              CSV should include: firstName,lastName,email,phone,role
            </Typography>
          </Box>
        </AppCard>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <AppButton onClick={handleSubmit} disabled={!file || isLoading}>
          Create Accounts
        </AppButton>
      </DialogActions>
    </Dialog>
  );
};

export default BulkImportDialog;
