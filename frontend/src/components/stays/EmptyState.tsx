import { Box, Stack } from "@mui/material";
import { Hotel } from "lucide-react";
import { Heading, SubHeading } from "../Heading";
import AppButton from "../ui/AppButton";
import AppCard from "../ui/AppCard";

interface EmptyStateProps {
  activeFilterSummary: string[];
  onClear: () => void;
}

const EmptyState = ({ activeFilterSummary, onClear }: EmptyStateProps) => (
  <AppCard sx={{ p: { xs: 3, md: 4 }, borderRadius: "8px", textAlign: "center" }}>
    <Stack spacing={2} alignItems="center">
      <Box sx={{ color: "#1F4D3A", lineHeight: 1 }} aria-hidden>
        <Hotel size={44} />
      </Box>
      <Box>
        <Heading sx={{ fontSize: "24px", mb: 0.75 }}>No stays found</Heading>
        <SubHeading sx={{ color: "#475569" }}>
          {activeFilterSummary.length
            ? `Active filters: ${activeFilterSummary.join(", ")}`
            : "No stays matched the current search."}
        </SubHeading>
      </Box>
      <AppButton onClick={onClear}>Clear all filters</AppButton>
    </Stack>
  </AppCard>
);

export default EmptyState;
