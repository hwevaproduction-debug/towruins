import { Button, Stack } from "@mui/material";
import PricingTab from "../../tabs/PricingTab";

type PricingStepProps = {
  accommodationId: string;
  rooms: any[];
  onNext: () => void;
  onBack: () => void;
  initialValues?: Record<string, any>;
  onDataChange?: (data: any) => void;
};

const PricingStep = ({ accommodationId, rooms, onNext, onBack, initialValues = {}, onDataChange }: PricingStepProps) => (
  <Stack spacing={2}>
    <PricingTab rooms={rooms} accommodationId={accommodationId} initialValues={initialValues} onDataChange={onDataChange} />
    <Stack direction="row" spacing={1}>
      <Button onClick={onBack}>Back</Button>
      <Button variant="contained" onClick={onNext}>Next</Button>
    </Stack>
  </Stack>
);

export default PricingStep;
