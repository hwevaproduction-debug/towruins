import { useState } from "react";
import { Box, Container } from "@mui/material";
import AppButton from "../ui/AppButton";
import AppCard from "../ui/AppCard";

interface LegalPageLayoutProps {
  title: string;
  eyebrow?: string;
  lastUpdated?: string;
  sections: Array<{ id: string; title: string; content: string }>;
}

const LegalPageLayout = ({
  title,
  eyebrow = "Legal",
  lastUpdated,
  sections,
}: LegalPageLayoutProps) => {
  const [activeId, setActiveId] = useState(sections[0]?.id || "");

  const scrollToSection = (id: string) => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Box>
      <Box
        sx={{
          background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)",
          py: 10,
          textAlign: "center",
          px: 2,
        }}
      >
        <Box sx={{ color: "#B8975A", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", mb: 1 }}>
          {eyebrow}
        </Box>
        <Box component="h1" sx={{ color: "#fff", fontSize: { xs: "2rem", md: "2.5rem" }, fontWeight: 800, m: 0 }}>
          {title}
        </Box>
        {lastUpdated ? (
          <Box sx={{ color: "rgba(255,255,255,0.65)", mt: 1 }}>
            Last updated {lastUpdated}
          </Box>
        ) : null}
      </Box>
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px 1fr" }, gap: 4 }}>
          <Box sx={{ position: { md: "sticky" }, top: 80, alignSelf: "start" }}>
            {sections.map((section) => (
              <Box
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                sx={{
                  cursor: "pointer",
                  color: activeId === section.id ? "#B8975A" : "text.secondary",
                  fontWeight: activeId === section.id ? 800 : 600,
                  fontSize: 14,
                  py: 1,
                }}
              >
                {section.title}
              </Box>
            ))}
          </Box>
          <Box>
            {sections.map((section) => (
              <AppCard key={section.id} id={section.id} sx={{ mb: 2, p: 3, scrollMarginTop: "96px" }}>
                <Box sx={{ color: "text.primary", fontWeight: 800, fontSize: "20px", mb: 1 }}>
                  {section.title}
                </Box>
                <Box sx={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.8 }}>
                  {section.content}
                </Box>
              </AppCard>
            ))}
          </Box>
        </Box>
      </Container>
      <Box sx={{ textAlign: "center", py: 6 }}>
        <Box sx={{ fontWeight: 800, fontSize: "24px", mb: 2 }}>
          Ready to get started?
        </Box>
        <AppButton href="/signup">Create an account</AppButton>
      </Box>
    </Box>
  );
};

export default LegalPageLayout;
