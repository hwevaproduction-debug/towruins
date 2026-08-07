import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import {
  toEntityArray,
  toEntityObject,
  useGetMyAccommodationQuery,
  useGetMyRoomsQuery,
} from "../../../../redux/api/providerApiSlice";
import {
  useGetListingDraftQuery,
  useUpdateListingDraftMutation,
} from "../../../../redux/api/listingApiSlice";
import AccommodationStep from "./steps/AccommodationStep";
import RoomsStep from "./steps/RoomsStep";
import ImagesStep from "./steps/ImagesStep";
import PricingStep from "./steps/PricingStep";
import PoliciesStep from "./steps/PoliciesStep";
import ReviewStep from "./steps/ReviewStep";

type ListingWizardProps = {
  open: boolean;
  onClose: () => void;
};

const steps = ["Info", "Rooms", "Images", "Pricing", "Policies", "Review"];
const emptyInitialValues = {};

const ListingWizard = ({ open, onClose }: ListingWizardProps) => {
  const [activeStep, setActiveStep] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [draftData, setDraftData] = useState<Record<string, any>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const hasUserChanges = useRef(false);
  const stepSnapshots = useRef<Record<string, string>>({});
  const hasSeenStepSnapshot = useRef<Record<string, boolean>>({});
  const { data: draft, isLoading: isDraftLoading, isFetching: isDraftFetching } = useGetListingDraftQuery(undefined, { skip: !open });
  const { data: accommodationResponse } = useGetMyAccommodationQuery(undefined, { skip: !open });
  const { data: roomsResponse } = useGetMyRoomsQuery(undefined, { skip: !open });
  const [updateListingDraft] = useUpdateListingDraftMutation();
  const accommodation = toEntityObject(accommodationResponse, ["accommodation"]);
  const rooms = useMemo(() => toEntityArray(roomsResponse, ["rooms", "data"]), [roomsResponse]);
  const accommodationId = accommodation?._id || accommodation?.id || "";
  const draftId = draft?._id || draft?.id;

  useEffect(() => {
    if (!open) {
      setActiveStep(0);
      setDraftData({});
      setIsHydrated(false);
      setSaveStatus("idle");
      hasUserChanges.current = false;
      stepSnapshots.current = {};
      hasSeenStepSnapshot.current = {};
      return;
    }

    if (isHydrated || isDraftLoading || isDraftFetching) {
      return;
    }

    const { step, ...rest } = draft?.data || {};
    setActiveStep(step != null ? Math.max(0, Math.min(5, Number(step))) : 0);
    setDraftData(rest);
    stepSnapshots.current = Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, JSON.stringify(value ?? {})]));
    hasSeenStepSnapshot.current = {};
    hasUserChanges.current = false;
    setIsHydrated(true);
  }, [draft, isDraftFetching, isDraftLoading, isHydrated, open]);

  const handleDataChange = useCallback((stepKey: string, data: any) => {
    if (!isHydrated) {
      return;
    }
    const snapshot = JSON.stringify(data ?? {});
    if (!hasSeenStepSnapshot.current[stepKey]) {
      hasSeenStepSnapshot.current[stepKey] = true;
      stepSnapshots.current[stepKey] = snapshot;
    } else if (stepSnapshots.current[stepKey] !== snapshot) {
      stepSnapshots.current[stepKey] = snapshot;
      hasUserChanges.current = true;
    }
    setDraftData((prev) => ({ ...prev, [stepKey]: data }));
  }, [isHydrated]);
  const handleAccommodationDataChange = useCallback((data: any) => handleDataChange("accommodation", data), [handleDataChange]);
  const handlePricingDataChange = useCallback((data: any) => handleDataChange("pricing", data), [handleDataChange]);
  const handlePoliciesDataChange = useCallback((data: any) => handleDataChange("policies", data), [handleDataChange]);

  useEffect(() => {
    if (!open || !isHydrated || !hasUserChanges.current) return undefined;
    setSaveStatus("saving");
    const timeout = window.setTimeout(async () => {
      await updateListingDraft({ id: draftId, payload: { step: activeStep, ...draftData } });
      setSaveStatus("saved");
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [activeStep, draftData, draftId, isHydrated, open, updateListingDraft]);

  const next = () => {
    hasUserChanges.current = true;
    setActiveStep((current) => Math.min(5, current + 1));
  };
  const back = () => {
    hasUserChanges.current = true;
    setActiveStep((current) => Math.max(0, current - 1));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
          <span>Create Your Listing</span>
          <Typography variant="caption" color="text.secondary">{saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : ""}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>
        {!accommodationId || !isHydrated ? (
          <Typography>Loading listing...</Typography>
        ) : activeStep === 0 ? (
          <AccommodationStep accommodationId={accommodationId} onNext={next} initialValues={draftData.accommodation || emptyInitialValues} onDataChange={handleAccommodationDataChange} />
        ) : activeStep === 1 ? (
          <RoomsStep accommodationId={accommodationId} onNext={next} onBack={back} />
        ) : activeStep === 2 ? (
          <ImagesStep accommodationId={accommodationId} rooms={rooms} onNext={next} onBack={back} />
        ) : activeStep === 3 ? (
          <PricingStep accommodationId={accommodationId} rooms={rooms} onNext={next} onBack={back} initialValues={draftData.pricing || emptyInitialValues} onDataChange={handlePricingDataChange} />
        ) : activeStep === 4 ? (
          <PoliciesStep accommodationId={accommodationId} onNext={next} onBack={back} initialValues={draftData.policies || emptyInitialValues} onDataChange={handlePoliciesDataChange} />
        ) : (
          <ReviewStep accommodationId={accommodationId} accommodation={accommodation} rooms={rooms} onBack={back} onPublish={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ListingWizard;
