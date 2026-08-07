import { useEffect, useState } from "react";
import {
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip as MuiTooltip,
} from "@mui/material";
import { ChevronLeft, ChevronRight, SlidersHorizontal, Star } from "lucide-react";
import { Heading, SubHeading } from "../Heading";
import AppButton from "../ui/AppButton";
import AppCard from "../ui/AppCard";
import { StayFilterField, StayFilterState } from "../../hooks/useStayFilters";

interface FilterPanelProps {
  filters: StayFilterState;
  onChange: (field: StayFilterField, value: StayFilterState[StayFilterField]) => void;
  onChangeMany: (updates: Partial<StayFilterState>) => void;
  onClear: () => void;
  activeFilterCount?: number;
}

const ROOM_TYPE_OPTIONS = [
  { label: "Any room type", value: "" },
  { label: "Single", value: "SINGLE" },
  { label: "Double", value: "DOUBLE" },
  { label: "Twin", value: "TWIN" },
  { label: "Suite", value: "SUITE" },
  { label: "Studio", value: "STUDIO" },
  { label: "Entire unit", value: "ENTIRE_UNIT" },
];

const BOOKING_MODE_OPTIONS = [
  { label: "Instant", value: "INSTANT" },
  { label: "Request", value: "REQUEST" },
];

const AMENITY_OPTIONS = [
  { label: "Wi-Fi", value: "wifi" },
  { label: "Breakfast Included", value: "breakfast" },
  { label: "Secure Parking", value: "parking" },
  { label: "Swimming Pool", value: "pool" },
  { label: "Air Conditioning", value: "aircon" },
  { label: "Conference Room", value: "conference-room" },
  { label: "Airport Pickup", value: "airport-pickup" },
  { label: "Family Friendly", value: "family-friendly" },
];

const sectionTitleSx = {
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "text.secondary",
  mb: 1.25,
};

const toggleGroupSx = {
  display: "flex",
  flexWrap: "wrap",
  gap: 0.5,
  "& .MuiToggleButtonGroup-grouped": {
    m: 0,
    border: "1px solid",
    borderColor: "divider",
  },
};

const toggleButtonSx = {
  borderRadius: "999px !important",
  fontSize: "12px",
  py: 0.5,
  px: 1.5,
  textTransform: "none",
  "&.Mui-selected": {
    background: "#B8975A",
    color: "#fff",
    "&:hover": { background: "#9E7E45" },
  },
};

const FilterPanel = ({
  filters,
  onChange,
  onChangeMany,
  onClear,
  activeFilterCount = 0,
}: FilterPanelProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const minPrice = Number(filters.minPrice) || 0;
  const maxPrice = Number(filters.maxPrice) || 2000;
  const normalizedMinPrice = Math.min(minPrice, maxPrice);
  const normalizedMaxPrice = Math.max(minPrice, maxPrice);
  const priceRange: [number, number] = [normalizedMinPrice, normalizedMaxPrice];
  const [draftPriceRange, setDraftPriceRange] = useState<[number, number]>(priceRange);

  useEffect(() => {
    setDraftPriceRange([normalizedMinPrice, normalizedMaxPrice]);
  }, [normalizedMinPrice, normalizedMaxPrice]);

  const toggleAmenity = (amenityValue: string) => {
    const nextAmenities = filters.amenities.includes(amenityValue)
      ? filters.amenities.filter((item) => item !== amenityValue)
      : [...filters.amenities, amenityValue];

    onChange("amenities", nextAmenities);
  };

  if (isCollapsed) {
    return (
      <Box
        onClick={() => setIsCollapsed(false)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: "pointer",
          background: "#B8975A",
          color: "#fff",
          borderRadius: "999px",
          px: 2,
          py: 1,
          fontSize: "14px",
          fontWeight: 700,
          width: "fit-content",
          position: "sticky",
          top: "88px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          transition: "all 0.25s ease",
          zIndex: 10,
        }}
      >
        <SlidersHorizontal size={16} />
        Filters
        {activeFilterCount > 0 ? `(${activeFilterCount})` : null}
        <ChevronRight size={14} />
      </Box>
    );
  }

  return (
    <AppCard
      elevation="flat"
      sx={{
        p: 2.5,
        borderRadius: "16px",
        position: "sticky",
        top: "88px",
        maxHeight: "calc(100vh - 108px)",
        overflowY: "auto",
      }}
    >
      <Stack spacing={2}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center" }}>
          <Heading sx={{ fontSize: "18px", fontWeight: 700 }}>Filters</Heading>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <AppButton size="small" variant="text" sx={{ color: "#1F4D3A" }} onClick={onClear}>
              Clear
            </AppButton>
            <MuiTooltip title="Collapse filters">
              <Box
                component="button"
                type="button"
                onClick={() => setIsCollapsed(true)}
                sx={{
                  border: "none",
                  background: "transparent",
                  color: "text.secondary",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  p: 0.5,
                }}
              >
                <ChevronLeft size={18} />
              </Box>
            </MuiTooltip>
          </Box>
        </Box>

        <Divider />

        <Box>
          <SubHeading sx={sectionTitleSx}>Price range</SubHeading>
          <Slider
            value={draftPriceRange}
            onChange={(_, newValue) => {
              const nextRange = newValue as number[];
              setDraftPriceRange([nextRange[0], nextRange[1]]);
            }}
            onChangeCommitted={(_, newValue) => {
              const nextRange = newValue as number[];
              const nextPriceRange: [number, number] = [
                Math.min(nextRange[0], nextRange[1]),
                Math.max(nextRange[0], nextRange[1]),
              ];

              setDraftPriceRange(nextPriceRange);
              onChangeMany({
                minPrice: String(nextPriceRange[0]),
                maxPrice: String(nextPriceRange[1]),
              });
            }}
            min={0}
            max={2000}
            step={50}
            valueLabelDisplay="auto"
            sx={{ color: "#B8975A" }}
          />
          <SubHeading sx={{ color: "text.secondary", fontSize: "13px" }}>
            ${draftPriceRange[0]} - ${draftPriceRange[1]}
          </SubHeading>
        </Box>

        <Divider />

        <Box>
          <SubHeading sx={sectionTitleSx}>Room type</SubHeading>
          <ToggleButtonGroup
            value={filters.roomType}
            exclusive
            onChange={(_, value) => value !== null && onChange("roomType", value)}
            sx={toggleGroupSx}
          >
            {ROOM_TYPE_OPTIONS.map((option) => (
              <ToggleButton key={option.value || "all"} value={option.value} sx={toggleButtonSx}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Divider />

        <Box>
          <SubHeading sx={sectionTitleSx}>Booking type</SubHeading>
          <ToggleButtonGroup
            value={filters.bookingMode}
            exclusive
            onChange={(_, value) => value !== null && onChange("bookingMode", value)}
            sx={toggleGroupSx}
          >
            {BOOKING_MODE_OPTIONS.map((option) => (
              <ToggleButton key={option.value} value={option.value} sx={toggleButtonSx}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Divider />

        <Box>
          <SubHeading sx={sectionTitleSx}>Amenities</SubHeading>
          <Stack spacing={0.5}>
            {AMENITY_OPTIONS.map((amenity) => (
              <FormControlLabel
                key={amenity.value}
                control={
                  <Checkbox
                    checked={filters.amenities.includes(amenity.value)}
                    onChange={() => toggleAmenity(amenity.value)}
                  />
                }
                label={amenity.label}
                sx={{ alignItems: "center", m: 0 }}
              />
            ))}
          </Stack>
        </Box>

        <Divider />

        <Box>
          <SubHeading sx={sectionTitleSx}>Minimum rating</SubHeading>
          <ToggleButtonGroup
            value={filters.minRating}
            exclusive
            onChange={(_, value) => value !== null && onChange("minRating", value)}
            sx={toggleGroupSx}
          >
            {["1", "2", "3", "4", "5"].map((rating) => (
              <ToggleButton key={rating} value={rating} sx={toggleButtonSx}>
                <Star size={11} style={{ marginRight: 3 }} />
                {rating}+
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Divider />

        <Box>
          <SubHeading sx={sectionTitleSx}>Property rules</SubHeading>
          <Stack spacing={0.5}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.selfCheckIn}
                  onChange={(event) => onChange("selfCheckIn", event.target.checked)}
                />
              }
              label="Self Check-in"
              sx={{ m: 0 }}
            />
          </Stack>
        </Box>
      </Stack>
    </AppCard>
  );
};

export default FilterPanel;
