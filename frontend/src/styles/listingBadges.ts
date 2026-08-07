import { Theme } from "@mui/material/styles";
import { SxProps } from "@mui/system";

export const earlyAccessBadgeSx: SxProps<Theme> = {
  background: "#F7EDDA",
  color: "#7D6234",
  borderRadius: "999px",
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: 700,
  display: "inline-block",
};

export const earlyAccessOverlayBadgeSx: SxProps<Theme> = {
  ...earlyAccessBadgeSx,
  padding: "5px 11px",
  fontSize: "11px",
  pointerEvents: "none",
};

export const studentAccommodationBadgeSx: SxProps<Theme> = {
  background: "#D1EAE0",
  color: "#1F4D3A",
  borderRadius: "999px",
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: 700,
  display: "inline-block",
};

export const studentAccommodationOverlayBadgeSx: SxProps<Theme> = {
  ...studentAccommodationBadgeSx,
  padding: "5px 11px",
  fontSize: "11px",
  pointerEvents: "none",
};
