// React Imports
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
// Formik Imports
import { Form, Formik, FormikProps } from "formik";
import * as Yup from "yup";
// Component Imports
import { SubHeading } from "../../components/Heading";
import PrimaryInput from "../../components/PrimaryInput/PrimaryInput";
import ToastAlert from "../../components/ToastAlert/ToastAlert";
import DotLoader from "../../components/Spinner/dotLoader";
// Utils Imports
import { onKeyDown } from "../../utils";
import { getGreeting, getFirstName } from "../../utils/greeting";
// Hooks Imports
import useTypedSelector from "../../hooks/useTypedSelector";
import { AlertTriangle, Camera, CheckCircle, Eye, EyeOff, Trash2, Upload } from "lucide-react";
// Redux Imports
import {
  useDeleteMutation,
  useSubmitVerificationMutation,
  useUpdateMutation,
} from "../../redux/api/userApiSlice";
import {
  useGetR2SignedUrlMutation,
  type R2SignedUrlData,
} from "../../redux/api/uploadApiSlice";
import {
  selectedUserAvatar,
  selectedUserName,
  selectedUserEmail,
  selectedUserRole,
  setUser,
  selectedUserId,
  selectedUserToken,
  selectedIsEmailVerified,
} from "../../redux/auth/authSlice";
import { useResendVerificationMutation } from "../../redux/api/authApiSlice";
// MUI Imports
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Tooltip,
  Avatar,
} from "@mui/material";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import WalletCard from "../../components/wallet/WalletCard";

interface ISProfileForm {
  userName: string;
  email: string;
  password: string;
}

const passwordMessage =
  "Password should contain minimum 8 characters, with a mix of uppercase letter, number, and symbol.";

const profileSchema = Yup.object().shape({
  userName: Yup.string().required("Username is required").nullable(),
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required")
    .nullable(),
  password: Yup.string()
    .required(passwordMessage)
    .min(8, passwordMessage)
    .matches(/[@$!%*?&]/, passwordMessage)
    .matches(/\d/, passwordMessage)
    .matches(/[A-Z]/, passwordMessage),
});

const getInitials = (name?: string) => {
  if (!name) {
    return "U";
  }

  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
};

// Firebase Storage
// allow read;
// allow write: if
// request.resource.size < 2 * 1024 * 1024 &&
// request.resource.contentType.matches('image/.*')

const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const fileRef = useRef<HTMLInputElement | null | any>(null);

  const userName = useTypedSelector(selectedUserName);
  const userEmail = useTypedSelector(selectedUserEmail);
  const userAvatar = useTypedSelector(selectedUserAvatar);
  const userId = useTypedSelector(selectedUserId);
  const token = useTypedSelector(selectedUserToken);
  const userRole = useTypedSelector(selectedUserRole);
  const isEmailVerified = useTypedSelector(selectedIsEmailVerified);
  const authUser = useTypedSelector((state) => state.auth?.user);
  const [getR2SignedUrl] = useGetR2SignedUrlMutation();
  const [submitVerification] = useSubmitVerificationMutation();
  const [resendVerification, { isLoading: isResendingVerification }] =
    useResendVerificationMutation();
  const firstName = getFirstName(userName);

  // states
  const [file, setFile] = useState<File | null>(null);
  const [fileUploadError, setFileUploadError] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [filePercentage, setFilePercentage] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [formValues, setFormValues] = useState<ISProfileForm>({
    userName,
    email: userEmail,
    password: "",
  });
  const [toast, setToast] = useState({
    message: "",
    appearence: false,
    type: "",
  });
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(
    authUser?.data?.user?.verificationStatus || "UNVERIFIED"
  );

  const openDialogSafely = (setter: (open: boolean) => void) => {
    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur();
    setter(true);
  };

  useEffect(() => {
    setVerificationStatus(
      authUser?.data?.user?.verificationStatus || "UNVERIFIED"
    );
  }, [authUser?.data?.user?.verificationStatus]);

  useEffect(() => {
    if (file) {
      handleFileUpload(file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const handleFileUpload = async (file: File) => {
    if (!token) {
      setToast({
        ...toast,
        message: "Session expired. Please log in again.",
        appearence: true,
        type: "error",
      });
      navigate("/login");
      return;
    }

    let result: R2SignedUrlData;

    try {
      result = await getR2SignedUrl({
        contentType: file.type,
        folder: "avatars",
      }).unwrap();
    } catch (error: any) {
      console.error(error);

      if (error?.status === 401 || error?.originalStatus === 401) {
        setToast({
          ...toast,
          message: "Session expired. Please log in again.",
          appearence: true,
          type: "error",
        });
        navigate("/login");
        setFileUploadError(true);
        return;
      }

      setFileUploadError(true);
      return;
    }

    try {
      const { uploadUrl, publicUrl } = result;

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!putRes.ok) throw new Error("R2 upload failed");

      setFormData({ ...formData, avatar: publicUrl });
      setFile(null);
      setFilePercentage(100);
    } catch (e) {
      console.error(e);
      setFileUploadError(true);
    }
  };

  const uploadVerificationFile = async (file: File) => {
    const result = await getR2SignedUrl({
      contentType: file.type,
      folder: "verification",
    }).unwrap();

    const putRes = await fetch(result.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!putRes.ok) throw new Error("R2 upload failed");

    return result.publicUrl;
  };

  const persistVerificationStatus = (status: string) => {
    if (!authUser?.data?.user) return;

    const nextAuthUser = {
      ...authUser,
      data: {
        ...authUser.data,
        user: {
          ...authUser.data.user,
          verificationStatus: status,
        },
      },
    };

    dispatch(setUser(nextAuthUser));
    localStorage.setItem("user", JSON.stringify(nextAuthUser));
  };

  const handleSubmitVerification = async () => {
    if (!idFile || !selfieFile) {
      setToast({
        ...toast,
        message: "Please upload both an ID image and a selfie.",
        appearence: true,
        type: "error",
      });
      return;
    }

    setVerificationLoading(true);
    try {
      const [idImageUrl, selfieUrl] = await Promise.all([
        uploadVerificationFile(idFile),
        uploadVerificationFile(selfieFile),
      ]);
      await submitVerification({ idImageUrl, selfieUrl }).unwrap();
      setVerificationStatus("PENDING_REVIEW");
      persistVerificationStatus("PENDING_REVIEW");
      setVerificationOpen(false);
      setIdFile(null);
      setSelfieFile(null);
      setToast({
        ...toast,
        message: "Verification submitted",
        appearence: true,
        type: "success",
      });
    } catch (error: any) {
      setToast({
        ...toast,
        message:
          error?.data?.message ||
          error?.message ||
          "Unable to submit verification.",
        appearence: true,
        type: "error",
      });
    } finally {
      setVerificationLoading(false);
    }
  };

  const hideShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleCloseToast = () => {
    setToast({ ...toast, appearence: false });
  };

  const handleResendVerification = async () => {
    try {
      await resendVerification({ email: userEmail }).unwrap();
      setToast({
        ...toast,
        message: "Verification email sent.",
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

  // Update Profile API bind
  const [updateProfile, { isLoading }] = useUpdateMutation();

  const ProfileHandler = async (data: ISProfileForm) => {
    const payload = {
      username: data.userName,
      email: data.email,
      password: data.password,
      avatar: formData.avatar || userAvatar,
    };

    try {
      const user: any = await updateProfile({
        id: userId,
        payload,
      });
      if (user?.data?.status) {
        setToast({
          ...toast,
          message: "User Updated Successfully",
          appearence: true,
          type: "success",
        });
        dispatch(setUser(user?.data));
        localStorage.setItem("user", JSON.stringify(user?.data));
        navigate("/");
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
      console.error("Profile Upload Error:", error);
      setToast({
        ...toast,
        message: "Something went wrong",
        appearence: true,
        type: "error",
      });
    }
  };

  // Delete Account API bind
  const [deleteAccount, { isLoading: deleteLoading }] = useDeleteMutation();

  const deleteHandler = async () => {
    try {
      const user: any = await deleteAccount(userId);
      if (user?.data === null) {
        setToast({
          ...toast,
          message: "Account Deleted Successfully",
          appearence: true,
          type: "success",
        });
        dispatch(setUser(null));
        localStorage.removeItem("user");
        navigate("/login");
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
      console.error("Delete Account Error:", error);
      setToast({
        ...toast,
        message: "Something went wrong",
        appearence: true,
        type: "error",
      });
    }
  };

  return (
    <Box sx={{ minHeight: "calc(100vh - 72px)", background: "background.default" }}>
      <Box
        sx={{
          background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)",
          pt: { xs: 8, md: 10 },
          pb: { xs: 8, md: 10 },
          px: 3,
          textAlign: "center",
          mb: -6,
        }}
      >
        <Box
          sx={{
            fontSize: { xs: "1.5rem", md: "2rem" },
            fontWeight: 800,
            color: "#fff",
          }}
        >
          {getGreeting(userName)}
        </Box>
        <Box sx={{ color: "rgba(255,255,255,0.7)", fontSize: "1rem", mt: 1 }}>
          Manage your account details and preferences
        </Box>
      </Box>
      <AppContainer sx={{ pb: { xs: 4, md: 6 } }}>
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} md={7} lg={6}>
            <AppCard sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: "24px" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexDirection: "column",
                }}
              >
                <Tooltip title="Upload Image" placement="right">
                  <Box sx={{ marginTop: "30px", cursor: "pointer" }}>
                    <input
                      onChange={(e) => {
                        if (e.target.files) {
                          setFile(e.target.files[0]);
                        }
                      }}
                      hidden
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      name=""
                      id=""
                    />
                    <Box
                      onClick={() => fileRef.current.click()}
                      sx={{
                        position: "relative",
                        width: 95,
                        height: 95,
                        cursor: "pointer",
                        "&:hover .upload-overlay": { opacity: 1 },
                      }}
                    >
                      {formData.avatar || userAvatar ? (
                        <Avatar
                          src={formData.avatar || userAvatar}
                          alt={`${firstName} avatar`}
                          sx={{
                            width: 95,
                            height: 95,
                            border: "3px solid #B8975A",
                          }}
                        />
                      ) : (
                        <Avatar
                          alt={`${firstName} avatar`}
                          sx={{
                            width: 95,
                            height: 95,
                            bgcolor: "#B8975A",
                            fontSize: "2rem",
                          }}
                        >
                          {getInitials(userName)}
                        </Avatar>
                      )}
                      <Box
                        className="upload-overlay"
                        sx={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "50%",
                          background: "rgba(0,0,0,0.45)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: 0,
                          transition: "opacity 0.2s",
                        }}
                      >
                        <Camera size={22} color="#fff" />
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        fontSize: "12px",
                        color: "text.secondary",
                        mt: 1,
                        textAlign: "center",
                      }}
                    >
                      Click to change photo
                    </Box>
                  </Box>
                </Tooltip>
                <Box sx={{ marginTop: "7px" }}>
                  {fileUploadError ? (
                    <Box sx={{ color: "#d32f2f", fontWeight: 400 }}>
                      File Upload Error
                      <span style={{ marginLeft: "3px" }}>
                        (Image be less than 2Mb)
                      </span>
                    </Box>
                  ) : filePercentage > 0 && filePercentage < 100 ? (
                    <Box
                      sx={{ color: "#334155", fontweight: 400 }}
                    >{`Uploading ${filePercentage}%`}</Box>
                  ) : filePercentage === 100 ? (
                    <Box sx={{ color: "#1db45a", fontWeight: 500 }}>
                      Image Successfully Uploaded!
                    </Box>
                  ) : (
                    ""
                  )}
                </Box>
              </Box>

              <Box sx={{ width: "100%", mt: 2 }}>
                <WalletCard compact />
              </Box>

              <Box sx={{ width: "100%", mt: 2 }}>
                {isEmailVerified ? (
                  <Box
                    sx={{
                      color: "#22c55e",
                      background: "rgba(34,197,94,0.1)",
                      border: "1px solid rgba(34,197,94,0.2)",
                      borderRadius: "999px",
                      px: 2,
                      py: 0.5,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    <CheckCircle size={16} />
                    Email Verified
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                    <Box
                      sx={{
                        color: "#f59e0b",
                        background: "rgba(245,158,11,0.1)",
                        border: "1px solid rgba(245,158,11,0.24)",
                        borderRadius: "999px",
                        px: 2,
                        py: 0.5,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      <AlertTriangle size={16} />
                      Email Not Verified
                    </Box>
                    <AppButton
                      size="small"
                      disabled={isResendingVerification}
                      loading={isResendingVerification}
                      onClick={handleResendVerification}
                    >
                      Resend verification email
                    </AppButton>
                  </Box>
                )}
              </Box>

              {userRole === "landlord" ? (
                <Box sx={{ width: "100%", mt: 2 }}>
                  {verificationStatus === "PENDING_REVIEW" ? (
                    <AppCard
                      elevation="flat"
                      sx={{ borderLeft: "4px solid #3B82F6", p: 2 }}
                    >
                      <Box
                        sx={{
                          display: "inline-block",
                          background: "#FEF3C7",
                          color: "#92400E",
                          borderRadius: "999px",
                          padding: "4px 10px",
                          fontSize: "12px",
                          fontWeight: 700,
                          mb: 1,
                        }}
                      >
                        Under Review
                      </Box>
                      <SubHeading sx={{ color: "text.secondary" }}>
                        Your verification is under review. We'll notify you within
                        24-48 hours.
                      </SubHeading>
                    </AppCard>
                  ) : verificationStatus === "VERIFIED" ? (
                    <AppCard
                      elevation="flat"
                      sx={{ borderLeft: "4px solid #1F4D3A", p: 2 }}
                    >
                      <Box
                        sx={{
                          display: "inline-block",
                          background: "#D1EAE0",
                          color: "#1F4D3A",
                          borderRadius: "999px",
                          padding: "4px 10px",
                          fontSize: "12px",
                          fontWeight: 700,
                          mb: 1,
                        }}
                      >
                        Verified
                      </Box>
                      <SubHeading sx={{ color: "text.secondary" }}>
                        Your identity has been verified.
                      </SubHeading>
                    </AppCard>
                  ) : verificationStatus === "REJECTED" ? (
                    <AppCard
                      elevation="flat"
                      sx={{ borderLeft: "4px solid #991B1B", p: 2 }}
                    >
                      <Box
                        sx={{
                          display: "inline-block",
                          background: "#FEE2E2",
                          color: "#991B1B",
                          borderRadius: "999px",
                          padding: "4px 10px",
                          fontSize: "12px",
                          fontWeight: 700,
                          mb: 1,
                        }}
                      >
                        Not Approved
                      </Box>
                      <SubHeading sx={{ color: "text.secondary", mb: 1.5 }}>
                        Your verification was not approved. Please resubmit.
                      </SubHeading>
                      <AppButton onClick={() => openDialogSafely(setVerificationOpen)}>
                        Resubmit
                      </AppButton>
                    </AppCard>
                  ) : (
                    <AppCard
                      elevation="flat"
                      sx={{ borderLeft: "4px solid #B8975A", p: 2 }}
                    >
                      <Box sx={{ fontWeight: 800, color: "text.primary", mb: 0.75 }}>
                        Identity Verification Required
                      </Box>
                      <SubHeading sx={{ color: "text.secondary", mb: 1.5 }}>
                        Upload your government ID and a selfie to verify your
                        identity and list properties.
                      </SubHeading>
                      <AppButton onClick={() => openDialogSafely(setVerificationOpen)}>
                        Start Verification
                      </AppButton>
                    </AppCard>
                  )}
                </Box>
              ) : null}

              <Box sx={{ width: "100%" }}>
                <Formik
                  initialValues={formValues}
                  onSubmit={(values: ISProfileForm) => {
                    ProfileHandler(values);
                  }}
                  validationSchema={profileSchema}
                >
                  {(props: FormikProps<ISProfileForm>) => {
                    const { values, touched, errors, handleBlur, handleChange } =
                      props;

                    return (
                      <Form onKeyDown={onKeyDown}>
                        <Box sx={{ minHeight: "72px", marginTop: "20px" }}>
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
                              errors.userName && touched.userName
                                ? errors.userName
                                : ""
                            }
                            error={
                              errors.userName && touched.userName ? true : false
                            }
                            onChange={handleChange}
                            onBlur={handleBlur}
                          />
                        </Box>
                        <Box sx={{ minHeight: "72px" }}>
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
                              errors.email && touched.email ? errors.email : ""
                            }
                            error={errors.email && touched.email ? true : false}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          />
                        </Box>
                        <Box sx={{ minHeight: "72px" }}>
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
                                <Eye size={18} />
                              ) : (
                                <EyeOff size={18} />
                              )
                            }
                          />
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            marginTop: "16px",
                          }}
                        >
                          <AppButton
                            type="submit"
                            fullWidth
                            disabled={isLoading}
                            sx={{ margin: "0 0 20px 0" }}
                          >
                            {isLoading ? (
                              <DotLoader color="#fff" size={12} />
                            ) : (
                              "Update"
                            )}
                          </AppButton>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <AppButton
                          variant="outlined"
                          color="error"
                          disabled={deleteLoading}
                          startIcon={<Trash2 size={16} />}
                          onClick={() => openDialogSafely(setConfirmDialog)}
                        >
                          Delete Account
                        </AppButton>
                        </Box>
                      </Form>
                    );
                  }}
                </Formik>
              </Box>
            </AppCard>
          </Grid>
        </Grid>
      </AppContainer>
      <ToastAlert
        appearence={toast.appearence}
        type={toast.type}
        message={toast.message}
        handleClose={handleCloseToast}
      />
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Permanently delete your account? All your data will be removed and
            cannot be recovered.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <AppButton variant="outlined" onClick={() => setConfirmDialog(false)}>
            Go Back
          </AppButton>
          <AppButton
            color="error"
            disabled={deleteLoading}
            onClick={() => {
              deleteHandler();
              setConfirmDialog(false);
            }}
          >
            Delete Account
          </AppButton>
        </DialogActions>
      </Dialog>
      <Dialog
        open={verificationOpen}
        onClose={() => setVerificationOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Identity Verification</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Upload a clear government ID image and a selfie for review.
          </DialogContentText>
          <Grid container spacing={2}>
            {[
              {
                label: "Government ID",
                file: idFile,
                onChange: setIdFile,
              },
              {
                label: "Selfie",
                file: selfieFile,
                onChange: setSelfieFile,
              },
            ].map((item) => (
              <Grid item xs={12} sm={6} key={item.label}>
                <Box
                  component="label"
                  sx={{
                    minHeight: 150,
                    border: "1.5px dashed",
                    borderColor: "divider",
                    borderRadius: "14px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    cursor: "pointer",
                    textAlign: "center",
                    p: 2,
                    "&:hover": {
                      borderColor: "#B8975A",
                      background: "#FDF8F0",
                    },
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const selectedFile = event.target.files?.[0] || null;
                      item.onChange(selectedFile);
                    }}
                  />
                  <Upload size={24} color="#B8975A" />
                  <Box sx={{ fontWeight: 700 }}>{item.label}</Box>
                  <Box sx={{ color: "text.secondary", fontSize: "12px" }}>
                    {item.file ? item.file.name : "Choose image"}
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <AppButton
            variant="outlined"
            onClick={() => setVerificationOpen(false)}
          >
            Cancel
          </AppButton>
          <AppButton
            disabled={verificationLoading}
            loading={verificationLoading}
            onClick={handleSubmitVerification}
          >
            Submit Verification
          </AppButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;
