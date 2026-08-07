import { Box, Skeleton, Stack } from "@mui/material";
import AppCard from "../ui/AppCard";

const skeletonSx = {
  bgcolor: "#F7EDDA",
  "&::after": {
    background: "linear-gradient(90deg, transparent, rgba(184,151,90,0.18), transparent)",
  },
};

const StayCardSkeleton = () => (
  <AppCard sx={{ height: "100%", borderRadius: "16px", overflow: "hidden" }}>
    <Skeleton variant="rectangular" height={240} animation="wave" sx={skeletonSx} />
    <Box sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        <Skeleton variant="text" width="72%" height={34} animation="wave" sx={skeletonSx} />
        <Skeleton variant="text" width="54%" height={22} animation="wave" sx={skeletonSx} />
        <Skeleton variant="text" width="40%" height={22} animation="wave" sx={skeletonSx} />
        <Skeleton
          variant="rectangular"
          width="100%"
          height={58}
          animation="wave"
          sx={{ ...skeletonSx, borderRadius: "8px" }}
        />
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center" }}>
          <Skeleton variant="text" width={120} height={36} animation="wave" sx={skeletonSx} />
          <Skeleton variant="rounded" width={112} height={38} animation="wave" sx={skeletonSx} />
        </Box>
      </Stack>
    </Box>
  </AppCard>
);

export default StayCardSkeleton;
