import React, { useState } from "react";
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, LinearProgress, Table, TableHead, TableRow, TableCell, TableBody, Checkbox } from "@mui/material";
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
  const [createValidOnly, setCreateValidOnly] = useState(true);
  const [selectedValidRows, setSelectedValidRows] = useState<Record<number, boolean>>({});

  const handleFileChange = async (f: File | null) => {
    setFile(f);
    setPreview(null);
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    setIsLoading(true);
    try {
      const res: any = await validateImport(fd).unwrap();
      const previewData = res?.data ?? res;
      // initialize selection for valid rows
      const sel: Record<number, boolean> = {};
      (previewData?.valid || []).forEach((_: any, idx: number) => (sel[idx] = true));
      setSelectedValidRows(sel);
      setPreview(previewData);
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

  const downloadFailures = () => {
    const failures = preview?.invalid || [];
    if (!failures.length) return;
    // failures expected as array of { row: number, errors: [...], raw: { ... } }
    const headers = Object.keys(failures[0].raw || {});
    const rows = failures.map((f: any) => headers.map((h) => String((f.raw || {})[h] ?? "")).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk-import-failures.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    if (!file) return;
    // if creating only valid rows, send flag to backend via form
    const fd = new FormData();
    fd.append("file", file);
    if (createValidOnly) fd.append("createValidOnly", "true");
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
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">Valid rows: {preview?.valid?.length ?? 0} • Invalid rows: {preview?.invalid?.length ?? 0}</Typography>
                </Box>

                {Array.isArray(preview?.valid) && preview.valid.length > 0 && (
                  <Box sx={{ maxHeight: 220, overflow: "auto", mt: 1, border: "1px solid #eee" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">&nbsp;</TableCell>
                          {Object.keys(preview.valid[0].raw || preview.valid[0] || {}).map((h: string) => (
                            <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {preview.valid.map((row: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell padding="checkbox">
                              <Checkbox checked={!!selectedValidRows[idx]} onChange={() => setSelectedValidRows((prev) => ({ ...prev, [idx]: !prev[idx] }))} />
                            </TableCell>
                            {Object.values(row.raw || row).map((v: any, i: number) => (
                              <TableCell key={i} sx={{ fontSize: 13 }}>{String(v ?? "")}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}

                {Array.isArray(preview?.invalid) && preview.invalid.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Invalid rows</Typography>
                    <Box sx={{ maxHeight: 160, overflow: "auto", border: "1px solid #ffecec", background: "#fff6f6", p: 1 }}>
                      {preview.invalid.slice(0, 20).map((f: any, i: number) => (
                        <Box key={i} sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Row {f.row ?? (i + 1)}</Typography>
                          <Typography variant="body2" sx={{ color: "#7f1d1d" }}>{(f.errors || []).join(", ")}</Typography>
                        </Box>
                      ))}
                      {preview.invalid.length > 20 && <Typography variant="caption">Showing first 20 invalid rows</Typography>}
                      <Box sx={{ mt: 1 }}>
                        <AppButton onClick={downloadFailures} size="small">Download failures CSV</AppButton>
                      </Box>
                    </Box>
                  </Box>
                )}

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
