import { Box, Grid } from "@mui/material";
import AppCard from "../../components/ui/AppCard";
import AppContainer from "../../components/ui/AppContainer";

const ProviderGuide = () => (
  <Box>
    <Box sx={{ background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)", pt: { xs: 12, md: 14 }, pb: { xs: 6, md: 8 }, textAlign: "center", px: 2 }}>
      <Box sx={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", color: "#B8975A", textTransform: "uppercase", mb: 2 }}>Provider Guide</Box>
      <Box component="h1" sx={{ fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 800, color: "#fff", m: 0 }}>Run Your Accommodation on Town Ruins</Box>
      <Box sx={{ color: "rgba(255,255,255,0.8)", mt: 2, maxWidth: 600, mx: "auto", fontSize: { xs: "1rem", md: "1.125rem" } }}>Register, set up your rooms, and start accepting bookings from guests across Zimbabwe.</Box>
    </Box>

    <AppContainer sx={{ py: { xs: 6, md: 8 } }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <AppCard sx={{ p: 3 }}>
            <Box sx={{ fontWeight: 800, fontSize: "22px", mb: 1 }}>How It Works</Box>
            <Box sx={{ color: "text.secondary", mb: 3 }}>Five simple steps to start accepting bookings.</Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box sx={{ fontWeight: 800, color: "#B8975A", mb: 0.5 }}>Step 1</Box>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Submit Your Interest</Box>
                <Box sx={{ color: "text.secondary" }}>Fill in your full name, email, phone, property type (House, Flat, Room, Student Accommodation, or Other), location, and a brief description at /provider-signup</Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ fontWeight: 800, color: "#B8975A", mb: 0.5 }}>Step 2</Box>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Wait for Our Team</Box>
                <Box sx={{ color: "text.secondary" }}>Our team reviews your submission and contacts you within 48 hours to guide you through the listing process</Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ fontWeight: 800, color: "#B8975A", mb: 0.5 }}>Step 3</Box>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Set Up Rooms</Box>
                <Box sx={{ color: "text.secondary" }}>Add rooms, images, pricing, and policies from your dashboard</Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ fontWeight: 800, color: "#B8975A", mb: 0.5 }}>Step 4</Box>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Go Live</Box>
                <Box sx={{ color: "text.secondary" }}>Once approved, your accommodation appears in stay search results</Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ fontWeight: 800, color: "#B8975A", mb: 0.5 }}>Step 5</Box>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Manage Bookings</Box>
                <Box sx={{ color: "text.secondary" }}>Confirm, decline, check in guests, and track payouts</Box>
              </Grid>
            </Grid>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Registration</Box>
            <Box sx={{ color: "text.secondary" }}>
              Navigate to /provider-signup and fill in: full name, email, phone, property type (House, Flat, Room, Student Accommodation, or Other), location, a description of the property, and an optional referral field. Submit the form and you will see a confirmation message: "Our team will be in touch within 48 hours to guide you through the listing process." There is no automated accommodation-creation or verification-status step on this page.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Setting Up Your Accommodation</Box>
            <Box sx={{ color: "text.secondary" }}>
              After approval, use the Listing Wizard from your dashboard → 6 steps: (1) Accommodation Info, (2) Rooms, (3) Images, (4) Pricing, (5) Policies, (6) Review & Submit → draft auto-saves every few seconds → you can resume at any time.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Managing Rooms</Box>
            <Box sx={{ color: "text.secondary" }}>
              Room fields: name, room type (Single / Double / Twin / Suite / Dormitory / Studio / Entire Unit), capacity, base price per night, booking mode (INSTANT = auto-confirmed after payment; REQUEST = you manually confirm), status (Available / Unavailable / Maintenance) → add multiple images per room → manage from the Rooms tab.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Pricing & Fees</Box>
            <Box sx={{ color: "text.secondary" }}>
              Base price: set per room, per night. Seasonal rates: override base price for specific date ranges or days of week (e.g. weekend rates, holiday rates). Room fees: add cleaning fee, linen fee, pet fee, or other fees (per stay or per night, optional or mandatory). Tax rule: set a percentage tax per accommodation (inclusive or exclusive, applies to subtotal / cleaning / all). Occupancy pricing: charge extra per guest above a base guest count.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Cancellation & Check-in Policies</Box>
            <Box sx={{ color: "text.secondary" }}>
              Cancellation policy types: FLEXIBLE (full refund if cancelled early), MODERATE, STRICT, NON_REFUNDABLE, CUSTOM. Check-in rules: set check-in window (e.g. 14:00–22:00), check-out time, self check-in option, late check-out fee, special instructions.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Managing Bookings</Box>
            <Box sx={{ color: "text.secondary" }}>
              PENDING_CONFIRMATION: guest has requested → you Confirm or Decline (REQUEST mode only). CONFIRMED: booking confirmed → guest pays → you Check In when guest arrives. CHECKED_IN: guest is on-site → auto-completes on checkout date. CANCELLED: either party cancelled → refund calculated per policy. Filter bookings by status using the chip filters in the Bookings tab.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Calendar & Availability</Box>
            <Box sx={{ color: "text.secondary" }}>
              Select a room → navigate months → booked dates shown in blue/purple → blocked dates shown in red → click a date range to block it and add a reason → delete blocks anytime → pricing for each date is shown directly in the day cell.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Promotions & Coupons</Box>
            <Box sx={{ color: "text.secondary" }}>
              Create promotions with percentage or fixed discounts → set validity dates and minimum nights → generate coupon codes guests can enter at checkout → deactivate promotions anytime from the Promotions tab.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Payouts</Box>
            <Box sx={{ color: "text.secondary" }}>
              Your net payout = total booking price minus platform commission → commission rate set by admin (default 10%) → payouts shown in the Payouts tab → status: PENDING (awaiting settlement) or SETTLED (paid out) → settlement triggered by admin.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Analytics</Box>
            <Box sx={{ color: "text.secondary" }}>
              View revenue by month and occupancy by room → filter by date range and specific room → 5 KPI cards: Occupancy Rate, Total Revenue, Net Payout, Booking Count, and Avg Nights.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12}>
          <AppCard sx={{ p: 3 }}>
            <Box sx={{ fontWeight: 800, fontSize: "22px", mb: 2 }}>Frequently Asked Questions</Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>How long does approval take?</Box>
                <Box sx={{ color: "text.secondary" }}>Typically 24–48 hours after registration.</Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Can I have multiple room types?</Box>
                <Box sx={{ color: "text.secondary" }}>Yes, add as many rooms as your accommodation has.</Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>What is the difference between INSTANT and REQUEST booking mode?</Box>
                <Box sx={{ color: "text.secondary" }}>INSTANT confirms automatically after payment. REQUEST requires you to manually confirm each booking.</Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>How do I get paid?</Box>
                <Box sx={{ color: "text.secondary" }}>Payouts are settled by the admin team. Your net payout (after commission) is shown in the Payouts tab.</Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>What is the commission rate?</Box>
                <Box sx={{ color: "text.secondary" }}>The default is 10% of the booking total. Your rate is shown in your provider profile.</Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Can guests cancel?</Box>
                <Box sx={{ color: "text.secondary" }}>Yes, based on your cancellation policy. Refunds are calculated automatically.</Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>How do I block dates for maintenance?</Box>
                <Box sx={{ color: "text.secondary" }}>Use the Calendar tab → select a room → click and drag to select a date range → add a reason for the block → save. Delete blocks anytime from the calendar.</Box>
              </Grid>
            </Grid>
          </AppCard>
        </Grid>
      </Grid>
    </AppContainer>
  </Box>
);

export default ProviderGuide;
