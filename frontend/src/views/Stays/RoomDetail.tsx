import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Avatar,
  Box,
  Chip,
  Grid,
  IconButton,
  Stack,
  Step,
  StepLabel,
  Stepper,
} from "@mui/material";
import { CalendarDays, MapPin, Minus, Plus, Users } from "lucide-react";
import { Heading, SubHeading } from "../../components/Heading";
import ToastAlert from "../../components/ToastAlert/ToastAlert";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppInput from "../../components/ui/AppInput";
import AppButton from "../../components/ui/AppButton";
import DotLoader from "../../components/Spinner/dotLoader";
import BookingCalendar from "../../components/stays/BookingCalendar";
import CouponInput from "../../components/stays/CouponInput";
import PriceBreakdown from "../../components/stays/PriceBreakdown";
import { usePricingQuote } from "../../hooks/usePricingQuote";
import useTypedSelector from "../../hooks/useTypedSelector";
import {
  useCreateBookingMutation,
  useGetProviderProfileQuery,
  useGetRoomAvailabilityQuery,
  useGetStayByIdQuery,
  useSubmitGuestInfoMutation,
} from "../../redux/api/stayApiSlice";
import { getDateStringForTimeZone, thousandSeparatorNumber } from "../../utils";

const CANCELLATION_POLICY_MAP: Record<string, string> = {
  flexible: "Free cancellation up to 24h before check-in",
  moderate: "50% refund if cancelled 5+ days before",
  strict: "Non-refundable within 7 days",
  non_refundable: "No refund",
};

const getRoomName = (room: any) =>
  room?.name || room?.title || room?.roomType || room?.type || "Temporary stay";

const getRoomLocation = (room: any) =>
  room?.location || room?.address || room?.city || room?.province || "Location unavailable";

const getRoomDescription = (room: any) =>
  room?.description || room?.summary || room?.details || "No description available yet.";

const getRoomImages = (room: any) => {
  if (Array.isArray(room?.images) && room.images.length > 0) return room.images;
  if (typeof room?.image === "string") return [room.image];
  if (typeof room?.coverImage === "string") return [room.coverImage];
  return [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
  ];
};

const getRoomPrice = (room: any) =>
  Number(
    room?.resolvedPrice ||
      room?.basePricePerNight ||
      room?.pricePerNight ||
      room?.nightlyRate ||
      room?.price ||
      0
  );

const getRoomCapacity = (room: any) =>
  Number(room?.occupancyRule?.maxGuests || room?.maxGuests || room?.capacity || room?.guests || room?.occupancy || 1);

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const getAmenities = (room: any) => {
  if (Array.isArray(room?.amenities)) {
    return room.amenities.filter(Boolean);
  }

  if (room?.amenities && typeof room.amenities === "object") {
    return Object.entries(room.amenities)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key);
  }

  return [];
};

const parseDateOnlyAsUtc = (value: string) => {
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) return null;

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return parsed;
};

const addDaysToDateString = (value: string, days: number) => {
  const parsed = parseDateOnlyAsUtc(value);

  if (!parsed) return "";

  parsed.setUTCDate(parsed.getUTCDate() + days);

  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(parsed.getUTCDate()).padStart(2, "0")}`;
};

const getDayCount = (checkIn: string, checkOut: string) => {
  const start = parseDateOnlyAsUtc(checkIn);
  const end = parseDateOnlyAsUtc(checkOut);

  if (!start || !end) return 0;

  const diff = end.getTime() - start.getTime();

  if (!checkIn || !checkOut || Number.isNaN(diff) || diff <= 0) return 0;

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const formatPricingDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parseDateOnlyAsUtc(value) || new Date(`${value}T00:00:00.000Z`));

const formatAmenity = (value: string) =>
  value
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const expandDateRange = (start: string, end: string) => {
  const dates = new Set<string>();

  if (!parseDateOnlyAsUtc(start) || !parseDateOnlyAsUtc(end)) {
    return dates;
  }

  let cursor = start;
  while (cursor < end) {
    dates.add(cursor);
    cursor = addDaysToDateString(cursor, 1);

    if (!cursor) break;
  }

  return dates;
};

const getProviderProfile = (data: any) =>
  data?.provider || data?.data?.provider || data?.providerProfile || data?.data?.providerProfile || null;

const getProviderLocation = (provider: any) =>
  provider?.location?.city || provider?.city || provider?.location || "Location unavailable";

const getProviderInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TS";

const getBookingId = (booking: any) =>
  booking?._id || booking?.id || booking?.data?.booking?._id || booking?.data?.booking?.id;

const RoomDetail = () => {
  const navigate = useNavigate();
  const { roomId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const authUser = useTypedSelector((state) => state.auth?.user);
  const initialGuests = Math.max(1, Number(searchParams.get("guests") || 1));
  const [form, setForm] = useState({
    checkIn: searchParams.get("checkIn") || "",
    checkOut: searchParams.get("checkOut") || "",
    guests: String(initialGuests),
    adultCount: initialGuests,
    childCount: 0,
    infantCount: 0,
    specialRequests: "",
    couponCode: "",
  });
  const [bookingStep, setBookingStep] = useState<0 | 1 | 2>(0);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [guestInfo, setGuestInfo] = useState({
    fullName: "",
    phone: "",
    nationalId: "",
    estimatedArrivalTime: "",
    additionalNotes: "",
  });
  const [toast, setToast] = useState({
    appearence: false,
    type: "success",
    message: "",
  });

  const { data: room, isLoading, error } = useGetStayByIdQuery(roomId, { skip: !roomId });
  const [createBooking, { isLoading: isBooking }] = useCreateBookingMutation();
  const [submitGuestInfo, { isLoading: isSubmittingGuestInfo }] = useSubmitGuestInfoMutation();
  const { data: providerData } = useGetProviderProfileQuery(room?.providerId || room?.provider?._id || "", {
    skip: !(room?.providerId || room?.provider?._id),
  });

  useEffect(() => {
    setCreatedBookingId(null);
  }, [roomId]);

  const shouldCheckAvailability = Boolean(roomId && form.checkIn && form.checkOut);
  const {
    data: availability,
    isFetching: isCheckingAvailability,
    error: availabilityError,
  } = useGetRoomAvailabilityQuery(
    {
      roomId,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      adultCount: form.adultCount,
      childCount: form.childCount,
      infantCount: form.infantCount,
    },
    { skip: !shouldCheckAvailability }
  );
  const { quote, isLoading: isQuoteLoading } = usePricingQuote({
    roomId,
    checkIn: form.checkIn,
    checkOut: form.checkOut,
    adultCount: form.adultCount,
    childCount: form.childCount,
    infantCount: form.infantCount,
    couponCode: form.couponCode,
  });

  const images = useMemo(() => getRoomImages(room), [room]);
  const provider = useMemo(() => getProviderProfile(providerData), [providerData]);
  const availabilityData = availability?.data || availability || null;
  const roomTimezone = availabilityData?.timezone || room?.timezone || room?.accommodation?.timezone;
  const nights = Number(availabilityData?.nights || getDayCount(form.checkIn, form.checkOut));
  const nightlyRate = getRoomPrice(room);
  const totalPrice = quote?.grandTotal ?? Number(availabilityData?.totalPrice ?? nights * nightlyRate);
  const occupancyRule = room?.occupancyRule || null;
  const totalOccupancyGuests = Number(form.adultCount || 0) + Number(form.childCount || 0);
  const occupancyExceeded = Boolean(
    occupancyRule && totalOccupancyGuests > Number(occupancyRule.maxGuests || 0)
  );
  const bookingMode = room?.bookingMode || room?.bookingSettings?.mode || room?.settings?.bookingMode || "request";
  const isInstantBooking = String(bookingMode).toUpperCase() === "INSTANT";
  const policyCode = room?.policyCode || room?.cancellationPolicy || room?.provider?.providerProfile?.cancellationPolicy;
  const checkInTime = room?.checkInTime || provider?.checkInTime || "14:00";
  const checkOutTime = room?.checkOutTime || provider?.checkOutTime || "11:00";

  const forbiddenDates = useMemo(() => {
    const ranges = [
      ...(availability?.bookedRanges || availability?.data?.bookedRanges || []),
      ...(availability?.blockedRanges || availability?.data?.blockedRanges || []),
    ];
    const dates = new Set<string>();

    ranges.forEach((range: any) => {
      const start =
        range?.checkInDate ||
        range?.startDateString ||
        getDateStringForTimeZone(range?.checkIn || range?.startDate, roomTimezone);
      const end =
        range?.checkOutDate ||
        range?.endDateString ||
        getDateStringForTimeZone(range?.checkOut || range?.endDate, roomTimezone);

      if (!start || !end) return;

      expandDateRange(start, end).forEach((value) => dates.add(value));
    });

    return dates;
  }, [availability, roomTimezone]);

  const isAvailable = useMemo(() => {
    if (typeof availabilityData?.isAvailable === "boolean") return availabilityData.isAvailable;
    if (!shouldCheckAvailability) return null;
    return forbiddenDates.size === 0;
  }, [availabilityData, forbiddenDates, shouldCheckAvailability]);

  const availabilityViolations = Array.isArray(availabilityData?.violations)
    ? availabilityData.violations
    : [];

  const showToast = (type: string, message: string) => {
    setToast({
      appearence: true,
      type,
      message,
    });
  };

  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, appearence: false }));
  };

  const updateOccupancyCount = (
    field: "adultCount" | "childCount" | "infantCount",
    delta: number,
    minValue: number,
    maxValue: number
  ) => {
    setForm((prev) => {
      const nextValue = Math.min(maxValue, Math.max(minValue, Number(prev[field] || 0) + delta));

      return {
        ...prev,
        [field]: nextValue,
      };
    });
  };

  useEffect(() => {
    if (!shouldCheckAvailability || createdBookingId) return;

    if (availabilityError) {
      showToast(
        "warning",
        (availabilityError as any)?.data?.message ||
          "Availability could not be checked for the selected dates."
      );
      return;
    }

    if (isCheckingAvailability) return;

    if (isAvailable === true) {
      showToast("success", "Room is available for these dates.");
    } else if (isAvailable === false) {
      showToast("error", "Room is not available for these dates.");
    }
  }, [
    availabilityError,
    createdBookingId,
    isAvailable,
    isCheckingAvailability,
    shouldCheckAvailability,
  ]);

  const validateStepZero = () => {
    if (!form.checkIn || !form.checkOut) {
      showToast("error", "Select check-in and check-out dates before continuing.");
      return false;
    }

    if (nights <= 0) {
      showToast("error", "Check-out must be after check-in.");
      return false;
    }

    if (isAvailable === false) {
      showToast("error", "This room is unavailable for the selected dates.");
      return false;
    }

    if (occupancyExceeded) {
      showToast("error", `This room allows up to ${occupancyRule?.maxGuests} guests.`);
      return false;
    }

    return true;
  };

  const validateStepOne = () => {
    if (!guestInfo.fullName.trim() || !guestInfo.phone.trim()) {
      showToast("error", "Full name and phone are required.");
      return false;
    }

    return true;
  };

  const handlePrimaryAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!authUser) {
      navigate("/login");
      return;
    }

    if (bookingStep === 0) {
      if (validateStepZero()) {
        setBookingStep(1);
      }
      return;
    }

    if (bookingStep === 1) {
      if (validateStepOne()) {
        setBookingStep(2);
      }
      return;
    }

    if (createdBookingId) {
      if (!validateStepOne()) {
        return;
      }

      try {
        await submitGuestInfo({
          id: createdBookingId,
          body: guestInfo,
        }).unwrap();

        showToast("success", "Booking created successfully.");
        navigate(`/stays/bookings/${createdBookingId}`);
      } catch (guestInfoError: any) {
        showToast(
          "error",
          guestInfoError?.data?.message ||
            "Booking was created, but guest information could not be saved. Please try again."
        );
      }
      return;
    }

    if (!validateStepZero() || !validateStepOne()) {
      return;
    }

    let bookingId: string | null = null;

    try {
      const booking = await createBooking({
        room: roomId,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: occupancyRule ? totalOccupancyGuests : Number(form.guests || 1),
        adultCount: occupancyRule ? form.adultCount : Number(form.guests || 1),
        childCount: occupancyRule ? form.childCount : 0,
        infantCount: occupancyRule ? form.infantCount : 0,
        specialRequests: form.specialRequests,
        totalPrice,
        couponCode: form.couponCode,
      }).unwrap();

      bookingId = getBookingId(booking);

      if (!bookingId) {
        throw new Error("Booking reference missing");
      }
      setCreatedBookingId(bookingId);
    } catch (bookingError: any) {
      showToast(
        "error",
        bookingError?.data?.message || bookingError?.message || "Booking could not be completed right now."
      );
      return;
    }

    if (!bookingId) {
      return;
    }

    try {
      await submitGuestInfo({
        id: bookingId,
        body: guestInfo,
      }).unwrap();

      showToast("success", "Booking created successfully.");
      navigate(`/stays/bookings/${bookingId}`);
    } catch (guestInfoError: any) {
      showToast(
        "error",
        guestInfoError?.data?.message ||
          "Booking was created, but guest information could not be saved. Please try again."
      );
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
        <DotLoader />
      </Box>
    );
  }

  if (error || !room) {
    return (
      <AppContainer sx={{ py: 6 }}>
        <AppCard sx={{ p: 3, borderRadius: 3 }}>
          <Heading sx={{ fontSize: "22px", mb: 1 }}>Room unavailable</Heading>
          <SubHeading>
            {(error as any)?.data?.message || "Room details could not be loaded."}
          </SubHeading>
        </AppCard>
      </AppContainer>
    );
  }

  return (
    <Box sx={{ py: { xs: 4, md: 6 }, background: "background.default", minHeight: "calc(100vh - 72px)" }}>
      <AppContainer>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Stack spacing={2.5}>
              <AppCard sx={{ overflow: "hidden", borderRadius: "16px" }}>
                <Box
                  component="img"
                  src={images[0]}
                  alt={getRoomName(room)}
                  sx={{ width: "100%", height: { xs: 260, md: 420 }, objectFit: "cover" }}
                />
              </AppCard>

              <Grid container spacing={2}>
                {images.slice(1, 4).map((image: string) => (
                  <Grid item xs={12} sm={4} key={image}>
                    <AppCard sx={{ overflow: "hidden", borderRadius: "16px" }}>
                      <Box
                        component="img"
                        src={image}
                        alt={getRoomName(room)}
                        sx={{ width: "100%", height: 150, objectFit: "cover" }}
                      />
                    </AppCard>
                  </Grid>
                ))}
              </Grid>

              <AppCard sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
                <Stack spacing={2.5}>
                  <AppCard
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      background: "var(--surface-page)",
                      border: "1px solid var(--border-default)",
                      boxShadow: "none",
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ bgcolor: "#B8975A", color: "#FFFFFF", width: 52, height: 52 }}>
                        {getProviderInitials(
                          provider?.businessName || room?.provider?.providerProfile?.businessName || ""
                        )}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Heading sx={{ fontSize: "20px", mb: 0.5 }}>
                          {provider?.businessName ||
                            room?.provider?.providerProfile?.businessName ||
                            "Verified provider"}
                        </Heading>
                        <SubHeading sx={{ color: "#475569" }}>
                          {(provider?.businessType ||
                            room?.provider?.providerProfile?.businessType ||
                            "Stay provider") +
                            " - " +
                            getProviderLocation(provider || room?.provider?.providerProfile)}
                        </SubHeading>
                      </Box>
                      {(provider?.verificationStatus ||
                        room?.provider?.providerProfile?.verificationStatus) === "approved" ? (
                        <Chip
                          label="Verified"
                          sx={{
                            ml: "auto",
                            flexShrink: 0,
                            background: "#D1EAE0",
                            color: "#1F4D3A",
                            fontWeight: 700,
                          }}
                        />
                      ) : null}
                    </Stack>
                  </AppCard>

                  <Box>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                    >
                      <Box>
                        <Heading sx={{ mb: 1 }}>{getRoomName(room)}</Heading>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#475569" }}>
                          <MapPin size={16} />
                          <SubHeading>{getRoomLocation(room)}</SubHeading>
                        </Box>
                      </Box>
                      <Chip
                        label={
                          isInstantBooking ? "Instant Booking" : "Request to Book"
                        }
                        sx={{
                          background: isInstantBooking ? "#FDF8F0" : "#FEF3C7",
                          color: isInstantBooking ? "#9E7E45" : "#92400E",
                          border: isInstantBooking ? "1px solid #EDD9B0" : "none",
                          fontWeight: 700,
                          alignSelf: "flex-start",
                        }}
                      />
                    </Stack>
                  </Box>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Chip icon={<Users size={16} />} label={`Up to ${getRoomCapacity(room)} guests`} />
                    <Chip
                      icon={<CalendarDays size={16} />}
                      label={`$${thousandSeparatorNumber(nightlyRate)}/night`}
                    />
                  </Stack>

                  <SubHeading sx={{ color: "text.secondary", lineHeight: 1.8 }}>
                    {getRoomDescription(room)}
                  </SubHeading>

                  <Box>
                    <Heading sx={{ fontSize: "22px", mb: 1.5 }}>Amenities</Heading>
                    {getAmenities(room).length > 0 ? (
                      <Grid container spacing={1.5}>
                        {getAmenities(room).map((amenity: string) => (
                          <Grid item xs={12} sm={6} md={4} key={amenity}>
                            <Chip
                              label={formatAmenity(amenity)}
                              sx={{
                                background: "#F7EDDA",
                                color: "#7D6234",
                                fontWeight: 700,
                              }}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <SubHeading>No amenities listed yet.</SubHeading>
                    )}
                  </Box>

                  <Box sx={{ background: "var(--success-bg)", borderRadius: "12px", padding: "16px" }}>
                    <Heading sx={{ fontSize: "22px", mb: 1.5 }}>Policies</Heading>
                    <Stack spacing={1}>
                      <SubHeading sx={{ color: "text.secondary" }}>
                        Check-in: {checkInTime} / Check-out: {checkOutTime}
                      </SubHeading>
                      <SubHeading sx={{ color: "text.secondary" }}>
                        {room?.cancellationPolicyCustomText ||
                          CANCELLATION_POLICY_MAP[policyCode] ||
                          "Cancellation policy will be shared by the provider before confirmation."}
                      </SubHeading>
                    </Stack>
                  </Box>
                </Stack>
              </AppCard>
            </Stack>
          </Grid>

          <Grid item xs={12} lg={4}>
            <AppCard
              elevation="floating"
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: 3,
                position: { lg: "sticky" },
                top: 80,
              }}
            >
              <Stack spacing={2}>
                <Box>
                  <Heading sx={{ fontSize: "24px" }}>Book this stay</Heading>
                  <SubHeading>Select dates, check availability, then confirm your booking.</SubHeading>
                </Box>

                <Chip
                  label={isInstantBooking ? "Instant Booking" : "Request to Book"}
                  sx={{
                    alignSelf: "flex-start",
                    background: isInstantBooking ? "#FDF8F0" : "#FEF3C7",
                    color: isInstantBooking ? "#9E7E45" : "#92400E",
                    border: isInstantBooking ? "1px solid #EDD9B0" : "none",
                    fontWeight: 700,
                  }}
                />

                <Box sx={{ fontSize: "32px", fontWeight: 800, color: "text.primary" }}>
                  ${thousandSeparatorNumber(nightlyRate)}
                  <Box
                    component="span"
                    sx={{ fontSize: "14px", fontWeight: 600, color: "#64748B", ml: 0.5 }}
                  >
                    /night
                  </Box>
                </Box>

                <Box component="form" onSubmit={handlePrimaryAction}>
                  <Stack spacing={2}>
                    <Stepper activeStep={bookingStep} alternativeLabel>
                      <Step>
                        <StepLabel>Dates</StepLabel>
                      </Step>
                      <Step>
                        <StepLabel>Guest info</StepLabel>
                      </Step>
                      <Step>
                        <StepLabel>Review</StepLabel>
                      </Step>
                    </Stepper>

                    {bookingStep === 0 ? (
                      <Stack spacing={2}>
                        <BookingCalendar
                          roomId={roomId}
                          value={{ checkIn: form.checkIn, checkOut: form.checkOut }}
                          onChange={(value) => setForm((prev) => ({ ...prev, ...value }))}
                          minNights={room?.minNights}
                          maxNights={room?.maxNights}
                          timezone={roomTimezone}
                          currentDate={room?.currentDate || availabilityData?.currentDate}
                        />

                        {occupancyRule ? (
                          <Box sx={{ p: 2, background: "var(--surface-page)", borderRadius: "8px" }}>
                            <Stack spacing={1.5}>
                              {[
                                {
                                  field: "adultCount" as const,
                                  label: "Adults",
                                  min: 1,
                                  max: Number(occupancyRule.maxAdults ?? 1),
                                  value: form.adultCount,
                                },
                                {
                                  field: "childCount" as const,
                                  label: "Children",
                                  min: 0,
                                  max: Number(occupancyRule.maxChildren ?? 0),
                                  value: form.childCount,
                                },
                                {
                                  field: "infantCount" as const,
                                  label: "Infants",
                                  min: 0,
                                  max: Number(occupancyRule.maxInfants ?? 0),
                                  value: form.infantCount,
                                },
                              ].map((counter) => (
                                <Stack
                                  key={counter.field}
                                  direction="row"
                                  justifyContent="space-between"
                                  alignItems="center"
                                  spacing={1.5}
                                >
                                  <SubHeading sx={{ color: "text.secondary", fontWeight: 700 }}>
                                    {counter.label}
                                  </SubHeading>
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        updateOccupancyCount(
                                          counter.field,
                                          -1,
                                          counter.min,
                                          counter.max
                                        )
                                      }
                                      disabled={counter.value <= counter.min}
                                      sx={{ border: "1px solid", borderColor: "divider" }}
                                    >
                                      <Minus size={12} />
                                    </IconButton>
                                    <Box sx={{ width: 28, textAlign: "center", fontWeight: 800 }}>
                                      {counter.value}
                                    </Box>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        updateOccupancyCount(
                                          counter.field,
                                          1,
                                          counter.min,
                                          counter.max
                                        )
                                      }
                                      disabled={counter.value >= counter.max}
                                      sx={{ border: "1px solid", borderColor: "divider" }}
                                    >
                                      <Plus size={12} />
                                    </IconButton>
                                  </Stack>
                                </Stack>
                              ))}
                              {occupancyExceeded ? (
                                <Chip
                                  color="warning"
                                  label={`Maximum ${occupancyRule.maxGuests} guests, excluding infants`}
                                  sx={{ alignSelf: "flex-start" }}
                                />
                              ) : null}
                            </Stack>
                          </Box>
                        ) : (
                          <AppInput
                            label="Guests"
                            type="number"
                            value={form.guests}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                guests: String(
                                  Math.min(
                                    getRoomCapacity(room),
                                    Math.max(1, Number(event.target.value || 1))
                                  )
                                ),
                              }))
                            }
                            inputProps={{ min: 1, max: getRoomCapacity(room) }}
                          />
                        )}
                        <AppInput
                          label="Special requests"
                          multiline
                          minRows={3}
                          value={form.specialRequests}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, specialRequests: event.target.value }))
                          }
                          placeholder="Arrival time, extra needs, notes..."
                        />

                        <Box sx={{ p: 2, background: "var(--surface-page)", borderRadius: "8px" }}>
                          <SubHeading sx={{ mb: 1 }}>Pricing breakdown</SubHeading>
                          <PriceBreakdown quote={quote} isLoading={isQuoteLoading} />
                        </Box>
                        <CouponInput
                          roomId={roomId}
                          checkIn={form.checkIn}
                          checkOut={form.checkOut}
                          adultCount={form.adultCount}
                          childCount={form.childCount}
                          onApply={(code) => setForm((prev) => ({ ...prev, couponCode: code }))}
                          onRemove={() => setForm((prev) => ({ ...prev, couponCode: "" }))}
                          appliedCode={form.couponCode}
                        />

                        {isAvailable === false && availabilityViolations.length > 0 ? (
                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            {availabilityViolations.map((violation: any) => (
                              <Chip
                                key={violation.code || violation.message}
                                color="warning"
                                label={violation.message || violation.code}
                              />
                            ))}
                          </Stack>
                        ) : null}

                        <AppButton
                          type="submit"
                          fullWidth
                          size="large"
                          disabled={
                            isCheckingAvailability ||
                            isQuoteLoading ||
                            isAvailable === false ||
                            occupancyExceeded ||
                            !form.checkIn ||
                            !form.checkOut
                          }
                        >
                          Continue
                        </AppButton>
                      </Stack>
                    ) : null}

                    {bookingStep === 1 ? (
                      <Stack spacing={2}>
                        <AppInput
                          label="Full name"
                          required
                          value={guestInfo.fullName}
                          onChange={(event) =>
                            setGuestInfo((prev) => ({ ...prev, fullName: event.target.value }))
                          }
                        />
                        <AppInput
                          label="Phone"
                          required
                          value={guestInfo.phone}
                          onChange={(event) =>
                            setGuestInfo((prev) => ({ ...prev, phone: event.target.value }))
                          }
                        />
                        <AppInput
                          label="National ID"
                          value={guestInfo.nationalId}
                          onChange={(event) =>
                            setGuestInfo((prev) => ({ ...prev, nationalId: event.target.value }))
                          }
                        />
                        <AppInput
                          label="Estimated arrival time"
                          value={guestInfo.estimatedArrivalTime}
                          onChange={(event) =>
                            setGuestInfo((prev) => ({
                              ...prev,
                              estimatedArrivalTime: event.target.value,
                            }))
                          }
                        />
                        <AppInput
                          label="Additional notes"
                          multiline
                          minRows={3}
                          value={guestInfo.additionalNotes}
                          onChange={(event) =>
                            setGuestInfo((prev) => ({
                              ...prev,
                              additionalNotes: event.target.value,
                            }))
                          }
                        />
                        <Stack direction="row" spacing={1.5}>
                          <AppButton
                            variant="outlined"
                            type="button"
                            onClick={() => setBookingStep(0)}
                          >
                            Back
                          </AppButton>
                          <AppButton
                            type="submit"
                            fullWidth
                            size="large"
                            disabled={!guestInfo.fullName.trim() || !guestInfo.phone.trim()}
                          >
                            Continue
                          </AppButton>
                        </Stack>
                      </Stack>
                    ) : null}

                    {bookingStep === 2 ? (
                      <Stack spacing={2}>
                        <Box sx={{ p: 2, background: "var(--surface-page)", borderRadius: "8px" }}>
                          <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between" spacing={1}>
                              <SubHeading>Room</SubHeading>
                              <Box sx={{ fontWeight: 700, textAlign: "right" }}>
                                {getRoomName(room)}
                              </Box>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" spacing={1}>
                              <SubHeading>Stay</SubHeading>
                              <Box sx={{ fontWeight: 700, textAlign: "right" }}>
                                {formatPricingDate(form.checkIn)} to {formatPricingDate(form.checkOut)}
                              </Box>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" spacing={1}>
                              <SubHeading>Nights</SubHeading>
                              <Box sx={{ fontWeight: 700 }}>{nights || 0}</Box>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" spacing={1}>
                              <SubHeading>Guests</SubHeading>
                              <Box sx={{ fontWeight: 700 }}>
                                {occupancyRule
                                  ? `${form.adultCount} adults, ${form.childCount} children, ${form.infantCount} infants`
                                  : `${form.guests} guest${Number(form.guests) === 1 ? "" : "s"}`}
                              </Box>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" spacing={1}>
                              <SubHeading>Booking mode</SubHeading>
                              <Chip
                                size="small"
                                label={isInstantBooking ? "Instant Booking" : "Request to Book"}
                                sx={{
                                  background: isInstantBooking ? "#FDF8F0" : "#FEF3C7",
                                  color: isInstantBooking ? "#9E7E45" : "#92400E",
                                  border: isInstantBooking ? "1px solid #EDD9B0" : "none",
                                  fontWeight: 700,
                                }}
                              />
                            </Stack>
                          </Stack>
                        </Box>

                        <Box sx={{ p: 2, background: "var(--surface-page)", borderRadius: "8px" }}>
                          <SubHeading sx={{ mb: 1 }}>Pricing breakdown</SubHeading>
                          <PriceBreakdown quote={quote} isLoading={isQuoteLoading} />
                        </Box>

                        <Box sx={{ p: 2, background: "var(--surface-page)", borderRadius: "8px" }}>
                          <SubHeading sx={{ mb: 1 }}>Guest information</SubHeading>
                          <Stack spacing={0.75}>
                            <SubHeading sx={{ color: "text.secondary" }}>
                              {guestInfo.fullName || "Guest name not set"}
                            </SubHeading>
                            <SubHeading sx={{ color: "text.secondary" }}>
                              {guestInfo.phone || "Guest phone not set"}
                            </SubHeading>
                            {guestInfo.nationalId ? (
                              <SubHeading sx={{ color: "text.secondary" }}>
                                National ID: {guestInfo.nationalId}
                              </SubHeading>
                            ) : null}
                            {guestInfo.estimatedArrivalTime ? (
                              <SubHeading sx={{ color: "text.secondary" }}>
                                Arrival: {guestInfo.estimatedArrivalTime}
                              </SubHeading>
                            ) : null}
                            {guestInfo.additionalNotes ? (
                              <SubHeading sx={{ color: "text.secondary" }}>
                                Notes: {guestInfo.additionalNotes}
                              </SubHeading>
                            ) : null}
                          </Stack>
                        </Box>

                        <Box sx={{ p: 2, background: "var(--success-bg)", borderRadius: "12px" }}>
                          <SubHeading sx={{ mb: 1 }}>Cancellation policy</SubHeading>
                          <SubHeading sx={{ color: "text.secondary", lineHeight: 1.7 }}>
                            {room?.cancellationPolicyCustomText ||
                              CANCELLATION_POLICY_MAP[policyCode] ||
                              "Cancellation policy will be shared by the provider before confirmation."}
                          </SubHeading>
                        </Box>

                        <Stack direction="row" spacing={1.5}>
                          <AppButton
                            variant="outlined"
                            type="button"
                            onClick={() => setBookingStep(1)}
                          >
                            Back
                          </AppButton>
                          <AppButton
                            type="submit"
                            fullWidth
                            size="large"
                            disabled={isBooking || isSubmittingGuestInfo || isQuoteLoading}
                          >
                            {isBooking || isSubmittingGuestInfo ? "Confirming..." : "Confirm Booking"}
                          </AppButton>
                        </Stack>
                      </Stack>
                    ) : null}
                  </Stack>
                </Box>
              </Stack>
            </AppCard>
          </Grid>
        </Grid>
      </AppContainer>

      <ToastAlert
        appearence={toast.appearence}
        type={toast.type}
        message={toast.message}
        handleClose={handleCloseToast}
      />
    </Box>
  );
};

export default RoomDetail;
