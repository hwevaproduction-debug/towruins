import React, { useEffect, useState } from "react";
import { Box, Button, Typography, Stack, IconButton, Checkbox, FormControlLabel } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useCompleteOnboardingMutation } from "../../../../redux/api/adminApiSlice";
import { trackEvent } from "../../../../utils/analytics";

type Step = {
  id: string;
  title: string;
  content: string;
};

const steps: Step[] = [
  { id: "provider-dashboard-header", title: "Dashboard", content: "This is your provider workspace. From here you can manage your listings, requests, activity and account information." },
  { id: "provider-listings-section", title: "Listings", content: "This is where you create and manage properties or temporary stays you offer." },
  { id: "create-listing-button", title: "Create Listing", content: "Start here to create a new listing. You can save your progress and return later." },
  { id: "listing-status", title: "Listing Status", content: "Listing statuses (only those that apply): Draft, Pending, Published, Unpublished, Rejected, Expired. Each state affects visibility and actions." },
  { id: "requests-tab", title: "Requests", content: "Provider requests and tenant messages appear here." },
  { id: "notifications-button", title: "Notifications", content: "Important provider notifications appear here." },
  { id: "provider-profile", title: "Profile", content: "Manage your provider profile and account settings here." },
];

const ProviderTourDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [index, setIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [dontShow, setDontShow] = useState(false);
  const [completeOnboarding] = useCompleteOnboardingMutation();

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setDontShow(false);
    // analytics: mark tour start
    try { trackEvent("tour_start", { tour: "provider_dashboard" }); } catch (e) {}
  }, [open]);

  useEffect(() => {
    if (!open) {
      setAnchorRect(null);
      return;
    }
    const id = steps[index]?.id;
    const el = id ? (document.querySelector(`[data-tour-id="${id}"]`) as HTMLElement) : null;
    setAnchorRect(el ? el.getBoundingClientRect() : null);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(steps.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, open, onClose]);

  const goNext = () => setIndex((i) => Math.min(steps.length - 1, i + 1));
  const goBack = () => setIndex((i) => Math.max(0, i - 1));
  const finish = async (skipped = false) => {
    try {
      // pass skipped flag when available; backend understands it
      // ignore result - non-blocking UX
      await (completeOnboarding as any)({ skipped }).unwrap();
    } catch (e) {
      // non-critical
    }
    if (dontShow) localStorage.setItem("tr_provider_tour_dont_show", "true");
    try { trackEvent("tour_finish", { tour: "provider_dashboard", skipped }); } catch (e) {}
    onClose();
  };

  if (!open) return null;

  const step = steps[index];
  const rect = anchorRect;
  const tooltipStyle: React.CSSProperties = rect
    ? { position: "fixed", top: (rect.bottom + window.scrollY + 10), left: Math.min(window.innerWidth - 340, rect.left + window.scrollX), width: 320, zIndex: 1402 }
    : { position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 420, zIndex: 1402 };

  const highlightStyle: React.CSSProperties = rect
    ? { position: "fixed", top: rect.top + window.scrollY - 6, left: rect.left + window.scrollX - 6, width: rect.width + 12, height: rect.height + 12, borderRadius: 8, boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)", border: "2px solid #B8975A", zIndex: 1401, pointerEvents: "none" }
    : {};

  return (
    <Box role="dialog" aria-modal="true" sx={{ position: "fixed", inset: 0, zIndex: 1400 }}>
      {/* click-away backdrop (transparent) */}
      <Box onClick={() => onClose()} sx={{ position: "fixed", inset: 0, background: "transparent" }} />
      {rect ? <Box sx={highlightStyle as any} /> : null}
      <Box sx={tooltipStyle as any} tabIndex={-1}>
        <Box sx={{ bgcolor: "background.paper", borderRadius: 2, boxShadow: 3, p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">{step.title}</Typography>
            <IconButton size="small" onClick={() => onClose()} aria-label="Close tour"><CloseIcon /></IconButton>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{step.content}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1}>
              <Button size="small" disabled={index === 0} onClick={goBack}>Back</Button>
              {index < steps.length - 1 ? <Button size="small" variant="contained" onClick={goNext}>Next</Button> : <Button size="small" variant="contained" onClick={() => finish(false)}>Finish</Button>}
            </Stack>
            <Stack direction="row" spacing={1}>
              <FormControlLabel control={<Checkbox checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />} label="Don't show this again" />
              <Button size="small" variant="outlined" onClick={() => finish(true)}>Skip</Button>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default ProviderTourDialog;
