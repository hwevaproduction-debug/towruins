const AppError = require("./appError");
const { DEFAULT_TIMEZONE, toLocalDateString, toUtcMidnight } = require("./dateUtils");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BOOKING_CANCELLED_STATUSES = ["CANCELLED", "DECLINED", "EXPIRED"];

const normalizeDateString = (value, label) => {
  if (value == null || value === "") {
    throw new AppError(`Invalid ${label}`, 400, "INVALID_DATE_RANGE");
  }

  const rawValue = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    const [year, month, day] = rawValue.split("-").map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day
    ) {
      throw new AppError(`Invalid ${label}`, 400, "INVALID_DATE_RANGE");
    }

    return rawValue;
  }

  const parsed = new Date(rawValue);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${label}`, 400, "INVALID_DATE_RANGE");
  }

  return parsed.toISOString().slice(0, 10);
};

const addDaysToDateString = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));

  return date.toISOString().slice(0, 10);
};

const getNightsBetweenDateStrings = (checkInDateString, checkOutDateString) => {
  const checkIn = new Date(`${checkInDateString}T00:00:00.000Z`);
  const checkOut = new Date(`${checkOutDateString}T00:00:00.000Z`);
  const diff = checkOut.getTime() - checkIn.getTime();

  return Math.round(diff / MS_PER_DAY);
};

const getRoomTimezone = (room) => room?.accommodation?.timezone || DEFAULT_TIMEZONE;

const normalizeStayDates = (rawCheckIn, rawCheckOut, timezone = DEFAULT_TIMEZONE) => {
  const checkInDateString = normalizeDateString(rawCheckIn, "checkIn");
  const checkOutDateString = normalizeDateString(rawCheckOut, "checkOut");
  const nights = getNightsBetweenDateStrings(checkInDateString, checkOutDateString);

  if (nights <= 0) {
    throw new AppError("checkOut must be after checkIn", 400, "INVALID_DATE_RANGE");
  }

  return {
    checkInDateString,
    checkOutDateString,
    checkIn: toUtcMidnight(checkInDateString, timezone),
    checkOut: toUtcMidnight(checkOutDateString, timezone),
    nights,
  };
};

const createViolation = (code, message, statusCode = 400) => ({
  code,
  message,
  statusCode,
});

const collectRuleViolations = (room, stayDates, guestCounts = {}, now = new Date()) => {
  const timezone = getRoomTimezone(room);
  const todayDateString = toLocalDateString(now, timezone);
  const today = toUtcMidnight(todayDateString, timezone);
  const maxAdvanceDays = Number(room?.maxAdvanceBookingDays ?? 90);
  const maxAdvanceDate = toUtcMidnight(addDaysToDateString(todayDateString, maxAdvanceDays), timezone);
  const violations = [];

  if (stayDates.checkIn < today) {
    violations.push(
      createViolation("PAST_DATE", "Check-in date cannot be in the past", 400)
    );
  }

  if (stayDates.checkIn > maxAdvanceDate) {
    violations.push(
      createViolation(
        "ADVANCE_BOOKING_EXCEEDED",
        `Check-in date cannot be more than ${maxAdvanceDays} days in advance`,
        400
      )
    );
  }

  const minNights = Number(room?.minNights || 1);
  if (stayDates.nights < minNights) {
    violations.push(
      createViolation("MIN_STAY_VIOLATION", `Minimum stay is ${minNights} night${minNights === 1 ? "" : "s"}`, 400)
    );
  }

  if (room?.maxNights != null && stayDates.nights > Number(room.maxNights)) {
    violations.push(
      createViolation("MAX_STAY_VIOLATION", `Maximum stay is ${room.maxNights} nights`, 400)
    );
  }

  if (room?.occupancyRule) {
    const rule = room.occupancyRule;
    const adultCount = Number(guestCounts.adultCount || 0);
    const childCount = Number(guestCounts.childCount || 0);
    const infantCount = Number(guestCounts.infantCount || 0);
    const totalGuests = adultCount + childCount;

    if (totalGuests > Number(rule.maxGuests)) {
      violations.push(
        createViolation("MAX_GUESTS_EXCEEDED", `Maximum guest count is ${rule.maxGuests}`, 400)
      );
    }

    if (adultCount > Number(rule.maxAdults)) {
      violations.push(
        createViolation("MAX_ADULTS_EXCEEDED", `Maximum adult count is ${rule.maxAdults}`, 400)
      );
    }

    if (childCount > Number(rule.maxChildren)) {
      violations.push(
        createViolation("MAX_CHILDREN_EXCEEDED", `Maximum child count is ${rule.maxChildren}`, 400)
      );
    }

    if (infantCount > Number(rule.maxInfants)) {
      violations.push(
        createViolation("MAX_INFANTS_EXCEEDED", `Maximum infant count is ${rule.maxInfants}`, 400)
      );
    }
  }

  if (room?.status !== "AVAILABLE") {
    violations.push(
      createViolation("ROOM_UNAVAILABLE", "Room is not available for booking", 409)
    );
  }

  return violations;
};

const throwViolation = (violation) => {
  throw new AppError(violation.message, violation.statusCode, violation.code);
};

const expandDateRange = (startDate, endDate, timezone = DEFAULT_TIMEZONE) => {
  const start = normalizeDateString(toLocalDateString(startDate, timezone), "startDate");
  const end = normalizeDateString(toLocalDateString(endDate, timezone), "endDate");
  const dates = [];
  let cursor = start;

  while (cursor < end) {
    dates.push(cursor);
    cursor = addDaysToDateString(cursor, 1);
  }

  return dates;
};

module.exports = {
  BOOKING_CANCELLED_STATUSES,
  addDaysToDateString,
  collectRuleViolations,
  createViolation,
  expandDateRange,
  getRoomTimezone,
  normalizeDateString,
  normalizeStayDates,
  throwViolation,
};
