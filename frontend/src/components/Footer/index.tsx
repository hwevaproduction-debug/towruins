import { Box, Grid, Link, useTheme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { FEATURE_FLAGS } from "../../config/featureFlags";

const platformLinks = [
  { label: "Documentation", to: "/docs" },
  { label: "Release Notes", to: "/docs/release-notes" },
  { label: "TR Token Guide", to: "/docs/tr-tokens" },
  ...(FEATURE_FLAGS.PUBLIC_ROADMAP ? [{ label: "Roadmap", to: "/docs/roadmap" }] : []),
];

const groups = [
  {
    title: "Legal",
    links: [
      { label: "Terms of Use", to: "/terms" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Community Guidelines", to: "/community-guidelines" },
      { label: "Refund Policy", to: "/refund-policy" },
    ],
  },
  {
    title: "Trust & Safety",
    links: [
      { label: "Landlord Verification Policy", to: "/landlord-terms" },
      { label: "Trust Center", to: "/trust-safety" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "mailto:support@townruins.com", external: true },
    ],
  },
  {
    title: "Platform",
    links: platformLinks,
  },
];

const Footer = () => {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        background: theme.palette.mode === "dark" ? "#0D1117" : "#1a2332",
        py: 6,
        px: { xs: 2, md: 6 },
      }}
    >
      <Grid container spacing={4}>
        {groups.map((group) => (
          <Grid item xs={12} md={3} key={group.title}>
            <Box sx={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#B8975A", mb: 2 }}>
              {group.title}
            </Box>
            {group.links.map((link) => (
              <Link
                key={link.label}
                component={link.external ? "a" : RouterLink}
                href={link.external ? link.to : undefined}
                to={link.external ? undefined : link.to}
                sx={{
                  display: "block",
                  color: "rgba(255,255,255,0.6)",
                  textDecoration: "none",
                  mb: 1,
                  "&:hover": { color: "#B8975A" },
                }}
              >
                {link.label}
              </Link>
            ))}
          </Grid>
        ))}
      </Grid>
      <Box sx={{ borderTop: "1px solid rgba(184,151,90,0.2)", mt: 4, pt: 3, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
        © 2026 Town Ruins. All rights reserved.
        <Box sx={{ color: "#B8975A", fontSize: 11, mt: 0.75 }}>
          Powered by TR Tokens
        </Box>
      </Box>
    </Box>
  );
};

export default Footer;
