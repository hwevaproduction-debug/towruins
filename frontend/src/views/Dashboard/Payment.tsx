// React Imports
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
// MUI Imports
import { Box, Typography } from "@mui/material";
// Redux Imports
import { useGetSingleListingQuery } from "../../redux/api/listingApiSlice";
import { useInitiateListingFeeMutation } from "../../redux/api/paymentApiSlice";
import { selectedUserId } from "../../redux/auth/authSlice";
// Hook Imports
import useTypedSelector from "../../hooks/useTypedSelector";
// Component Imports
import { Heading, SubHeading } from "../../components/Heading";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import DotLoader from "../../components/Spinner/dotLoader";
import OverlayLoader from "../../components/Spinner/OverlayLoader";
import ToastAlert from "../../components/ToastAlert/ToastAlert";
// React Icons
import { FaCheckCircle } from "react-icons/fa";

const Payment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const userId = useTypedSelector(selectedUserId);

  const [uiState, setUiState] = useState<"idle" | "submitting" | "success">("idle");
  const [toast, setToast] = useState({
    message: "",
    appearence: false,
    type: "",
  });

  const { data, isLoading, refetch } = useGetSingleListingQuery(id as string, {
    skip: !id,
    refetchOnMountOrArgChange: true,
  });
  const [initiateListingFee, { isLoading: isInitiating }] =
    useInitiateListingFeeMutation();

  const listing = data?.data;
  const tokenCost = Number(process.env.REACT_APP_LISTING_FEE_AMOUNT || "5");
  const tokenCostDisplay = Number.isFinite(tokenCost) ? tokenCost.toFixed(0) : "5";
  const isOwner = listing?.user === userId || listing?.user?._id === userId;
  const canActivate = ["pending_payment", "inactive"].includes(listing?.status);

  useEffect(() => {
    if (uiState !== "success") {
      return;
    }

    const timer = window.setTimeout(() => {
      navigate("/dashboard/landlord");
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [uiState, navigate]);

  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, appearence: false }));
  };

  const handleSubmit = async () => {
    try {
      await initiateListingFee({
        listingId: id,
        earlyAccess: false,
      }).unwrap();

      setToast({
        message: "Listing activated with TR Tokens.",
        appearence: true,
        type: "success",
      });

      await refetch();
      setUiState("success");
    } catch (error: any) {
      setToast({
        message:
          error?.data?.message ||
          error?.message ||
          "Something went wrong",
        appearence: true,
        type: "error",
      });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ marginTop: "50px" }}>
        <OverlayLoader />
      </Box>
    );
  }

  if (!listing) {
    return (
      <Box sx={{ marginTop: "50px" }}>
        <AppContainer>
          <AppCard sx={{ p: { xs: 2, md: 3 }, maxWidth: 500, mx: "auto" }}>
            <Typography sx={{ marginBottom: "16px" }}>
              Listing not found.
            </Typography>
            <AppButton onClick={() => navigate("/dashboard/landlord")}>
              Back to Dashboard
            </AppButton>
          </AppCard>
        </AppContainer>
        <ToastAlert
          appearence={toast.appearence}
          type={toast.type}
          message={toast.message}
          handleClose={handleCloseToast}
        />
      </Box>
    );
  }

  if (!isOwner) {
    return (
      <Box sx={{ marginTop: "50px" }}>
        <AppContainer>
          <AppCard sx={{ p: { xs: 2, md: 3 }, maxWidth: 500, mx: "auto" }}>
            <Typography sx={{ marginBottom: "16px" }}>
              You do not have permission to activate this listing.
            </Typography>
            <AppButton onClick={() => navigate("/dashboard/landlord")}>
              Back to Dashboard
            </AppButton>
          </AppCard>
        </AppContainer>
        <ToastAlert
          appearence={toast.appearence}
          type={toast.type}
          message={toast.message}
          handleClose={handleCloseToast}
        />
      </Box>
    );
  }

  if (uiState === "idle" && !canActivate) {
    return (
      <Box sx={{ marginTop: "50px" }}>
        <AppContainer>
          <AppCard sx={{ p: { xs: 2, md: 3 }, maxWidth: 500, mx: "auto" }}>
            <Typography sx={{ marginBottom: "16px" }}>
              This listing is already active.
            </Typography>
            <AppButton onClick={() => navigate("/dashboard/landlord")}>
              Back to Dashboard
            </AppButton>
          </AppCard>
        </AppContainer>
        <ToastAlert
          appearence={toast.appearence}
          type={toast.type}
          message={toast.message}
          handleClose={handleCloseToast}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ marginTop: "50px" }}>
      <AppContainer>
        {uiState === "idle" ? (
          <AppCard
            sx={{
              marginTop: "30px",
              p: { xs: 2, md: 3 },
              maxWidth: 500,
              mx: "auto",
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                background:
                  listing?.status === "inactive" ? "#f1f5f9" : "#fef3c7",
                color: listing?.status === "inactive" ? "#64748b" : "#92400e",
                borderRadius: "999px",
                padding: "4px 12px",
                fontSize: "12px",
                fontWeight: 600,
                marginBottom: "16px",
              }}
            >
              {listing?.status === "inactive"
                ? "Inactive - Restore Listing"
                : "Pending Activation"}
            </Box>
            <Heading sx={{ marginBottom: "8px" }}>
              {listing?.status === "inactive"
                ? "Restore Your Listing"
                : "Activate Your Listing"}
            </Heading>
            <SubHeading sx={{ marginBottom: "16px" }}>
              {listing?.status === "inactive"
                ? "Spend TR Tokens to restore this listing."
                : "Spend TR Tokens to publish this listing."}
            </SubHeading>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <Box>Listing</Box>
              <Box sx={{ fontWeight: 600 }}>{listing.name}</Box>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <Box>Token Cost</Box>
              <Box sx={{ fontWeight: 600 }}>{tokenCostDisplay} TR</Box>
            </Box>
            <AppButton
              fullWidth
              onClick={handleSubmit}
              disabled={isInitiating}
            >
              {isInitiating ? <DotLoader color="#fff" size={10} /> : "Spend TR Tokens"}
            </AppButton>
          </AppCard>
        ) : null}

        {uiState === "success" ? (
          <AppCard
            sx={{
              marginTop: "30px",
              p: { xs: 2, md: 3 },
              maxWidth: 500,
              mx: "auto",
              textAlign: "center",
            }}
          >
            <FaCheckCircle size={64} color="#16a34a" />
            <Typography variant="h6" sx={{ marginTop: "16px" }}>
              ✓ Listing activated with TR Tokens.
            </Typography>
            <AppButton
              onClick={() => navigate("/dashboard/landlord")}
              sx={{ marginTop: "16px" }}
            >
              Go to Dashboard
            </AppButton>
            <Typography
              variant="body2"
              color="text.disabled"
              sx={{ marginTop: "12px" }}
            >
              Redirecting to dashboard in 2.5 seconds...
            </Typography>
          </AppCard>
        ) : null}
      </AppContainer>
      <ToastAlert
        appearence={toast.appearence}
        type={toast.type}
        message={toast.message}
        handleClose={handleCloseToast}
      />
    </Box>
  );
};

export default Payment;
