const DEFAULT_TIMEZONE = "Africa/Harare";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const getDateParts = (date, timezone) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  return formatter.formatToParts(date).reduce((parts, part) => {
    if (part.type !== "literal") {
      parts[part.type] = Number(part.value);
    }

    return parts;
  }, {});
};

const getTimezoneOffsetMs = (date, timezone) => {
  const parts = getDateParts(date, timezone);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return localAsUtc - date.getTime();
};

const parseDateString = (dateString) => {
  const match = DATE_PATTERN.exec(String(dateString || "").trim());

  if (!match) {
    throw new Error("dateString must be in YYYY-MM-DD format");
  }

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  ) {
    throw new Error("dateString must be a valid calendar date");
  }

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
};

const toUtcMidnight = (dateString, timezone = DEFAULT_TIMEZONE) => {
  const { year, month, day } = parseDateString(dateString);
  const localMidnightAsUtc = Date.UTC(year, month - 1, day);

  let result = new Date(localMidnightAsUtc - getTimezoneOffsetMs(new Date(localMidnightAsUtc), timezone));
  const correctedOffset = getTimezoneOffsetMs(result, timezone);
  result = new Date(localMidnightAsUtc - correctedOffset);

  return result;
};

const toLocalDateString = (date, timezone = DEFAULT_TIMEZONE) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("date must be valid");
  }

  const parts = getDateParts(parsedDate, timezone);
  const year = String(parts.year).padStart(4, "0");
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

module.exports = {
  DEFAULT_TIMEZONE,
  toUtcMidnight,
  toLocalDateString,
};
