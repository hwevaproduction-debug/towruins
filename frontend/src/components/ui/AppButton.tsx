import { Button, ButtonProps } from "@mui/material";
import DotLoader from "../Spinner/dotLoader";

interface AppButtonProps extends ButtonProps {
  loading?: boolean;
}

const AppButton = ({
  loading = false,
  variant = "contained",
  color = "primary",
  size = "medium",
  disabled,
  children,
  sx,
  ...props
}: AppButtonProps) => {
  const loaderColor = variant === "contained" ? "#fff" : variant === "text" ? "#1F4D3A" : "#B8975A";
  const isBrandColor = color === "primary";
  const brandVariantSx =
    isBrandColor && variant === "contained"
      ? {
          background: "linear-gradient(135deg, #B8975A, #9E7E45)",
          color: "#FFFFFF",
          boxShadow: "0 4px 16px rgba(184,151,90,0.25)",
          "&:hover": {
            background: "linear-gradient(135deg, #C9A86A, #B8975A)",
            boxShadow: "0 4px 12px rgba(184,151,90,0.35)",
            transform: "translateY(-1px)",
          },
        }
      : isBrandColor && variant === "outlined"
      ? {
          color: "#B8975A",
          borderColor: "#B8975A",
          "&:hover": {
            background: "rgba(184,151,90,0.08)",
            borderColor: "#9E7E45",
          },
        }
      : isBrandColor && variant === "text"
      ? {
          color: "#1F4D3A",
          "&:hover": {
            background: "#F0F7F4",
          },
        }
      : {};
  const sizeSx =
    size === "large"
      ? { padding: "14px 28px", fontSize: "16px", minHeight: 52 }
      : size === "small"
      ? { padding: "6px 14px", fontSize: "13px", minHeight: 36 }
      : { padding: "10px 20px", fontSize: "14px", minHeight: 44 };

  return (
    <Button
      variant={variant}
      color={color}
      size={size}
      disabled={disabled || loading}
      sx={[
        {
          borderRadius: "999px",
          fontWeight: 700,
          lineHeight: 1.2,
          transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
        },
        brandVariantSx,
        sizeSx,
        loading ? { pointerEvents: "none" } : {},
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    >
      {loading ? <DotLoader color={loaderColor} size={12} /> : children}
    </Button>
  );
};

export default AppButton;
