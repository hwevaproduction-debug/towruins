import { Button, Stack } from "@mui/material";
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
    <PolicyTab accommodationId={accommodationId} initialValues={initialValues} onDataChange={onDataChange} />
    <Stack direction="row" spacing={1}>
      <Button onClick={onBack}>Back</Button>
      <Button variant="contained" onClick={onNext}>Next</Button>
    </Stack>
  </Stack>
);

export default PoliciesStep;
