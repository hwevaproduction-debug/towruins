// MUI Imports
import { Box, Grid, Menu, MenuItem, Skeleton, useTheme } from "@mui/material";
// React Imports
import { useEffect, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Droplets,
  GraduationCap,
  Home as HomeIcon,
  ParkingCircle,
  Shield,
  Sofa,
  Star,
  Wifi,
  Zap,
} from "lucide-react";
// Custom Imports
import { Heading, SubHeading } from "../../components/Heading";
import PropertyCard from "../../components/PropertyCard";
import HeroSlideshow from "./HeroSlideshow";
// Swiper Imports
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, FreeMode } from "swiper/modules";
import "swiper/css/free-mode";
import "swiper/css";
import "swiper/css/pagination";
import {
  useGetHomeHighlightedQuery,
  useGetPublicStatsQuery,
} from "../../redux/api/listingApiSlice";
import OverlayLoader from "../../components/Spinner/OverlayLoader";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import AppInput from "../../components/ui/AppInput";
import useTypedSelector from "../../hooks/useTypedSelector";
import { ZIMBABWE_PROVINCES } from "../../config/zimbabweProvinces";
import { ZIMBABWE_NEIGHBORHOODS } from "../../config/zimbabweNeighborhoods";
import {
  selectedUserRole,
  selectedUserToken,
} from "../../redux/auth/authSlice";

const NEIGHBOURHOOD_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80",
];

type SearchTab = "rent" | "stays" | "student";

const filterButtonSx = {
  background: "#F7EDDA",
  color: "#7D6234",
  borderRadius: "999px",
  padding: "8px 16px",
  fontSize: "13px",
  cursor: "pointer",
  border: "1px solid #EDD9B0",
  fontWeight: 600,
  "&:hover": {
    background: "#EDD9B0",
  },
};

const categoryChips = [
  { label: "All Rentals", path: "/search", icon: <HomeIcon size={14} /> },
  {
    label: "Student Accommodation",
    path: "/search?studentAccommodation=true",
    icon: <GraduationCap size={14} />,
  },
  { label: "Solar Powered", path: "/search?solar=true", icon: <Zap size={14} /> },
  { label: "With Parking", path: "/search?parking=true", icon: <ParkingCircle size={14} /> },
  { label: "Furnished", path: "/search?furnished=true", icon: <Sofa size={14} /> },
  { label: "Borehole Water", path: "/search?borehole=true", icon: <Droplets size={14} /> },
  { label: "Gated/Security", path: "/search?security=true", icon: <Shield size={14} /> },
  { label: "Internet Ready", path: "/search?internet=true", icon: <Wifi size={14} /> },
];

const FALLBACK_HERO_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1920&q=80",
];

const fallbackStats = [
  { value: "Curated", label: "Premium Listings" },
  { value: "Trusted", label: "Verified Landlords" },
  { value: "30+", label: "Neighbourhoods" },
  { value: "Top Rated", label: "Verified Stays" },
];

const getListingImage = (item: any) =>
  item?.image || item?.images?.[0] || item?.imageUrls?.[0] || null;

const computeStats = (data: any) => {
  if (!data) {
    return fallbackStats;
  }

  const activeListings = Number(data.activeListings || 0);
  const landlords = Number(data.landlords || 0);
  const avgRating = Number(data.avgRating || 0);
  const hasAvgRating = Number.isFinite(avgRating) && avgRating > 0;

  return [
    activeListings >= 100
      ? { value: `${activeListings}+`, label: "Active Listings" }
      : { value: "Growing", label: "Curated Listings" },
    landlords >= 50
      ? { value: `${landlords}+`, label: "Verified Landlords" }
      : { value: "Growing Network", label: "Trusted Landlords" },
    { value: "30+", label: "Neighbourhoods" },
    hasAvgRating && avgRating >= 4.0
      ? { value: avgRating.toFixed(1), label: "Average Rating" }
      : { value: "Highly Rated", label: "Verified Stays" },
  ];
};

const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const token = useTypedSelector(selectedUserToken);
  const userRole = useTypedSelector(selectedUserRole);
  const isAuthenticated = Boolean(token);
  const [heroSearch, setHeroSearch] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("rent");
  const [locationAnchor, setLocationAnchor] = useState<null | HTMLElement>(null);
  const [roomsAnchor, setRoomsAnchor] = useState<null | HTMLElement>(null);
  const [priceAnchor, setPriceAnchor] = useState<null | HTMLElement>(null);
  const [amenitiesAnchor, setAmenitiesAnchor] = useState<null | HTMLElement>(null);

  const { data: highlightedData, isLoading: highlightedLoading } =
    useGetHomeHighlightedQuery(6);
  const { data: statsData } = useGetPublicStatsQuery(undefined);

  const highlightedListings = (highlightedData?.data || []).slice(0, 6);
  const neighborhoodEntries = ZIMBABWE_NEIGHBORHOODS.flatMap((entry) =>
    entry.neighborhoods.map((neighborhood) => ({
      city: entry.city,
      neighborhood,
    }))
  );
  const neighborhoodGradients = [
    "linear-gradient(135deg,#B8975A,#7D6234)",
    "linear-gradient(135deg,#1F4D3A,#1F2937)",
    "linear-gradient(135deg,#1F2937,#374151)",
  ];
  const listingHeroImages = highlightedListings
    .map((item: any) => getListingImage(item))
    .filter((image: string | null): image is string => Boolean(image));
  const heroImages =
    listingHeroImages.length >= 3 ? listingHeroImages : FALLBACK_HERO_IMAGES;

  // Never block the whole landing page forever.
  // If the API is down or DB isn't connected, show the page and allow retry.
  const [showOverlay, setShowOverlay] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!highlightedLoading) {
      setShowOverlay(false);
      setTimedOut(false);
      return;
    }

    const t1 = window.setTimeout(() => setShowOverlay(true), 250);
    const t2 = window.setTimeout(() => {
      setShowOverlay(false);
      setTimedOut(true);
    }, 8000);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [highlightedLoading]);

  const navigateToSearch = (params: Record<string, string>) => {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        urlParams.set(key, value);
      }
    });
    navigate(`/search?${urlParams.toString()}`);
  };

  const handleTabClick = (tab: SearchTab) => {
    setActiveTab(tab);
    if (tab === "stays") {
      navigate("/stays");
      return;
    }
    if (tab === "student") {
      navigate("/search?studentAccommodation=true");
    }
  };

  const handleHeroSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!heroSearch.trim()) {
      navigate("/search");
      return;
    }
    const urlParams = new URLSearchParams();
    urlParams.set("searchTerm", heroSearch.trim().toLowerCase());
    navigate(`/search?${urlParams.toString()}`);
  };

  const getAuthenticatedListPropertyPath = () => {
    if (userRole === "landlord") {
      return "/create-listing";
    }

    if (userRole === "provider") {
      return "/dashboard/provider";
    }

    if (userRole === "admin" || userRole === "super_admin") {
      return "/dashboard/admin";
    }

    if (userRole === "tenant") {
      return "/dashboard/tenant";
    }

    return "/profile";
  };

  const handleListPropertyClick = () => {
    navigate(
      isAuthenticated ? getAuthenticatedListPropertyPath() : "/provider-signup"
    );
  };

  return (
    <Box sx={{ background: "background.default" }}>
      {showOverlay && <OverlayLoader />}
      {timedOut && (
        <AppContainer>
          <Box
            sx={{
              background: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "10px",
              padding: "12px 14px",
              color: "text.secondary",
              fontSize: "14px",
            }}
          >
            Listings are taking too long to load. Make sure the backend is running and
            MongoDB is connected, then refresh.
          </Box>
        </AppContainer>
      )}

      <Box
        sx={{
          width: "100%",
          minHeight: { xs: "70vh", md: "88vh" },
          position: "relative",
          backgroundColor: "#0F141E",
          display: "flex",
          alignItems: "center",
          pt: 0,
          pb: { xs: 6, md: 8 },
        }}
      >
        <HeroSlideshow images={heroImages} />
        <Box sx={{ position: "relative", zIndex: 1, width: "100%", pt: { xs: "80px", md: "96px" } }}>
          <AppContainer>
            <Box
              sx={{
                maxWidth: 680,
                mx: "auto",
                textAlign: "center",
                color: "#fff",
              }}
            >
            <Box
              sx={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: "#B8975A",
                textTransform: "uppercase",
                marginBottom: 2,
                textShadow: "0 1px 8px rgba(0,0,0,0.5)",
              }}
            >
              ZIMBABWE&apos;S PREMIER PROPERTY PLATFORM
            </Box>
            <Box
              component="h1"
              sx={{
                fontSize: { xs: "2rem", md: "3.5rem" },
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#fff",
                margin: 0,
                marginBottom: 2.5,
                lineHeight: 1.05,
                textShadow:
                  "0 2px 16px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.5)",
              }}
            >
              Find Your Perfect Home in Zimbabwe
            </Box>
            <Box
              sx={{
                fontSize: "1.1rem",
                opacity: 0.82,
                marginBottom: 4,
                lineHeight: 1.6,
                textShadow: "0 1px 8px rgba(0,0,0,0.4)",
              }}
            >
              Explore thousands of verified rentals, student accommodation, and
              temporary stays across all provinces
            </Box>

            <AppCard
              sx={{
                borderRadius: "20px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
                p: { xs: 2.5, md: 3 },
                marginBottom: 3,
              }}
            >
              <Box component="form" onSubmit={handleHeroSubmit}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    justifyContent: "center",
                    flexWrap: "wrap",
                    marginBottom: 2.5,
                  }}
                >
                  {[
                    { label: "Rent", value: "rent" },
                    { label: "Stays", value: "stays" },
                    { label: "Student", value: "student" },
                  ].map((tab) => {
                    const isActive = activeTab === tab.value;
                    return (
                      <Box
                        key={tab.value}
                        component="button"
                        type="button"
                        onClick={() => handleTabClick(tab.value as SearchTab)}
                        sx={{
                          background: isActive ? "#B8975A" : "transparent",
                          color: isActive ? "#fff" : "#475569",
                          border: isActive ? "1.5px solid #B8975A" : "1.5px solid #E2E8F0",
                          borderRadius: "999px",
                          padding: "8px 18px",
                          fontSize: "14px",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {tab.label}
                      </Box>
                    );
                  })}
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 1.5,
                    alignItems: "center",
                  }}
                >
                  <AppInput
                    placeholder="Search by location, address, or keyword"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    sx={{
                      "& .MuiInputBase-root": {
                        height: 56,
                        borderRadius: "14px",
                      },
                    }}
                  />
                  <AppButton
                    type="submit"
                    sx={{
                      flexShrink: 0,
                      width: { xs: "100%", sm: "auto" },
                      height: 56,
                      borderRadius: "14px",
                      background: "#B8975A",
                    }}
                  >
                    Search
                  </AppButton>
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, marginTop: 2 }}>
                  <Box
                    component="button"
                    type="button"
                    onClick={(e: MouseEvent<HTMLElement>) =>
                      setLocationAnchor(e.currentTarget)
                    }
                    sx={filterButtonSx}
                  >
                    Location
                  </Box>
                  <Menu
                    anchorEl={locationAnchor}
                    open={Boolean(locationAnchor)}
                    onClose={() => setLocationAnchor(null)}
                  >
                    {ZIMBABWE_PROVINCES.map((province) => (
                      <MenuItem
                        key={province.value}
                        onClick={() => {
                          setLocationAnchor(null);
                          navigateToSearch({ province: province.value });
                        }}
                      >
                        {province.label}
                      </MenuItem>
                    ))}
                  </Menu>
                  <Box
                    component="button"
                    type="button"
                    onClick={(e: MouseEvent<HTMLElement>) =>
                      setRoomsAnchor(e.currentTarget)
                    }
                    sx={filterButtonSx}
                  >
                    Rooms
                  </Box>
                  <Menu
                    anchorEl={roomsAnchor}
                    open={Boolean(roomsAnchor)}
                    onClose={() => setRoomsAnchor(null)}
                  >
                    {[1, 2, 3, 4, 5, 6].map((rooms) => (
                      <MenuItem
                        key={rooms}
                        onClick={() => {
                          setRoomsAnchor(null);
                          navigateToSearch({ minTotalRooms: String(rooms) });
                        }}
                      >
                        {rooms}+ rooms
                      </MenuItem>
                    ))}
                  </Menu>
                  <Box
                    component="button"
                    type="button"
                    onClick={(e: MouseEvent<HTMLElement>) =>
                      setPriceAnchor(e.currentTarget)
                    }
                    sx={filterButtonSx}
                  >
                    Price
                  </Box>
                  <Menu
                    anchorEl={priceAnchor}
                    open={Boolean(priceAnchor)}
                    onClose={() => setPriceAnchor(null)}
                  >
                    {[
                      { label: "Under $200", query: "maxRent=200" },
                      { label: "$200 - $500", query: "minRent=200&maxRent=500" },
                      { label: "$500 - $1,000", query: "minRent=500&maxRent=1000" },
                      { label: "$1,000 - $2,000", query: "minRent=1000&maxRent=2000" },
                      { label: "Over $2,000", query: "minRent=2000" },
                    ].map((band) => (
                      <MenuItem
                        key={band.label}
                        onClick={() => {
                          setPriceAnchor(null);
                          navigate(`/search?${band.query}`);
                        }}
                      >
                        {band.label}
                      </MenuItem>
                    ))}
                  </Menu>
                  <Box
                    component="button"
                    type="button"
                    onClick={(e: MouseEvent<HTMLElement>) =>
                      setAmenitiesAnchor(e.currentTarget)
                    }
                    sx={filterButtonSx}
                  >
                    Amenities
                  </Box>
                  <Menu
                    anchorEl={amenitiesAnchor}
                    open={Boolean(amenitiesAnchor)}
                    onClose={() => setAmenitiesAnchor(null)}
                  >
                    {[
                      { label: "Solar", query: "solar=true" },
                      { label: "Borehole", query: "borehole=true" },
                      { label: "Security", query: "security=true" },
                      { label: "Parking", query: "parking=true" },
                      { label: "Internet", query: "internet=true" },
                    ].map((amenity) => (
                      <MenuItem
                        key={amenity.label}
                        onClick={() => {
                          setAmenitiesAnchor(null);
                          navigate(`/search?${amenity.query}`);
                        }}
                      >
                        {amenity.label}
                      </MenuItem>
                    ))}
                  </Menu>
                </Box>
              </Box>
            </AppCard>
            </Box>
          </AppContainer>
        </Box>
      </Box>

      <AppContainer sx={{ py: { xs: 6, md: 8 } }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            marginBottom: 3,
          }}
        >
          <Heading>Featured Properties</Heading>
          <AppButton variant="text" onClick={() => navigate("/search")}>
            View all →
          </AppButton>
        </Box>

        <Grid container spacing={3}>
          {highlightedLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Box
                    sx={{
                      borderRadius: "16px",
                      overflow: "hidden",
                      background: "background.paper",
                      boxShadow: "0 4px 16px rgba(31,41,55,0.08)",
                    }}
                  >
                    <Skeleton
                      variant="rectangular"
                      height={220}
                      sx={{ borderRadius: "16px 16px 0 0" }}
                    />
                    <Skeleton variant="text" width="60%" sx={{ mt: 2, ml: 2 }} />
                    <Skeleton variant="text" width="40%" sx={{ ml: 2, mb: 2 }} />
                  </Box>
                </Grid>
              ))
            : highlightedListings.map((item: any) => (
                <Grid item xs={12} sm={6} md={4} key={item?._id}>
                  <PropertyCard
                    item={item}
                    onClick={() => navigate(`/listing/${item?._id}`)}
                  />
                </Grid>
              ))}
        </Grid>
      </AppContainer>

      <AppContainer sx={{ pb: { xs: 6, md: 8 } }}>
        <Box sx={{ marginBottom: 3 }}>
          <Heading>Popular Neighbourhoods</Heading>
          <SubHeading sx={{ marginTop: 0.75 }}>
            Discover high-demand areas across Zimbabwe&apos;s major cities
          </SubHeading>
        </Box>
        <Grid container spacing={2}>
          {neighborhoodEntries.map((entry, index) => (
            <Grid
              item
              xs={6}
              sm={4}
              md={3}
              lg={2}
              key={`${entry.city}-${entry.neighborhood}`}
            >
              <Box
                onClick={() =>
                  navigate(
                    `/search?city=${entry.city}&neighborhood=${entry.neighborhood}`
                  )
                }
                sx={{
                  height: 100,
                  borderRadius: "14px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background:
                    neighborhoodGradients[index % neighborhoodGradients.length],
                  transition: "all 0.2s",
                  px: 1.5,
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: "0 12px 32px rgba(31,41,55,0.2)",
                  },
                }}
              >
                <Box
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                >
                  {entry.neighborhood}
                </Box>
                <Box
                  sx={{
                    color: "#fff",
                    opacity: 0.7,
                    fontSize: "11px",
                    mt: 0.5,
                  }}
                >
                  {entry.city}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Box
          component="button"
          type="button"
          onClick={() => navigate("/search")}
          sx={{
            mt: 2,
            border: 0,
            background: "transparent",
            color: "#1F4D3A",
            fontWeight: 700,
            cursor: "pointer",
            padding: 0,
            font: "inherit",
          }}
        >
          View all neighbourhoods &rarr;
        </Box>
      </AppContainer>

      <AppContainer sx={{ pb: { xs: 6, md: 8 } }}>
        <Heading sx={{ marginBottom: 3 }}>Popular Categories</Heading>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {categoryChips.map((category) => (
            <Box
              key={category.path}
              component="button"
              type="button"
              onClick={() => navigate(category.path)}
              sx={{
                background: "#F7EDDA",
                color: "#7D6234",
                border: "1px solid #EDD9B0",
                borderRadius: "999px",
                padding: "8px 18px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                "&:hover": {
                  background: "#EDD9B0",
                },
              }}
            >
              {category.icon}
              {category.label}
            </Box>
          ))}
        </Box>
      </AppContainer>

      <Box
        sx={{
          background: theme.palette.mode === "light" ? "#1F2937" : "#161B22",
          py: { xs: 5, md: 6 },
        }}
      >
        <AppContainer>
          <Grid container spacing={4}>
            {computeStats(statsData?.data).map((stat) => (
              <Grid item xs={6} md={3} key={stat.label}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.5,
                      fontSize: { xs: "2rem", md: "2.5rem" },
                      fontWeight: 800,
                      color: "#B8975A",
                      lineHeight: 1.1,
                    }}
                  >
                    {stat.value}
                    {stat.label === "Average Rating" ? (
                      <Star size={28} fill="currentColor" strokeWidth={2.5} />
                    ) : null}
                  </Box>
                  <Box
                    sx={{
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.65)",
                      fontWeight: 500,
                      marginTop: 0.75,
                    }}
                  >
                    {stat.label}
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </AppContainer>
      </Box>

      <AppContainer
        sx={{
          pb: { xs: 6, md: 8 },
          "& .swiper-pagination-bullet-active": { background: "#B8975A" },
        }}
      >
        <Box sx={{ marginBottom: 3 }}>
          <Heading>Discover Your Neighbourhood</Heading>
          <SubHeading sx={{ marginTop: 0.75 }}>
            Explore premium areas across Zimbabwe&apos;s major cities
          </SubHeading>
        </Box>
        <Swiper
          slidesPerView="auto"
          spaceBetween={16}
          modules={[Autoplay, Pagination, FreeMode]}
          autoplay={{ delay: 3500, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          speed={800}
          style={{ paddingBottom: "40px" }}
        >
          {neighborhoodEntries.map((entry, index) => (
            <SwiperSlide
              key={`${entry.city}-${entry.neighborhood}`}
              style={{ width: "220px" }}
            >
              <Box
                onClick={() =>
                  navigate(
                    `/search?city=${entry.city}&neighborhood=${entry.neighborhood}`
                  )
                }
                sx={{
                  position: "relative",
                  height: 280,
                  borderRadius: "16px",
                  overflow: "hidden",
                  cursor: "pointer",
                  backgroundImage: `url(${
                    NEIGHBOURHOOD_IMAGES[
                      index % NEIGHBOURHOOD_IMAGES.length
                    ]
                  })`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  "&:hover": {
                    transform: "scale(1.03)",
                    boxShadow: "0 16px 40px rgba(31,41,55,0.25)",
                  },
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(15,20,30,0.88) 0%, rgba(31,77,58,0.22) 60%, rgba(31,77,58,0) 100%)",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: 2,
                  }}
                >
                  <Box
                    sx={{
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "16px",
                      lineHeight: 1.2,
                    }}
                  >
                    {entry.neighborhood}
                  </Box>
                  <Box
                    sx={{
                      color: "rgba(255,255,255,0.72)",
                      fontSize: "12px",
                      mt: 0.5,
                    }}
                  >
                    {entry.city}
                  </Box>
                  <Box
                    sx={{
                      color: "#B8975A",
                      fontSize: "12px",
                      fontWeight: 700,
                      mt: 1,
                    }}
                  >
                    Explore &rarr;
                  </Box>
                </Box>
              </Box>
            </SwiperSlide>
          ))}
        </Swiper>
      </AppContainer>

      <Box
        sx={{
          background: "linear-gradient(135deg, #B8975A, #9E7E45)",
          py: { xs: 6, md: 8 },
          textAlign: "center",
        }}
      >
        <AppContainer>
          <Box
            sx={{
              fontSize: { xs: "1.75rem", md: "2.25rem" },
              fontWeight: 800,
              color: "#fff",
              marginBottom: 1.5,
            }}
          >
            Have a Property to Rent?
          </Box>
          <Box
            sx={{
              color: "rgba(255,255,255,0.85)",
              fontSize: "1.1rem",
              marginBottom: 3,
            }}
          >
            List it on Town Ruins and reach thousands of verified tenants
          </Box>
          <AppButton
            variant="outlined"
            size="large"
            onClick={handleListPropertyClick}
            sx={{
              color: "#fff",
              borderColor: "rgba(255,255,255,0.6)",
              "&:hover": {
                borderColor: "#fff",
                background: "rgba(255,255,255,0.1)",
              },
            }}
          >
            List Your Property
          </AppButton>
        </AppContainer>
      </Box>
    </Box>
  );
};

export default Home;
