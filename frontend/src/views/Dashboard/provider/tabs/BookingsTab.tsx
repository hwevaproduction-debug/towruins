import { useMemo, useState } from "react";
import { Chip, Stack, Typography } from "@mui/material";
import {
  useCancelBookingMutation,
  useCheckInBookingMutation,
  useConfirmBookingMutation,
  useDeclineBookingMutation,
} from "../../../../redux/api/providerApiSlice";
import ConfirmDialog from "../components/ConfirmDialog";
import DeclineDialog from "../components/DeclineDialog";
import AppButton from "../../../../components/ui/AppButton";
import AppCard from "../../../../components/ui/AppCard";

type BookingsTabProps = {
  bookings: any[];
};

const filters = ["ALL", "PENDING_CONFIRMATION", "CONFIRMED", "CHECKED_IN", "COMPLETED"];
const getBookingId = (booking: any) => booking?._id || booking?.id;
const getStatusChipSx = (status: string) => {
  const normalized = String(status || "PENDING").toUpperCase();

  if (["CONFIRMED", "CHECKED_IN"].includes(normalized)) {
    return { background: "#D1EAE0", color: "#1F4D3A", fontWeight: 700 };
  }

  if (["PENDING_CONFIRMATION", "PENDING"].includes(normalized)) {
    return { background: "#FDF8F0", color: "#9E7E45", fontWeight: 700 };
  }

  if (normalized === "COMPLETED") {
    return { background: "#F1F5F9", color: "#64748B", fontWeight: 700 };
  }

  if (["CANCELLED", "REJECTED"].includes(normalized)) {
    return { background: "#FEE2E2", color: "#991B1B", fontWeight: 700 };
  }

  return { background: "#F1F5F9", color: "#64748B", fontWeight: 700 };
};

const BookingsTab = ({ bookings }: BookingsTabProps) => {
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState<any>(null);
  const [declining, setDeclining] = useState<any>(null);
  const [confirmBooking, { isLoading: confirming }] = useConfirmBookingMutation();
  const [declineBooking, { isLoading: decliningBooking }] = useDeclineBookingMutation();
  const [cancelBooking, { isLoading: canceling }] = useCancelBookingMutation();
  const [checkInBooking, { isLoading: checkingIn }] = useCheckInBookingMutation();

  const filteredBookings = useMemo(
    () =>
      filter === "ALL"
        ? bookings
        : bookings.filter((booking) => String(booking?.status || "").toUpperCase() === filter),
    [bookings, filter]
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {filters.map((item) => (
          <Chip
            key={item}
            label={item.replace(/_/g, " ")}
            sx={
              filter === item
                ? item === "ALL"
                  ? { background: "#B8975A", color: "#FFFFFF", fontWeight: 700 }
                  : getStatusChipSx(item)
                : undefined
            }
            onClick={() => setFilter(item)}
          />
        ))}
      </Stack>
      {filteredBookings.map((booking) => (
        <AppCard key={getBookingId(booking)} elevation="flat" sx={{ p: 2, borderRadius: "16px" }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <div>
              <Typography variant="subtitle1" fontWeight={700}>
                {booking?.guest?.username || booking?.guest?.name || "Guest"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {booking?.room?.name || "Room"}
              </Typography>
              <Chip
                size="small"
                label={String(booking?.status || "PENDING").replace(/_/g, " ")}
                sx={{ mt: 0.75, ...getStatusChipSx(booking?.status) }}
              />
              <Typography variant="body2">
                {String(booking?.checkIn || "").slice(0, 10)} to {String(booking?.checkOut || "").slice(0, 10)}
              </Typography>
            </div>
            <Stack direction="row" spacing={1} alignItems="center">
              {booking?.status === "PENDING_CONFIRMATION" ? (
                <>
                  <AppButton size="small" variant="outlined" onClick={() => setSelected(booking)}>
                    Confirm
                  </AppButton>
                  <AppButton size="small" variant="outlined" color="error" onClick={() => setDeclining(booking)}>
                    Decline
                  </AppButton>
                </>
              ) : null}
              {["PENDING_CONFIRMATION", "CONFIRMED"].includes(booking?.status) ? (
                <>
                  {booking?.status === "CONFIRMED" ? (
                    <AppButton
                      size="small"
                      variant="outlined"
                      sx={{ borderColor: "#1F4D3A", color: "#1F4D3A" }}
                      onClick={() => checkInBooking(getBookingId(booking))}
                    >
                      Check In
                    </AppButton>
                  ) : null}
                  <AppButton
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => cancelBooking({ id: getBookingId(booking), body: { reason: "Canceled by provider" } })}
                  >
                    Cancel
                  </AppButton>
                </>
              ) : null}
            </Stack>
          </Stack>
        </AppCard>
      ))}
      {!filteredBookings.length ? <Typography>No bookings found.</Typography> : null}
      <ConfirmDialog
        open={Boolean(selected)}
        title="Confirm Booking"
        message="Confirm this booking request?"
        loading={confirming || canceling}
        onClose={() => setSelected(null)}
        onConfirm={async () => {
          await confirmBooking(getBookingId(selected)).unwrap();
          setSelected(null);
        }}
      />
      <DeclineDialog
        open={Boolean(declining)}
        loading={decliningBooking}
        onClose={() => setDeclining(null)}
        onDecline={async (reason) => {
          await declineBooking({ id: getBookingId(declining), reason }).unwrap();
          setDeclining(null);
        }}
      />
    </Stack>
  );
};

export default BookingsTab;
