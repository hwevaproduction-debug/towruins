import { Box, Grid } from "@mui/material";
import AppCard from "../../components/ui/AppCard";
import AppContainer from "../../components/ui/AppContainer";

const TenantGuide = () => (
  <Box>
    <Box sx={{ background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)", pt: { xs: 12, md: 14 }, pb: { xs: 6, md: 8 }, textAlign: "center", px: 2 }}>
      <Box sx={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", color: "#B8975A", textTransform: "uppercase", mb: 2 }}>Tenant Guide</Box>
      <Box component="h1" sx={{ fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 800, color: "#fff", m: 0 }}>Find Your Next Home in Zimbabwe</Box>
      <Box sx={{ color: "rgba(255,255,255,0.8)", mt: 2, maxWidth: 600, mx: "auto", fontSize: { xs: "1rem", md: "1.125rem" } }}>Search listings, book stays, and connect with landlords — all in one place.</Box>
    </Box>

    <AppContainer sx={{ py: { xs: 6, md: 8 } }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <AppCard sx={{ p: 3 }}>
            <Box sx={{ fontWeight: 800, fontSize: "22px", mb: 1 }}>How It Works</Box>
            <Box sx={{ color: "text.secondary", mb: 3 }}>Five simple steps to find your next home or short-stay room.</Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box sx={{ fontWeight: 800, color: "#B8975A", mb: 0.5 }}>Step 1</Box>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Create Account</Box>
                <Box sx={{ color: "text.secondary" }}>Sign up as a tenant, verify your email and phone to unlock full access.</Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ fontWeight: 800, color: "#B8975A", mb: 0.5 }}>Step 2</Box>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Search Listings</Box>
                <Box sx={{ color: "text.secondary" }}>Filter by location, rent range, rooms, amenities, and listing type to narrow results.</Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ fontWeight: 800, color: "#B8975A", mb: 0.5 }}>Step 3</Box>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Contact Landlords</Box>
                <Box sx={{ color: "text.secondary" }}>Send an engagement message; the landlord approves and shares their contact details.</Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ fontWeight: 800, color: "#B8975A", mb: 0.5 }}>Step 4</Box>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Book a Stay</Box>
                <Box sx={{ color: "text.secondary" }}>Find short-stay rooms, select dates, and submit guest info. INSTANT-mode rooms proceed to payment and confirmation; REQUEST-mode rooms wait for provider approval.</Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ fontWeight: 800, color: "#B8975A", mb: 0.5 }}>Step 5</Box>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Manage Everything</Box>
                <Box sx={{ color: "text.secondary" }}>Track bookings, saved searches, and notifications from your personal dashboard.</Box>
              </Grid>
            </Grid>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Searching for Listings</Box>
            <Box sx={{ color: "text.secondary" }}>
              Use the search page to filter listings by province, city, or neighborhood. Narrow by rent range ($0–$5000), minimum rooms, and amenities such as solar, borehole, security, or internet. Choose listing type — rent, student, or all — and sort results by latest, oldest, or price. Pagination loads more results with "Show More", and recently viewed listings are saved in your dashboard for quick access.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Contacting a Landlord</Box>
            <Box sx={{ color: "text.secondary" }}>
              View any listing and click "Contact Landlord" to open the engagement modal. Write a short message introducing yourself and your needs. The landlord receives a notification and can approve or decline. Once approved, their phone number and address appear in your dashboard under "Approved Contacts" so you can follow up directly.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Booking a Stay</Box>
            <Box sx={{ color: "text.secondary" }}>
              Browse stays on the stays page, select a room, and pick check-in/check-out dates on the calendar. Review the price breakdown — base rate, fees, tax, and any discounts — then optionally apply a coupon code. Click "Book Now", submit your guest info (full name, phone, national ID, and estimated arrival time), and pay via EcoCash. INSTANT-mode rooms are confirmed automatically after payment. REQUEST-mode rooms are sent to the provider for approval and may stay in "Awaiting Approval" until the provider responds.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Cancellation & Refunds</Box>
            <Box sx={{ color: "text.secondary" }}>
              Cancel a booking from My Bookings at any time. Before confirming, you can preview the refund amount. The actual refund depends on the property's cancellation policy — FLEXIBLE, MODERATE, STRICT, or NON_REFUNDABLE. Approved refunds are processed back to your original payment method.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Premium Membership</Box>
            <Box sx={{ color: "text.secondary" }}>
              Upgrade to Premium Membership by spending TR Tokens from your wallet. Premium tenants get early access to new listings before they go public, giving you a head start on the best properties. Renew from your dashboard at any time. Each membership lasts 30 days and your dashboard shows the expiry date and days remaining.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Saved Searches</Box>
            <Box sx={{ color: "text.secondary" }}>
              Save search criteria from /saved-searches by giving a name and setting location, rent range, minimum bedrooms, and amenities. You will be notified when new matching listings appear. From your dashboard you can view and delete saved searches.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12}>
          <AppCard sx={{ p: 3 }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Notifications</Box>
            <Box sx={{ color: "text.secondary" }}>
              Stay updated with the bell icon in the header — it shows your unread count in real time via a floating notification bubble. Visit /notifications to see the full list, mark all notifications as read, and manage your email, push, and in-app preferences.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>TR Token Wallet</Box>
            <Box sx={{ color: "text.secondary" }}>
              Every tenant account comes with a TR Token wallet. View your balance and transaction history in the dashboard sidebar. Tokens are used for actions such as contacting landlords and restoring expired listings. Visit /docs/tr-tokens for the full token economics guide.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12}>
          <AppCard sx={{ p: 3 }}>
            <Box sx={{ fontWeight: 800, fontSize: "22px", mb: 2 }}>Frequently Asked Questions</Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Do I need to pay to search listings?</Box>
                <Box sx={{ color: "text.secondary" }}>No, searching and browsing is always free.</Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>How do I get a landlord's contact details?</Box>
                <Box sx={{ color: "text.secondary" }}>Send an engagement request. Once the landlord approves, their phone number and address appear in your dashboard.</Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Can I cancel a booking?</Box>
                <Box sx={{ color: "text.secondary" }}>Yes, from My Bookings. The refund amount depends on the property's cancellation policy.</Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>What is Premium Membership?</Box>
                <Box sx={{ color: "text.secondary" }}>A 30-day TR Token spend that gives you early access to new listings before they go public.</Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>How do I pay for a stay?</Box>
                <Box sx={{ color: "text.secondary" }}>Via EcoCash (Paynow). You will receive a payment prompt on your phone.</Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>What if my booking isn't confirmed?</Box>
                <Box sx={{ color: "text.secondary" }}>For REQUEST mode rooms, the provider must confirm. For INSTANT mode, confirmation is automatic after payment.</Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>How do I report a problem?</Box>
                <Box sx={{ color: "text.secondary" }}>Email support@townruins.com for assistance with listings, bookings, or account issues.</Box>
              </Grid>
            </Grid>
          </AppCard>
        </Grid>
      </Grid>
    </AppContainer>
  </Box>
);

export default TenantGuide;
