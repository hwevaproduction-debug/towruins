import { Box, Tooltip } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import type { SystemStyleObject } from "@mui/system";
import type { MouseEvent } from "react";
import {
  Bath,
  BedDouble,
  Car,
  Droplets,
  Heart,
  MapPin,
  Shield,
  Sofa,
  Wifi,
  Zap,
} from "lucide-react";
import {
  earlyAccessOverlayBadgeSx,
  studentAccommodationOverlayBadgeSx,
} from "../../styles/listingBadges";
import { thousandSeparatorNumber } from "../../utils";

type PropertyCardProps = {
  item: any;
  onClick: () => void;
};

const amenityIconMap = [
  { key: "solar", Icon: Zap, label: "Solar" },
  { key: "parking", Icon: Car, label: "Parking" },
  { key: "furnished", Icon: Sofa, label: "Furnished" },
  { key: "borehole", Icon: Droplets, label: "Borehole" },
  { key: "security", Icon: Shield, label: "Security" },
  { key: "internet", Icon: Wifi, label: "Internet" },
];

const getListingImage = (item: any) =>
  item?.image || item?.images?.[0] || item?.imageUrls?.[0] || null;

const overlayBadgeSx: SystemStyleObject<Theme> = {
  maxWidth: "100%",
  whiteSpace: "normal",
  lineHeight: 1.2,
};

const earlyAccessPropertyBadgeSx: SystemStyleObject<Theme> = {
  ...(earlyAccessOverlayBadgeSx as SystemStyleObject<Theme>),
  ...overlayBadgeSx,
};

const studentAccommodationPropertyBadgeSx: SystemStyleObject<Theme> = {
  ...(studentAccommodationOverlayBadgeSx as SystemStyleObject<Theme>),
  ...overlayBadgeSx,
};

const renderPropertyBadges = (item: any) => {
  const badges: Array<{ label: string; sx: SystemStyleObject<Theme> }> = [];

  if (item?.status === "early_access") {
    badges.push({ label: "Early Access", sx: earlyAccessPropertyBadgeSx });
  }

  if (item?.studentAccommodation) {
    badges.push({
      label: "Student Accommodation",
      sx: studentAccommodationPropertyBadgeSx,
    });
  }

  if (!badges.length) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "absolute",
        top: 12,
        left: 12,
        right: 56,
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0.75,
        pointerEvents: "none",
      }}
    >
      {badges.map(({ label, sx }) => (
        <Box key={label} sx={sx}>
          {label}
        </Box>
      ))}
    </Box>
  );
};

const PropertyCard = ({ item, onClick }: PropertyCardProps) => {
  const amenities = item?.amenities || {};
  const activeAmenities = amenityIconMap.filter(
    ({ key }) => item?.[key] || amenities?.[key]
  );
  const visibleAmenities = activeAmenities.slice(0, 4);
  const hiddenAmenitiesCount = Math.max(activeAmenities.length - visibleAmenities.length, 0);

  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: "pointer",
        borderRadius: "16px",
        overflow: "hidden",
        backgroundColor: "background.paper",
        height: "380px",
        boxShadow: (theme) =>
          `0 4px 16px ${alpha(
            theme.palette.common.black,
            theme.palette.mode === "dark" ? 0.28 : 0.08,
          )}`,
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: (theme) =>
            `0 16px 48px ${alpha(
              theme.palette.common.black,
              theme.palette.mode === "dark" ? 0.38 : 0.16,
            )}`,
        },
        "&:hover .listing-image": {
          transform: "scale(1.06)",
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          height: 220,
          overflow: "hidden",
          backgroundColor: "action.hover",
        }}
      >
        {getListingImage(item) ? (
          <Box
            component="img"
            className="listing-image"
            src={getListingImage(item)}
            alt={item?.name || "listing"}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.4s ease",
            }}
          />
        ) : null}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "55%",
            background: (theme) =>
              `linear-gradient(to top, ${alpha(
                theme.palette.common.black,
                theme.palette.mode === "dark" ? 0.75 : 0.6,
              )}, transparent)`,
            pointerEvents: "none",
          }}
        />
        {renderPropertyBadges(item)}
        {item?.isVerified || item?.status === "active" ? (
          <Box
            sx={{
              position: "absolute",
              top: 52,
              right: 12,
              background: "rgba(31,77,58,0.9)",
              color: "#fff",
              borderRadius: "999px",
              padding: "3px 8px",
              fontSize: "11px",
              fontWeight: 700,
              zIndex: 1,
            }}
          >
            {"\u2713"} Verified
          </Box>
        ) : null}
        <Box
          component="button"
          type="button"
          aria-label="Save property"
          onClick={(event: MouseEvent<HTMLButtonElement>) => event.stopPropagation()}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            cursor: "pointer",
            border: "1px solid",
            borderColor: (theme) => alpha(theme.palette.divider, 0.7),
            backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.9),
            color: "text.secondary",
            "&:hover": { color: "#B8975A", borderColor: "#B8975A" },
          }}
        >
          <Heart size={16} />
        </Box>
      </Box>
      <Box
        sx={{
          padding: "16px 18px 18px",
          height: "160px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            fontSize: "22px",
            fontWeight: 800,
            color: "text.primary",
            marginBottom: 0.5,
          }}
        >
          ${thousandSeparatorNumber(Number(item?.monthlyRent || item?.regularPrice || 0))}{" "}
          /month
        </Box>
        <Box
          sx={{
            fontSize: "15px",
            fontWeight: 600,
            color: "text.primary",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 0.75,
          }}
        >
          {item?.name || "Property listing"}
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "13px",
            color: "text.secondary",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 1.5,
          }}
        >
          <MapPin size={13} color="#94A3B8" style={{ flexShrink: 0 }} />
          <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {item?.address || item?.province || "Zimbabwe"}
          </Box>
        </Box>
        <Box
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            pt: 1.5,
            mt: "auto",
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            fontSize: "12px",
            color: "text.secondary",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <BedDouble size={13} color="#94A3B8" />
            {item?.totalRooms ?? item?.bedrooms ?? 1} Rooms
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Bath size={13} color="#94A3B8" />
            {item?.bathrooms ?? 1} Baths
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, ml: "auto" }}>
            {visibleAmenities.map(({ key, Icon, label }) => (
              <Tooltip key={key} title={label}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Icon size={14} color="#94A3B8" />
                </Box>
              </Tooltip>
            ))}
            {hiddenAmenitiesCount > 0 ? (
              <Box sx={{ color: "#94A3B8", fontWeight: 700 }}>
                +{hiddenAmenitiesCount}
              </Box>
            ) : null}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PropertyCard;
