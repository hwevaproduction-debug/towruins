import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Chip, Grid } from "@mui/material";
import { CheckCircle2, Home, Mail } from "lucide-react";
import { Form, Formik, FormikProps } from "formik";
import * as Yup from "yup";
import { onKeyDown } from "../../utils";
import { useRegisterProviderMutation } from "../../redux/api/providerApiSlice";
import DotLoader from "../../components/Spinner/dotLoader";
import PrimaryInput from "../../components/PrimaryInput/PrimaryInput";
import ToastAlert from "../../components/ToastAlert/ToastAlert";
import { Heading, SubHeading } from "../../components/Heading";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import AppSelect from "../../components/ui/AppSelect";
import HeroSlideshow from "../Home/HeroSlideshow";
import { providerSignUpSchema } from "./components/validationSchema";
import { ZIMBABWE_PROVINCES } from "../../config/zimbabweProvinces";

interface IProviderRegistrationForm {
  userName: string;
  email: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  businessType: string;
  province: string;
  city: string;
  address: string;
  contactPhone: string;
  registrationNumber?: string;
  description?: string;
}

const FALLBACK_HERO_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1920&q=80",
];

const BUSINESS_TYPE_OPTIONS = [
  { label: "Hotel", value: "hotel" },
  { label: "Lodge", value: "lodge" },
  { label: "Bed & Breakfast", value: "bnb" },
  { label: "Guesthouse", value: "guesthouse" },
  { label: "Motel", value: "motel" },
  { label: "Backpackers", value: "backpackers" },
];

const TRUST_SIGNALS = [
  "Verified Properties",
  "Secure Payments",
  "24/7 Support",
];

const initialValues: IProviderRegistrationForm = {
  userName: "",
  email: "",
  password: "",
  confirmPassword: "",
  businessName: "",
  businessType: "",
  province: "",
  city: "",
  address: "",
  contactPhone: "",
  registrationNumber: "",
  description: "",
};

const ProviderSignUp = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState({
    message: "",
    appearence: false,
    type: "",
  });

  const [registerProvider, { isLoading }] = useRegisterProviderMutation();

  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, appearence: false }));
  };

  const handleSubmit = async (data: IProviderRegistrationForm) => {
    try {
      // Transform the data to match the API expected format
      const apiData = {
        username: data.userName,
        email: data.email,
        password: data.password,
        businessName: data.businessName,
        businessType: data.businessType,
        location: {
          province: data.province,
          city: data.city,
        },
        address: data.address,
        contactPhone: data.contactPhone,
        registrationNumber: data.registrationNumber || undefined,
        description: data.description || undefined,
      };

      await registerProvider(apiData).unwrap();
      setSubmitted(true);
    } catch (error: any) {
      setToast({
        message:
          error?.data?.message ||
          error?.message ||
          "Unable to register provider right now.",
        appearence: true,
        type: "error",
      });
    }
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
      <Box sx={{ position: "relative", zIndex: 2, width: "100%" }}>
        <AppContainer>
          <Grid container justifyContent="center">
            <Grid item xs={12}>
              <AppCard
                sx={{
                  maxWidth: 520,
                  mx: "auto",
                  p: { xs: 3, md: 4 },
                  borderRadius: "24px",
                  boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
                }}
              >
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
                {submitted ? (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      py: 2,
                      gap: 1.5,
                    }}
                  >
                    <Mail size={58} color="#1F4D3A" />
                    <Heading sx={{ fontSize: "30px" }}>
                      Registration Submitted
                    </Heading>
                    <SubHeading sx={{ color: "text.secondary", maxWidth: 420 }}>
                      Please verify your email to complete registration. Your account will be reviewed for approval before you can access the provider dashboard.
                    </SubHeading>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1.5,
                        flexWrap: "wrap",
                        justifyContent: "center",
                        mt: 1,
                      }}
                    >
                      <AppButton variant="outlined" onClick={() => navigate("/")}>
                        Back to Home
                      </AppButton>
                      <AppButton onClick={() => navigate("/stays")}>
                        View Stays
                      </AppButton>
                    </Box>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ textAlign: "center" }}>
                      <Home size={34} color="#B8975A" />
                      <Heading sx={{ fontSize: "30px", mt: 1 }}>
                        List Your Property on Town Ruins
                      </Heading>
                      <SubHeading sx={{ color: "text.secondary", mt: 0.75 }}>
                        Join Zimbabwe's most curated property platform. We
                        personally review every listing.
                      </SubHeading>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        flexWrap: "wrap",
                        justifyContent: "center",
                        mt: 2,
                      }}
                    >
                      {TRUST_SIGNALS.map((signal) => (
                        <Chip
                          key={signal}
                          label={signal}
                          size="small"
                          sx={{
                            background: "#F0F7F4",
                            color: "#1F4D3A",
                            fontWeight: 700,
                          }}
                        />
                      ))}
                    </Box>
                    <Box sx={{ width: "100%", mt: 2 }}>
                      <Formik
                        initialValues={initialValues}
                        onSubmit={handleSubmit}
                        validationSchema={providerSignUpSchema}
                      >
                        {(props: FormikProps<IProviderRegistrationForm>) => {
                          const {
                            values,
                            touched,
                            errors,
                            handleBlur,
                            handleChange,
                          } = props;

                          return (
                            <Form onKeyDown={onKeyDown}>
                              <Box sx={{ display: "grid", gap: 1.5 }}>
                                <PrimaryInput
                                  label="Username"
                                  name="userName"
                                  placeholder="Choose a username"
                                  value={values.userName}
                                  helperText={
                                    errors.userName && touched.userName
                                      ? errors.userName
                                      : ""
                                  }
                                  error={Boolean(
                                    errors.userName && touched.userName
                                  )}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                />
                                <PrimaryInput
                                  label="Email"
                                  name="email"
                                  placeholder="you@example.com"
                                  value={values.email}
                                  helperText={
                                    errors.email && touched.email
                                      ? errors.email
                                      : ""
                                  }
                                  error={Boolean(errors.email && touched.email)}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                />
                                <PrimaryInput
                                  label="Password"
                                  name="password"
                                  type="password"
                                  placeholder="••••••••"
                                  value={values.password}
                                  helperText={
                                    errors.password && touched.password
                                      ? errors.password
                                      : ""
                                  }
                                  error={Boolean(
                                    errors.password && touched.password
                                  )}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                />
                                <PrimaryInput
                                  label="Confirm Password"
                                  name="confirmPassword"
                                  type="password"
                                  placeholder="••••••••"
                                  value={values.confirmPassword}
                                  helperText={
                                    errors.confirmPassword &&
                                    touched.confirmPassword
                                      ? errors.confirmPassword
                                      : ""
                                  }
                                  error={Boolean(
                                    errors.confirmPassword &&
                                    touched.confirmPassword
                                  )}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                />
                                <PrimaryInput
                                  label="Business Name"
                                  name="businessName"
                                  placeholder="Your business name"
                                  value={values.businessName}
                                  helperText={
                                    errors.businessName &&
                                    touched.businessName
                                      ? errors.businessName
                                      : ""
                                  }
                                  error={Boolean(
                                    errors.businessName &&
                                    touched.businessName
                                  )}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                />
                                <AppSelect
                                  label="Business Type"
                                  name="businessType"
                                  value={values.businessType}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  options={BUSINESS_TYPE_OPTIONS}
                                />
                                {errors.businessType && touched.businessType ? (
                                  <Box sx={{ color: "#d32f2f", fontSize: "12px" }}>
                                    {errors.businessType}
                                  </Box>
                                ) : null}
                                <AppSelect
                                  label="Province"
                                  name="province"
                                  value={values.province}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  options={ZIMBABWE_PROVINCES}
                                />
                                {errors.province && touched.province ? (
                                  <Box sx={{ color: "#d32f2f", fontSize: "12px" }}>
                                    {errors.province}
                                  </Box>
                                ) : null}
                                <PrimaryInput
                                  label="City"
                                  name="city"
                                  placeholder="City or town"
                                  value={values.city}
                                  helperText={
                                    errors.city && touched.city
                                      ? errors.city
                                      : ""
                                  }
                                  error={Boolean(errors.city && touched.city)}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                />
                                <PrimaryInput
                                  label="Address"
                                  name="address"
                                  placeholder="Street address"
                                  value={values.address}
                                  helperText={
                                    errors.address && touched.address
                                      ? errors.address
                                      : ""
                                  }
                                  error={Boolean(
                                    errors.address && touched.address
                                  )}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                />
                                <PrimaryInput
                                  label="Contact Phone"
                                  name="contactPhone"
                                  placeholder="+263 77 123 4567"
                                  value={values.contactPhone}
                                  helperText={
                                    errors.contactPhone &&
                                    touched.contactPhone
                                      ? errors.contactPhone
                                      : ""
                                  }
                                  error={Boolean(
                                    errors.contactPhone &&
                                    touched.contactPhone
                                  )}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                />
                                <PrimaryInput
                                  label="Registration Number (Optional)"
                                  name="registrationNumber"
                                  placeholder="Business registration number"
                                  value={values.registrationNumber}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                />
                                <PrimaryInput
                                  label="Description (Optional)"
                                  name="description"
                                  placeholder="Tell us about your property"
                                  value={values.description}
                                  helperText={
                                    errors.description &&
                                    touched.description
                                      ? errors.description
                                      : ""
                                  }
                                  error={Boolean(
                                    errors.description &&
                                    touched.description
                                  )}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  multiline
                                  minRows={4}
                                  maxRows={6}
                                />
                              </Box>
                              <AppButton
                                type="submit"
                                fullWidth
                                disabled={isLoading}
                                sx={{ mt: 2 }}
                              >
                                {isLoading ? (
                                  <DotLoader color="#fff" size={12} />
                                ) : (
                                  "Register Provider"
                                )}
                              </AppButton>
                            </Form>
                          );
                        }}
                      </Formik>
                    </Box>
                  </>
                )}
              </AppCard>
            </Grid>
          </Grid>
        </AppContainer>
      </Box>
      <ToastAlert
        appearence={toast.appearence}
        type={toast.type}
        message={toast.message}
        handleClose={handleCloseToast}
      />
    </Box>
  );
};

export default ProviderSignUp;