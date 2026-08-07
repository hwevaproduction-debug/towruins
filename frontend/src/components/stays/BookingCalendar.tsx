import { useMemo, useState } from "react";
import { Box, Chip, IconButton, Stack } from "@mui/material";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useGetRoomCalendarQuery } from "../../redux/api/stayApiSlice";
import { getDateStringForTimeZone } from "../../utils";

interface BookingCalendarProps {
  roomId: string;
  value: { checkIn: string; checkOut: string };
  onChange: (value: { checkIn: string; checkOut: string }) => void;
  minNights?: number;
  maxNights?: number | null;
  timezone?: string;
  currentDate?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const SELECTED_COLOR = "#B8975A";
const IN_RANGE_COLOR = "#F7EDDA";
const UNAVAILABLE_COLOR = "#F1F3F5";
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const toLocalIsoDate = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const toIsoDate = (year: number, month: number, day: number) =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const parseIsoDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

const getDateParts = (value: string) => {
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
};

const diffDays = (start: string, end: string) => {
  const diff = parseIsoDate(end).getTime() - parseIsoDate(start).getTime();

  return Math.round(diff / (24 * 60 * 60 * 1000));
};

const hasUnavailableBetween = (start: string, end: string, unavailableDates: Set<string>) => {
  const cursor = parseIsoDate(start);
  const endDate = parseIsoDate(end);

  cursor.setUTCDate(cursor.getUTCDate() + 1);

  while (cursor < endDate) {
    if (unavailableDates.has(toLocalIsoDate(cursor))) {
      return true;
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return false;
};

const formatPrice = (price?: number) => {
  if (!Number.isFinite(Number(price))) {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(price));
};

const getCellStyles = ({
  isPast,
  isUnavailable,
  isCheckIn,
  isCheckOut,
  isInRange,
  isTooClose,
  isTooFar,
}: {
  isPast: boolean;
  isUnavailable: boolean;
  isCheckIn: boolean;
  isCheckOut: boolean;
  isInRange: boolean;
  isTooClose: boolean;
  isTooFar: boolean;
}) => {
  const isSelected = isCheckIn || isCheckOut;
  const muted = isUnavailable || isTooClose || isTooFar;

  return {
    minHeight: 56,
    border: "1px solid transparent",
    borderRadius: "8px",
    p: 0.75,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 0.25,
    font: "inherit",
    cursor: isPast || muted ? "not-allowed" : "pointer",
    opacity: isPast ? 0.35 : 1,
    background: isSelected ? SELECTED_COLOR : isInRange ? IN_RANGE_COLOR : muted ? UNAVAILABLE_COLOR : "var(--surface-card)",
    color: isSelected ? "#fff" : isInRange ? "#7D6234" : "var(--text-primary)",
    textDecoration: isUnavailable ? "line-through" : "none",
    transition: "background 120ms ease, border-color 120ms ease",
    "&:hover": {
      background: isPast || muted || isSelected ? undefined : "#FDF8F0",
      borderColor: isPast || muted || isSelected ? "transparent" : "#EDD9B0",
    },
  };
};

const BookingCalendar = ({
  roomId,
  value,
  onChange,
  minNights,
  maxNights,
  timezone,
  currentDate,
}: BookingCalendarProps) => {
  const initialTodayIso = useMemo(
    () => currentDate || getDateStringForTimeZone(new Date(), timezone),
    [currentDate, timezone]
  );
  const initialDateParts = getDateParts(initialTodayIso) || {
    year: new Date().getUTCFullYear(),
    month: new Date().getUTCMonth() + 1,
    day: new Date().getUTCDate(),
  };
  const [currentYear, setCurrentYear] = useState(initialDateParts.year);
  const [currentMonth, setCurrentMonth] = useState(initialDateParts.month);
  const { data: calendar, isFetching, isError } = useGetRoomCalendarQuery(
    { roomId, year: currentYear, month: currentMonth },
    { skip: !roomId }
  );
  const calendarData = calendar?.data;
  const todayIso =
    calendarData?.currentDate ||
    currentDate ||
    getDateStringForTimeZone(new Date(), calendarData?.timezone || timezone);
  const todayParts = getDateParts(todayIso) || initialDateParts;
  const effectiveMinNights = minNights ?? calendarData?.minNights ?? 1;
  const effectiveMaxNights = maxNights ?? calendarData?.maxNights ?? null;
  const unavailableDates = useMemo(
    () => new Set(calendarData?.unavailableDates || []),
    [calendarData?.unavailableDates]
  );
  const monthTitle = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(currentYear, currentMonth - 1, 1))),
    [currentMonth, currentYear]
  );
  const firstDay = new Date(Date.UTC(currentYear, currentMonth - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
  const isAtCurrentMonth =
    currentYear < todayParts.year ||
    (currentYear === todayParts.year && currentMonth <= todayParts.month);

  const goToPreviousMonth = () => {
    if (isAtCurrentMonth) return;

    if (currentMonth === 1) {
      setCurrentYear((year) => year - 1);
      setCurrentMonth(12);
      return;
    }

    setCurrentMonth((month) => month - 1);
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((year) => year + 1);
      setCurrentMonth(1);
      return;
    }

    setCurrentMonth((month) => month + 1);
  };

  const handleDateClick = (isoDate: string, disabled: boolean) => {
    if (disabled) return;

    if (!value.checkIn || value.checkOut) {
      onChange({ checkIn: isoDate, checkOut: "" });
      return;
    }

    if (isoDate <= value.checkIn) {
      onChange({ checkIn: isoDate, checkOut: "" });
      return;
    }

    const selectedNights = diffDays(value.checkIn, isoDate);

    if (selectedNights < effectiveMinNights) {
      return;
    }

    if (effectiveMaxNights != null && selectedNights > effectiveMaxNights) {
      return;
    }

    if (hasUnavailableBetween(value.checkIn, isoDate, unavailableDates)) {
      return;
    }

    onChange({ checkIn: value.checkIn, checkOut: isoDate });
  };

  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "12px", p: 2, background: "background.paper" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <IconButton
          aria-label="Previous month"
          size="small"
          onClick={goToPreviousMonth}
          disabled={isAtCurrentMonth}
          sx={{ border: "1px solid #e2e8f0", borderRadius: "8px" }}
        >
          <FaChevronLeft size={14} />
        </IconButton>
        <Box sx={{ fontWeight: 700, color: "text.primary" }}>{monthTitle}</Box>
        <IconButton
          aria-label="Next month"
          size="small"
          onClick={goToNextMonth}
          sx={{ border: "1px solid #e2e8f0", borderRadius: "8px" }}
        >
          <FaChevronRight size={14} />
        </IconButton>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: "4px",
          mb: 0.5,
        }}
      >
        {WEEKDAYS.map((weekday) => (
          <Box key={weekday} sx={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>
            {weekday}
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: "4px",
        }}
      >
        {Array.from({ length: firstDay }).map((_, index) => (
          <Box key={`blank-${index}`} sx={{ minHeight: 56 }} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const isoDate = toIsoDate(currentYear, currentMonth, day);
          const price = calendarData?.pricingByDate?.[isoDate];
          const isPast = isoDate < todayIso;
          const isUnavailable = unavailableDates.has(isoDate);
          const isCheckIn = isoDate === value.checkIn;
          const isCheckOut = isoDate === value.checkOut;
          const isInRange = Boolean(value.checkIn && value.checkOut && isoDate > value.checkIn && isoDate < value.checkOut);
          const nightsFromCheckIn = value.checkIn && !value.checkOut ? diffDays(value.checkIn, isoDate) : 0;
          const isTooClose =
            Boolean(value.checkIn && !value.checkOut && isoDate > value.checkIn) &&
            nightsFromCheckIn < effectiveMinNights;
          const isTooFar =
            Boolean(value.checkIn && !value.checkOut && isoDate > value.checkIn && effectiveMaxNights != null) &&
            nightsFromCheckIn > Number(effectiveMaxNights);
          const disabled = isPast || isUnavailable || isTooClose || isTooFar;

          return (
            <Box
              component="button"
              type="button"
              key={isoDate}
              onClick={() => handleDateClick(isoDate, disabled)}
              sx={getCellStyles({
                isPast,
                isUnavailable,
                isCheckIn,
                isCheckOut,
                isInRange,
                isTooClose,
                isTooFar,
              })}
            >
              <Box component="span" sx={{ fontSize: 13, fontWeight: 800, lineHeight: 1 }}>
                {day}
              </Box>
              {!isUnavailable && price != null ? (
                <Box
                  component="span"
                  sx={{ fontSize: 10, color: isCheckIn || isCheckOut ? "#fff" : isInRange ? SELECTED_COLOR : "#64748b" }}
                >
                  {formatPrice(price)}
                </Box>
              ) : null}
            </Box>
          );
        })}
      </Box>

      <Stack spacing={1} sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid #f1f5f9" }}>
        {calendarData?.checkInFrom || calendarData?.checkOutBy ? (
          <Box sx={{ fontSize: 12, color: "#64748b" }}>
            {calendarData?.checkInFrom ? `Check-in from ${calendarData.checkInFrom}` : ""}
            {calendarData?.checkInFrom && calendarData?.checkOutBy ? " \u00b7 " : ""}
            {calendarData?.checkOutBy ? `Check-out by ${calendarData.checkOutBy}` : ""}
          </Box>
        ) : null}
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip
            size="small"
            label="Selected"
            icon={<Box sx={{ width: 10, height: 10, borderRadius: "2px", background: SELECTED_COLOR }} />}
          />
          <Chip
            size="small"
            label="In range"
            icon={<Box sx={{ width: 10, height: 10, borderRadius: "2px", background: IN_RANGE_COLOR }} />}
          />
          <Chip
            size="small"
            label="Unavailable"
            icon={<Box sx={{ width: 10, height: 10, borderRadius: "2px", background: UNAVAILABLE_COLOR }} />}
          />
          {isFetching ? <Chip size="small" label="Updating" /> : null}
          {isError ? <Chip size="small" color="warning" label="Calendar unavailable" /> : null}
        </Stack>
      </Stack>
    </Box>
  );
};

export default BookingCalendar;
