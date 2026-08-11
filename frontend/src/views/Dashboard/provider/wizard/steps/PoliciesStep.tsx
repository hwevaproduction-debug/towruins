import { Button, Stack, Box, Typography } from "@mui/material";
import PolicyTab from "../../tabs/PolicyTab";

type PoliciesStepProps = {
  accommodationId: string;
  onNext: () => void;
  onBack: () => void;
  initialValues?: Record<string, any>;
  onDataChange?: (data: any) => void;
};

const PoliciesStep = ({ accommodationId, onNext, onBack, initialValues = {}, onDataChange }: PoliciesStepProps) => (
  <Stack spacing={2}>
    <Box>
      <Typography variant="h6">Policies & Rules</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Tell guests about house rules, cancellation and any property-specific policies. Mark items required for booking where applicable.
      </Typography>
    </Box>
    <PolicyTab accommodationId={accommodationId} initialValues={initialValues} onDataChange={onDataChange} />
    <Stack direction="row" spacing={1}>
      <Button onClick={onBack}>Back</Button>
      <Button variant="contained" onClick={onNext}>Next</Button>
    </Stack>
  </Stack>
);

export default PoliciesStep;
