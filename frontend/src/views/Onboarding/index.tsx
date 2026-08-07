import { useState } from "react";
import { Box } from "@mui/material";
import { CheckCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import WalletCard from "../../components/wallet/WalletCard";

type OnboardingState = {
  role?: string;
  userName?: string;
};

const Onboarding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, userName } = (location.state || {}) as OnboardingState;
  const [step, setStep] = useState(0);
  const roleDashboard =
    role === "landlord"
      ? "/dashboard/landlord"
      : role === "tenant"
      ? "/dashboard/tenant"
      : "/";

  const renderStep = () => {
    if (step === 0) {
      return (
        <>
          <CheckCircle size={72} color="#B8975A" />
          <Box sx={{ fontSize: "32px", fontWeight: 800, mt: 2 }}>
            Email Verified!
          </Box>
          <Box sx={{ color: "text.secondary", mt: 1 }}>
            Welcome to Town Ruins, {userName || "there"}.
          </Box>
          <AppButton sx={{ mt: 3 }} onClick={() => setStep(1)}>
            Get Started {"\u2192"}
          </AppButton>
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <Box sx={{ fontSize: "30px", fontWeight: 800 }}>Your TR Wallet</Box>
          <Box sx={{ color: "text.secondary", mt: 1, mb: 2 }}>
            You've received 100 TR Tokens as a welcome bonus.
          </Box>
          <WalletCard compact />
          <Box sx={{ color: "text.secondary", mt: 2, fontSize: "14px" }}>
            Tokens let you contact landlords and unlock premium features.
          </Box>
          <AppButton sx={{ mt: 3 }} onClick={() => setStep(2)}>
            Next {"\u2192"}
          </AppButton>
        </>
      );
    }

    if (step === 2 && role === "landlord") {
      return (
        <>
          <Box sx={{ fontSize: "30px", fontWeight: 800 }}>List Your First Property</Box>
          <Box sx={{ color: "text.secondary", mt: 1, mb: 3 }}>
            Create your first listing and start receiving tenant requests.
          </Box>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
            <AppButton onClick={() => navigate("/create-listing")}>Create Listing</AppButton>
            <AppButton variant="outlined" onClick={() => setStep(3)}>
              Next {"\u2192"}
            </AppButton>
          </Box>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <Box sx={{ fontSize: "30px", fontWeight: 800 }}>Find Your Home</Box>
          <Box sx={{ color: "text.secondary", mt: 1, mb: 3 }}>
            Browse verified listings. Use your TR tokens to contact landlords directly.
          </Box>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
            <AppButton onClick={() => navigate("/search")}>Browse Properties</AppButton>
            <AppButton variant="outlined" onClick={() => setStep(3)}>
              Next {"\u2192"}
            </AppButton>
          </Box>
        </>
      );
    }

    return (
      <>
        <Box sx={{ fontSize: "30px", fontWeight: 800 }}>Complete Your Profile</Box>
        <Box sx={{ color: "text.secondary", mt: 1, mb: 3 }}>
          Build trust with landlords and tenants by completing your profile.
        </Box>
        <Box sx={{ display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
          <AppButton onClick={() => navigate("/profile")}>Complete Profile</AppButton>
          <AppButton variant="outlined" onClick={() => navigate(roleDashboard)}>
            Skip for now {"\u2192"}
          </AppButton>
        </Box>
      </>
    );
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <AppCard sx={{ maxWidth: 520, width: "100%", p: { xs: 3, md: 5 }, borderRadius: "24px", textAlign: "center" }}>
        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.75, mb: 3 }}>
          {[0, 1, 2, 3].map((index) => (
            <Box
              key={index}
              sx={{
                width: index === step ? 18 : 8,
                height: 8,
                borderRadius: "999px",
                background: index === step ? "#B8975A" : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </Box>
        {renderStep()}
      </AppCard>
    </Box>
  );
};

export default Onboarding;
