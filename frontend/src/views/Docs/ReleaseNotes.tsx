import { Box } from "@mui/material";
import AppCard from "../../components/ui/AppCard";
import AppContainer from "../../components/ui/AppContainer";

const entries = [
  {
    version: "v1.1 - Premium Refinement Pass",
    badge: "Current",
    badgeSx: { background: "#D1EAE0", color: "#1F4D3A" },
    items: [
      "TR Token economy integrated as primary payment system",
      "Premium auth form layouts with cinematic hero backgrounds",
      "Landlord & Tenant dashboards with wallet cards and 2-column layout",
      "Engagement system with token deductions (5 TR per engagement)",
      "Post-signup onboarding flow with wallet introduction",
      "Email verification flow with guided redirect",
      "Legal documents (Terms, Privacy, Landlord Agreement, Refund Policy)",
      "Trust & Safety page and Community Guidelines",
      "Release documentation hub",
    ],
  },
  {
    version: "v1.0 - Foundation",
    badge: "Previous",
    badgeSx: { background: "#F1F5F9", color: "#64748B" },
    items: [
      "Core listing platform with search & filter",
      "Provider (stays) system with booking",
      "Basic authentication",
      "Property card grid with amenity icons",
    ],
  },
];

const ReleaseNotes = () => (
  <Box>
    <Box sx={{ background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)", pt: { xs: 12, md: 14 }, pb: { xs: 6, md: 8 }, textAlign: "center", px: 2 }}>
      <Box sx={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", color: "#B8975A", textTransform: "uppercase", mb: 2 }}>Release Notes</Box>
      <Box component="h1" sx={{ fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 800, color: "#fff", m: 0 }}>Town Ruins v1.1</Box>
    </Box>
    <AppContainer sx={{ py: { xs: 6, md: 8 }, display: "grid", gap: 3 }}>
      {entries.map((entry) => (
        <AppCard key={entry.version} sx={{ p: 3, borderLeft: "4px solid #B8975A" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2 }}>
            <Box sx={{ fontWeight: 800, fontSize: "20px" }}>{entry.version}</Box>
            <Box sx={{ ...entry.badgeSx, borderRadius: "999px", px: 1.5, py: 0.5, fontSize: "12px", fontWeight: 800 }}>{entry.badge}</Box>
          </Box>
          <Box component="ul" sx={{ m: 0, pl: 2.5, color: "text.secondary", lineHeight: 1.9 }}>
            {entry.items.map((item) => <li key={item}>{item}</li>)}
          </Box>
        </AppCard>
      ))}
    </AppContainer>
  </Box>
);

export default ReleaseNotes;
