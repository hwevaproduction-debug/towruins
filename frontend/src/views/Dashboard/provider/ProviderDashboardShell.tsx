import React, { Suspense, useMemo, useState } from "react";
import {
  Box,
  Chip,
  Grid,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AppContainer from "../../../components/ui/AppContainer";
import AppButton from "../../../components/ui/AppButton";
import AppCard from "../../../components/ui/AppCard";
import {
  toEntityArray,
  toEntityObject,
  useGetMyAccommodationQuery,
  useGetMyAnalyticsQuery,
  useGetMyRoomsQuery,
  useGetProviderBookingsQuery,
  useGetProviderProfileQuery,
} from "../../../redux/api/providerApiSlice";
import StatCard from "./components/StatCard";
import ListingWizard from "./wizard/ListingWizard";
import ProviderTourDialog from "./wizard/ProviderTourDialog";

const RoomsTab = React.lazy(() => import("./tabs/RoomsTab"));
const BookingsTab = React.lazy(() => import("./tabs/BookingsTab"));
const CalendarTab = React.lazy(() => import("./tabs/CalendarTab"));
const PricingTab = React.lazy(() => import("./tabs/PricingTab"));
const AnalyticsTab = React.lazy(() => import("./tabs/AnalyticsTab"));
const PolicyTab = React.lazy(() => import("./tabs/PolicyTab"));
const PayoutsTab = React.lazy(() => import("./tabs/PayoutsTab"));
const AvailabilityTab = React.lazy(() => import("./tabs/AvailabilityTab"));
const PromotionsTab = React.lazy(() => import("./tabs/PromotionsTab"));
const ReviewsTab = React.lazy(() => import("./tabs/ReviewsTab"));

const tabs = ["Rooms", "Bookings", "Calendar", "Pricing", "Analytics", "Policies", "Payouts", "Availability", "Promotions", "Reviews"];
const formatCurrency = (value: any) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));

const ProviderDashboardShell = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const isoDate30DaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const isoDateToday = new Date().toISOString().slice(0, 10);
  const { data: roomsResponse, refetch: refetchRooms } = useGetMyRoomsQuery(undefined);
  const { data: bookingsResponse } = useGetProviderBookingsQuery(undefined);
  const { data: profileResponse } = useGetProviderProfileQuery(undefined);
  const { data: analyticsResponse } = useGetMyAnalyticsQuery({ from: isoDate30DaysAgo, to: isoDateToday });
  const { data: accommodationResponse } = useGetMyAccommodationQuery(undefined);
  const rooms = useMemo(() => toEntityArray(roomsResponse, ["rooms", "data"]), [roomsResponse]);
  const bookings = useMemo(() => toEntityArray(bookingsResponse, ["bookings", "data"]), [bookingsResponse]);
  const profile = toEntityObject(profileResponse, ["provider", "profile", "data"]);
  const accommodation = toEntityObject(accommodationResponse, ["accommodation"]) || {};
  const analytics = toEntityObject(analyticsResponse, ["data"]) || {};
  const occupancyRate = analyticsResponse?.data?.occupancyRate ?? analytics?.occupancyRate;
  const accommodationId = accommodation?._id || accommodation?.id || rooms[0]?.accommodationId || "";
  const businessName = accommodation?.name || profile?.providerProfile?.businessName || profile?.username || "Provider Dashboard";
  const activeBookings = bookings.filter((booking: any) => ["PENDING_CONFIRMATION", "CONFIRMED", "CHECKED_IN"].includes(String(booking?.status || "").toUpperCase())).length;
  const pendingPayout = bookings
    .filter((booking: any) => String(booking?.settlementStatus || "").toUpperCase() === "PENDING" && ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(String(booking?.status || "").toUpperCase()))
    .reduce((sum: number, booking: any) => sum + Number(booking?.netPayout || 0), 0);

  return (
    <Box sx={{ mt: { xs: 5, md: 6 }, mb: 6 }}>
      <AppContainer>
        <AppCard
          elevation="raised"
          sx={{
            background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)",
            color: "#fff",
            p: { xs: 2, md: 3 },
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, flexDirection: { xs: "column", md: "row" }, gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={800} color="#fff" data-tour-id="provider-dashboard-header">{businessName}</Typography>
              <Chip
                size="small"
                label={String(accommodation?.verificationStatus || profile?.providerProfile?.verificationStatus || "PENDING").replace(/_/g, " ")}
                sx={
                  String(accommodation?.verificationStatus || "").toUpperCase() === "APPROVED"
                    ? { mt: 1, background: "#D1EAE0", color: "#1F4D3A", fontWeight: 700 }
                    : { mt: 1, background: "#FDF8F0", color: "#9E7E45", fontWeight: 700 }
                }
              />
            </Box>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <AppButton startIcon={<AddIcon />} data-tour-id="create-listing-button" onClick={() => setWizardOpen(true)}>
                Create Listing
              </AppButton>
              <AppButton variant="outlined" size="small" onClick={() => setTourOpen(true)} data-tour-id="start-tour-button" sx={{ ml: 1 }}>
                Take guided tour
              </AppButton>
            </Box>
          </Box>
        </AppCard>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}><StatCard label="Total Rooms" value={rooms.length} /></Grid>
          <Grid item xs={12} md={3}><StatCard label="Active Bookings" value={activeBookings} /></Grid>
          <Grid item xs={12} md={3}><StatCard label="Pending Payout" value={formatCurrency(pendingPayout)} /></Grid>
          <Grid item xs={12} md={3}><StatCard label="Occupancy (30d)" value={occupancyRate != null ? `${Number(occupancyRate).toFixed(1)}%` : "-"} /></Grid>
        </Grid>

        <AppCard elevation="flat" sx={{ mb: 3, p: 0.5 }}>
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTabs-indicator": { backgroundColor: "#B8975A" },
              "& .MuiTab-root": {
                color: "#64748B",
                borderRadius: "10px",
                minHeight: 44,
                "&:hover": { background: "rgba(184,151,90,0.08)" },
                "&.Mui-selected": { color: "text.primary" },
              },
            }}
          >
            {tabs.map((tab) => <Tab key={tab} label={tab} />)}
          </Tabs>
        </AppCard>

        <Suspense fallback={<Typography>Loading tab...</Typography>}>
          {activeTab === 0 ? (
            <RoomsTab rooms={rooms} accommodationId={accommodationId} onRoomCreated={refetchRooms} onRoomUpdated={refetchRooms} onRoomDeleted={refetchRooms} />
          ) : activeTab === 1 ? (
            <BookingsTab bookings={bookings} />
          ) : activeTab === 2 ? (
            <CalendarTab rooms={rooms} />
          ) : activeTab === 3 ? (
            <PricingTab rooms={rooms} accommodationId={accommodationId} />
          ) : activeTab === 4 ? (
            <AnalyticsTab rooms={rooms} accommodationId={accommodationId} />
          ) : activeTab === 5 ? (
            <PolicyTab accommodationId={accommodationId} />
          ) : activeTab === 6 ? (
            <PayoutsTab bookings={bookings} />
          ) : activeTab === 7 ? (
            <AvailabilityTab rooms={rooms} />
          ) : activeTab === 8 ? (
            <PromotionsTab accommodationId={accommodationId} rooms={rooms} />
          ) : (
            <ReviewsTab accommodationId={accommodationId} />
          )}
        </Suspense>
      </AppContainer>
      <ListingWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    <ProviderTourDialog open={tourOpen} onClose={() => setTourOpen(false)} />
    </Box>
  );
};

export default ProviderDashboardShell;
