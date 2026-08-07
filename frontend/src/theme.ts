import { createTheme } from "@mui/material/styles";
import type { Shadows } from "@mui/material/styles";

const createShadowScale = (): Shadows => [
  "none",
  "0px 2px 8px rgba(31, 41, 55, 0.06)",
  "0px 6px 16px rgba(31, 41, 55, 0.08)",
  "0px 10px 24px rgba(31, 41, 55, 0.10)",
  "0px 14px 32px rgba(31, 41, 55, 0.12)",
  "0px 18px 40px rgba(31, 41, 55, 0.14)",
  "0px 22px 48px rgba(31, 41, 55, 0.16)",
  "0px 26px 56px rgba(31, 41, 55, 0.18)",
  "0px 30px 64px rgba(31, 41, 55, 0.20)",
  "0px 34px 72px rgba(31, 41, 55, 0.22)",
  "0px 38px 80px rgba(31, 41, 55, 0.24)",
  "0px 42px 88px rgba(31, 41, 55, 0.26)",
  "0px 46px 96px rgba(31, 41, 55, 0.28)",
  "0px 50px 104px rgba(31, 41, 55, 0.30)",
  "0px 54px 112px rgba(31, 41, 55, 0.32)",
  "0px 58px 120px rgba(31, 41, 55, 0.34)",
  "0px 62px 128px rgba(31, 41, 55, 0.36)",
  "0px 66px 136px rgba(31, 41, 55, 0.38)",
  "0px 70px 144px rgba(31, 41, 55, 0.40)",
  "0px 74px 152px rgba(31, 41, 55, 0.42)",
  "0px 78px 160px rgba(31, 41, 55, 0.44)",
  "0px 82px 168px rgba(31, 41, 55, 0.46)",
  "0px 86px 176px rgba(31, 41, 55, 0.48)",
  "0px 90px 184px rgba(31, 41, 55, 0.50)",
  "0px 94px 192px rgba(31, 41, 55, 0.52)",
];

export const createAppTheme = (mode: "light" | "dark") => {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#B8975A",
        dark: "#9E7E45",
        light: "#CFA96A",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: isDark ? "#2B6A50" : "#1F4D3A",
        dark: "#17382B",
        light: "#2B6A50",
        contrastText: "#FFFFFF",
      },
      background: {
        default: isDark ? "#0D1117" : "#F5F0EB",
        paper: isDark ? "#161B22" : "#FFFFFF",
      },
      text: {
        primary: isDark ? "#E6EDF3" : "#1F2937",
        secondary: isDark ? "#8B949E" : "#475569",
      },
      divider: isDark ? "#30363D" : "#E2E8F0",
      success: {
        main: "#1F4D3A",
        light: "#D1EAE0",
        contrastText: "#FFFFFF",
      },
      error: {
        main: "#991B1B",
        light: "#FEE2E2",
      },
      warning: {
        main: "#92400E",
        light: "#FEF3C7",
      },
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: "Manrope, \"Segoe UI\", Tahoma, Arial, sans-serif",
      h1: { fontSize: "3rem", fontWeight: 800, letterSpacing: "-0.03em" },
      h2: { fontSize: "2.25rem", fontWeight: 700, letterSpacing: "-0.02em" },
      h3: { fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.015em" },
      h4: { fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.01em" },
      h5: { fontSize: "1.125rem", fontWeight: 600, letterSpacing: 0 },
      h6: { fontSize: "1rem", fontWeight: 600, letterSpacing: 0 },
      body1: { fontSize: "1rem", fontWeight: 400, lineHeight: 1.7 },
      body2: { fontSize: "0.875rem", fontWeight: 400, lineHeight: 1.6 },
      caption: { fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.02em" },
      overline: { fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.1em" },
      button: { textTransform: "none", fontWeight: 600 },
    },
    shadows: createShadowScale(),
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            padding: "10px 20px",
            lineHeight: 1.2,
            transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: "none",
            "&:focus-visible": {
              outline: "2px solid #B8975A",
              outlineOffset: "2px",
            },
          },
          sizeSmall: {
            padding: "6px 14px",
            fontSize: "13px",
            minHeight: 36,
          },
          sizeLarge: {
            padding: "14px 28px",
            fontSize: "16px",
            minHeight: 52,
          },
          containedPrimary: {
            backgroundColor: "#B8975A",
            color: "#FFFFFF",
            "&:hover": {
              backgroundColor: "#9E7E45",
              boxShadow: "0 4px 12px rgba(184,151,90,0.35)",
              transform: "translateY(-1px)",
            },
          },
          outlinedPrimary: {
            borderColor: "#B8975A",
            color: "#B8975A",
            "&:hover": {
              borderColor: "#9E7E45",
              backgroundColor: isDark ? "rgba(184,151,90,0.08)" : "#FDF8F0",
            },
          },
          textPrimary: {
            color: "#1F4D3A",
            "&:hover": {
              backgroundColor: isDark ? "rgba(31,77,58,0.08)" : "#F0F7F4",
            },
          },
          outlinedSecondary: {
            borderColor: "#1F4D3A",
            color: "#1F4D3A",
            "&:hover": {
              borderColor: "#17382B",
              backgroundColor: isDark ? "rgba(31,77,58,0.08)" : "#F0F7F4",
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 600,
          },
          filled: {
            backgroundColor: isDark ? "#1C2330" : "#F7EDDA",
            color: isDark ? "#E6EDF3" : "#7D6234",
          },
          outlined: {
            borderColor: isDark ? "#30363D" : "#E2E8F0",
            color: isDark ? "#8B949E" : "#475569",
          },
          filledPrimary: {
            backgroundColor: "#B8975A",
            color: "#FFFFFF",
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: "#B8975A",
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            color: "#64748B",
            textTransform: "none",
            fontWeight: 600,
            "&.Mui-selected": {
              color: isDark ? "#E6EDF3" : "#1F2937",
            },
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          colorPrimary: {
            "&.Mui-checked": {
              color: "#B8975A",
            },
          },
        },
      },
      MuiRadio: {
        styleOverrides: {
          colorPrimary: {
            "&.Mui-checked": {
              color: "#B8975A",
            },
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            backgroundColor: "#B8975A",
            color: "#FFFFFF",
            "&:hover": {
              backgroundColor: "#9E7E45",
            },
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: "#B8975A",
            color: "#FFFFFF",
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          barColorPrimary: {
            backgroundColor: "#B8975A",
          },
        },
      },
      MuiStepIcon: {
        styleOverrides: {
          root: {
            "&.Mui-active, &.Mui-completed": {
              color: "#B8975A",
            },
          },
        },
      },
      MuiStepLabel: {
        styleOverrides: {
          label: {
            "&.Mui-active, &.Mui-completed": {
              color: isDark ? "#E6EDF3" : "#1F2937",
              fontWeight: 700,
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(31,41,55,0.18)",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? "#161B22" : "#F5F0EB",
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            "&.Mui-selected": {
              borderLeft: "3px solid #B8975A",
              backgroundColor: "rgba(184,151,90,0.08)",
              "&:hover": {
                backgroundColor: "rgba(184,151,90,0.06)",
              },
            },
            "&:hover": {
              backgroundColor: "rgba(184,151,90,0.06)",
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: isDark ? "#30363D" : "#E2E8F0",
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? "#1C2330" : "#1F2937",
            color: "#FFFFFF",
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            background: isDark ? "#1C2330" : "#FFFFFF",
            minHeight: 48,
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#B8975A",
            },
          },
          notchedOutline: {
            borderColor: isDark ? "#30363D" : "#E2E8F0",
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: "#64748B",
            "&.Mui-focused": {
              color: "#B8975A",
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(31,41,55,0.08)",
            ...(isDark
              ? {
                  backgroundColor: "#161B22",
                  border: "1px solid #30363D",
                }
              : {}),
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            ...(isDark
              ? {
                  backgroundColor: "#161B22",
                  backgroundImage: "none",
                  color: "#E6EDF3",
                }
              : {}),
          },
        },
      },
    },
  });
};

const theme = createAppTheme("light");

export default theme;
