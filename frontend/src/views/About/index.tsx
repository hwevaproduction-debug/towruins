// MUI Imports
import { Box, Grid, Link, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Eye, FileText, Home, Key, Search, Shield, Smartphone, UserX, Users } from "lucide-react";
// Custom Imports
import { SubHeading } from "../../components/Heading";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import { useGetPublicStatsQuery } from "../../redux/api/listingApiSlice";

const fallbackStats = [
  { value: "Curated", label: "Premium Listings" },
  { value: "Trusted", label: "Verified Landlords" },
  { value: "10", label: "Provinces Covered" },
  { value: "Top Rated", label: "Verified Stays" },
];

const computeStats = (data: any) => {
  if (!data) {
    return fallbackStats;
  }

  const activeListings = Number(data.activeListings || 0);
  const landlords = Number(data.landlords || 0);
  const provinces = Number(data.provinces || 0);
  const avgRating = Number(data.avgRating || 0);
  const hasAvgRating = Number.isFinite(avgRating) && avgRating > 0;

  return [
    activeListings >= 100
      ? { value: `${activeListings}+`, label: "Active Listings" }
      : { value: "Growing", label: "Curated Listings" },
    landlords >= 50
      ? { value: `${landlords}+`, label: "Verified Landlords" }
      : { value: "Growing Network", label: "Trusted Landlords" },
    { value: String(provinces || 10), label: "Provinces Covered" },
    hasAvgRating && avgRating >= 4.0
      ? { value: `${avgRating.toFixed(1)}★`, label: "Average Rating" }
      : { value: "Highly Rated", label: "Verified Stays" },
  ];
};

const stepCards = [
  {
    Icon: Search,
    title: "Browse Freely",
    body: "Explore verified listings without creating an account",
  },
  {
    Icon: Home,
    title: "Connect Directly",
    body: "Contact landlords directly — no agent fees",
  },
  {
    Icon: Shield,
    title: "Move In Confidently",
    body: "Verified listings, structured data, trusted platform",
  },
];

const valueCards = [
  {
    Icon: Eye,
    title: "Transparency",
    body: "Every listing shows real data — rooms, amenities, price",
  },
  {
    Icon: UserX,
    title: "No Middlemen",
    body: "Direct landlord-to-tenant connections",
  },
  {
    Icon: Smartphone,
    title: "Mobile First",
    body: "Built for Zimbabwe's mobile-first reality",
  },
  {
    Icon: Key,
    title: "Landlord Control",
    body: "Landlords own their listings, set their terms",
  },
];

const About = () => {
  const navigate = useNavigate();
  const { data: statsData } = useGetPublicStatsQuery(undefined);

  return (
    <>
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
          OUR STORY
        </Box>
        <Box
          component="h1"
          sx={{
            fontSize: { xs: "2rem", md: "3rem" },
            fontWeight: 800,
            color: "#fff",
            m: 0,
            mb: 2,
          }}
        >
          Reimagining Property Discovery in Zimbabwe
        </Box>
        <Box
          sx={{
            fontSize: "1.1rem",
            color: "rgba(255,255,255,0.75)",
            maxWidth: 560,
            mx: "auto",
            lineHeight: 1.6,
          }}
        >
          Agent-free. Transparent. Built for real people.
        </Box>
      </Box>

      <AppContainer sx={{ py: { xs: 6, md: 8 } }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                borderRadius: "20px",
                overflow: "hidden",
                height: { xs: 240, md: 360 },
              }}
            >
              <Box
                component="img"
                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80"
                alt="Luxury property"
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ color: "#B8975A", fontSize: "2rem", fontWeight: 800, mb: 2 }}>
              Our Mission
            </Box>
            <SubHeading sx={{ color: "text.secondary", lineHeight: 1.8, mb: 2 }}>
              We built Town Ruins because finding a home in Zimbabwe shouldn't require
              an agent, inflated fees, or wasted weekends. Direct connections. Real
              listings. Zero middlemen.
            </SubHeading>
            <SubHeading sx={{ color: "text.secondary", lineHeight: 1.8 }}>
              Tenants browse freely. Landlords list directly. No intermediaries. No
              hidden costs. Just transparent, structured property data for everyone.
            </SubHeading>
          </Grid>
        </Grid>

        <Box sx={{ mt: { xs: 6, md: 8 } }}>
          <Grid container spacing={3}>
            {stepCards.map(({ Icon, title, body }) => (
              <Grid item xs={12} md={4} key={title}>
                <AppCard sx={{ p: 3, textAlign: "center", height: "100%" }}>
                  <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                    <Icon size={28} color="#B8975A" />
                  </Box>
                  <Box sx={{ fontWeight: 800, fontSize: "18px", mb: 1 }}>{title}</Box>
                  <SubHeading sx={{ color: "text.secondary" }}>{body}</SubHeading>
                </AppCard>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mt: { xs: 6, md: 8 } }}>
          <Grid container spacing={3}>
            {valueCards.map(({ Icon, title, body }) => (
              <Grid item xs={12} sm={6} key={title}>
                <AppCard sx={{ p: 2.5, height: "100%" }}>
                  <Box sx={{ mb: 1.5 }}>
                    <Icon size={24} color="#B8975A" />
                  </Box>
                  <Box sx={{ fontWeight: 800, fontSize: "17px", mb: 0.75 }}>
                    {title}
                  </Box>
                  <SubHeading sx={{ color: "text.secondary" }}>{body}</SubHeading>
                </AppCard>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mt: { xs: 6, md: 8 }, mb: 8 }}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box sx={{ color: "#B8975A", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", mb: 1 }}>Safety First</Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary" }}>Trust & Safety</Typography>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <AppCard sx={{ p: 3, height: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Shield size={32} color="#B8975A" style={{ marginBottom: 12 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Landlord Verification</Typography>
                <Typography sx={{ color: "text.secondary", fontSize: 14, mb: 2 }}>All landlords on Town Ruins go through identity and document verification before listing properties.</Typography>
                <Link component={RouterLink} to="/trust-safety" sx={{ color: "#B8975A", fontWeight: 600, fontSize: 14 }}>Learn more →</Link>
              </AppCard>
            </Grid>
            <Grid item xs={12} sm={6}>
              <AppCard sx={{ p: 3, height: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Users size={32} color="#B8975A" style={{ marginBottom: 12 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Community Standards</Typography>
                <Typography sx={{ color: "text.secondary", fontSize: 14, mb: 2 }}>Our community guidelines ensure respectful, safe interactions for every tenant and landlord on the platform.</Typography>
                <Link component={RouterLink} to="/community-guidelines" sx={{ color: "#B8975A", fontWeight: 600, fontSize: 14 }}>Read guidelines →</Link>
              </AppCard>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mb: 8 }}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box sx={{ color: "#B8975A", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", mb: 1 }}>Transparency</Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary" }}>Legal & Compliance</Typography>
          </Box>
          <Grid container spacing={2}>
            {[
              { title: "Terms of Use", desc: "Rules governing use of the platform", path: "/terms" },
              { title: "Privacy Policy", desc: "How we collect and protect your data", path: "/privacy" },
              { title: "Refund Policy", desc: "Cancellation and refund procedures", path: "/refund-policy" },
              { title: "Landlord Agreement", desc: "Terms for hosting on Town Ruins", path: "/landlord-terms" },
            ].map((doc) => (
              <Grid item xs={12} sm={6} md={3} key={doc.path}>
                <AppCard sx={{ p: 2.5, boxShadow: "0 4px 24px rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <FileText size={24} color="#B8975A" style={{ marginBottom: 8 }} />
                  <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{doc.title}</Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: 13, mb: 1.5 }}>{doc.desc}</Typography>
                  <Link component={RouterLink} to={doc.path} sx={{ color: "#B8975A", fontWeight: 600, fontSize: 13 }}>Read →</Link>
                </AppCard>
              </Grid>
            ))}
          </Grid>
        </Box>
      </AppContainer>

      <Box sx={{ background: "#1F2937", py: 5 }}>
        <AppContainer>
          <Grid container spacing={4}>
            {computeStats(statsData?.data).map((stat) => (
              <Grid item xs={6} md={3} key={stat.label}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      fontSize: { xs: "2rem", md: "2.5rem" },
                      fontWeight: 800,
                      color: "#B8975A",
                      lineHeight: 1.1,
                    }}
                  >
                    {stat.value}
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

      <Box
        sx={{
          background: "linear-gradient(135deg, #B8975A, #9E7E45)",
          py: { xs: 6, md: 8 },
          textAlign: "center",
          px: 2,
        }}
      >
        <Box
          sx={{
            color: "#fff",
            fontSize: { xs: "1.75rem", md: "2.25rem" },
            fontWeight: 800,
            mb: 3,
          }}
        >
          Ready to find your next home?
        </Box>
        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
          <AppButton
            variant="outlined"
            onClick={() => navigate("/search")}
            sx={{
              color: "#fff",
              borderColor: "rgba(255,255,255,0.6)",
              "&:hover": { borderColor: "#fff", background: "rgba(255,255,255,0.1)" },
            }}
          >
            Browse Properties
          </AppButton>
          <AppButton
            variant="outlined"
            onClick={() => navigate("/provider-signup")}
            sx={{
              color: "#fff",
              borderColor: "rgba(255,255,255,0.6)",
              "&:hover": { borderColor: "#fff", background: "rgba(255,255,255,0.1)" },
            }}
          >
            List Your Property
          </AppButton>
        </Box>
      </Box>
    </>
  );
};

export default About;
