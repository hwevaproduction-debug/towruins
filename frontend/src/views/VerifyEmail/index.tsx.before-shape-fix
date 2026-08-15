import { useEffect, useState } from "react";
import { Box, CircularProgress, TextField } from "@mui/material";
import CheckCircle from "@mui/icons-material/CheckCircle";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import { Heading, SubHeading } from "../../components/Heading";
import {
  useResendVerificationMutation,
  useVerifyEmailQuery,
} from "../../redux/api/authApiSlice";
import { setUser } from "../../redux/auth/authSlice";
import HeroSlideshow from "../Home/HeroSlideshow";

const FALLBACK_HERO_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1920&q=80",
];

const cardSx = {
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
  textAlign: "center",
  position: "relative",
  zIndex: 2,
  scrollbarWidth: "thin",
  scrollbarColor: "#B8975A transparent",
  "&::-webkit-scrollbar": { width: "4px" },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": { background: "#B8975A", borderRadius: "4px" },
};

const VerifyEmail = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [showResend, setShowResend] = useState(false);
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [resendMessage, setResendMessage] = useState("");
  const [resendVerification, { isLoading: isResending }] =
    useResendVerificationMutation();
  const { data, error, isLoading } = useVerifyEmailQuery(token, { skip: !token });

  useEffect(() => {
    if (!token) {
      navigate("/signup", { replace: true });
    }
  }, [navigate, token]);

  useEffect(() => {
    if (data?.status !== "success") return;

    dispatch(setUser(data));
    localStorage.setItem("user", JSON.stringify(data));

    const timeout = window.setTimeout(() => {
      navigate("/onboarding", {
        replace: true,
        state: {
          role: data?.data?.user?.role,
          userName: data?.data?.user?.username,
        },
      });
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [data, dispatch, navigate]);

  const handleResend = async () => {
    if (!email) {
      setResendMessage("Enter your email address first.");
      return;
    }

    try {
      await resendVerification({ email }).unwrap();
      setResendMessage("Verification email sent.");
    } catch (err: any) {
      setResendMessage(
        err?.data?.message || err?.message || "Unable to resend verification email."
      );
    }
  };

  const state = data?.status === "success" ? "success" : error ? "error" : "loading";

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0F141E",
        py: 4,
      }}
    >
      <HeroSlideshow images={FALLBACK_HERO_IMAGES} />
      <AppCard sx={cardSx}>
        {state === "loading" || isLoading ? (
          <>
            <CircularProgress sx={{ color: "#B8975A", mb: 2 }} />
            <Heading sx={{ fontSize: "28px", mb: 1 }}>
              Verifying your email...
            </Heading>
            <SubHeading sx={{ color: "text.secondary" }}>
              We are confirming your Town Ruins account.
            </SubHeading>
          </>
        ) : state === "success" ? (
          <>
            <CheckCircle sx={{ color: "#B8975A", fontSize: 72, mb: 2 }} />
            <Heading sx={{ fontSize: "30px", mb: 1 }}>Email verified!</Heading>
            <SubHeading sx={{ color: "text.secondary" }}>
              Redirecting to your dashboard...
            </SubHeading>
          </>
        ) : (
          <>
            <ErrorOutline sx={{ color: "#f87171", fontSize: 72, mb: 2 }} />
            <Heading sx={{ fontSize: "30px", mb: 1 }}>
              This link has expired
            </Heading>
            <SubHeading sx={{ color: "text.secondary", mb: 2 }}>
              Verification links are valid for 24 hours.
            </SubHeading>
            {showResend ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <TextField
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  size="small"
                  fullWidth
                />
                <AppButton
                  disabled={isResending}
                  loading={isResending}
                  onClick={handleResend}
                >
                  Send verification email
                </AppButton>
                {resendMessage ? (
                  <Box sx={{ color: "text.secondary", fontSize: 13 }}>
                    {resendMessage}
                  </Box>
                ) : null}
              </Box>
            ) : (
              <AppButton onClick={() => setShowResend(true)}>
                Resend verification email
              </AppButton>
            )}
            <Box
              sx={{ color: "#B8975A", mt: 2, cursor: "pointer", fontWeight: 700 }}
              onClick={() => navigate("/signup")}
            >
              Back to Sign Up
            </Box>
          </>
        )}
      </AppCard>
    </Box>
  );
};

export default VerifyEmail;
