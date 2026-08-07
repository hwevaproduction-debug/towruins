import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { StaySearchParams } from "../redux/api/stayApiSlice";

export interface StayFilterState {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  minPrice: string;
  maxPrice: string;
  searchTerm: string;
  businessType: string;
  bookingMode: string;
  amenities: string[];
  sort: string;
  roomType: string;
  minRating: string;
  lat: string;
  lng: string;
  radius: string;
  selfCheckIn: boolean;
  page: number;
  limit: number;
}

export type StayFilterField = keyof StayFilterState;

export const DEFAULT_STAY_FILTERS: StayFilterState = {
  location: "",
  checkIn: "",
  checkOut: "",
  guests: "1",
  minPrice: "",
  maxPrice: "",
  searchTerm: "",
  businessType: "",
  bookingMode: "",
  amenities: [],
  sort: "newest",
  roomType: "",
  minRating: "",
  lat: "",
  lng: "",
  radius: "",
  selfCheckIn: false,
  page: 1,
  limit: 12,
};

const TEXT_FIELDS = new Set<StayFilterField>(["location", "searchTerm"]);
const BOOLEAN_FIELDS = new Set<StayFilterField>(["selfCheckIn"]);

const parsePositiveInt = (value: string | null, defaultValue: number) => {
  const parsed = Number(value || "");

  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
};

const parseBoolean = (value: string | null) =>
  value === "true" || value === "1" || value === "yes";

export const readStayFilters = (searchParams: URLSearchParams): StayFilterState => ({
  ...DEFAULT_STAY_FILTERS,
  location: searchParams.get("location") || "",
  checkIn: searchParams.get("checkIn") || "",
  checkOut: searchParams.get("checkOut") || "",
  guests: searchParams.get("guests") || DEFAULT_STAY_FILTERS.guests,
  minPrice: searchParams.get("minPrice") || "",
  maxPrice: searchParams.get("maxPrice") || "",
  searchTerm: searchParams.get("searchTerm") || "",
  businessType: searchParams.get("businessType") || "",
  bookingMode: searchParams.get("bookingMode") || "",
  amenities: searchParams.getAll("amenities"),
  sort: searchParams.get("sort") || DEFAULT_STAY_FILTERS.sort,
  roomType: searchParams.get("roomType") || "",
  minRating: searchParams.get("minRating") || "",
  lat: searchParams.get("lat") || "",
  lng: searchParams.get("lng") || "",
  radius: searchParams.get("radius") || "",
  selfCheckIn: parseBoolean(searchParams.get("selfCheckIn")),
  page: parsePositiveInt(searchParams.get("page"), DEFAULT_STAY_FILTERS.page),
  limit: Math.min(parsePositiveInt(searchParams.get("limit"), DEFAULT_STAY_FILTERS.limit), 48),
});

export const buildStaySearchParams = (filters: StayFilterState): URLSearchParams => {
  const nextSearchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (key === "amenities") {
      (value as string[]).forEach((amenity) => {
        if (amenity) {
          nextSearchParams.append(key, amenity);
        }
      });
      return;
    }

    if (BOOLEAN_FIELDS.has(key as StayFilterField)) {
      if (value === true) {
        nextSearchParams.set(key, "true");
      }
      return;
    }

    if (key === "page") {
      if (Number(value) > DEFAULT_STAY_FILTERS.page) {
        nextSearchParams.set(key, String(value));
      }
      return;
    }

    if (key === "limit") {
      if (Number(value) !== DEFAULT_STAY_FILTERS.limit) {
        nextSearchParams.set(key, String(value));
      }
      return;
    }

    if (key === "sort" && value === DEFAULT_STAY_FILTERS.sort) {
      return;
    }

    if (value !== undefined && value !== null && value !== "") {
      nextSearchParams.set(key, String(value));
    }
  });

  return nextSearchParams;
};

const isValidDateRange = (checkIn: string, checkOut: string) => {
  if (!checkIn || !checkOut) {
    return false;
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  return (
    !Number.isNaN(checkInDate.getTime()) &&
    !Number.isNaN(checkOutDate.getTime()) &&
    checkInDate < checkOutDate
  );
};

export const buildStayQueryParams = (filters: StayFilterState): StaySearchParams => {
  const params: StaySearchParams = {
    location: filters.location,
    guests: filters.guests,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    searchTerm: filters.searchTerm,
    businessType: filters.businessType,
    bookingMode: filters.bookingMode,
    amenities: filters.amenities,
    sort: filters.sort,
    roomType: filters.roomType,
    minRating: filters.minRating,
    lat: filters.lat,
    lng: filters.lng,
    radius: filters.radius,
    page: filters.page,
    limit: filters.limit,
  };

  if (isValidDateRange(filters.checkIn, filters.checkOut)) {
    params.checkIn = filters.checkIn;
    params.checkOut = filters.checkOut;
  }

  if (filters.selfCheckIn) {
    params.selfCheckIn = true;
  }

  return params;
};

const FILTER_LABELS: Partial<Record<StayFilterField, string>> = {
  location: "Location",
  checkIn: "Check-in",
  checkOut: "Check-out",
  guests: "Guests",
  minPrice: "Min price",
  maxPrice: "Max price",
  searchTerm: "Search",
  businessType: "Property type",
  bookingMode: "Booking type",
  roomType: "Room type",
  minRating: "Rating",
  lat: "Latitude",
  lng: "Longitude",
  radius: "Radius",
  selfCheckIn: "Self check-in",
};

export const getActiveStayFilterCount = (filters: StayFilterState) => {
  let count = 0;

  Object.entries(filters).forEach(([key, value]) => {
    if (["page", "limit", "sort"].includes(key)) {
      return;
    }

    if (key === "guests") {
      if (String(value) !== DEFAULT_STAY_FILTERS.guests) {
        count += 1;
      }
      return;
    }

    if (key === "amenities") {
      if ((value as string[]).length > 0) {
        count += 1;
      }
      return;
    }

    if (typeof value === "boolean") {
      if (value) {
        count += 1;
      }
      return;
    }

    if (value) {
      count += 1;
    }
  });

  return count;
};

export const getActiveStayFilterSummary = (filters: StayFilterState) => {
  const summary: string[] = [];

  Object.entries(filters).forEach(([key, value]) => {
    if (["page", "limit", "sort"].includes(key)) {
      return;
    }

    if (key === "guests" && String(value) === DEFAULT_STAY_FILTERS.guests) {
      return;
    }

    if (key === "amenities") {
      const amenities = value as string[];

      if (amenities.length) {
        summary.push(`${amenities.length} amenity${amenities.length === 1 ? "" : "ies"}`);
      }
      return;
    }

    if (typeof value === "boolean") {
      if (value) {
        summary.push(FILTER_LABELS[key as StayFilterField] || key);
      }
      return;
    }

    if (value) {
      summary.push(`${FILTER_LABELS[key as StayFilterField] || key}: ${value}`);
    }
  });

  return summary;
};

export const useStayFilters = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const debounceTimerRef = useRef<number | null>(null);
  const appliedFilters = useMemo(() => readStayFilters(searchParams), [searchParams]);
  const [filters, setFilters] = useState<StayFilterState>(appliedFilters);

  useEffect(() => {
    setFilters(appliedFilters);
  }, [appliedFilters]);

  useEffect(
    () => () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    },
    []
  );

  const commitFilters = useCallback(
    (nextFilters: StayFilterState, replace = false) => {
      setSearchParams(buildStaySearchParams(nextFilters), { replace });
    },
    [setSearchParams]
  );

  const updateField = useCallback(
    (field: StayFilterField, value: StayFilterState[StayFilterField]) => {
      setFilters((previousFilters) => {
        const nextFilters = {
          ...previousFilters,
          [field]: value,
          page: field === "page" ? Number(value) : 1,
        } as StayFilterState;

        if (debounceTimerRef.current) {
          window.clearTimeout(debounceTimerRef.current);
        }

        if (TEXT_FIELDS.has(field)) {
          debounceTimerRef.current = window.setTimeout(() => {
            commitFilters(nextFilters, true);
          }, 350);
        } else {
          commitFilters(nextFilters);
        }

        return nextFilters;
      });
    },
    [commitFilters]
  );

  const updateFields = useCallback(
    (updates: Partial<StayFilterState>) => {
      setFilters((previousFilters) => {
        const nextFilters = {
          ...previousFilters,
          ...updates,
          page: updates.page != null ? Number(updates.page) : 1,
        } as StayFilterState;

        if (debounceTimerRef.current) {
          window.clearTimeout(debounceTimerRef.current);
        }

        commitFilters(nextFilters);

        return nextFilters;
      });
    },
    [commitFilters]
  );

  const applyFilters = useCallback(
    (nextFilters: StayFilterState) => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }

      const committedFilters = {
        ...nextFilters,
        page: 1,
      };

      setFilters(committedFilters);
      commitFilters(committedFilters);
    },
    [commitFilters]
  );

  const clearFilters = useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    setFilters(DEFAULT_STAY_FILTERS);
    navigate("/stays");
  }, [navigate]);

  const queryParams = useMemo(() => buildStayQueryParams(appliedFilters), [appliedFilters]);
  const activeFilterCount = useMemo(
    () => getActiveStayFilterCount(appliedFilters),
    [appliedFilters]
  );
  const activeFilterSummary = useMemo(
    () => getActiveStayFilterSummary(appliedFilters),
    [appliedFilters]
  );

  return {
    filters,
    appliedFilters,
    queryParams,
    activeFilterCount,
    activeFilterSummary,
    updateField,
    updateFields,
    clearFilters,
    applyFilters,
  };
};
