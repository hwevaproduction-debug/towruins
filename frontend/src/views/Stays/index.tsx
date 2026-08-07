import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Box,
  Drawer,
  Fab,
  Grid,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Building,
  Building2,
  Home,
  Home as House,
  SlidersHorizontal,
  Trees,
  Users,
} from "lucide-react";
import { Heading, SubHeading } from "../../components/Heading";
import EmptyState from "../../components/stays/EmptyState";
import FilterPanel from "../../components/stays/FilterPanel";
import StayCard from "../../components/stays/StayCard";
import StayCardSkeleton from "../../components/stays/StayCardSkeleton";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppInput from "../../components/ui/AppInput";
import AppButton from "../../components/ui/AppButton";
import AppSelect from "../../components/ui/AppSelect";
import {
  DEFAULT_STAY_FILTERS,
  StayFilterField,
  StayFilterState,
  useStayFilters,
} from "../../hooks/useStayFilters";
import { useSearchStaysQuery } from "../../redux/api/stayApiSlice";
import HeroSlideshow from "../Home/HeroSlideshow";

const STAY_HERO_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1551882547-ff40c4a49f5e?auto=format&fit=crop&w=1920&q=80",
];

export const BUSINESS_TYPES = [
  { label: "All", value: "", icon: null },
  { label: "Hotel", value: "HOTEL", icon: <Building2 size={14} /> },
  { label: "Lodge", value: "LODGE", icon: <Trees size={14} /> },
  { label: "BnB", value: "BNB", icon: <Home size={14} /> },
  { label: "Apartment", value: "APARTMENT", icon: <Building size={14} /> },
  { label: "Guesthouse", value: "GUEST_HOUSE", icon: <House size={14} /> },
  { label: "Hostel", value: "HOSTEL", icon: <Users size={14} /> },
];

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price Low to High", value: "price_asc" },
  { label: "Price High to Low", value: "price_desc" },
  { label: "Rating", value: "rating_desc" },
  { label: "Distance", value: "distance" },
];

const heroInputSx = {
  "& .MuiInputBase-root": {
    background: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(184,151,90,0.35)",
  },
  "& .MuiInputBase-input::placeholder": {
    color: "rgba(255,255,255,0.55)",
    opacity: 1,
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255,255,255,0.72)",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#E0C285",
  },
};

const cloneFilters = (filters: StayFilterState): StayFilterState => ({
  ...filters,
  amenities: [...filters.amenities],
});

const getErrorMessage = (error: unknown) =>
  (error as any)?.data?.message ||
  (error as any)?.error ||
  "Unable to load stays right now. Please try again.";

const buildDetailsQuery = (filters: StayFilterState) => {
  const query = new URLSearchParams();

  if (filters.checkIn) query.set("checkIn", filters.checkIn);
  if (filters.checkOut) query.set("checkOut", filters.checkOut);
  if (filters.guests) query.set("guests", filters.guests);

  return query.toString();
};

const Stays = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const {
    filters,
    appliedFilters,
    queryParams,
    activeFilterCount,
    activeFilterSummary,
    updateField,
    updateFields,
    clearFilters,
    applyFilters,
  } = useStayFilters();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileDraftFilters, setMobileDraftFilters] = useState<StayFilterState>(() =>
    cloneFilters(DEFAULT_STAY_FILTERS)
  );

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useSearchStaysQuery(queryParams);

  const stays = data?.data?.stays || [];
  const pagination = data?.pagination;
  const detailsQuery = useMemo(() => buildDetailsQuery(appliedFilters), [appliedFilters]);
  const resultCount = pagination?.total ?? stays.length;
  const showInitialSkeletons = isLoading && stays.length === 0;
  const showFetchingSkeletons = isFetching && !showInitialSkeletons;

  useEffect(() => {
    if (!data || isLoading) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("stay:search", {
        detail: {
          params: queryParams,
          resultCount: data.data?.stays?.length || 0,
        },
      })
    );
  }, [data, isLoading, queryParams]);

  useEffect(() => {
    if (mobileFiltersOpen) {
      setMobileDraftFilters(cloneFilters(filters));
    }
  }, [filters, mobileFiltersOpen]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyFilters(filters);
  };

  const handleOpenStay = (room: any) => {
    const roomId = room?._id || room?.id;

    if (!roomId) {
      return;
    }

    navigate(`/stays/rooms/${roomId}${detailsQuery ? `?${detailsQuery}` : ""}`);
  };

  const updateMobileDraft = (
    field: StayFilterField,
    value: StayFilterState[StayFilterField]
  ) => {
    setMobileDraftFilters((previousFilters) => ({
      ...previousFilters,
      [field]: value,
      page: 1,
    }));
  };

  const updateMobileDraftFields = (updates: Partial<StayFilterState>) => {
    setMobileDraftFilters((previousFilters) => ({
      ...previousFilters,
      ...updates,
      page: 1,
    }));
  };

  const handleLoadMore = () => {
    updateField("page", appliedFilters.page + 1);
  };

  return (
    <Box sx={{ py: { xs: 4, md: 6 }, background: "background.default", minHeight: "calc(100vh - 72px)" }}>
      <AppContainer>
        <Stack spacing={3}>
          <Box
            sx={{
              position: "relative",
              minHeight: { xs: "380px", md: "460px" },
              display: "flex",
              alignItems: "center",
              backgroundColor: "#0F141E",
              overflow: "hidden",
              color: "#fff",
              borderRadius: { xs: "16px", md: "24px" },
            }}
          >
            <HeroSlideshow images={STAY_HERO_IMAGES} />
            <Stack
              spacing={3}
              sx={{
                position: "relative",
                zIndex: 3,
                width: "100%",
                pt: { xs: 5, md: 7 },
                pb: { xs: 5, md: 7 },
                px: { xs: 3, md: 5 },
              }}
            >
              <Box>
                <Box
                  sx={{
                    color: "#B8975A",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    mb: 1,
                  }}
                >
                  TEMPORARY STAYS
                </Box>
                <Heading
                  sx={{
                    mb: 1,
                    color: "#fff",
                    fontSize: { xs: "1.75rem", md: "2.5rem" },
                    fontWeight: 800,
                  }}
                >
                  Find Your Perfect Short Stay
                </Heading>
                <SubHeading sx={{ color: "rgba(255,255,255,0.8)" }}>
                  Hotels, lodges, BnBs and apartments across Zimbabwe
                </SubHeading>
              </Box>

              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2} alignItems="flex-end">
                  <Grid item xs={12} md={3}>
                    <AppInput
                      label="Location"
                      value={filters.location}
                      onChange={(event) => updateField("location", event.target.value)}
                      placeholder="Harare"
                      InputLabelProps={{ shrink: true }}
                      sx={heroInputSx}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <AppInput
                      label="Check-in"
                      type="date"
                      value={filters.checkIn}
                      onChange={(event) => updateField("checkIn", event.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={heroInputSx}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <AppInput
                      label="Check-out"
                      type="date"
                      value={filters.checkOut}
                      onChange={(event) => updateField("checkOut", event.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={heroInputSx}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <AppInput
                      label="Guests"
                      type="number"
                      value={filters.guests}
                      onChange={(event) => updateField("guests", event.target.value)}
                      inputProps={{ min: 1 }}
                      InputLabelProps={{ shrink: true }}
                      sx={heroInputSx}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <AppInput
                      label="Search"
                      value={filters.searchTerm}
                      onChange={(event) => updateField("searchTerm", event.target.value)}
                      placeholder="Suite, wifi, city center..."
                      InputLabelProps={{ shrink: true }}
                      sx={heroInputSx}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                  <AppButton
                    type="submit"
                    size="large"
                    sx={{
                      background: "#B8975A",
                      color: "#fff",
                      "&:hover": { background: "#9E7E45" },
                    }}
                  >
                    Search Stays
                  </AppButton>
                </Box>
              </Box>

              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {BUSINESS_TYPES.map((type) => {
                  const isActive = filters.businessType === type.value;

                  return (
                    <Box
                      key={type.label}
                      component="button"
                      type="button"
                      onClick={() => updateField("businessType", type.value)}
                      sx={{
                        border: "1px solid rgba(255,255,255,0.3)",
                        borderRadius: "999px",
                        px: 1.5,
                        py: 0.75,
                        color: "#fff",
                        cursor: "pointer",
                        font: "inherit",
                        backgroundColor: isActive ? "#B8975A" : "rgba(255,255,255,0.08)",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                      }}
                    >
                      {type.icon}
                      {type.label}
                    </Box>
                  );
                })}
              </Stack>
            </Stack>
          </Box>

          <Box
            sx={{
              background: "linear-gradient(135deg, #B8975A, #9E7E45)",
              borderRadius: "16px",
              p: { xs: 2.5, md: 3 },
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Building2 size={24} color="#fff" />
              <Box>
                <Box sx={{ color: "#fff", fontWeight: 800 }}>
                  Are you a hotel or lodge owner?
                </Box>
                <Box sx={{ color: "rgba(255,255,255,0.85)", fontSize: "14px" }}>
                  List your property and reach thousands of guests
                </Box>
              </Box>
            </Box>
            <AppButton
              variant="outlined"
              onClick={() => navigate("/provider-signup")}
              sx={{
                color: "#fff",
                borderColor: "rgba(255,255,255,0.6)",
                "&:hover": {
                  borderColor: "#fff",
                  background: "rgba(255,255,255,0.1)",
                },
              }}
            >
              List Your Stay &rarr;
            </AppButton>
          </Box>

          {error ? (
            <AppCard sx={{ p: 3, borderRadius: "8px", border: "1px solid #FECACA", boxShadow: "none" }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between">
                <Box>
                  <Heading sx={{ fontSize: "22px", color: "#991B1B", mb: 0.75 }}>
                    Search could not be completed
                  </Heading>
                  <SubHeading sx={{ color: "#7F1D1D" }}>{getErrorMessage(error)}</SubHeading>
                </Box>
                <AppButton onClick={refetch} sx={{ alignSelf: { xs: "stretch", sm: "center" } }}>
                  Retry
                </AppButton>
              </Stack>
            </AppCard>
          ) : null}

          <Grid container spacing={3} alignItems="flex-start">
            {!isMobile ? (
              <Grid item xs={12} md={3}>
                <Box>
                  <FilterPanel
                    filters={filters}
                    onChange={updateField}
                    onChangeMany={updateFields}
                    onClear={clearFilters}
                    activeFilterCount={activeFilterCount}
                  />
                </Box>
              </Grid>
            ) : null}

            <Grid item xs={12} md={isMobile ? 12 : 9}>
              <Stack spacing={2.5}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 2,
                    alignItems: "center",
                    flexWrap: "wrap",
                    flexDirection: { xs: "column", sm: "row" },
                  }}
                >
                  <SubHeading sx={{ color: "#475569", fontWeight: 600 }}>
                    {resultCount} result{resultCount === 1 ? "" : "s"}
                  </SubHeading>
                  <Box sx={{ minWidth: 200, maxWidth: 300, flex: "0 0 auto", width: { xs: "100%" } }}>
                    <AppSelect
                      label="Sort"
                      value={filters.sort}
                      onChange={(event) => updateField("sort", event.target.value as string)}
                      options={SORT_OPTIONS}
                    />
                  </Box>
                </Box>

                {showInitialSkeletons ? (
                  <Grid container spacing={2.5}>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Grid item xs={12} md={6} xl={4} key={`initial-skeleton-${index}`}>
                        <StayCardSkeleton />
                      </Grid>
                    ))}
                  </Grid>
                ) : null}

                {!showInitialSkeletons && !error && stays.length === 0 ? (
                  <EmptyState activeFilterSummary={activeFilterSummary} onClear={clearFilters} />
                ) : null}

                {!showInitialSkeletons && stays.length > 0 ? (
                  <Grid container spacing={2.5}>
                    {stays.map((room: any) => (
                      <Grid item xs={12} md={6} xl={4} key={room?._id || room?.id}>
                        <StayCard room={room} onOpen={() => handleOpenStay(room)} />
                      </Grid>
                    ))}
                    {showFetchingSkeletons
                      ? Array.from({ length: 6 }).map((_, index) => (
                          <Grid item xs={12} md={6} xl={4} key={`fetching-skeleton-${index}`}>
                            <StayCardSkeleton />
                          </Grid>
                        ))
                      : null}
                  </Grid>
                ) : null}

                {pagination?.hasMore && !error ? (
                  <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
                    <AppButton onClick={handleLoadMore} disabled={isFetching}>
                      {isFetching ? "Loading..." : "Load more"}
                    </AppButton>
                  </Box>
                ) : null}
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </AppContainer>

      {isMobile ? (
        <>
          <Drawer
            anchor="bottom"
            open={mobileFiltersOpen}
            onClose={() => setMobileFiltersOpen(false)}
            PaperProps={{
              sx: {
                borderRadius: "16px 16px 0 0",
                maxHeight: "85vh",
                display: "flex",
              },
            }}
          >
            <Box
              sx={{
                px: 2,
                pt: 1.5,
                pb: 1,
                borderBottom: "1px solid #E2E8F0",
                background: "background.default",
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 4,
                  borderRadius: "999px",
                  background: "#cbd5e1",
                  margin: "0 auto 16px",
                }}
              />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Heading sx={{ fontSize: "20px" }}>Filters</Heading>
                <AppButton
                  variant="text"
                  onClick={() => {
                    clearFilters();
                    setMobileFiltersOpen(false);
                  }}
                >
                  Clear all
                </AppButton>
              </Stack>
            </Box>

            <Box sx={{ overflowY: "auto", flex: 1, minHeight: 0, p: 2 }}>
              <FilterPanel
                filters={mobileDraftFilters}
                onChange={updateMobileDraft}
                onChangeMany={updateMobileDraftFields}
                onClear={() => setMobileDraftFilters(cloneFilters(DEFAULT_STAY_FILTERS))}
                activeFilterCount={activeFilterCount}
              />
            </Box>

            <Box sx={{ p: 2, borderTop: "1px solid #E2E8F0", background: "background.paper" }}>
              <AppButton
                fullWidth
                size="large"
                onClick={() => {
                  applyFilters(mobileDraftFilters);
                  setMobileFiltersOpen(false);
                }}
              >
                Apply Filters
              </AppButton>
            </Box>
          </Drawer>

          {!mobileFiltersOpen ? (
            <Badge
              badgeContent={activeFilterCount}
              color="error"
              invisible={activeFilterCount === 0}
              sx={{ position: "fixed", bottom: 24, right: 20, zIndex: theme.zIndex.speedDial }}
            >
              <Fab
                variant="extended"
                onClick={() => setMobileFiltersOpen(true)}
                sx={{
                  background: "#B8975A",
                  color: "#fff",
                  "&:hover": {
                    background: "#9E7E45",
                  },
                }}
              >
                <SlidersHorizontal size={16} style={{ marginRight: 8 }} />
                Filters
              </Fab>
            </Badge>
          ) : null}
        </>
      ) : null}
    </Box>
  );
};

export default Stays;
