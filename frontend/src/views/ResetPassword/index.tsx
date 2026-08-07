import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box } from "@mui/material";
import { Eye, EyeOff } from "lucide-react";
import HeroSlideshow from "../Home/HeroSlideshow";
import { Heading, SubHeading } from "../../components/Heading";
import DotLoader from "../../components/Spinner/dotLoader";
import PrimaryInput from "../../components/PrimaryInput/PrimaryInput";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import { useResetPasswordMutation } from "../../redux/api/authApiSlice";

const FALLBACK_HERO_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1920&q=80",
];

const authCardSx = {
  width: { xs: "calc(100% - 32px)", sm: "480px", md: "min(480px, 38vw)" },
  minWidth: { md: "420px" },
  maxHeight: "calc(100vh - 64px)",
  overflowY: "auto",
  p: { xs: 3, md: "48px 52px" },
  borderRadius: "28px",
  background: "rgba(15,20,30,0.72)",
  backdropFilter: "blur(28px)",
  border: "1px solid rgba(255,255,255,0.09)",
  boxShadow:
    "0 48px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)",
  position: "relative",
  zIndex: 2,
  scrollbarWidth: "thin",
  scrollbarColor: "#B8975A transparent",
  "&::-webkit-scrollbar": { width: "4px" },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": { background: "#B8975A", borderRadius: "4px" },
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isError, setIsError] = useState(!token);
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "This reset link is missing a token."
  );
  const [formError, setFormError] = useState("");
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsError(false);
    setErrorMessage("");
    setFormError("");

    if (newPassword.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    try {
      await resetPassword({ token, password: newPassword }).unwrap();
      setSubmitted(true);
    } catch (error: any) {
      setIsError(true);
      setErrorMessage(
        error?.data?.message ||
          error?.message ||
          "This link has expired or is invalid."
      );
    }
  };

  const renderContent = () => {
    if (submitted) {
      return (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Heading sx={{ fontSize: "32px", marginBottom: "6px" }}>
            Password updated!
          </Heading>
          <SubHeading sx={{ color: "text.secondary", mb: 2 }}>
            You can now log in with your new password.
          </SubHeading>
          <AppButton onClick={() => navigate("/login")}>Go to Login</AppButton>
        </Box>
      );
    }

    if (isError && !token) {
      return (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Heading sx={{ fontSize: "32px", marginBottom: "6px" }}>
            Invalid link
          </Heading>
          <SubHeading sx={{ color: "text.secondary", mb: 2 }}>
            {errorMessage}
          </SubHeading>
          <AppButton onClick={() => navigate("/forgot-password")}>
            Request new link
          </AppButton>
        </Box>
      );
    }

    if (isError && errorMessage && !submitted) {
      return (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Heading sx={{ fontSize: "32px", marginBottom: "6px" }}>
            Link expired
          </Heading>
          <SubHeading sx={{ color: "text.secondary", mb: 2 }}>
            {errorMessage}
          </SubHeading>
          <AppButton onClick={() => navigate("/forgot-password")}>
            Request new link
          </AppButton>
        </Box>
      );
    }

    return (
      <>
        <Box sx={{ textAlign: "center" }}>
          <Heading sx={{ fontSize: "32px", marginBottom: "6px" }}>
            Reset password
          </Heading>
          <SubHeading sx={{ color: "text.secondary" }}>
            Choose a new password for your account.
          </SubHeading>
        </Box>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Box sx={{ marginTop: "20px" }}>
            <SubHeading sx={{ marginBottom: "5px" }}>New password</SubHeading>
            <PrimaryInput
              type={showPassword ? "text" : "password"}
              label=""
              name="newPassword"
              placeholder="New password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              onClick={() => setShowPassword((value) => !value)}
              endAdornment={showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            />
          </Box>
          <Box sx={{ marginTop: "12px" }}>
            <SubHeading sx={{ marginBottom: "5px" }}>
              Confirm password
            </SubHeading>
            <PrimaryInput
              type={showConfirmPassword ? "text" : "password"}
              label=""
              name="confirmPassword"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onClick={() => setShowConfirmPassword((value) => !value)}
              endAdornment={
                showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />
              }
            />
          </Box>
          {formError ? (
            <Box sx={{ color: "#991B1B", fontSize: "13px", mt: 1.5 }}>
              {formError}
            </Box>
          ) : null}
          <AppButton
            type="submit"
            fullWidth
            disabled={isLoading}
            sx={{ margin: "16px 0 0 0" }}
          >
            {isLoading ? <DotLoader color="#fff" size={12} /> : "Reset Password"}
          </AppButton>
        </Box>
      </>
    );
  };

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
        background: "#0F141E",
      }}
    >
      <HeroSlideshow images={FALLBACK_HERO_IMAGES} />
      <AppCard sx={authCardSx}>
                <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                  <Box
                    component="img"
                    src="/app-logo.png"
                    alt="Town Ruins"
                    sx={{
                      height: { xs: 32, md: 40 },
                      width: "auto",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                </Box>
        {renderContent()}
      </AppCard>
    </Box>
  );
};

export default ResetPassword;
