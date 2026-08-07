import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Stack,
  TextField,
} from "@mui/material";
import { Minus, Plus } from "lucide-react";
import { Heading, SubHeading } from "../../components/Heading";
import ToastAlert from "../../components/ToastAlert/ToastAlert";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import AppInput from "../../components/ui/AppInput";
import DotLoader from "../../components/Spinner/dotLoader";
import {
  useCancelBookingMutation,
  useGetCancellationPreviewQuery,
  useInitiateBookingPaymentMutation,
  useModifyBookingMutation,
  useGetMyBookingsQuery,
} from "../../redux/api/stayApiSlice";
import { formatDate, getDateStringForTimeZone, thousandSeparatorNumber } from "../../utils";

const getBookingRoom = (booking: any) => booking?.room || booking?.stay || booking?.roomDetails || {};

const getRoomName = (booking: any) => {
  const room = getBookingRoom(booking);
  return room?.name || room?.title || room?.roomType || booking?.roomName || "Temporary stay";
};

const getRoomLocation = (booking: any) => {
  const room = getBookingRoom(booking);
  return room?.location || room?.address || room?.city || booking?.location || "Location unavailable";
};

const getRoomImage = (booking: any) => {
  const room = getBookingRoom(booking);
  if (Array.isArray(room?.images) && room.images.length > 0) return room.images[0];
  if (typeof room?.image === "string") return room.image;
  if (typeof room?.coverImage === "string") return room.coverImage;
  return "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80";
};

const getBookingTotal = (booking: any) =>
  Number(booking?.totalPrice || booking?.amount || booking?.price || booking?.total || 0);

const getBookingTimezone = (booking: any) =>
  booking?.timezone || booking?.room?.timezone || booking?.room?.accommodation?.timezone;

const getBookingDateValue = (booking: any, field: "checkIn" | "checkOut") =>
  booking?.[`${field}Date`] || booking?.[`${field}DateString`] || booking?.[field];

const formatBookingDate = (booking: any, field: "checkIn" | "checkOut") => {
  const dateValue = getBookingDateValue(booking, field);

  if (!dateValue) return "Not set";

  return formatDate(dateValue, getBookingTimezone(booking));
};

const canCancelBooking = (booking: any) => {
  const status = String(booking?.status || "").toLowerCase();
  const timezone = getBookingTimezone(booking);
  const checkInDate = getDateStringForTimeZone(getBookingDateValue(booking, "checkIn"), timezone);
  const todayDate = getDateStringForTimeZone(new Date(), timezone);

  return ["confirmed", "pending_confirmation", "pending_payment"].includes(status) && checkInDate > todayDate;
};

const canModifyBooking = (booking: any) =>
  ["pending_confirmation", "pending_payment"].includes(String(booking?.status || "").toLowerCase());

const isPaymentDue = (booking: any) =>
  String(booking?.status || "").toUpperCase() === "PENDING_PAYMENT" &&
  String(booking?.paymentStatus || "").toUpperCase() === "UNPAID";

const getStatusChip = (status?: string) => {
  switch (String(status || "").toLowerCase()) {
    case "pending_payment":
      return <Chip color="warning" label="Awaiting Payment" size="small" />;
    case "pending_confirmation":
      return <Chip color="warning" label="Awaiting Approval" size="small" />;
    case "confirmed":
      return <Chip color="success" label="Confirmed" size="small" />;
    case "declined":
      return <Chip color="error" label="Declined" size="small" />;
    case "cancelled":
      return <Chip color="error" label="Cancelled" size="small" />;
    case "checked_in":
      return <Chip color="info" label="Checked In" size="small" />;
    case "completed":
      return <Chip color="default" label="Completed" size="small" />;
    case "expired":
      return <Chip color="default" label="Expired" size="small" />;
    case "refunded":
      return <Chip color="info" label="Refunded" size="small" />;
    default:
      return <Chip color="default" label={status || "Pending"} size="small" />;
  }
};

const MyBookings = () => {
  const navigate = useNavigate();
  const { data: bookings = [], isLoading, error, refetch, isFetching } = useGetMyBookingsQuery();
  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();
  const [initiateBookingPayment, { isLoading: isPaying }] = useInitiateBookingPaymentMutation();
  const [modifyBooking, { isLoading: isModifying }] = useModifyBookingMutation();
  const [toast, setToast] = useState({
    appearence: false,
    type: "success",
    message: "",
  });
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    booking: any | null;
    reason: string;
  }>({ open: false, booking: null, reason: "" });
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const { data: cancelPreview } = useGetCancellationPreviewQuery(cancellingBookingId!, {
    skip: !cancellingBookingId,
  });
  const [modifyDialog, setModifyDialog] = useState<{
    open: boolean;
    booking: any | null;
    form: any;
  }>({
    open: false,
    booking: null,
    form: {
      checkIn: "",
      checkOut: "",
      guests: "1",
      adultCount: 1,
      childCount: 0,
      infantCount: 0,
      specialRequests: "",
    },
  });

  const busy = useMemo(
    () => isCancelling || isPaying || isModifying || isFetching,
    [isCancelling, isPaying, isModifying, isFetching]
  );

  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, appearence: false }));
  };

  const showToast = (type: string, message: string) => {
    setToast({
      appearence: true,
      type,
      message,
    });
  };

  const openCancelDialog = (booking: any) => {
    setCancellingBookingId(booking?._id || booking?.id || null);
    setCancelDialog({ open: true, booking, reason: "" });
  };

  const closeCancelDialog = () => {
    setCancellingBookingId(null);
    setCancelDialog({ open: false, booking: null, reason: "" });
  };

  const openModifyDialog = (booking: any) => {
    const occupancyRule = booking?.room?.occupancyRule || null;
    const adultCount = Number(booking?.adultCount || 1);
    const childCount = Number(booking?.childCount || 0);
    const infantCount = Number(booking?.infantCount || 0);

    setModifyDialog({
      open: true,
      booking,
      form: {
        checkIn: booking?.checkInDate || booking?.checkIn || "",
        checkOut: booking?.checkOutDate || booking?.checkOut || "",
        guests: String(adultCount + childCount || 1),
        adultCount: occupancyRule ? adultCount : Number(booking?.guestCount || adultCount || 1),
        childCount,
        infantCount,
        specialRequests: booking?.specialRequests || "",
      },
    });
  };

  const closeModifyDialog = () => {
    setModifyDialog((current) => ({
      ...current,
      open: false,
      booking: null,
    }));
  };

  const handlePayNow = async (booking: any) => {
    try {
      await initiateBookingPayment({ bookingId: booking?._id || booking?.id }).unwrap();
      showToast("success", "Payment instructions sent.");
      refetch();
    } catch (payError: any) {
      showToast("error", payError?.data?.message || "Payment could not be started right now.");
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelDialog.booking || !cancelDialog.reason.trim()) {
      return;
    }

    try {
      await cancelBooking({
        id: cancelDialog.booking._id || cancelDialog.booking.id,
        body: { reason: cancelDialog.reason },
      }).unwrap();
      showToast("success", "Booking cancelled successfully.");
      refetch();
      closeCancelDialog();
    } catch (cancelError: any) {
      showToast("error", cancelError?.data?.message || "Booking could not be cancelled right now.");
    }
  };

  const handleConfirmModify = async () => {
    if (!modifyDialog.booking) {
      return;
    }

    try {
      const occupancyRule = modifyDialog.booking?.room?.occupancyRule || null;
      const existingAdultCount = Number(modifyDialog.booking?.adultCount || 1);
      const existingChildCount = Number(modifyDialog.booking?.childCount || 0);
      const existingInfantCount = Number(modifyDialog.booking?.infantCount || 0);
      const hasStoredDependentCounts = existingChildCount > 0 || existingInfantCount > 0;

      await modifyBooking({
        id: modifyDialog.booking._id || modifyDialog.booking.id,
        body: {
          checkIn: modifyDialog.form.checkIn,
          checkOut: modifyDialog.form.checkOut,
          adultCount: occupancyRule
            ? Number(modifyDialog.form.adultCount || 1)
            : hasStoredDependentCounts
              ? existingAdultCount
              : Number(modifyDialog.form.guests || 1),
          childCount: occupancyRule ? Number(modifyDialog.form.childCount || 0) : existingChildCount,
          infantCount: occupancyRule ? Number(modifyDialog.form.infantCount || 0) : existingInfantCount,
          specialRequests: modifyDialog.form.specialRequests,
        },
      }).unwrap();

      showToast("success", "Booking updated successfully.");
      refetch();
      closeModifyDialog();
    } catch (modifyError: any) {
      showToast("error", modifyError?.data?.message || "Booking could not be modified right now.");
    }
  };

  return (
    <Box sx={{ py: { xs: 4, md: 6 }, background: "#f8fafc", minHeight: "calc(100vh - 72px)" }}>
      <AppContainer>
        <Stack spacing={3}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Heading sx={{ mb: 1 }}>My Stay Bookings</Heading>
              <SubHeading>Review your upcoming and previous temporary stay reservations.</SubHeading>
            </Box>
            <AppButton onClick={refetch} disabled={busy}>
              Refresh
            </AppButton>
          </Box>

          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <DotLoader />
            </Box>
          ) : null}

          {error ? (
            <AppCard sx={{ p: 3, borderRadius: 3 }}>
              <SubHeading>
                {(error as any)?.data?.message || "Booking history could not be loaded."}
              </SubHeading>
            </AppCard>
          ) : null}

          {!isLoading && !error && bookings.length === 0 ? (
            <AppCard sx={{ p: 3, borderRadius: 3 }}>
              <SubHeading>You do not have any temporary stay bookings yet.</SubHeading>
            </AppCard>
          ) : null}

          <Grid container spacing={2.5}>
            {bookings.map((booking: any) => {
              const canCancel = canCancelBooking(booking);
              const canModify = canModifyBooking(booking);
              const paymentDue = isPaymentDue(booking);

              return (
                <Grid item xs={12} md={6} key={booking?._id || `${booking?.room}-${booking?.checkIn}`}>
                  <AppCard sx={{ borderRadius: 3, overflow: "hidden", height: "100%" }}>
                    <Box
                      component="img"
                      src={getRoomImage(booking)}
                      alt={getRoomName(booking)}
                      sx={{ width: "100%", height: 220, objectFit: "cover" }}
                    />
                    <Stack spacing={1.25} sx={{ p: 2.5 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 1.5,
                          alignItems: "flex-start",
                        }}
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Heading
                            sx={{
                              fontSize: "22px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {getRoomName(booking)}
                          </Heading>
                        </Box>
                        <Box sx={{ flexShrink: 0 }}>{getStatusChip(booking?.status)}</Box>
                      </Box>
                      <SubHeading>{getRoomLocation(booking)}</SubHeading>
                      <SubHeading>Check-in: {formatBookingDate(booking, "checkIn")}</SubHeading>
                      <SubHeading>Check-out: {formatBookingDate(booking, "checkOut")}</SubHeading>
                      <SubHeading>
                        Guests: {booking?.adultCount || booking?.guests || booking?.guestCount || 1}
                      </SubHeading>
                      <Box sx={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", pt: 0.5 }}>
                        ${thousandSeparatorNumber(getBookingTotal(booking))}
                      </Box>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ pt: 1 }}>
                        <AppButton
                          variant="outlined"
                          onClick={() => navigate(`/stays/bookings/${booking._id || booking.id}`)}
                        >
                          View Details
                        </AppButton>
                        {paymentDue ? (
                          <AppButton onClick={() => handlePayNow(booking)} disabled={isPaying}>
                            {isPaying ? "Sending..." : "Pay Now"}
                          </AppButton>
                        ) : null}
                        {canModify ? (
                          <AppButton variant="outlined" onClick={() => openModifyDialog(booking)}>
                            Modify
                          </AppButton>
                        ) : null}
                        {canCancel ? (
                          <AppButton
                            color="error"
                            onClick={() => openCancelDialog(booking)}
                            disabled={isCancelling}
                          >
                            Cancel Booking
                          </AppButton>
                        ) : null}
                      </Stack>
                    </Stack>
                  </AppCard>
                </Grid>
              );
            })}
          </Grid>
        </Stack>
      </AppContainer>

      <ToastAlert
        appearence={toast.appearence}
        type={toast.type}
        message={toast.message}
        handleClose={handleCloseToast}
      />

      <Dialog
        open={cancelDialog.open}
        onClose={closeCancelDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Cancel Booking</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>Cancel this booking?</DialogContentText>
          <Stack spacing={0.75} sx={{ mb: 2 }}>
            <SubHeading sx={{ color: "#334155" }}>
              Refund you will receive: $
              {thousandSeparatorNumber(Number(cancelPreview?.data?.refundAmount || 0))}
            </SubHeading>
            <SubHeading sx={{ color: "#334155" }}>
              Cancellation fee: $
              {thousandSeparatorNumber(Number(cancelPreview?.data?.cancellationFee || 0))}
            </SubHeading>
          </Stack>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Cancellation reason"
            required
            value={cancelDialog.reason}
            onChange={(e) => setCancelDialog((prev) => ({ ...prev, reason: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <AppButton
            variant="outlined"
            onClick={closeCancelDialog}
          >
            Go Back
          </AppButton>
          <AppButton
            color="error"
            disabled={isCancelling || !cancelDialog.reason.trim()}
            onClick={handleConfirmCancel}
          >
            Confirm Cancel
          </AppButton>
        </DialogActions>
      </Dialog>

      <Dialog open={modifyDialog.open} onClose={closeModifyDialog} fullWidth maxWidth="sm">
        <DialogTitle>Modify Booking</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <AppInput
                label="Check in"
                type="date"
                value={modifyDialog.form.checkIn}
                onChange={(event) =>
                  setModifyDialog((current) => ({
                    ...current,
                    form: { ...current.form, checkIn: event.target.value },
                  }))
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <AppInput
                label="Check out"
                type="date"
                value={modifyDialog.form.checkOut}
                onChange={(event) =>
                  setModifyDialog((current) => ({
                    ...current,
                    form: { ...current.form, checkOut: event.target.value },
                  }))
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>

            {modifyDialog.booking?.room?.occupancyRule ? (
              <Box sx={{ p: 2, background: "#f8fafc", borderRadius: "8px" }}>
                <Stack spacing={1.5}>
                  {[
                    {
                      key: "adultCount",
                      label: "Adults",
                      min: 1,
                      max: Number(modifyDialog.booking?.room?.occupancyRule?.maxAdults ?? 1),
                      value: Number(modifyDialog.form.adultCount || 1),
                    },
                    {
                      key: "childCount",
                      label: "Children",
                      min: 0,
                      max: Number(modifyDialog.booking?.room?.occupancyRule?.maxChildren ?? 0),
                      value: Number(modifyDialog.form.childCount || 0),
                    },
                    {
                      key: "infantCount",
                      label: "Infants",
                      min: 0,
                      max: Number(modifyDialog.booking?.room?.occupancyRule?.maxInfants ?? 0),
                      value: Number(modifyDialog.form.infantCount || 0),
                    },
                  ].map((counter) => (
                    <Stack
                      key={counter.key}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={1.5}
                    >
                      <SubHeading sx={{ color: "#334155", fontWeight: 700 }}>{counter.label}</SubHeading>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <AppButton
                          variant="outlined"
                          type="button"
                          onClick={() =>
                            setModifyDialog((current) => ({
                              ...current,
                              form: {
                                ...current.form,
                                [counter.key]: Math.max(
                                  counter.min,
                                  Number(current.form[counter.key] || 0) - 1
                                ),
                              },
                            }))
                          }
                          disabled={counter.value <= counter.min}
                        >
                          <Minus size={12} />
                        </AppButton>
                        <Box sx={{ width: 28, textAlign: "center", fontWeight: 800 }}>
                          {counter.value}
                        </Box>
                        <AppButton
                          variant="outlined"
                          type="button"
                          onClick={() =>
                            setModifyDialog((current) => ({
                              ...current,
                              form: {
                                ...current.form,
                                [counter.key]: Math.min(
                                  counter.max,
                                  Number(current.form[counter.key] || 0) + 1
                                ),
                              },
                            }))
                          }
                          disabled={counter.value >= counter.max}
                        >
                          <Plus size={12} />
                        </AppButton>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            ) : (
              <AppInput
                label="Guests"
                type="number"
                value={modifyDialog.form.guests}
                onChange={(event) =>
                  setModifyDialog((current) => ({
                    ...current,
                    form: { ...current.form, guests: event.target.value },
                  }))
                }
                inputProps={{ min: 1 }}
              />
            )}

            <AppInput
              label="Special requests"
              multiline
              minRows={3}
              value={modifyDialog.form.specialRequests}
              onChange={(event) =>
                setModifyDialog((current) => ({
                  ...current,
                  form: { ...current.form, specialRequests: event.target.value },
                }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <AppButton variant="outlined" onClick={closeModifyDialog}>
            Go Back
          </AppButton>
          <AppButton
            onClick={handleConfirmModify}
            disabled={isModifying || !modifyDialog.form.checkIn || !modifyDialog.form.checkOut}
          >
            {isModifying ? "Saving..." : "Save Changes"}
          </AppButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyBookings;
