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
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  toEntityArray,
  toEntityObject,
  useGetMyAccommodationQuery,
  useGetMyRoomsQuery,
} from "../../../../redux/api/providerApiSlice";
import {
  useGetListingDraftQuery,
  useUpdateListingDraftMutation,
  useAutosaveListingDraftMutation,
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
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [draftData, setDraftData] = useState<Record<string, any>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const hasUserChanges = useRef(false);
  const stepSnapshots = useRef<Record<string, string>>({});
  const hasSeenStepSnapshot = useRef<Record<string, boolean>>({});
  const { data: draft, isLoading: isDraftLoading, isFetching: isDraftFetching } = useGetListingDraftQuery(undefined, { skip: !open });

  // Get accommodation and detect empty (404) vs other errors
  const {
    data: accommodationResponse,
    isLoading: isAccommodationLoading,
    isFetching: isAccommodationFetching,
    isError: isAccommodationError,
    error: accommodationError,
    refetch: refetchAccommodation,
  } = useGetMyAccommodationQuery(undefined, { skip: !open });

  const { data: roomsResponse } = useGetMyRoomsQuery(undefined, { skip: !open });
  const [updateListingDraft] = useUpdateListingDraftMutation();
  const [autosaveListingDraft] = useAutosaveListingDraftMutation();
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const draftDataRef = useRef(draftData);
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

  // keep a ref of latest draftData to avoid stale closure
  useEffect(() => {
    draftDataRef.current = draftData;
  }, [draftData]);

  useEffect(() => {
    if (!open || !isHydrated || !hasUserChanges.current) return undefined;

    setSaveStatus("saving");
    const timeout = window.setTimeout(async () => {
      // serialize saves: if a save is in-flight, mark pending and return
      if (isSavingRef.current) {
        pendingSaveRef.current = true;
        return;
      }

      isSavingRef.current = true;
      try {
        const res = await autosaveListingDraft({ id: draftId, payload: { step: activeStep, ...draftDataRef.current } });
        if ((res as any).error) {
          // non-disruptive failure: keep local form intact and indicate failure
          setSaveStatus("idle");
        } else {
          setSaveStatus("saved");
          // mark that current changes are persisted
          hasUserChanges.current = false;
        }
      } catch (err) {
        setSaveStatus("idle");
      } finally {
        isSavingRef.current = false;
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          // trigger another autosave for the latest data
          hasUserChanges.current = true;
          // schedule a short timeout to let state settle before saving again
          const t = window.setTimeout(async () => {
            if (!isSavingRef.current) {
              isSavingRef.current = true;
              try {
                const r2 = await autosaveListingDraft({ id: draftId, payload: { step: activeStep, ...draftDataRef.current } });
                if (!(r2 as any).error) {
                  setSaveStatus("saved");
                  hasUserChanges.current = false;
                }
              } catch (e) {
                // swallow
              } finally {
                isSavingRef.current = false;
              }
            }
          }, 200);
          // clear this fallback timer if component unmounts before it fires
          return () => window.clearTimeout(t);
        }
      }
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [activeStep, draftId, isHydrated, open, autosaveListingDraft]);

  const next = () => {
    hasUserChanges.current = true;
    setActiveStep((current) => Math.min(5, current + 1));
  };
  const back = () => {
    hasUserChanges.current = true;
    setActiveStep((current) => Math.max(0, current - 1));
  };

  const accommodationLoading = isAccommodationLoading || isAccommodationFetching;
  const accommodation404 = isAccommodationError && Number((accommodationError as any)?.status) === 404;
  const accommodationUnexpectedError = isAccommodationError && !accommodation404;

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

        {/* Loading states */}
        {(!isHydrated || isDraftLoading || isDraftFetching || accommodationLoading) ? (
          <Typography>Loading listing...</Typography>

        /* No accommodation (expected) */
        ) : accommodation404 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" gutterBottom>You don't have an accommodation set up yet</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>Providers must set up an accommodation before creating listings. Go to your Provider Dashboard to create and configure your accommodation, then return here to continue creating a listing.</Typography>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
              <Button variant="contained" onClick={() => { navigate("/dashboard/provider/accommodations/create"); onClose(); }}>Create accommodation</Button>
              <Button variant="outlined" onClick={() => refetchAccommodation()}>Retry</Button>
              <Button onClick={onClose}>Close</Button>
            </Box>
          </Box>

        /* Unexpected API error */
        ) : accommodationUnexpectedError ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" gutterBottom>Unable to load accommodation</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>An unexpected error occurred while fetching your accommodation. Please try again or contact support if the problem persists.</Typography>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
              <Button variant="contained" onClick={() => refetchAccommodation()}>Retry</Button>
              <Button onClick={onClose}>Close</Button>
            </Box>
          </Box>

        /* Normal flow */
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
