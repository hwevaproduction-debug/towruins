import React, { useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, CircularProgress, Typography } from "@mui/material";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { useGetProvidersQuery } from "../../../redux/api/adminApiSlice";
import { useGetR2SignedUrlMutation } from "../../../redux/api/uploadApiSlice";
import { useCreateTemporaryStayMutation } from "../../../redux/api/adminStayApiSlice";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const validationSchema = Yup.object().shape({
  providerId: Yup.string().required("Provider is required"),
  name: Yup.string().required("Title is required"),
  basePricePerNight: Yup.number().required("Price is required").min(0),
  capacity: Yup.number().nullable(),
});

const AdminTemporaryStayForm: React.FC<Props> = ({ onClose, onCreated }) => {
  const { data: providersData } = useGetProvidersQuery();
  const providers = providersData?.data || [];
  const [getR2SignedUrl] = useGetR2SignedUrlMutation();
  const [createTempStay, { isLoading: isCreating }] = useCreateTemporaryStayMutation();
  const [uploading, setUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const initialValues = {
    providerId: "",
    name: "",
    description: "",
    basePricePerNight: "",
    capacity: "",
    roomType: "",
    bookingMode: "",
    minNights: "",
    maxNights: "",
    images: [] as string[],
  } as any;

  const uploadImages = async (files: File[]) => {
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const result = await getR2SignedUrl({ contentType: file.type, folder: "listings" }).unwrap();
        const putRes = await fetch(result.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!putRes.ok) throw new Error("R2 upload failed");
        urls.push(result.publicUrl);
      }
      return urls;
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setError(null);
          try {
            // Need provider
            if (!values.providerId) {
              setError("Provider is required");
              setSubmitting(false);
              return;
            }

            let imageUrls: string[] = [];
            if (imageFiles.length > 0) {
              imageUrls = await uploadImages(imageFiles);
            }

            const payload: any = {
              providerId: values.providerId,
              name: values.name,
              description: values.description,
              basePricePerNight: Number(values.basePricePerNight),
              capacity: values.capacity ? Number(values.capacity) : undefined,
              roomType: values.roomType || undefined,
              bookingMode: values.bookingMode || undefined,
              minNights: values.minNights ? Number(values.minNights) : undefined,
              maxNights: values.maxNights ? Number(values.maxNights) : undefined,
              images: imageUrls,
            };

            await createTempStay(payload).unwrap();
            onCreated();
            onClose();
          } catch (err: any) {
            setError(err?.data?.message || err?.message || "Unable to create temporary stay");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ values, handleChange, handleBlur, isSubmitting }) => (
          <Form>
            <DialogTitle>Create Temporary Stay</DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 480 }}>
              <TextField select label="Provider" name="providerId" value={values.providerId} onChange={handleChange} onBlur={handleBlur} size="small">
                {providers.map((p: any) => (
                  <MenuItem key={p._id} value={p._id}>{p.username} {p.email ? `(${p.email})` : ""}</MenuItem>
                ))}
              </TextField>

              <TextField label="Title" name="name" value={values.name} onChange={handleChange} onBlur={handleBlur} size="small" />
              <TextField label="Description" name="description" value={values.description} onChange={handleChange} onBlur={handleBlur} size="small" multiline minRows={3} />
              <TextField label="Price per night" name="basePricePerNight" value={values.basePricePerNight} onChange={handleChange} onBlur={handleBlur} size="small" />
              <TextField label="Capacity" name="capacity" value={values.capacity} onChange={handleChange} onBlur={handleBlur} size="small" />

              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>Images</Typography>
                <input type="file" accept="image/*" multiple onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  setImageFiles(files);
                }} />
                {uploading && <Box sx={{ mt: 1 }}><CircularProgress size={16} /></Box>}
              </Box>

              {error ? <Typography color="error">{error}</Typography> : null}
            </DialogContent>

            <DialogActions>
              <Button onClick={onClose} disabled={isCreating || uploading || isSubmitting}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isCreating || uploading || isSubmitting}>{(isCreating || uploading || isSubmitting) ? <CircularProgress size={16} /> : "Create"}</Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Box>
  );
};

export default AdminTemporaryStayForm;
