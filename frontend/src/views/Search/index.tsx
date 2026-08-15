// React Imports
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
// MUI Imports
import {
  Box,
  Checkbox,
  Divider,
  Drawer,
  Fab,
  FormControlLabel,
  Grid,
  IconButton,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
// Custom Imports
import SearchBar from "../../components/SearchBar";
import { Heading } from "../../components/Heading";
import PropertyCard from "../../components/PropertyCard";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppSelect from "../../components/ui/AppSelect";
import AppButton from "../../components/ui/AppButton";
import DotLoader from "../../components/Spinner/dotLoader";
import { ZIMBABWE_PROVINCES } from "../../config/zimbabweProvinces";
// Hooks Imports
import useTypedSelector from "../../hooks/useTypedSelector";
// Redux Imports
import {
  selectedSearchText,
  setSearchText,
} from "../../redux/global/globalSlice";
// Utils Imports
import { getApiBaseUrl } from "../../utils";
import { getStoredUserToken } from "../../redux/auth/authSlice";

const sortTypes = [
  {
    name: "Latest",
    value: "createdAt_desc",
  },
  {
    name: "Oldest",
    value: "createdAt_asc",
  },
  {
    name: "Price High to Low",
    value: "monthlyRent_desc",
  },
  {
    name: "Price Low to High",
    value: "monthlyRent_asc",
  },
];

const defaultSideBarData = {
  searchTerm: "",
  location: "",
  city: "",
  neighborhood: "",
  minRent: "",
  maxRent: "",
  minTotalRooms: "",
  solar: false,
  borehole: false,
  security: false,
  internet: false,
  type: "all",
  parking: false,
  furnished: false,
  offer: false,
  studentAccommodation: false,
  sort: "createdAt_desc",
};

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
} as const;

type FilterFormProps = {
  sideBarData: any;
  setSideBarData: (data: any, source?: "searchTerm" | "other") => void;
  handleSubmit: (e: any) => void;
  isMobile: boolean;
  searchText: string;
  handleSearch: (e: any) => void;
  onCollapse: () => void;
};

const FilterForm = ({
  sideBarData,
  setSideBarData,
  handleSubmit,
  isMobile,
  searchText,
  handleSearch,
  onCollapse,
}: FilterFormProps) => {
  const parsedMinRent = Number(sideBarData.minRent || 0);
  const parsedMaxRent = Number(sideBarData.maxRent || 5000);
  const safeMinRent = Number.isFinite(parsedMinRent) ? parsedMinRent : 0;
  const safeMaxRent = Number.isFinite(parsedMaxRent) ? parsedMaxRent : 5000;
  const normalizedMinRent = Math.max(
    0,
    Math.min(safeMinRent, safeMaxRent, 5000)
  );
  const normalizedMaxRent = Math.min(
    5000,
    Math.max(safeMinRent, safeMaxRent, 0)
  );
  const [rentRange, setRentRange] = useState<[number, number]>([
    normalizedMinRent,
    normalizedMaxRent,
  ]);
  const listingTypeValue = sideBarData.studentAccommodation
    ? "student"
    : sideBarData.type || "all";
  const amenityOptions = [
    { key: "solar", label: "Solar" },
    { key: "borehole", label: "Borehole" },
    { key: "security", label: "Security" },
    { key: "internet", label: "Internet" },
  ];
  const featureOptions = [
    { key: "offer", label: "Offer" },
    { key: "parking", label: "Parking" },
    { key: "furnished", label: "Furnished" },
  ];

  useEffect(() => {
    setRentRange([normalizedMinRent, normalizedMaxRent]);
  }, [normalizedMinRent, normalizedMaxRent]);

  return (
    <AppCard
      sx={{
        p: 2.5,
        borderRadius: "16px",
        position: "sticky",
        top: "88px",
        maxHeight: "calc(100vh - 108px)",
        overflowY: "auto",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          mb: 2,
        }}
      >
        <Heading sx={{ fontSize: "18px", fontWeight: 700 }}>Filters</Heading>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <AppButton
            type="button"
            variant="text"
            size="small"
            onClick={() => setSideBarData({ ...defaultSideBarData })}
            sx={{ minHeight: 32, px: 1, py: 0.5, color: "#64748B" }}
          >
            Clear all
          </AppButton>
          <IconButton
            size="small"
            onClick={onCollapse}
            sx={{
              width: 34,
              height: 34,
    border: "1px solid",
    borderColor: "divider",
              color: "#64748B",
            }}
          >
            <ChevronLeft size={18} />
          </IconButton>
        </Box>
      </Box>

      <form onSubmit={handleSubmit}>
        <Box sx={sectionTitleSx}>Search</Box>
        <SearchBar
          placeholder="Search..."
          searchText={searchText}
          handleSearch={handleSearch}
          value={sideBarData.searchTerm}
          onChange={handleSearch}
          color="#fff"
        />

        <Divider sx={{ my: 2 }} />

        <Box>
          <Box sx={sectionTitleSx}>Location</Box>
          <AppSelect
            options={[
              { label: "All locations", value: "" },
              ...ZIMBABWE_PROVINCES,
            ]}
            value={sideBarData.location}
            onChange={(e) =>
              setSideBarData({ ...sideBarData, location: e.target.value })
            }
            size="small"
            displayEmpty
            renderValue={(selected) => {
              const province = selected as string;
              return province || "All locations";
            }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Box sx={sectionTitleSx}>Rent Range</Box>
          <Slider
            min={0}
            max={5000}
            step={100}
            valueLabelDisplay="auto"
            sx={{ color: "#B8975A" }}
            value={rentRange}
            onChange={(_, value) => {
              if (Array.isArray(value)) {
                setRentRange(value as [number, number]);
              }
            }}
            onChangeCommitted={(_, value) => {
              const val = Array.isArray(value) ? value : [0, value];
              setSideBarData({
                ...sideBarData,
                minRent: String(val[0]),
                maxRent: String(val[1]),
              });
            }}
          />
          <Box sx={{ fontSize: "13px", fontWeight: 700, color: "text.primary" }}>
            ${rentRange[0]} &ndash; ${rentRange[1]}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Box sx={sectionTitleSx}>Min Rooms</Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <IconButton
              size="small"
              onClick={() =>
                setSideBarData({
                  ...sideBarData,
                  minTotalRooms: String(
                    Math.max(0, Number(sideBarData.minTotalRooms || 0) - 1)
                  ),
                })
              }
            >
              <Remove fontSize="small" />
            </IconButton>
            <Box sx={{ minWidth: 24, textAlign: "center", fontWeight: 700 }}>
              {sideBarData.minTotalRooms || 0}
            </Box>
            <IconButton
              size="small"
              onClick={() =>
                setSideBarData({
                  ...sideBarData,
                  minTotalRooms: String(
                    Number(sideBarData.minTotalRooms || 0) + 1
                  ),
                })
              }
            >
              <Add fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Box sx={sectionTitleSx}>Amenities</Box>
          <Box sx={{ display: "grid", gap: 0.5 }}>
            {amenityOptions.map((option) => (
              <FormControlLabel
                key={option.key}
                sx={{ alignItems: "center", m: 0 }}
                control={
                  <Checkbox
                    checked={Boolean(sideBarData[option.key])}
                    onChange={(e) =>
                      setSideBarData({
                        ...sideBarData,
                        [option.key]: e.target.checked,
                      })
                    }
                  />
                }
                label={option.label}
              />
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Box sx={sectionTitleSx}>Listing Type</Box>
          <ToggleButtonGroup
            exclusive
            value={listingTypeValue}
            onChange={(_, value) => {
              if (!value) {
                return;
              }

              setSideBarData({
                ...sideBarData,
                type: value,
                studentAccommodation: value === "student",
              });
            }}
            sx={toggleGroupSx}
          >
            {[
              { label: "All", value: "all" },
              { label: "Rent", value: "rent" },
              { label: "Student", value: "student" },
            ].map((option) => (
              <ToggleButton
                key={option.value}
                value={option.value}
                sx={toggleButtonSx}
              >
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Box sx={sectionTitleSx}>More Filters</Box>
          <Box sx={{ display: "grid", gap: 0.5 }}>
            {featureOptions.map((option) => (
              <FormControlLabel
                key={option.key}
                sx={{ alignItems: "center", m: 0 }}
                control={
                  <Checkbox
                    checked={Boolean(sideBarData[option.key])}
                    onChange={(e) =>
                      setSideBarData({
                        ...sideBarData,
                        [option.key]: e.target.checked,
                      })
                    }
                  />
                }
                label={option.label}
              />
            ))}
          </Box>
        </Box>

        {isMobile && (
          <AppButton sx={{ width: "100%", marginTop: "16px" }} type="submit">
            Apply Filters
          </AppButton>
        )}
      </form>
    </AppCard>
  );
};

const SearchPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const searchText = useTypedSelector(selectedSearchText);
  const token = getStoredUserToken();
  const apiBase = getApiBaseUrl();

  const [sideBarData, setSideBarData] = useState<any>(defaultSideBarData);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState<any>([]);
  const [showMore, setShowMore] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(true);
  const [filterCollapsed, setFilterCollapsed] = useState(false);
  const locationSearch = location.search;
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastChangedFilterRef = useRef<"searchTerm" | "other">("other");
  const isFirstRender = useRef(true);

  const normalizeType = (value: string | null) => {
    if (value === "rent" || value === "all") {
      return value;
    }
    return "all";
  };

  const hasAnySupportedFilterParam = (urlParams: URLSearchParams) => {
    const supportedParams = [
      "searchTerm",
      "location",
      "province",
      "city",
      "neighborhood",
      "minRent",
      "maxRent",
      "minTotalRooms",
      "minBedrooms",
      "solar",
      "borehole",
      "security",
      "internet",
      "type",
      "parking",
      "furnished",
      "offer",
      "studentAccommodation",
      "sort",
    ];

    return supportedParams.some((param) => urlParams.has(param));
  };

  const normalizeRoomParams = (urlParams: URLSearchParams) => {
    const minTotalRooms = urlParams.get("minTotalRooms");
    const minBedrooms = urlParams.get("minBedrooms");

    if (!minTotalRooms && minBedrooms) {
      urlParams.set("minTotalRooms", minBedrooms);
    }

    urlParams.delete("minBedrooms");
  };

  const buildSearchQuery = (filters: any) => {
    const urlParams = new URLSearchParams();
    urlParams.set("searchTerm", filters.searchTerm || "");
    urlParams.set("type", normalizeType(filters.type));
    urlParams.set("parking", String(Boolean(filters.parking)));
    urlParams.set("furnished", String(Boolean(filters.furnished)));
    urlParams.set("offer", String(Boolean(filters.offer)));
    urlParams.set(
      "studentAccommodation",
      String(Boolean(filters.studentAccommodation))
    );
    urlParams.set("sort", filters.sort || "createdAt_desc");
    urlParams.set("province", filters.location || "");
    urlParams.set("city", filters.city || "");
    urlParams.set("neighborhood", filters.neighborhood || "");
    urlParams.set("minRent", filters.minRent || "");
    urlParams.set("maxRent", filters.maxRent || "");
    urlParams.set("minTotalRooms", filters.minTotalRooms || "");
    urlParams.set("solar", String(Boolean(filters.solar)));
    urlParams.set("borehole", String(Boolean(filters.borehole)));
    urlParams.set("security", String(Boolean(filters.security)));
    urlParams.set("internet", String(Boolean(filters.internet)));

    return urlParams.toString();
  };

  const applySearchQuery = (filters: any) => {
    navigate(`/search?${buildSearchQuery(filters)}`);
  };

  const updateSideBarData = (
    nextSideBarData: any,
    source: "searchTerm" | "other" = "other"
  ) => {
    lastChangedFilterRef.current = source;
    setSideBarData(nextSideBarData);
  };

  const handleSearch = (event: any) => {
    let value = event.target.value.toLowerCase();
    updateSideBarData({ ...sideBarData, searchTerm: value }, "searchTerm");
    dispatch(setSearchText(value));
  };

  useEffect(() => {
    if (!isMobile) {
      setMobileFiltersOpen(false);
      return;
    }

    const urlParams = new URLSearchParams(locationSearch);
    // On a first mobile visit with no filters applied, open the drawer so
    // users start in filter-selection mode before narrowing results.
    setMobileFiltersOpen(!hasAnySupportedFilterParam(urlParams));
  }, [isMobile, locationSearch]);

  useEffect(() => {
    const urlParams = new URLSearchParams(locationSearch);
    const searchTermFromUrl = urlParams.get("searchTerm");
    const typeFromUrl = urlParams.get("type");
    const parkingFromUrl = urlParams.get("parking");
    const furnishedFromUrl = urlParams.get("furnished");
    const offerFromUrl = urlParams.get("offer");
    const studentAccommodationFromUrl = urlParams.get("studentAccommodation");
    const sortFromUrl = urlParams.get("sort");
    const locationFromUrl = urlParams.get("location");
    const provinceFromUrl = urlParams.get("province");
    const cityFromUrl = urlParams.get("city");
    const neighborhoodFromUrl = urlParams.get("neighborhood");
    const minRentFromUrl = urlParams.get("minRent");
    const maxRentFromUrl = urlParams.get("maxRent");
    const minTotalRoomsFromUrl = urlParams.get("minTotalRooms");
    const minBedroomsFromUrl = urlParams.get("minBedrooms");
    const solarFromUrl = urlParams.get("solar");
    const boreholeFromUrl = urlParams.get("borehole");
    const securityFromUrl = urlParams.get("security");
    const internetFromUrl = urlParams.get("internet");
    const normalizedType = normalizeType(typeFromUrl);

    if (hasAnySupportedFilterParam(urlParams)) {
      setSideBarData({
        searchTerm: searchTermFromUrl || "",
        location: provinceFromUrl || locationFromUrl || cityFromUrl || "",
        city: cityFromUrl || "",
        neighborhood: neighborhoodFromUrl || "",
        minRent: minRentFromUrl || "",
        maxRent: maxRentFromUrl || "",
        minTotalRooms: minTotalRoomsFromUrl || minBedroomsFromUrl || "",
        solar: solarFromUrl === "true",
        borehole: boreholeFromUrl === "true",
        security: securityFromUrl === "true",
        internet: internetFromUrl === "true",
        type: normalizedType,
        parking: parkingFromUrl === "true" ? true : false,
        furnished: furnishedFromUrl === "true" ? true : false,
        offer: offerFromUrl === "true" ? true : false,
        studentAccommodation: studentAccommodationFromUrl === "true",
        sort: sortFromUrl || "createdAt_desc",
      });
    }

    const fetchListings = async () => {
      setLoading(true);
      setShowMore(false);
      if (typeFromUrl && normalizedType !== typeFromUrl) {
        urlParams.set("type", normalizedType);
      }
      normalizeRoomParams(urlParams);
      const searchQuery = urlParams.toString();
      const res = await fetch(`${apiBase}/listings/get?${searchQuery}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (data?.data?.length > 5) {
        setShowMore(true);
      } else {
        setShowMore(false);
      }
      setListings(data?.data);
      setLoading(false);
    };

    fetchListings();
  }, [apiBase, locationSearch, token]);

  useEffect(() => {
    // Skip the very first render - the URL-param useEffect handles initial load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (isMobile) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      return;
    }

    const delay =
      lastChangedFilterRef.current === "searchTerm" ? 600 : 400;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      applySearchQuery(sideBarData);
    }, delay);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, sideBarData]);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    applySearchQuery(sideBarData);
    if (isMobile) {
      setMobileFiltersOpen(false);
    }
  };

  const onShowMoreClick = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    normalizeRoomParams(urlParams);
    urlParams.set("page", (page + 1).toString());
    const searchQuery = urlParams.toString();
    const res = await fetch(`${apiBase}/listings/get?${searchQuery}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const data = await res.json();
    if (data?.data?.length < 6) {
      setShowMore(false);
    }
    setListings([...listings, ...data?.data]);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <Box sx={{ mt: { xs: 4, md: 4.5 } }}>
      <AppContainer>
      {loading && (
        <Box sx={{ position: "relative", minHeight: 40 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "absolute",
              inset: 0,
            }}
          >
            <DotLoader color="#334155" />
          </Box>
        </Box>
      )}
      <Grid container spacing={3}>
        {!isMobile && (
          <Grid item xs={12} md={4} lg={3}>
            {filterCollapsed ? (
              <Box
                onClick={() => setFilterCollapsed(false)}
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
                }}
              >
                <SlidersHorizontal size={16} />
                Filters
                <ChevronRight size={14} />
              </Box>
            ) : (
              <FilterForm
                sideBarData={sideBarData}
                setSideBarData={updateSideBarData}
                handleSubmit={handleSubmit}
                isMobile={isMobile}
                searchText={searchText}
                handleSearch={handleSearch}
                onCollapse={() => setFilterCollapsed(true)}
              />
            )}
          </Grid>
        )}
        <Grid item xs={12} md={8} lg={9}>
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: { xs: "stretch", sm: "center" },
                justifyContent: "space-between",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                mb: 2,
              }}
            >
              <Heading sx={{ margin: 0 }}>Listing Results</Heading>
              <Box sx={{ minWidth: { xs: "100%", sm: 240 } }}>
                <AppSelect
                  name="sort"
                  value={sideBarData.sort}
                  size="small"
                  onChange={(event: any) => {
                    const nextSideBarData = {
                      ...sideBarData,
                      sort: event.target.value,
                    };

                    updateSideBarData(nextSideBarData);
                    applySearchQuery(nextSideBarData);
                  }}
                  options={sortTypes.map((copyType) => ({
                    value: copyType.value,
                    label: copyType.name,
                  }))}
                />
              </Box>
            </Box>
            <Grid container spacing={2}>
              {!loading && listings?.length === 0 ? (
                <Grid item xs={12}>
                  <AppCard sx={{ p: 3, textAlign: "center" }}>
                    No results found
                  </AppCard>
                </Grid>
              ) : (
                <>
                  {listings?.map((item: any, index: number) => (
                    <Grid item xs={12} sm={6} md={4} key={item?._id || index}>
                      <PropertyCard
                        item={item}
                        onClick={() => navigate(`/listing/${item._id}`)}
                      />
                    </Grid>
                  ))}
                </>
              )}
            </Grid>
            {showMore && (
              <AppButton onClick={onShowMoreClick} sx={{ marginTop: 2 }}>
                Show More
              </AppButton>
            )}
          </Box>
        </Grid>
      </Grid>
      {isMobile && (
        <>
          <Drawer
            anchor="bottom"
            open={mobileFiltersOpen}
            onClose={() => setMobileFiltersOpen(false)}
            PaperProps={{
              sx: {
                borderRadius: "20px 20px 0 0",
                padding: 2,
                maxHeight: "85vh",
              },
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
            <FilterForm
              sideBarData={sideBarData}
              setSideBarData={updateSideBarData}
              handleSubmit={handleSubmit}
              isMobile={isMobile}
              searchText={searchText}
              handleSearch={handleSearch}
              onCollapse={() => setMobileFiltersOpen(false)}
            />
          </Drawer>
          {!mobileFiltersOpen && (
            <Fab
              variant="extended"
              onClick={() => setMobileFiltersOpen(true)}
              sx={{
                position: "fixed",
                bottom: 24,
                right: 20,
                background: "#1F4D3A",
                color: "#fff",
                "&:hover": {
                  background: "#183d2f",
                },
              }}
            >
              <SlidersHorizontal size={16} style={{ marginRight: 8 }} />
              Filters
            </Fab>
          )}
        </>
      )}
      </AppContainer>
    </Box>
  );
};

export default SearchPage;
