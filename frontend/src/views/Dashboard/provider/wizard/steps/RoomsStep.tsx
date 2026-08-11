import { useState } from "react";
import { Button, Grid, MenuItem, Paper, Stack, TextField, Typography, Box, Chip, Tooltip } from "@mui/material";
import { toEntityArray, useCreateRoomMutation, useGetMyRoomsQuery } from "../../../../../redux/api/providerApiSlice";

type RoomsStepProps = {
  accommodationId: string;
  onNext: () => void;
  onBack: () => void;
};

const RoomsStep = ({ accommodationId, onNext, onBack }: RoomsStepProps) => {
  const { data } = useGetMyRoomsQuery(undefined);
  const rooms: any[] = toEntityArray(data, ["rooms", "data"]);
  const [createRoom] = useCreateRoomMutation();
  const [form, setForm] = useState({ name: "", roomType: "DOUBLE", capacity: "2", basePricePerNight: "", bookingMode: "INSTANT" });

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6">Property details</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Tell guests what your property offers. Name and Price are required before creating a room.
        </Typography>
      </Box>
      {rooms.map((room) => <Paper key={room?._id || room?.id} variant="outlined" sx={{ p: 1.5 }}><Typography fontWeight={700}>{room?.name}</Typography><Typography variant="body2">{room?.roomType} · {room?.capacity} guests</Typography></Paper>)}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}><TextField fullWidth label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Grid>
        <Grid item xs={12} md={2}><TextField fullWidth select label="Type" value={form.roomType} onChange={(event) => setForm({ ...form, roomType: event.target.value })}>{["SINGLE", "DOUBLE", "TWIN", "SUITE", "DORMITORY", "STUDIO", "ENTIRE_UNIT"].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={2}><TextField fullWidth type="number" label="Capacity" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></Grid>
        <Grid item xs={12} md={2}><TextField fullWidth type="number" label="Price" value={form.basePricePerNight} onChange={(event) => setForm({ ...form, basePricePerNight: event.target.value })} /></Grid>
        <Grid item xs={12} md={2}><TextField fullWidth select label="Booking" value={form.bookingMode} onChange={(event) => setForm({ ...form, bookingMode: event.target.value })}><MenuItem value="INSTANT">INSTANT</MenuItem><MenuItem value="REQUEST">REQUEST</MenuItem></TextField></Grid>
      </Grid>
      <Stack direction="row" spacing={1}>
        <Button onClick={onBack}>Back</Button>
        <Button variant="outlined" disabled={!form.name || !form.basePricePerNight} onClick={async () => { await createRoom({ ...form, capacity: Number(form.capacity), basePricePerNight: Number(form.basePricePerNight), accommodationId }).unwrap(); setForm({ ...form, name: "", basePricePerNight: "" }); }}>Add Room</Button>
        <Button variant="contained" onClick={onNext}>Next</Button>
      </Stack>
    </Stack>
  );
};

export default RoomsStep;
