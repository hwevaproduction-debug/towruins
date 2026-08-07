import { useMemo, useState } from "react";
import {
  Box,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AppCard from "../../../../components/ui/AppCard";

const formatCurrency = (value: any) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));

type PayoutsTabProps = {
  bookings?: any[];
};

const payableStatuses = new Set(["CONFIRMED", "CHECKED_IN", "COMPLETED"]);

const getBookingId = (booking: any) => booking?.id || booking?._id || "";

const PayoutsTab = ({ bookings = [] }: PayoutsTabProps) => {
  const [filter, setFilter] = useState("ALL");
  const settledBookings = useMemo(
    () => bookings.filter((booking) => ["PENDING", "SETTLED", "DISPUTED"].includes(String(booking?.settlementStatus || "").toUpperCase())),
    [bookings]
  );
  const filteredBookings = useMemo(
    () => filter === "ALL" ? settledBookings : settledBookings.filter((booking) => String(booking?.settlementStatus || "").toUpperCase() === filter),
    [filter, settledBookings]
  );
  const pendingPayout = useMemo(
    () => bookings
      .filter((booking) => String(booking?.settlementStatus || "").toUpperCase() === "PENDING" && payableStatuses.has(String(booking?.status || "").toUpperCase()))
      .reduce((sum, booking) => sum + Number(booking?.netPayout || 0), 0),
    [bookings]
  );
  const totalSettled = useMemo(
    () => bookings
      .filter((booking) => String(booking?.settlementStatus || "").toUpperCase() === "SETTLED")
      .reduce((sum, booking) => sum + Number(booking?.netPayout || 0), 0),
    [bookings]
  );

  const chipColor = (status: string): "warning" | "success" | "default" => {
    if (status === "PENDING") return "warning";
    if (status === "SETTLED") return "success";
    return "default";
  };

  return (
    <Grid container spacing={2}>
      {[
        ["Pending Payout", formatCurrency(pendingPayout)],
        ["Total Settled", formatCurrency(totalSettled)],
        ["Next Payout", "Not scheduled"],
      ].map(([label, value]) => (
        <Grid item xs={12} md={4} key={label}>
          <AppCard elevation="flat" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="h5" fontWeight={700}>{value}</Typography>
          </AppCard>
        </Grid>
      ))}
      <Grid item xs={12}>
        <AppCard elevation="flat" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            {["ALL", "PENDING", "SETTLED"].map((status) => (
              <Chip
                key={status}
                label={status}
                color={filter === status ? "primary" : "default"}
                variant={filter === status ? "filled" : "outlined"}
                onClick={() => setFilter(status)}
              />
            ))}
          </Stack>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Booking ID</TableCell>
                <TableCell>Guest</TableCell>
                <TableCell>Room</TableCell>
                <TableCell>Check-in</TableCell>
                <TableCell>Net Payout</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBookings.map((booking) => {
                const status = String(booking?.settlementStatus || "PENDING").toUpperCase();

                return (
                  <TableRow key={getBookingId(booking)}>
                    <TableCell>{getBookingId(booking).slice(0, 8) || "-"}</TableCell>
                    <TableCell>{booking?.guest?.username || "-"}</TableCell>
                    <TableCell>{booking?.room?.name || "-"}</TableCell>
                    <TableCell>{String(booking?.checkIn || "").slice(0, 10) || "-"}</TableCell>
                    <TableCell>{formatCurrency(booking?.netPayout)}</TableCell>
                    <TableCell><Chip size="small" label={status} color={chipColor(status)} /></TableCell>
                  </TableRow>
                );
              })}
              {!filteredBookings.length ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Box sx={{ py: 3, textAlign: "center" }}>No settlements found.</Box>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </AppCard>
      </Grid>
    </Grid>
  );
};

export default PayoutsTab;
