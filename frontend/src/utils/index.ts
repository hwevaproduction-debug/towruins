import { parsePhoneNumber } from "libphonenumber-js";
import moment from "moment";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// prevent auto form submission
export function onKeyDown(keyEvent: any) {
  if ((keyEvent.charCode || keyEvent.keyCode) === 13) {
    keyEvent.preventDefault();
  }
}

// remove dash and space from the number
export const removeDashAndSpace = (value: string) => {
  return value.replace(/[- ]/g, "");
};

// Format Date Time 2023-11-19T08:58:06.435Z => 11/19/2023, 1:58:06 PM
export function formatDateTime(dateString: string) {
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  };

  const date = new Date(dateString);
  const formattedDateTime = date.toLocaleString("en-US", options);

  return formattedDateTime;
}

const parseDateOnlyAsUtc = (value: string) => {
  const match = DATE_ONLY_PATTERN.exec(value);

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

const formatDateOnly = (dateString: string) => {
  const parsed = parseDateOnlyAsUtc(dateString);

  if (!parsed) return dateString;

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
};

export function getDateStringForTimeZone(
  value?: string | Date | null,
  timeZone?: string | null
) {
  if (!value) return "";

  const rawValue = value instanceof Date ? value.toISOString() : String(value).trim();
  if (!rawValue) return "";

  if (DATE_ONLY_PATTERN.test(rawValue)) {
    return rawValue;
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);
      const year = parts.find((part) => part.type === "year")?.value;
      const month = parts.find((part) => part.type === "month")?.value;
      const day = parts.find((part) => part.type === "day")?.value;

      if (year && month && day) {
        return `${year}-${month}-${day}`;
      }
    } catch {
      // Fall through to the UTC date below when the supplied timezone is invalid.
    }
  }

  return date.toISOString().slice(0, 10);
}

// 2023-11-21T19:00:00.000Z => 11/22/2023
export function formatDate(dateString: string | Date, timeZone?: string | null) {
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };

  const rawValue = dateString instanceof Date ? dateString.toISOString() : String(dateString || "").trim();
  const localDateString =
    DATE_ONLY_PATTERN.test(rawValue) || timeZone
      ? getDateStringForTimeZone(rawValue, timeZone)
      : "";

  if (localDateString) {
    return formatDateOnly(localDateString);
  }

  const date = dateString instanceof Date ? dateString : new Date(dateString);
  const formattedDateTime = date.toLocaleString("en-US", options);

  return formattedDateTime;
}

// "2023-11-21T11:00:00.644Z" ===> 4:00:00 PM
export function formatTime(inputDateString: string) {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  };

  const date = new Date(inputDateString);
  const formattedDateTime = date.toLocaleString("en-US", options);

  return formattedDateTime;
}

// Masking Mobile Number +923234910944 => 0323 4910955
export const maskingPhoneNumber = (value: any) => {
  if (value) {
    const phoneNumber = parsePhoneNumber(value);
    return phoneNumber.formatNational();
  }
};

export const add30Minutes = (timeString: string) => {
  // Parse the input time string using moment
  const momentTime = moment(timeString);

  // Add 30 minutes
  const newTime = momentTime.add(30, "minutes");

  // Format the result back to the original string format
  const formattedTime = newTime.format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ");

  return formattedTime;
};

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizeBaseUrl(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimTrailingSlashes(trimmedValue);
  }

  const normalizedPath = trimTrailingSlashes(trimmedValue).replace(/^\/+/, "");
  if (!normalizedPath) return "/";

  return `/${normalizedPath}`;
}

function shouldUpgradeToHttps(url: URL) {
  if (typeof window === "undefined") return false;
  if (window.location.protocol !== "https:") return false;

  return !["localhost", "127.0.0.1"].includes(url.hostname);
}

function normalizeConfiguredBaseUrl(value: string) {
  const normalizedValue = normalizeBaseUrl(value);
  if (!/^http:\/\//i.test(normalizedValue)) {
    return normalizedValue;
  }

  try {
    const parsedUrl = new URL(normalizedValue);
    if (!shouldUpgradeToHttps(parsedUrl)) {
      return normalizedValue;
    }

    parsedUrl.protocol = "https:";
    return trimTrailingSlashes(parsedUrl.toString());
  } catch {
    return normalizedValue;
  }
}

export function joinUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedPath = path.replace(/^\/+/, "");

  if (!normalizedBaseUrl || normalizedBaseUrl === "/") {
    return `/${normalizedPath}`;
  }

  return `${normalizedBaseUrl}/${normalizedPath}`;
}

export function getApiBaseUrl() {
  const apiUrl = normalizeConfiguredBaseUrl(process.env.REACT_APP_API_URL || "");
  if (apiUrl) return apiUrl;

  const backendUrl = normalizeConfiguredBaseUrl(
    process.env.REACT_APP_BACKEND_URL || ""
  );
  if (backendUrl) return joinUrl(backendUrl, "api/v1");

  return "";
}

export function buildUploadSignUrl(contentType: string, folder: string) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error(
      "Missing API configuration. Set REACT_APP_API_URL or REACT_APP_BACKEND_URL."
    );
  }

  const params = new URLSearchParams({
    contentType,
    folder,
  });

  return `${joinUrl(apiBaseUrl, "uploads/r2-sign")}?${params.toString()}`;
}

// Salman Muazam => SM
export function getNameInitials(name: string) {
  const words = name?.split(" ");
  const initials = words?.map((word) => word.charAt(0).toUpperCase());
  return initials?.join("");
}

export function convertToAMPMFormat(timestamp: string) {
  const date = new Date(timestamp);

  let hours = date.getHours();
  let minutes: any = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";

  // Convert hours to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // If hours is 0, set it to 12

  // Add leading zero to minutes if needed
  minutes = minutes < 10 ? "0" + minutes : minutes;

  // Concatenate hours, minutes, and AM/PM
  const timeString = `${hours}:${minutes} ${ampm}`;

  return timeString;
}

// 1200 => 1,200
export function thousandSeparatorNumber(number: number) {
  // Check if the input is a valid number
  if (typeof number !== "number" || isNaN(number)) {
    return "Invalid number";
  }

  // Convert the number to a string
  const numberString = number.toString();

  // Split the string into integer and decimal parts
  const [integerPart, decimalPart] = numberString.split(".");

  // Add thousand separators to the integer part
  const formattedIntegerPart = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ","
  );

  // Combine the formatted integer part and the decimal part (if exists)
  const formattedNumber = decimalPart
    ? `${formattedIntegerPart}.${decimalPart}`
    : formattedIntegerPart;

  return formattedNumber;
}

// 2023-11-28T19:07:32.365Z ===> Nov 29, 2023 and also return time
export function convertToFormattedDate(dateString: string) {
  const date = new Date(dateString);
  const formattedDate = date.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  return formattedDate;
}
