// React Imports
import { useState } from "react";
import { useNavigate } from "react-router-dom";
// MUI Imports
import { Box, Checkbox, FormControlLabel, Link, Radio, RadioGroup } from "@mui/material";
import { Eye, EyeOff } from "lucide-react";
// Formik Imports
import { Form, Formik, FormikProps } from "formik";
// Utils Imports
import { onKeyDown } from "../../utils";
// Redux Imports
import {
  useLazyCheckAvailabilityQuery,
  useResendVerificationMutation,
  useSignupMutation,
} from "../../redux/api/authApiSlice";
// Components Imports
import DotLoader from "../../components/Spinner/dotLoader";
import PrimaryInput from "../../components/PrimaryInput/PrimaryInput";
import ToastAlert from "../../components/ToastAlert/ToastAlert";
import { signUpSchema } from "./components/validationSchema";
import { Heading, SubHeading } from "../../components/Heading";
// Google OAuth Imports
import GoogleOAuth from "../../components/OAuth";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import HeroSlideshow from "../Home/HeroSlideshow";
import { FALLBACK_HERO_IMAGES, AUTH_CARD_SX, AUTH_PAGE_WRAPPER_SX } from "../auth/authShared";


interface ISSignUpForm {
  userName: string;
  email: string;
  password: string;
  role: "tenant" | "landlord";
  consentTerms: boolean;
  consentPrivacy: boolean;
  consentLandlord: boolean;
}

const signUpFormSchema = signUpSchema.omit(["phoneNumber", "nationalId"] as any);

const SignUp = () => {
  const navigate = useNavigate();

  // states
  const [showPassword, setShowPassword] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [formValues, setFormValues] = useState<ISSignUpForm>({
    userName: "",
    email: "",
    password: "",
    role: "tenant",
    consentTerms: false,
    consentPrivacy: false,
    consentLandlord: false,
  });

  const [toast, setToast] = useState({
    message: "",
    appearence: false,
    type: "",
  });
  const [checkAvailability] = useLazyCheckAvailabilityQuery();
  const [availabilityErrors, setAvailabilityErrors] = useState<{ email?: string; userName?: string }>({});
  const [availabilityChecking, setAvailabilityChecking] = useState<{ email: boolean; userName: boolean }>({ email: false, userName: false });

  const hideShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleEmailBlur = async (value: string) => {
    if (!value || !value.includes("@")) return;
    setAvailabilityChecking((prev) => ({ ...prev, email: true }));
    try {
      const result = await checkAvailability({ email: value }).unwrap();
      if (result.data.emailAvailable === false) {
        setAvailabilityErrors((prev) => ({
          ...prev,
          email: "This email is already registered. Try logging in instead.",
        }));
      } else {
        setAvailabilityErrors((prev) => ({ ...prev, email: undefined }));
      }
    } catch {
      // silently ignore network errors
    } finally {
      setAvailabilityChecking((prev) => ({ ...prev, email: false }));
    }
  };

  const handleUsernameBlur = async (value: string) => {
    if (!value || value.length < 2) return;
    setAvailabilityChecking((prev) => ({ ...prev, userName: true }));
    try {
      const result = await checkAvailability({ username: value }).unwrap();
      if (result.data.usernameAvailable === false) {
        setAvailabilityErrors((prev) => ({
          ...prev,
          userName: "This username is already taken. Please choose another.",
        }));
      } else {
        setAvailabilityErrors((prev) => ({ ...prev, userName: undefined }));
      }
    } catch {
      // silently ignore
    } finally {
      setAvailabilityChecking((prev) => ({ ...prev, userName: false }));
    }
  };

  const handleCloseToast = () => {
    setToast({ ...toast, appearence: false });
  };

  // Sign Up Api Bind
  const [signupUser, { isLoading }] = useSignupMutation();
  const [resendVerification, { isLoading: isResendingVerification }] =
    useResendVerificationMutation();

  const SignUpHandler = async (data: ISSignUpForm) => {
    if (!["tenant", "landlord"].includes(data.role)) {
      setToast({
        ...toast,
        message: "Role must be tenant or landlord",
        appearence: true,
        type: "error",
      });
      return;
    }

    const payload = {
      username: data.userName,
      email: data.email,
      password: data.password,
      role: data.role,
      consentAcceptedAt: new Date().toISOString(),
    };
    try {
      const user: any = await signupUser(payload);

      if (user?.data?.status === "pending_verification") {
        setPendingVerificationEmail(data.email);
        return;
      }

      if (user?.data?.status) {
        setToast({
          ...toast,
          message: user?.data?.message || "Account created",
          appearence: true,
          type: "success",
        });
      }
      if (user?.error) {
        setToast({
          ...toast,
          message: user?.error?.data?.message,
          appearence: true,
          type: "error",
        });
      }
    } catch (error) {
      console.error("SignUp Error:", error);
      setToast({
        ...toast,
        message: "Something went wrong",
        appearence: true,
        type: "error",
      });
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendVerification({ email: pendingVerificationEmail }).unwrap();
      setToast({
        ...toast,
        message: "Verification email resent.",
        appearence: true,
        type: "success",
      });
    } catch (error: any) {
      setToast({
        ...toast,
        message:
          error?.data?.message ||
          error?.message ||
          "Unable to resend verification email.",
        appearence: true,
        type: "error",
      });
    }
  };

  return (
    <Box sx={AUTH_PAGE_WRAPPER_SX}>
      <HeroSlideshow images={FALLBACK_HERO_IMAGES} />
      <AppCard sx={AUTH_CARD_SX}>
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
              {pendingVerificationEmail ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexDirection: "column",
                    textAlign: "center",
                    py: 2,
                    gap: 1.5,
                  }}
                >
                  <Heading sx={{ fontSize: "32px", marginBottom: "6px" }}>
                    Check your email
                  </Heading>
                  <SubHeading sx={{ color: "text.secondary", maxWidth: 360 }}>
                    We sent a verification link to {pendingVerificationEmail}. Verify
                    your email before logging in.
                  </SubHeading>
                  <AppButton
                    sx={{ mt: 1 }}
                    disabled={isResendingVerification}
                    loading={isResendingVerification}
                    onClick={handleResendVerification}
                  >
                    Resend email
                  </AppButton>
                  <AppButton variant="text" onClick={() => navigate("/login")}>
                    Go to Login
                  </AppButton>
                </Box>
              ) : (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      flexDirection: "column",
                      textAlign: "center",
                    }}
                  >
                    <Heading sx={{ fontSize: "32px", marginBottom: "6px" }}>
                      Create your account
                    </Heading>
                    <SubHeading sx={{ color: "text.secondary" }}>
                      Join to save listings and manage your profile.
                    </SubHeading>
                  </Box>
                  <Box sx={{ width: "100%", marginTop: "10px" }}>
              <Formik
                initialValues={formValues}
                validate={(values: ISSignUpForm) => {
                  const validationErrors: Partial<
                    Record<keyof ISSignUpForm, string>
                  > = {};
                  if (!["tenant", "landlord"].includes(values.role)) {
                    validationErrors.role = "Role must be tenant or landlord";
                  }
                  if (!values.consentTerms || !values.consentPrivacy) {
                    validationErrors.consentTerms = "Required";
                  }
                  if (values.role === "landlord" && !values.consentLandlord) {
                    validationErrors.consentLandlord = "Required";
                  }
                  return validationErrors;
                }}
                onSubmit={(values: ISSignUpForm) => {
                  SignUpHandler(values);
                }}
                validationSchema={signUpFormSchema}
              >
                {(props: FormikProps<ISSignUpForm>) => {
                  const { values, touched, errors, handleBlur, handleChange } =
                    props;

                  return (
                    <Form onKeyDown={onKeyDown}>
                      <Box sx={{ marginTop: "20px" }}>
                        <SubHeading sx={{ marginBottom: "5px" }}>
                          User Name
                        </SubHeading>
                        <PrimaryInput
                          type="text"
                          label=""
                          name="userName"
                          placeholder="User Name"
                          value={values.userName}
                          helperText={
                            availabilityErrors.userName ||
                            (errors.userName && touched.userName
                              ? errors.userName
                              : "")
                          }
                          error={Boolean(
                            availabilityErrors.userName ||
                              (errors.userName && touched.userName)
                          )}
                          onChange={handleChange}
                          onBlur={(event) => {
                            handleBlur(event);
                            void handleUsernameBlur(values.userName);
                          }}
                        />
                      </Box>
                      <Box sx={{ marginTop: "12px" }}>
                        <SubHeading sx={{ marginBottom: "5px" }}>
                          Email
                        </SubHeading>
                        <PrimaryInput
                          type="text"
                          label=""
                          name="email"
                          placeholder="Email"
                          value={values.email}
                          helperText={
                            availabilityErrors.email ||
                            (errors.email && touched.email ? errors.email : "")
                          }
                          error={Boolean(
                            availabilityErrors.email || (errors.email && touched.email)
                          )}
                          onChange={handleChange}
                          onBlur={(event) => {
                            handleBlur(event);
                            void handleEmailBlur(values.email);
                          }}
                        />
                      </Box>
                      <Box sx={{ marginTop: "12px" }}>
                        <SubHeading sx={{ marginBottom: "5px" }}>
                          Password
                        </SubHeading>
                        <PrimaryInput
                          type={showPassword ? "text" : "password"}
                          label=""
                          name="password"
                          placeholder="Password"
                          value={values.password}
                          helperText={
                            errors.password && touched.password
                              ? errors.password
                              : ""
                          }
                          error={
                            errors.password && touched.password ? true : false
                          }
                          onChange={handleChange}
                          onBlur={handleBlur}
                          onClick={hideShowPassword}
                          endAdornment={
                            showPassword ? (
                              <Eye color="disabled" />
                            ) : (
                              <EyeOff color="disabled" />
                            )
                          }
                        />
                      </Box>
                      <Box sx={{ marginTop: "12px" }}>
                        <SubHeading sx={{ marginBottom: "5px" }}>
                          I am a:
                        </SubHeading>
                        <RadioGroup
                          name="role"
                          value={values.role}
                          onChange={handleChange}
                          row
                        >
                          <FormControlLabel
                            value="tenant"
                            control={<Radio />}
                            label="Tenant"
                          />
                          <FormControlLabel
                            value="landlord"
                            control={<Radio />}
                            label="Landlord"
                          />
                        </RadioGroup>
                        {errors.role && touched.role && (
                          <Box sx={{ fontSize: "12px", color: "#d32f2f" }}>
                            {errors.role}
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                        <Box sx={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#B8975A", mb: 1.5 }}>Before you continue</Box>
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1 }}>
                          <Checkbox name="consentTerms" checked={values.consentTerms} onChange={handleChange} sx={{ p: 0, color: "#B8975A", "&.Mui-checked": { color: "#B8975A" } }} />
                          <Box sx={{ fontSize: "13px", color: "text.secondary", lineHeight: 1.5 }}>
                            I agree to the <Link href="/terms" target="_blank" sx={{ color: "#B8975A" }}>Terms of Use</Link> and <Link href="/community-guidelines" target="_blank" sx={{ color: "#B8975A" }}>Community Guidelines</Link>
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1 }}>
                          <Checkbox name="consentPrivacy" checked={values.consentPrivacy} onChange={handleChange} sx={{ p: 0, color: "#B8975A", "&.Mui-checked": { color: "#B8975A" } }} />
                          <Box sx={{ fontSize: "13px", color: "text.secondary", lineHeight: 1.5 }}>
                            I have read and accept the <Link href="/privacy" target="_blank" sx={{ color: "#B8975A" }}>Privacy Policy</Link>
                          </Box>
                        </Box>
                        {values.role === "landlord" && (
                          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1 }}>
                            <Checkbox name="consentLandlord" checked={values.consentLandlord} onChange={handleChange} sx={{ p: 0, color: "#B8975A", "&.Mui-checked": { color: "#B8975A" } }} />
                            <Box sx={{ fontSize: "13px", color: "text.secondary", lineHeight: 1.5 }}>
                              I agree to the <Link href="/landlord-terms" target="_blank" sx={{ color: "#B8975A" }}>Host & Landlord Agreement</Link>
                            </Box>
                          </Box>
                        )}
                        {(touched.consentTerms || touched.consentPrivacy) && (!values.consentTerms || !values.consentPrivacy || (values.role === "landlord" && !values.consentLandlord)) && (
                          <Box sx={{ fontSize: "12px", color: "#f87171", mt: 0.5 }}>You must accept all required agreements to continue</Box>
                        )}
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "end",
                          marginTop: "16px",
                        }}
                      >
                        <AppButton
                          type="submit"
                          fullWidth
                          size="large"
                          disabled={Boolean(
                            isLoading ||
                              availabilityChecking.email ||
                              availabilityChecking.userName ||
                              availabilityErrors.email ||
                              availabilityErrors.userName
                          )}
                          sx={{ margin: "0 0 16px 0" }}
                        >
                          {isLoading ? (
                            <DotLoader color="#fff" size={12} />
                          ) : (
                            "Sign Up"
                          )}
                        </AppButton>
                      </Box>
                      <Box
                        sx={{
                          "& .MuiButton-root": {
                            background: "var(--surface-card)",
                            color: "var(--text-primary)",
                            border: "1.5px solid var(--border-default)",
                            borderRadius: "999px",
                            lineHeight: 1.2,
                            "&:hover": {
                              background: "var(--surface-page)",
                            },
                          },
                        }}
                      >
                        <GoogleOAuth role={values.role} />
                      </Box>
                      <Box
                        sx={{
                          margin: "0 0 10px 0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                        }}
                      >
                        Already have an account?
                        <Box
                          sx={{
                            color: "#B8975A",
                            fontWeight: 600,
                            cursor: "pointer",
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                          onClick={() => {
                            navigate("/login");
                          }}
                        >
                          Login
                        </Box>
                      </Box>
                    </Form>
                  );
                }}
              </Formik>
                  </Box>
                </>
              )}
      </AppCard>
      <ToastAlert
        appearence={toast.appearence}
        type={toast.type}
        message={toast.message}
        handleClose={handleCloseToast}
      />
    </Box>
  );
};

export default SignUp;
