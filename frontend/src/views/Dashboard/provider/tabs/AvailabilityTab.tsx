import { useEffect, useState } from "react";
import { Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import AppButton from "../../../../components/ui/AppButton";
import AppCard from "../../../../components/ui/AppCard";
import {
  toEntityArray,
  useBlockRoomDatesMutation,
  useGetRoomAvailabilityQuery,
} from "../../../../redux/api/providerApiSlice";

type AvailabilityTabProps = {
  rooms: any[];
};

const getRoomId = (room: any) => room?._id || room?.id;

const AvailabilityTab = ({ rooms }: AvailabilityTabProps) => {
  const [form, setForm] = useState({ roomId: "", startDate: "", endDate: "", reason: "" });
  const [check, setCheck] = useState({ roomId: "", checkIn: "", checkOut: "" });
  const [blockRoomDates, { isLoading }] = useBlockRoomDatesMutation();
  const { data, isFetching } = useGetRoomAvailabilityQuery(check, {
    skip: !check.roomId || !check.checkIn || !check.checkOut,
  });
  const availability = data?.data || data || {};

  useEffect(() => {
    const firstRoomId = getRoomId(rooms[0]) || "";
    setForm((current) => ({ ...current, roomId: current.roomId || firstRoomId }));
    setCheck((current) => ({ ...current, roomId: current.roomId || firstRoomId }));
  }, [rooms]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={5}>
        <AppCard elevation="flat" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Block Dates</Typography>
          <Stack spacing={2}>
            <TextField select label="Room" value={form.roomId} onChange={(event) => setForm({ ...form, roomId: event.target.value })}>
              {rooms.map((room) => <MenuItem key={getRoomId(room)} value={getRoomId(room)}>{room?.name}</MenuItem>)}
            </TextField>
            <TextField type="date" label="Start" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField type="date" label="End" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
            <AppButton
              variant="contained"
              disabled={isLoading || !form.roomId || !form.startDate || !form.endDate}
              onClick={() => blockRoomDates({ roomId: form.roomId, payload: { startDate: form.startDate, endDate: form.endDate, reason: form.reason } })}
            >
              {isLoading ? "Saving..." : "Block Dates"}
            </AppButton>
          </Stack>
        </AppCard>
      </Grid>
      <Grid item xs={12} md={7}>
        <AppCard elevation="flat" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Availability Checker</Typography>
          <Stack spacing={2}>
            <TextField select label="Room" value={check.roomId} onChange={(event) => setCheck({ ...check, roomId: event.target.value })}>
              {rooms.map((room) => <MenuItem key={getRoomId(room)} value={getRoomId(room)}>{room?.name}</MenuItem>)}
            </TextField>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth type="date" label="Check in" value={check.checkIn} onChange={(event) => setCheck({ ...check, checkIn: event.target.value })} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth type="date" label="Check out" value={check.checkOut} onChange={(event) => setCheck({ ...check, checkOut: event.target.value })} InputLabelProps={{ shrink: true }} />
              </Grid>
            </Grid>
            <Typography>{isFetching ? "Checking..." : availability?.isAvailable === false ? "Unavailable" : availability?.isAvailable === true ? "Available" : "Select dates to check."}</Typography>
            <Typography variant="body2" color="text.secondary">
              Booked ranges: {toEntityArray(availability, ["bookedRanges"]).length} · Blocked ranges: {toEntityArray(availability, ["blockedRanges"]).length}
            </Typography>
          </Stack>
        </AppCard>
      </Grid>
    </Grid>
  );
};

export default AvailabilityTab;
