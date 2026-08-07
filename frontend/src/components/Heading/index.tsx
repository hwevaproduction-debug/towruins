// React Imports
import * as React from "react";
// MUI Imports
import { Box } from "@mui/material";
import { SxProps } from "@mui/system";

const root = {
  fontSize: { xs: "22px", sm: "26px" },
  fontWeight: 700,
  color: "text.primary",
};

const subRoot = {
  fontSize: { xs: "14px", sm: "15px" },
  fontWeight: 500,
  color: "text.secondary",
};

interface HeadingProps {
  children?: React.ReactNode;
  sx?: SxProps;
  variant?: "default" | "section";
}

export const Heading = (props: HeadingProps) => {
  const styles: any = props.sx;
  const variantStyles =
    props.variant === "section"
      ? {
          textTransform: "uppercase",
          fontSize: "0.6875rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: "#94A3B8",
        }
      : {};

  return <Box sx={{ ...root, ...variantStyles, ...styles }}>{props.children}</Box>;
};

export const SubHeading = (props: HeadingProps) => {
  const styles: any = props.sx;
  return <Box sx={{ ...subRoot, ...styles }}>{props.children}</Box>;
};
