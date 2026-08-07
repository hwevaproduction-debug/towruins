import { Box, Grid } from "@mui/material";
import AppCard from "../../components/ui/AppCard";
import AppContainer from "../../components/ui/AppContainer";

const LandlordGuide = () => (
  <Box>
    <Box
      sx={{
        background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)",
        pt: { xs: 12, md: 14 },
        pb: { xs: 6, md: 8 },
        textAlign: "center",
        px: 2,
      }}
    >
      <Box
        sx={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.15em",
          color: "#B8975A",
          textTransform: "uppercase",
          mb: 2,
        }}
      >
        Landlord Guide
      </Box>
      <Box
        component="h1"
        sx={{ fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 800, color: "#fff", m: 0 }}
      >
        List Your Property. Reach Tenants.
      </Box>
      <Box
        sx={{
          color: "rgba(255,255,255,0.8)",
          mt: 2,
          maxWidth: 600,
          mx: "auto",
          fontSize: { xs: "1rem", md: "1.125rem" },
        }}
      >
        Create listings, manage engagement requests, and handle token-based premium actions
        from your dashboard.
      </Box>
    </Box>

    <AppContainer sx={{ py: { xs: 6, md: 8 } }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <AppCard sx={{ p: 3 }}>
            <Box sx={{ fontWeight: 800, fontSize: "22px", mb: 1 }}>How It Works</Box>
            <Box sx={{ color: "text.secondary", mb: 3 }}>
              Five simple steps to list your property and start earning.
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box sx={{ fontWeight: 800, color: "#B8975A", mb: 0.5 }}>Step 1</Box>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Create Account</Box>
                <Box sx={{ color: "text.secondary" }}>
                  Sign up as a landlord, verify your email and phone to unlock listing
                  privileges.
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ fontWeight: 800, color: "#B8975A", mb: 0.5 }}>Step 2</Box>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Verify Your Identity</Box>
                <Box sx={{ color: "text.secondary" }}>
                  Upload a government ID and selfie from your Profile page. Required before you
                  can list.
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ fontWeight: 800, color: "#B8975A", mb: 0.5 }}>Step 3</Box>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Create a Listing</Box>
                <Box sx={{ color: "text.secondary" }}>
                  Use the listing wizard to add property details, photos, amenities, and
                  pricing.
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ fontWeight: 800, color: "#B8975A", mb: 0.5 }}>Step 4</Box>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Submit & Manage Lifecycle</Box>
                <Box sx={{ color: "text.secondary" }}>
                  Submit your listing details. If the listing later enters an activation or
                  restore flow, the dashboard shows the TR Token cost before you confirm.
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ fontWeight: 800, color: "#B8975A", mb: 0.5 }}>Step 5</Box>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Manage Requests</Box>
                <Box sx={{ color: "text.secondary" }}>
                  Approve or decline tenant engagement requests from your dashboard.
                </Box>
              </Grid>
            </Grid>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Creating a Listing</Box>
            <Box sx={{ color: "text.secondary" }}>
              Navigate to /create-listing and fill in your property details: name, description,
              address, province, city, monthly rent, bathrooms, bedrooms, total rooms,
              furnished status, and amenities. Upload photos via our secure uploader. Your
              draft is saved in your browser session and can be restored if you leave the page.
              When ready, submit the listing and manage any later activation or restoration
              steps from your dashboard using TR Tokens.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Listing Fee & Activation</Box>
            <Box sx={{ color: "text.secondary" }}>
              When a listing enters an activation or restore flow, the dashboard shows the TR
              Token cost before you confirm. Premium listing actions use TR Tokens rather than
              direct money payments.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12}>
          <AppCard sx={{ p: 3 }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 2 }}>Listing Lifecycle</Box>
            <Box sx={{ overflowX: "auto" }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
                  gap: 1,
                  "& > div": {
                    py: 1.5,
                    px: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  },
                }}
              >
                <Box sx={{ fontWeight: 700 }}>Status</Box>
                <Box sx={{ fontWeight: 700 }}>What it means</Box>
                <Box sx={{ fontWeight: 700 }}>What you can do</Box>

                <Box>Active</Box>
                <Box sx={{ color: "text.secondary" }}>Fully public</Box>
                <Box sx={{ color: "text.secondary" }}>Edit, Delete</Box>

                <Box>Expired</Box>
                <Box sx={{ color: "text.secondary" }}>Past expiry date</Box>
                <Box sx={{ color: "text.secondary" }}>Restore (costs TR Tokens)</Box>

                <Box>Inactive</Box>
                <Box sx={{ color: "text.secondary" }}>Admin-deactivated</Box>
                <Box sx={{ color: "text.secondary" }}>Revive (spend TR Tokens to restore)</Box>
              </Box>
              <Box sx={{ color: "text.secondary", fontSize: "13px", mt: 1.5 }}>
                Note: Pending Payment and Early Access are transitional states used in
                token-based activation and visibility flows.
              </Box>
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>
              Responding to Engagement Requests
            </Box>
            <Box sx={{ color: "text.secondary" }}>
              Tenants send you a message via the listing page when they want to contact you.
              You receive a notification and can review their message in your dashboard under
              "Incoming Engagement Requests". Click Approve - the tenant will see your phone
              number and address in their dashboard. You can also Decline the request if it
              does not suit your needs.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Managing TR Tokens</Box>
            <Box sx={{ color: "text.secondary" }}>
              TR Tokens are used for premium landlord actions such as listing activation and
              restoring expired listings. View your balance and transaction history in the
              dashboard sidebar. Visit /docs/tr-tokens for the full token economics guide.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>
              Restoring Expired Listings
            </Box>
            <Box sx={{ color: "text.secondary" }}>
              When a listing expires it shows "Expired" status. Click Restore and choose how
              many days to extend. The cost in TR Tokens is shown before you confirm. Once
              confirmed the listing is reactivated and tokens are deducted from your wallet.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Identity Verification</Box>
            <Box sx={{ color: "text.secondary" }}>
              Identity verification is required for all landlords before listing. Go to
              /profile and click "Start Verification". Upload a clear government ID photo and a
              selfie. Your submission is reviewed by our admin team within 24-48 hours. You
              will be notified of the outcome. If rejected, you can resubmit with updated
              documents.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12}>
          <AppCard sx={{ p: 3 }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>Dashboard Overview</Box>
            <Box sx={{ color: "text.secondary" }}>
              Your landlord dashboard shows 4 KPI cards at the top: Active Listings, Expiring
              Soon, Token Balance, and Pending Requests. Below that, a listings table with
              status chips and actions such as edit, delete, and restore/activate when
              required. The wallet history tracks your TR Token activity, and the wallet card
              displays your current balance and recent transactions.
            </Box>
          </AppCard>
        </Grid>

        <Grid item xs={12}>
          <AppCard sx={{ p: 3 }}>
            <Box sx={{ fontWeight: 800, fontSize: "22px", mb: 2 }}>
              Frequently Asked Questions
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>
                  How much does it cost to list a property?
                </Box>
                <Box sx={{ color: "text.secondary" }}>
                  If a listing enters an activation flow, the TR Token cost is shown before you
                  confirm the action.
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>How long does a listing stay active?</Box>
                <Box sx={{ color: "text.secondary" }}>
                  Listings have an expiry date. You can restore expired listings using TR
                  Tokens.
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>
                  What happens if I do not have enough TR Tokens?
                </Box>
                <Box sx={{ color: "text.secondary" }}>
                  The activation or restore action will not complete until your wallet has
                  enough TR Tokens for that premium step.
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>
                  Can I edit my listing after it&apos;s active?
                </Box>
                <Box sx={{ color: "text.secondary" }}>
                  Yes, use the edit (pencil) icon in your listings table.
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>
                  What do tenants see when I approve their request?
                </Box>
                <Box sx={{ color: "text.secondary" }}>
                  They see your phone number and property address in their dashboard.
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>How do I get verified?</Box>
                <Box sx={{ color: "text.secondary" }}>
                  Go to your Profile page and click "Start Verification". Upload your ID and a
                  selfie.
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>Can I have multiple listings?</Box>
                <Box sx={{ color: "text.secondary" }}>
                  No, you can only have one active listing at a time.
                </Box>
              </Grid>
            </Grid>
          </AppCard>
        </Grid>
      </Grid>
    </AppContainer>
  </Box>
);

export default LandlordGuide;
