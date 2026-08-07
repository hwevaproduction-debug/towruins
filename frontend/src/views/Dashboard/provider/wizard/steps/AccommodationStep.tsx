import { useEffect, useRef, useState } from "react";
import { Button, Grid, MenuItem, Stack, TextField } from "@mui/material";
import { toEntityObject, useGetMyAccommodationQuery, useUpdateAccommodationMutation } from "../../../../../redux/api/providerApiSlice";

type AccommodationStepProps = {
  accommodationId: string;
  onNext: () => void;
  initialValues?: Record<string, any>;
  onDataChange?: (data: any) => void;
};

const AccommodationStep = ({ accommodationId, onNext, initialValues = {}, onDataChange }: AccommodationStepProps) => {
  const { data } = useGetMyAccommodationQuery(undefined);
  const accommodation = toEntityObject(data, ["accommodation"]);
  const [updateAccommodation, { isLoading }] = useUpdateAccommodationMutation();
  const [form, setForm] = useState({ name: "", type: "HOTEL", description: "", province: "", city: "", addressLine: "", contactPhone: "", timezone: "Africa/Harare", ...initialValues });
  const hydratedForm = useRef(false);

  useEffect(() => {
    if (hydratedForm.current || (!accommodation && !Object.keys(initialValues).length)) {
      return;
    }
    hydratedForm.current = true;
    setForm((current) => ({
      name: accommodation?.name || initialValues.name || current.name || "",
      type: accommodation?.type || initialValues.type || current.type || "HOTEL",
      description: accommodation?.description || initialValues.description || current.description || "",
      province: accommodation?.province || initialValues.province || current.province || "",
      city: accommodation?.city || initialValues.city || current.city || "",
      addressLine: accommodation?.addressLine || initialValues.addressLine || current.addressLine || "",
      contactPhone: accommodation?.contactPhone || initialValues.contactPhone || current.contactPhone || "",
      timezone: accommodation?.timezone || initialValues.timezone || current.timezone || "Africa/Harare",
    }));
  }, [accommodation, initialValues]);

  useEffect(() => {
    onDataChange?.(form);
  }, [form, onDataChange]);

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}><TextField fullWidth label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Grid>
        <Grid item xs={12} md={4}><TextField fullWidth select label="Type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{["HOTEL", "LODGE", "BNB", "APARTMENT", "GUEST_HOUSE", "HOSTEL"].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Grid>
        <Grid item xs={12} md={4}><TextField fullWidth label="Province" value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} /></Grid>
        <Grid item xs={12} md={4}><TextField fullWidth label="City" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Grid>
        <Grid item xs={12} md={4}><TextField fullWidth label="Phone" value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} /></Grid>
        <Grid item xs={12} md={8}><TextField fullWidth label="Address" value={form.addressLine} onChange={(event) => setForm({ ...form, addressLine: event.target.value })} /></Grid>
        <Grid item xs={12} md={4}><TextField fullWidth label="Timezone" value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} /></Grid>
      </Grid>
      <Button variant="contained" disabled={isLoading} onClick={async () => { await updateAccommodation({ id: accommodationId, payload: form }).unwrap(); onNext(); }}>Next</Button>
    </Stack>
  );
};

export default AccommodationStep;
