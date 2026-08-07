import { useEffect, useMemo, useState } from "react";
import { Box, LinearProgress } from "@mui/material";
import useTypedSelector from "../../../hooks/useTypedSelector";
import {
  selectedIsEmailVerified,
  selectedUserAvatar,
  selectedUserEmail,
  selectedUserName,
  selectedUserRole,
} from "../../../redux/auth/authSlice";
import { selectTransactions } from "../../../redux/wallet/walletSlice";
import AppButton from "../../../components/ui/AppButton";
import AppCard from "../../../components/ui/AppCard";

const DISMISS_KEY = "tr_checklist_dismissed";
const CHECKLIST_KEY = "tr_onboarding_checklist";

const readJsonArray = (key: string) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const OnboardingChecklist = () => {
  const isEmailVerified = useTypedSelector(selectedIsEmailVerified);
  const userRole = useTypedSelector(selectedUserRole);
  const userName = useTypedSelector(selectedUserName);
  const userEmail = useTypedSelector(selectedUserEmail);
  const userAvatar = useTypedSelector(selectedUserAvatar);
  const transactions = useTypedSelector(selectTransactions);
  const [dismissed, setDismissed] = useState(false);
  const [hasRecentlyViewed, setHasRecentlyViewed] = useState(false);
  const [storedCompleted, setStoredCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "true");
    setHasRecentlyViewed(readJsonArray("tr_recently_viewed").length > 0);
    try {
      const parsed = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || "{}");
      setStoredCompleted(
        parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
      );
    } catch {
      setStoredCompleted({});
    }
  }, []);

  const hasCompletedProfile = Boolean(userName?.trim() && userEmail?.trim() && userAvatar);
  const isLandlord = userRole === "landlord";
  const steps = useMemo(
    () => {
      const finalStep = isLandlord
        ? {
            label: "Approve an engagement",
            complete: transactions.some((transaction) =>
              transaction.label.startsWith("Approved engagement")
            ),
          }
        : {
            label: "Contact a landlord",
            complete: transactions.some((transaction) =>
              transaction.label.startsWith("Contacted landlord")
            ),
          };

      return [
        { label: "Create account", complete: storedCompleted.createAccount ?? true },
        { label: "Verify email", complete: isEmailVerified },
        {
          label: "Complete profile",
          complete: storedCompleted.completeProfile ?? hasCompletedProfile,
        },
        {
          label: "Browse first listing",
          complete: storedCompleted.browseFirstListing ?? hasRecentlyViewed,
        },
        finalStep,
      ];
    },
    [
      hasCompletedProfile,
      hasRecentlyViewed,
      isEmailVerified,
      isLandlord,
      storedCompleted,
      transactions,
    ]
  );
  const completedCount = steps.filter((step) => step.complete).length;
  const allComplete = completedCount === steps.length;

  if (dismissed) return null;

  return (
    <AppCard sx={{ p: 2.5 }}>
      <Box sx={{ fontWeight: 800, mb: 1 }}>Getting Started</Box>
      <LinearProgress
        variant="determinate"
        value={(completedCount / steps.length) * 100}
        sx={{
          height: 8,
          borderRadius: "999px",
          mb: 2,
          backgroundColor: "rgba(184,151,90,0.16)",
          "& .MuiLinearProgress-bar": { backgroundColor: "#B8975A" },
        }}
      />
      <Box sx={{ display: "grid", gap: 1 }}>
        {steps.map((step) => (
          <Box
            key={step.label}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: step.complete ? "text.primary" : "text.secondary",
              fontSize: "14px",
            }}
          >
            <Box sx={{ color: step.complete ? "#B8975A" : "text.disabled", fontWeight: 800 }}>
              {step.complete ? "\u2713" : "\u25CB"}
            </Box>
            {step.label}
          </Box>
        ))}
      </Box>
      {allComplete ? (
        <Box sx={{ mt: 2, p: 1.5, borderRadius: "12px", background: "rgba(184,151,90,0.12)" }}>
          <Box sx={{ fontWeight: 800 }}>{"\u{1F389}"} All done!</Box>
          <AppButton
            size="small"
            sx={{ mt: 1 }}
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, "true");
              setDismissed(true);
            }}
          >
            Dismiss
          </AppButton>
        </Box>
      ) : null}
    </AppCard>
  );
};

export default OnboardingChecklist;
