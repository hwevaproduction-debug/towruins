import { Typography } from "@mui/material";
import AppCard from "../../../../components/ui/AppCard";

type StatCardProps = {
  label: string;
  value: string | number;
  sub?: string;
};

const StatCard = ({ label, value, sub }: StatCardProps) => (
  <AppCard
    elevation="raised"
    sx={{
      height: "100%",
      borderLeft: "3px solid #B8975A",
      borderRadius: "16px",
      p: { xs: 2, md: 2.5 },
      boxShadow: "0 2px 12px rgba(31,41,55,0.07)",
    }}
  >
    <Typography
      variant="body2"
      sx={{
        textTransform: "uppercase",
        fontSize: "11px",
        letterSpacing: "0.08em",
        color: "#94A3B8",
        fontWeight: 700,
      }}
    >
      {label}
    </Typography>
    <Typography
      variant="h4"
      sx={{ mt: 0.75, fontSize: "32px", fontWeight: 800, color: "text.primary" }}
    >
      {value}
    </Typography>
    {sub ? (
      <Typography variant="caption" color="text.secondary">
        {sub}
      </Typography>
    ) : null}
  </AppCard>
);

export default StatCard;
