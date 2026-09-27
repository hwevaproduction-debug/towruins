import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import AppButton from "../ui/AppButton";

type BookingDetailsDialogProps = {
  open: boolean;
  onClose: () => void;
  booking: any;
  kind: "engagement" | "stay";
  loading?: boolean;
  error?: unknown;
};

const valueOrFallback = (value: unknown) =>
  value === undefined || value === null || value === "" ? "Not provided" : String(value);

const formatDate = (value: unknown) => {
  if (!value) return "Not provided";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Not provided" : date.toLocaleString();
};

const DetailRow = ({ label, value }: { label: string; value: unknown }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary" fontWeight={700}>
      {label}
    </Typography>
    <Typography sx={{ overflowWrap: "anywhere" }}>{valueOrFallback(value)}</Typography>
  </Box>
);

const BookingDetailsDialog = ({
  open,
  onClose,
  booking,
  kind,
  loading = false,
  error,
}: BookingDetailsDialogProps) => {
  const person = kind === "engagement" ? booking?.tenant : booking?.guest;
  const guestInfo = booking?.guestInfo;
  const referenceId = booking?.id || booking?._id;
  const title = kind === "engagement" ? "Tenant Details" : "Guest Details";
  const listingName =
    kind === "engagement"
      ? booking?.listing?.name
      : booking?.room?.accommodation?.name || booking?.room?.name;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: "20px", p: { xs: 1, sm: 2 } } }}
    >
      <DialogTitle>Booking Details</DialogTitle>
      <DialogContent>
        {loading ? (
          <Stack alignItems="center" spacing={2} sx={{ py: 5 }}>
            <CircularProgress size={28} />
            <Typography color="text.secondary">Loading booking details...</Typography>
          </Stack>
        ) : error ? (
          <Alert severity="error">Unable to load booking details.</Alert>
        ) : !booking ? (
          <Alert severity="info">No booking details are available.</Alert>
        ) : (
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                {valueOrFallback(person?.username || person?.name || guestInfo?.fullName)}
              </Typography>
              <Typography color="text.secondary">{title}</Typography>
            </Box>
            <Divider />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <DetailRow label="Profile ID" value={person?.id || person?._id} />
              <DetailRow label="Email" value={person?.email} />
              <DetailRow label="Phone" value={person?.phoneNumber || guestInfo?.phone} />
              <DetailRow label="Booking reference" value={referenceId} />
              <DetailRow label="Status" value={booking?.status} />
              <DetailRow label="Listing / Temporary Stay" value={listingName} />
              <DetailRow
                label={kind === "engagement" ? "Request date" : "Booking date"}
                value={formatDate(booking?.createdAt)}
              />
              {kind === "stay" ? (
                <>
                  <DetailRow
                    label="Requested dates"
                    value={`${formatDate(booking?.checkIn)} to ${formatDate(booking?.checkOut)}`}
                  />
                  <DetailRow
                    label="Guests"
                    value={`Adults: ${booking?.adultCount ?? 0}, Children: ${booking?.childCount ?? 0}, Infants: ${booking?.infantCount ?? 0}`}
                  />
                  <DetailRow label="Room" value={booking?.room?.name} />
                  <DetailRow label="Arrival time" value={guestInfo?.estimatedArrivalTime} />
                </>
              ) : null}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {kind === "engagement" ? "Tenant message" : "Booking notes"}
              </Typography>
              <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {valueOrFallback(booking?.message || booking?.specialRequests || guestInfo?.additionalNotes)}
              </Typography>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <Box sx={{ display: "flex", justifyContent: "flex-end", px: 2, pb: 1 }}>
        <AppButton variant="outlined" onClick={onClose}>
          Close
        </AppButton>
      </Box>
    </Dialog>
  );
};

export default BookingDetailsDialog;
