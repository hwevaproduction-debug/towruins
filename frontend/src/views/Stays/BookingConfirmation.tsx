import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@mui/material";
import { PartyPopper } from "lucide-react";
import { Heading, SubHeading } from "../../components/Heading";
import DotLoader from "../../components/Spinner/dotLoader";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import PriceBreakdown from "../../components/stays/PriceBreakdown";
import { useGetBookingByIdQuery } from "../../redux/api/stayApiSlice";
import { formatDate, thousandSeparatorNumber } from "../../utils";

const getBookingRoom = (booking: any) => booking?.room || booking?.stay || booking?.roomDetails || {};

const getBookingTimezone = (booking: any) =>
  booking?.timezone || booking?.room?.timezone || booking?.room?.accommodation?.timezone;

const formatBookingDate = (booking: any, field: "checkIn" | "checkOut") => {
  const dateValue = booking?.[`${field}Date`] || booking?.[`${field}DateString`] || booking?.[field];

  return dateValue ? formatDate(dateValue, getBookingTimezone(booking)) : "Not set";
};

const getStatusMeta = (status?: string) => {
  const value = String(status || "").toLowerCase();

  switch (value) {
    case "pending_payment":
      return { color: "warning" as const, label: "Awaiting Payment", title: "Payment is pending" };
    case "pending_confirmation":
      return { color: "warning" as const, label: "Awaiting Approval", title: "Booking is waiting for approval" };
    case "confirmed":
      return { color: "success" as const, label: "Confirmed", title: "Your booking is confirmed" };
    case "declined":
      return { color: "error" as const, label: "Declined", title: "Booking request declined" };
    case "cancelled":
      return { color: "error" as const, label: "Cancelled", title: "Booking cancelled" };
    case "checked_in":
      return { color: "info" as const, label: "Checked In", title: "Guest is checked in" };
    case "completed":
      return { color: "default" as const, label: "Completed", title: "Stay completed" };
    case "expired":
      return { color: "default" as const, label: "Expired", title: "Booking expired" };
    case "refunded":
      return { color: "info" as const, label: "Refunded", title: "Refund processed" };
    default:
      return { color: "default" as const, label: status || "Pending", title: "Booking status" };
  }
};

const CANCELLATION_POLICY_MAP: Record<string, string> = {
  flexible: "Free cancellation up to 24h before check-in",
  moderate: "50% refund if cancelled 5+ days before check-in",
  strict: "50% refund if cancelled 7+ days before check-in; non-refundable within 7 days",
  non_refundable: "No refund",
};

const formatCancellationWindow = (hours: number) => {
  if (hours === 24) return "24h";
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  return `${hours}h`;
};

const formatRefundPercentage = (value: number) => `${Number(value.toFixed(2))}%`;

const getPolicyType = (policy: any) =>
  String(typeof policy === "string" ? policy : policy?.policyType || policy?.policy || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const formatCancellationPolicy = (policy: any) => {
  if (!policy) return "";

  if (typeof policy !== "string" && policy?.customDescription?.trim()) {
    return policy.customDescription.trim();
  }

  const policyType = getPolicyType(policy);
  const rawFreeCancellationHours = policy?.freeCancellationHours;
  const rawRefundPercentage = policy?.refundPercentage;
  const freeCancellationHours = Number(rawFreeCancellationHours);
  const refundPercentage = Number(rawRefundPercentage);
  const hasFreeCancellationHours =
    rawFreeCancellationHours !== undefined &&
    rawFreeCancellationHours !== null &&
    rawFreeCancellationHours !== "" &&
    Number.isFinite(freeCancellationHours) && freeCancellationHours > 0;
  const hasRefundPercentage =
    rawRefundPercentage !== undefined &&
    rawRefundPercentage !== null &&
    rawRefundPercentage !== "" &&
    Number.isFinite(refundPercentage) &&
    refundPercentage >= 0;

  switch (policyType) {
    case "flexible":
      return hasFreeCancellationHours
        ? `Free cancellation up to ${formatCancellationWindow(freeCancellationHours)} before check-in`
        : CANCELLATION_POLICY_MAP.flexible;
    case "moderate":
      return `${formatRefundPercentage(hasRefundPercentage ? refundPercentage : 50)} refund if cancelled 5+ days before check-in`;
    case "strict":
      return `${formatRefundPercentage(hasRefundPercentage ? refundPercentage : 50)} refund if cancelled 7+ days before check-in; non-refundable within 7 days`;
    case "non_refundable":
      return CANCELLATION_POLICY_MAP.non_refundable;
    case "custom":
      if (hasRefundPercentage && hasFreeCancellationHours) {
        return `${formatRefundPercentage(refundPercentage)} refund applies under the provider's custom terms; free cancellation window: ${formatCancellationWindow(freeCancellationHours)} before check-in`;
      }
      if (hasRefundPercentage) {
        return `${formatRefundPercentage(refundPercentage)} refund applies under the provider's custom cancellation terms.`;
      }
      if (hasFreeCancellationHours) {
        return `Free cancellation up to ${formatCancellationWindow(freeCancellationHours)} before check-in under the provider's custom terms.`;
      }
      return "";
    default:
      if (policyType && CANCELLATION_POLICY_MAP[policyType]) {
        return CANCELLATION_POLICY_MAP[policyType];
      }
      if (hasRefundPercentage) {
        return `${formatRefundPercentage(refundPercentage)} refund applies under the provider's cancellation terms.`;
      }
      if (hasFreeCancellationHours) {
        return `Free cancellation up to ${formatCancellationWindow(freeCancellationHours)} before check-in.`;
      }
      return "";
  }
};

const BookingConfirmation = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { data: booking, isLoading, error, refetch } = useGetBookingByIdQuery(id, {
    skip: !id,
  });

  const room = getBookingRoom(booking);
  const statusMeta = useMemo(() => getStatusMeta(booking?.status), [booking?.status]);
  const totalPrice = Number(booking?.totalPrice || 0);
  const guestCount = booking?.adultCount || booking?.guests || booking?.guestCount || 1;
  const fallbackQuote = booking ? {
    nights: booking.nights,
    nightlyBreakdown: [],
    accommodationSubtotal: Number(booking.pricePerNight) * Number(booking.nights),
    occupancySurcharge: 0,
    cleaningFee: Number(booking.cleaningFee ?? 0),
    subtotal: Number(booking.subtotal ?? booking.totalPrice),
    promotionDiscount: Number(booking.discountAmount ?? 0),
    couponDiscount: 0,
    taxAmount: Number(booking.taxAmount ?? 0),
    grandTotal: Number(booking.totalPrice),
    lineItems: [],
    appliedPromotion: null,
    appliedCoupon: booking.couponCode ? { code: booking.couponCode } : null,
    currency: "USD",
  } : null;
  const quote =
    booking?.feeSnapshot
      ? { ...booking.feeSnapshot, nightlyBreakdown: [], nights: booking.nights, currency: "USD" }
      : booking?.quote || fallbackQuote;
  const policyText =
    formatCancellationPolicy(booking?.cancellationPolicySnapshot) ||
    formatCancellationPolicy(room?.accommodation?.cancellationPolicy) ||
    booking?.cancellationPolicyCustomText ||
    "Cancellation policy will be handled according to the provider's current terms.";

  if (isLoading) {
    return (
      <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
        <DotLoader />
      </Box>
    );
  }

  if (error || !booking) {
    return (
      <AppContainer sx={{ py: 6 }}>
        <AppCard sx={{ p: 3 }}>
          <Heading sx={{ fontSize: "24px", mb: 1 }}>Booking unavailable</Heading>
          <SubHeading sx={{ mb: 2 }}>
            {(error as any)?.data?.message || "Booking details could not be loaded."}
          </SubHeading>
          <Stack direction="row" spacing={1.5}>
            <AppButton onClick={() => refetch()} disabled={!id}>
              Refresh
            </AppButton>
            <AppButton variant="outlined" onClick={() => navigate("/stays/bookings")}>
              Back to bookings
            </AppButton>
          </Stack>
        </AppCard>
      </AppContainer>
    );
  }

  return (
    <Box sx={{ py: { xs: 4, md: 6 }, background: "#f8fafc", minHeight: "calc(100vh - 72px)" }}>
      <AppContainer>
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} md={10} lg={8}>
            <AppCard sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{ color: "#1F4D3A", lineHeight: 1, mb: 1, display: "flex", justifyContent: "center" }}
                    aria-hidden
                  >
                    <PartyPopper size={44} />
                  </Box>
                  <Heading sx={{ fontSize: "30px", mb: 1 }}>{statusMeta.title}</Heading>
                  <Stack direction="row" justifyContent="center" sx={{ mb: 1 }}>
                    <Chip color={statusMeta.color} label={statusMeta.label} />
                  </Stack>
                  <SubHeading>
                    Booking reference: <strong>{booking?._id || booking?.id}</strong>
                  </SubHeading>
                </Box>

                <Box
                  sx={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    overflow: "hidden",
                    background: "#fff",
                  }}
                >
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ width: "32%", fontWeight: 700 }}>Room</TableCell>
                        <TableCell>{room?.name || room?.title || "Temporary stay"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Dates</TableCell>
                        <TableCell>
                          {formatBookingDate(booking, "checkIn")} to {formatBookingDate(booking, "checkOut")}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Guests</TableCell>
                        <TableCell>{guestCount}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                        <TableCell>${thousandSeparatorNumber(totalPrice)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Box>

                <Box sx={{ p: 2.25, background: "#f8fafc", borderRadius: "8px" }}>
                  <SubHeading sx={{ mb: 1 }}>Pricing breakdown</SubHeading>
                  <PriceBreakdown quote={quote} />
                </Box>

                <Box sx={{ p: 2.25, background: "#f8fafc", borderRadius: "8px" }}>
                  <SubHeading sx={{ mb: 1 }}>Cancellation policy</SubHeading>
                  <SubHeading sx={{ color: "#334155", lineHeight: 1.7 }}>{policyText}</SubHeading>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <AppButton onClick={() => navigate("/stays/bookings")}>View My Bookings</AppButton>
                  <AppButton variant="outlined" onClick={() => navigate("/stays")}>
                    Browse Stays
                  </AppButton>
                </Stack>
              </Stack>
            </AppCard>
          </Grid>
        </Grid>
      </AppContainer>

    </Box>
  );
};

export default BookingConfirmation;
