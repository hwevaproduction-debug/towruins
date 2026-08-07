import { Card, CardProps } from "@mui/material";

interface AppCardProps extends Omit<CardProps, "elevation" | "variant"> {
  elevation?: "flat" | "raised" | "floating" | "premium";
  interactive?: boolean;
  variant?: "default" | "glass";
}

const elevationStyles = {
  flat: {
    boxShadow: "none",
    border: "1px solid",
    borderColor: "divider",
  },
  raised: {
    boxShadow: "0 4px 16px rgba(31,41,55,0.08)",
  },
  floating: {
    boxShadow: "0 12px 40px rgba(31,41,55,0.14)",
  },
  premium: {
    boxShadow: "0 20px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.12)",
  },
};

const nextElevation = {
  flat: "raised",
  raised: "floating",
  floating: "floating",
  premium: "premium",
} as const;

const AppCard = ({
  elevation = "raised",
  interactive = false,
  variant = "default",
  sx,
  ...props
}: AppCardProps) => {
  return (
    <Card
      sx={[
        {
          backgroundColor: "background.paper",
          color: "text.primary",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
          border: "1px solid rgba(255,255,255,0.07)",
        },
        elevationStyles[elevation],
        variant === "glass"
          ? {
              backdropFilter: "blur(12px)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow:
                "0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)",
            }
          : {},
        (theme) =>
          theme.palette.mode === "dark"
            ? { border: "1px solid rgba(255,255,255,0.06)" }
            : {},
        elevation === "flat" ? { borderColor: "divider" } : {},
        interactive
          ? {
              cursor: "pointer",
              transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
              "&:hover": {
                transform: "translateY(-3px)",
                boxShadow: elevationStyles[nextElevation[elevation]].boxShadow,
              },
            }
          : null,
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    />
  );
};

export default AppCard;
