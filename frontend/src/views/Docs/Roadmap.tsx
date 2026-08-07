import { Box, Grid } from "@mui/material";
import AppCard from "../../components/ui/AppCard";
import AppContainer from "../../components/ui/AppContainer";

const columns = [
  { title: "Now (v1.1)", color: "#B8975A", items: ["Token economy", "Premium UX", "Verification flows", "Documentation"] },
  { title: "Next (v1.2)", color: "#3B82F6", items: ["Real payment integration (EcoCash/Stripe)", "Advanced search filters", "In-app messaging", "Mobile PWA improvements"] },
  { title: "Future", color: "#8B5CF6", items: ["Mobile app", "AI property matching", "Landlord analytics dashboard", "Multi-currency support"] },
];

const Roadmap = () => (
  <Box>
    <Box sx={{ background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)", pt: { xs: 12, md: 14 }, pb: { xs: 6, md: 8 }, textAlign: "center", px: 2 }}>
      <Box sx={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", color: "#B8975A", textTransform: "uppercase", mb: 2 }}>Roadmap</Box>
      <Box component="h1" sx={{ fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 800, color: "#fff", m: 0 }}>Product Roadmap</Box>
    </Box>
    <AppContainer sx={{ py: { xs: 6, md: 8 } }}>
      <Grid container spacing={3}>
        {columns.map((column) => (
          <Grid item xs={12} md={4} key={column.title}>
            <AppCard sx={{ p: 3, height: "100%" }}>
              <Box sx={{ color: column.color, fontWeight: 800, fontSize: "20px", mb: 2 }}>{column.title}</Box>
              <Box component="ul" sx={{ m: 0, pl: 2.5, color: "text.secondary", lineHeight: 1.9 }}>
                {column.items.map((item) => <li key={item}>{item}</li>)}
              </Box>
            </AppCard>
          </Grid>
        ))}
      </Grid>
    </AppContainer>
  </Box>
);

export default Roadmap;
