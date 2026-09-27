import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { LegalDocument } from "../../../redux/api/adminApiSlice";

type LegalDocumentDraft = {
  slug: string;
  title: string;
  content: string;
};

type LegalDocumentWizardProps = {
  open: boolean;
  mode: "create" | "edit";
  document: LegalDocument | null;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: LegalDocumentDraft) => void;
};

const steps = [
  "Introduction",
  "Document type",
  "Document details",
  "Content",
  "Review",
  "Save & publish",
];

const documentTypes = [
  {
    slug: "terms-of-use",
    name: "Tenant & Guest Agreement",
    explanation:
      "Sets the rules for people searching for, enquiring about, or booking accommodation.",
    useWhen:
      "creating or updating the terms that apply to tenants, guests, and other accommodation seekers.",
    audience: "Tenants and short-term guests.",
    distinction:
      "This is for accommodation users; the Host & Landlord Agreement is for property providers.",
  },
  {
    slug: "privacy-policy",
    name: "Privacy Policy",
    explanation:
      "Explains how the platform collects, uses, shares, stores, and protects personal information.",
    useWhen: "creating or updating the platform privacy notice.",
    audience: "Everyone whose information is handled by the platform.",
    distinction:
      "This covers personal information handling, not booking rules or user conduct.",
  },
  {
    slug: "landlord-terms",
    name: "Host & Landlord Agreement",
    explanation:
      "Sets expectations for property owners, landlords, hotels, lodges, and other accommodation providers.",
    useWhen:
      "creating or updating the provider agreement for listing and offering accommodation.",
    audience: "Landlords, hosts, hotels, lodges, and other accommodation providers.",
    distinction:
      "This is for providers; the Tenant & Guest Agreement is for people using accommodation.",
  },
  {
    slug: "refund-policy",
    name: "Refund and Cancellation Policy",
    explanation:
      "Explains how cancellation and refund information is presented and how disputes and related platform rules are handled.",
    useWhen: "creating or updating the platform's refund and cancellation guidance.",
    audience: "Users making or managing accommodation bookings.",
    distinction:
      "Property-specific cancellation terms still come from the individual property.",
  },
  {
    slug: "community-guidelines",
    name: "Community Guidelines",
    explanation:
      "Describes respectful communication, prohibited behaviour, reporting, and possible enforcement outcomes.",
    useWhen: "creating or updating standards for safe participation on the platform.",
    audience: "All platform users, including tenants, landlords, hosts, and providers.",
    distinction:
      "This focuses on community conduct rather than contractual accommodation terms.",
  },
  {
    slug: "trust-safety",
    name: "Trust & Safety",
    explanation:
      "Explains the platform's verification, reporting, payment-safety, and dispute-support practices.",
    useWhen: "creating or updating the platform trust and safety overview.",
    audience: "All platform users.",
    distinction:
      "This explains safety mechanisms and support, not the full user or provider agreement.",
  },
];

const getInitialDraft = (
  mode: "create" | "edit",
  document: LegalDocument | null
): LegalDocumentDraft => ({
  slug: mode === "edit" && document ? document.slug : "",
  title: mode === "edit" && document ? document.title : "",
  content: mode === "edit" && document ? document.content : "",
});

const getTextPreview = (content: string) => {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed
        .map((section) => `${section.title || ""}\n${section.content || ""}`)
        .join("\n\n");
    }
  } catch {
    // Existing documents may use plain text; show it as entered.
  }
  return content;
};

const LegalDocumentWizard: React.FC<LegalDocumentWizardProps> = ({
  open,
  mode,
  document,
  saving,
  onClose,
  onSave,
}) => {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<LegalDocumentDraft>(() =>
    getInitialDraft(mode, document)
  );
  const [confirmed, setConfirmed] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setDraft(getInitialDraft(mode, document));
      setConfirmed(false);
      setAttempted(false);
    }
  }, [document, mode, open]);

  const selectedType = useMemo(
    () => documentTypes.find((type) => type.slug === draft.slug),
    [draft.slug]
  );
  const contentPreview = getTextPreview(draft.content);
  const errors = {
    type: !draft.slug ? "Choose a document type to continue." : "",
    title: !draft.title.trim() ? "Enter a document title." : "",
    content: !draft.content.trim() ? "Enter the approved legal content." : "",
  };

  const validateStep = () => {
    if (step === 1) return !errors.type;
    if (step === 2) return !errors.title;
    if (step === 3) return !errors.content;
    return true;
  };

  const handleNext = () => {
    setAttempted(true);
    if (validateStep()) {
      setAttempted(false);
      setStep((current) => Math.min(current + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setAttempted(false);
    setStep((current) => Math.max(current - 1, 0));
  };

  const handleClose = () => {
    if (!saving) onClose();
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Create a clear, approved legal document
          </Typography>
          <Typography paragraph>
            Legal Documentation stores the notices and agreements that explain
            how Town Ruins operates and what users can expect. This wizard will
            help you choose the right document, enter its details, review the
            result, and save a new version.
          </Typography>
          <Alert severity="warning">
            Use the appropriate approved legal wording. This tool does not
            provide legal advice or generate legal content.
          </Alert>
          <Typography sx={{ mt: 2 }} color="text.secondary">
            Saving here immediately makes the new version active on the
            platform. You will get a final confirmation before that happens.
          </Typography>
        </Box>
      );
    }

    if (step === 1) {
      return (
        <Box>
          <Typography paragraph>
            Choose the document that matches the subject of the approved
            content. The system uses an internal identifier behind the scenes;
            you do not need to know or enter it.
          </Typography>
          <Box sx={{ display: "grid", gap: 1.5 }}>
            {documentTypes.map((type) => (
              <Paper
                key={type.slug}
                component="button"
                type="button"
                onClick={() =>
                  setDraft((current) => ({ ...current, slug: type.slug }))
                }
                aria-pressed={draft.slug === type.slug}
                sx={{
                  textAlign: "left",
                  cursor: "pointer",
                  p: 2,
                  border: "2px solid",
                  borderColor: draft.slug === type.slug ? "primary.main" : "divider",
                  backgroundColor:
                    draft.slug === type.slug ? "action.selected" : "background.paper",
                }}
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  {type.name}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {type.explanation}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Use this when:</strong> {type.useWhen}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  <strong>Applies to:</strong> {type.audience}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  <strong>Important distinction:</strong> {type.distinction}
                </Typography>
              </Paper>
            ))}
          </Box>
          {attempted && errors.type && (
            <Typography color="error" role="alert" sx={{ mt: 1 }}>
              {errors.type}
            </Typography>
          )}
        </Box>
      );
    }

    if (step === 2) {
      return (
        <Box>
          <Typography paragraph>
            Give this version a clear name. The title is shown to
            administrators and readers; the document type selected earlier
            determines its audience and purpose.
          </Typography>
          <TextField
            fullWidth
            required
            label="Document title"
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            placeholder={selectedType?.name || "For example, Privacy Policy"}
            error={attempted && Boolean(errors.title)}
            helperText={
              (attempted && errors.title) ||
              "Use a short, recognizable title. This field is required."
            }
            inputProps={{ "aria-label": "Document title" }}
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Version</Typography>
            <Typography variant="body2" color="text.secondary">
              {mode === "edit"
                ? `The system will create version ${(document?.version || 0) + 1} and archive the current version.`
                : "The system assigns version 1 for a new document, or the next version if this type already exists."}
            </Typography>
          </Box>
        </Box>
      );
    }

    if (step === 3) {
      return (
        <Box>
          <Typography paragraph>
            Enter the approved legal content that readers should see. Plain
            text is supported, and existing documents may also use JSON section
            content with headings and body text. Do not add legal wording that
            has not been approved.
          </Typography>
          <TextField
            fullWidth
            required
            multiline
            minRows={12}
            label="Approved legal content"
            value={draft.content}
            onChange={(event) =>
              setDraft((current) => ({ ...current, content: event.target.value }))
            }
            placeholder="Enter the approved notice, agreement, or policy text."
            error={attempted && Boolean(errors.content)}
            helperText={
              (attempted && errors.content) ||
              "Headings and sections are supported when entered in the existing document format."
            }
            inputProps={{ "aria-label": "Approved legal content" }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            The current implementation stores this content as text and does not
            impose a separate character limit.
          </Typography>
        </Box>
      );
    }

    if (step === 4) {
      return (
        <Box>
          <Typography paragraph>
            Check the information below before continuing. Use Back to edit any
            step.
          </Typography>
          <Box sx={{ display: "grid", gap: 1.5 }}>
            <Typography>
              <strong>Document type:</strong> {selectedType?.name || "Not selected"}
            </Typography>
            <Typography>
              <strong>Title:</strong> {draft.title || "Not entered"}
            </Typography>
            <Typography>
              <strong>Audience:</strong> {selectedType?.audience || "Not specified"}
            </Typography>
            <Typography>
              <strong>Version:</strong>{" "}
              {mode === "edit"
                ? (document?.version || 0) + 1
                : "Assigned automatically when saved"}
            </Typography>
            <Typography>
              <strong>Status after save:</strong> Active and visible to readers
            </Typography>
            <Box>
              <Typography fontWeight={700}>Content preview</Typography>
              <Paper
                variant="outlined"
                sx={{ p: 2, mt: 0.5, maxHeight: 220, overflow: "auto", whiteSpace: "pre-wrap" }}
              >
                {contentPreview || "No content entered"}
              </Paper>
            </Box>
          </Box>
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Confirm save and publish
        </Typography>
        <Alert severity="warning" sx={{ mb: 2 }}>
          There is no draft or approval state in the current system. Confirming
          will save this version as active immediately. If this replaces an
          existing document, the current active version will be archived.
        </Alert>
        <FormControlLabel
          control={
            <Checkbox
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              inputProps={{ "aria-label": "Confirm save and publish" }}
            />
          }
          label="I have checked that this is the approved content and want to save and publish it now."
        />
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === "edit" ? "Update legal document" : "Create legal document"}
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 4, pt: 1 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {renderStep()}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
        <Button variant="outlined" onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        {step > 0 && (
          <Button onClick={handleBack} disabled={saving}>
            Back
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button variant="contained" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={() => onSave(draft)}
            disabled={!confirmed || saving}
          >
            {saving ? "Saving..." : "Save & publish"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default LegalDocumentWizard;
