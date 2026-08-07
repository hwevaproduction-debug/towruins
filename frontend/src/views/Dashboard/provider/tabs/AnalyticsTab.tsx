import { useState } from "react";
import { Box, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useGetMyAnalyticsQuery } from "../../../../redux/api/providerApiSlice";
import AppCard from "../../../../components/ui/AppCard";
import StatCard from "../components/StatCard";

type AnalyticsTabProps = {
  rooms: any[];
  accommodationId: string;
};

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const getRoomId = (room: any) => room?._id || room?.id;
const formatCurrency = (value: any) => `$${Number(value || 0).toFixed(2)}`;

const BarChart = ({ data, labelKey, valueKey, suffix = "" }: any) => {
  const max = Math.max(1, ...data.map((item: any) => Number(item[valueKey] || 0)));
  return (
    <svg viewBox="0 0 520 220" width="100%" height="220" role="img">
      {data.map((item: any, index: number) => {
        const barWidth = 36;
        const gap = 24;
        const x = 36 + index * (barWidth + gap);
        const height = (Number(item[valueKey] || 0) / max) * 140;
        const y = 170 - height;
        return (
          <g key={`${item[labelKey]}-${index}`}>
            <rect x={x} y={y} width={barWidth} height={height} fill="#B8975A" rx="3" />
            <text x={x + barWidth / 2} y="194" textAnchor="middle" fontSize="10" fill="currentColor">{String(item[labelKey]).slice(0, 8)}</text>
            <text x={x + barWidth / 2} y={Math.max(14, y - 6)} textAnchor="middle" fontSize="10" fill="currentColor">{Number(item[valueKey] || 0).toFixed(0)}{suffix}</text>
          </g>
        );
      })}
    </svg>
  );
};

const AnalyticsTab = ({ rooms }: AnalyticsTabProps) => {
  const [from, setFrom] = useState(isoDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(isoDate(new Date()));
  const [roomId, setRoomId] = useState("");
  const { data, isFetching } = useGetMyAnalyticsQuery({ from, to, roomId: roomId || undefined });
  const analytics = data?.data || data || {};

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField type="date" label="From" value={from} onChange={(event) => setFrom(event.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField type="date" label="To" value={to} onChange={(event) => setTo(event.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField select label="Room" value={roomId} onChange={(event) => setRoomId(event.target.value)} sx={{ minWidth: 220 }}>
          <MenuItem value="">All rooms</MenuItem>
          {rooms.map((room) => <MenuItem key={getRoomId(room)} value={getRoomId(room)}>{room?.name}</MenuItem>)}
        </TextField>
      </Stack>
      {isFetching ? <Typography>Loading analytics...</Typography> : null}
      <Grid container spacing={2}>
        <Grid item xs={12} md={2.4}><StatCard label="Occupancy Rate" value={`${Number(analytics?.occupancyRate || 0).toFixed(1)}%`} /></Grid>
        <Grid item xs={12} md={2.4}><StatCard label="Total Revenue" value={formatCurrency(analytics?.totalRevenue)} /></Grid>
        <Grid item xs={12} md={2.4}><StatCard label="Net Payout" value={formatCurrency(analytics?.netPayout)} /></Grid>
        <Grid item xs={12} md={2.4}><StatCard label="Booking Count" value={analytics?.bookingCount || 0} /></Grid>
        <Grid item xs={12} md={2.4}><StatCard label="Avg Nights" value={Number(analytics?.avgNights || 0).toFixed(1)} /></Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <AppCard elevation="flat" sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700}>Revenue by Month</Typography>
            <BarChart data={analytics?.revenueByMonth || []} labelKey="month" valueKey="revenue" />
          </AppCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <AppCard elevation="flat" sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700}>Occupancy by Room</Typography>
            <BarChart data={analytics?.occupancyByRoom || []} labelKey="roomName" valueKey="occupancyRate" suffix="%" />
          </AppCard>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default AnalyticsTab;
