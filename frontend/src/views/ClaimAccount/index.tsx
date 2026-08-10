import React, { useEffect, useState } from "react";
import { Box, Typography, TextField } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import { useValidateClaimQuery, useClaimAccountMutation, useCompleteOnboardingMutation } from "../../redux/api/adminApiSlice";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/auth/authSlice";

const ClaimAccount = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data, isFetching } = useValidateClaimQuery(token, { skip: !token });
  const [claimAccount, { isLoading: isClaiming }] = useClaimAccountMutation();
  const [completeOnboarding] = useCompleteOnboardingMutation();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setMessage("Missing token. Please use the invitation link sent to your email.");
    }
  }, [token]);

  const handleSubmit = async () => {
    if (!password || password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    try {
      const res: any = await claimAccount({ token, password }).unwrap();
      const user = res?.data ?? res;
      if (user) {
        dispatch(setUser(user));
        localStorage.setItem("user", JSON.stringify(user));
        // mark onboarding complete later from onboarding view; navigate to onboarding
        navigate("/onboarding", { state: { role: user?.role, userName: user?.firstName || user?.name } });
      }
    } catch (err: any) {
      setMessage(err?.data?.message || "Unable to claim account.");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
      <AppCard sx={{ maxWidth: 520, width: "100%", p: 4 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>
          Claim account
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          Use the token from your invitation link to set a password and claim your account.
        </Typography>
        {isFetching ? (
          <Typography>Validating token...</Typography>
        ) : data?.error ? (
          <Typography color="error">{data.error || "Invalid or expired token."}</Typography>
        ) : (
          <>
            <Typography sx={{ mb: 1 }}>
              Claiming account for <strong>{data?.user?.email || data?.email}</strong>
            </Typography>
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              helperText="At least 8 characters"
            />
            {message && <Typography color="error">{message}</Typography>}
            <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
              <AppButton onClick={handleSubmit} disabled={isClaiming}>
                Claim Account
              </AppButton>
              <AppButton variant="outlined" onClick={() => navigate("/")}>Cancel</AppButton>
            </Box>
          </>
        )}
      </AppCard>
    </Box>
  );
};

export default ClaimAccount;
