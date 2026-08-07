import { Box, Grid } from "@mui/material";
import { Building2, Coins, FileText, Home, Map, Shield, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppCard from "../../components/ui/AppCard";
import AppContainer from "../../components/ui/AppContainer";
import { FEATURE_FLAGS } from "../../config/featureFlags";

const docs = [
  { title: "Release Notes", path: "/docs/release-notes", icon: FileText, description: "See what changed in v1.1." },
  { title: "TR Tokens", path: "/docs/tr-tokens", icon: Coins, description: "Understand wallet costs and purchases." },
  { title: "Tenant Guide", path: "/docs/tenant-guide", icon: User, description: "Find, contact, and move in." },
  { title: "Landlord Guide", path: "/docs/landlord-guide", icon: Home, description: "List properties and manage requests." },
  ...(FEATURE_FLAGS.PUBLIC_ROADMAP ? [{ title: "Roadmap", path: "/docs/roadmap", icon: Map, description: "What's now, next, and future." }] : []),
  { title: "Trust & Safety", path: "/trust-safety", icon: Shield, description: "Platform safety standards." },
  { title: "Provider Guide", path: "/docs/provider-guide", icon: Building2, description: "Set up and manage your accommodation." },
];

const DocsHub = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <Box sx={{ background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)", pt: { xs: 12, md: 14 }, pb: { xs: 6, md: 8 }, textAlign: "center", px: 2 }}>
        <Box sx={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", color: "#B8975A", textTransform: "uppercase", mb: 2 }}>Platform Docs</Box>
        <Box component="h1" sx={{ fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 800, color: "#fff", m: 0 }}>
          Town Ruins Documentation <Box component="span" sx={{ display: "inline-block", ml: 1, px: 1.5, py: 0.5, borderRadius: "999px", background: "#B8975A", fontSize: "0.9rem", verticalAlign: "middle" }}>v1.1</Box>
        </Box>
        <Box sx={{ color: "rgba(255,255,255,0.72)", mt: 2 }}>Everything you need to know about the platform.</Box>
      </Box>
      <AppContainer sx={{ py: { xs: 6, md: 8 } }}>
        <Grid container spacing={3}>
          {docs.map(({ title, path, icon: Icon, description }) => (
            <Grid item xs={12} sm={6} md={4} key={title}>
              <AppCard interactive onClick={() => navigate(path)} sx={{ p: 3, height: "100%" }}>
                <Icon size={28} color="#B8975A" />
                <Box sx={{ fontWeight: 800, fontSize: "18px", mt: 2 }}>{title}</Box>
                <Box sx={{ color: "text.secondary", my: 1.5 }}>{description}</Box>
                <Box sx={{ color: "#B8975A", fontWeight: 800 }}>Read {"\u2192"}</Box>
              </AppCard>
            </Grid>
          ))}
        </Grid>
      </AppContainer>
    </Box>
  );
};

export default DocsHub;
