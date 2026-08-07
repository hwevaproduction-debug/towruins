// React Imports
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
// MUI Imports
import { Box, Typography } from "@mui/material";
import { Bookmark, MessageSquare } from "lucide-react";
// Hook Imports
import useTypedSelector from "../../hooks/useTypedSelector";
// Redux Imports
import {
  useDeleteSavedSearchMutation,
  useGetMySavedSearchesQuery,
} from "../../redux/api/userApiSlice";
import { useGetMyEngagementsQuery } from "../../redux/api/engagementApiSlice";
import { useInitiateTenantPremiumMutation } from "../../redux/api/paymentApiSlice";
import {
  selectedUserName,
  selectedUserPremiumExpiry,
  setUser,
} from "../../redux/auth/authSlice";
// Config Imports
import { isPremiumTenant } from "../../config/monetization";
import { getGreeting } from "../../utils/greeting";
// Component Imports
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import ToastAlert from "../../components/ToastAlert/ToastAlert";
import { Heading, SubHeading } from "../../components/Heading";
import WalletCard from "../../components/wallet/WalletCard";
import TransactionList from "../../components/wallet/TransactionList";
import useTokenNotifications from "../../hooks/useTokenNotifications";
import OnboardingChecklist from "./components/OnboardingChecklist";
import QuickActionsBar from "./components/QuickActionsBar";
import TRTokenOnboarding from "./components/TRTokenOnboarding";
import VerificationStatusCard from "./components/VerificationStatusCard";

const getEngagementStatusBadge = (status: string) => {
  const normalizedStatus = status === "CHARGED" ? "APPROVED" : status;
  const styles =
    normalizedStatus === "APPROVED"
      ? { background: "#D1EAE0", color: "#1F4D3A", label: "Approved" }
      : normalizedStatus === "DECLINED"
      ? { background: "#FEE2E2", color: "#991B1B", label: "Declined" }
      : { background: "#FEF3C7", color: "#92400E", label: "Pending" };

  return (
    <Box
      sx={{
        background: styles.background,
        color: styles.color,
        borderRadius: "999px",
        padding: "5px 10px",
        fontSize: "12px",
        fontWeight: 700,
        display: "inline-block",
      }}
    >
      {styles.label}
    </Box>
  );
};

const TenantDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const premiumExpiry = useTypedSelector(selectedUserPremiumExpiry);
  const userName = useTypedSelector(selectedUserName);
  const authUser = useTypedSelector((state) => state.auth?.user);
  const { toast: tokenToast, handleCloseToast: handleCloseTokenToast } =
    useTokenNotifications();
  const [recentlyViewed, setRecentlyViewed] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [toast, setToast] = useState({
    message: "",
    appearence: false,
    type: "",
  });

  const {
    data: savedSearchesData,
    isLoading: savedSearchesLoading,
    refetch: refetchSavedSearches,
  } =
    useGetMySavedSearchesQuery(undefined);
  const { data: engagementsData, isLoading: engagementsLoading } =
    useGetMyEngagementsQuery(undefined);

  const [deleteSavedSearch, { isLoading: isDeletingSavedSearch }] =
    useDeleteSavedSearchMutation();
  const [initiateTenantPremium, { isLoading: isInitiatingPremium }] =
    useInitiateTenantPremiumMutation();

  const premiumAmountRaw = process.env.REACT_APP_TENANT_PREMIUM_AMOUNT || "10";
  const premiumAmountNumber = Number(premiumAmountRaw);
  const premiumAmountDisplay = Number.isFinite(premiumAmountNumber)
    ? premiumAmountNumber.toFixed(2)
    : "10.00";
  const premiumActive = isPremiumTenant({ premiumExpiry });
  const engagements = engagementsData?.data || [];
  const approvedEngagements = engagements.filter(
    (engagement: any) => engagement.status === "APPROVED" || engagement.status === "CHARGED"
  );
  const pendingEngagements = engagements.filter(
    (engagement: any) => engagement.status === "PENDING"
  );
  const daysRemaining = premiumExpiry
    ? Math.ceil((new Date(premiumExpiry).getTime() - Date.now()) / 86_400_000)
    : null;
  const showRenew =
    premiumActive && daysRemaining !== null && daysRemaining <= 7;
  const formattedPremiumExpiry = premiumExpiry
    ? new Date(premiumExpiry).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

  useEffect(() => {
    const stored = localStorage.getItem("tr_recently_viewed");
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      setRecentlyViewed(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRecentlyViewed([]);
    }
  }, []);

  const handleCloseToast = () => {
    setToast({ ...toast, appearence: false });
  };

  const handleInitiatePremium = async () => {
    try {
      const result: any = await initiateTenantPremium(undefined).unwrap();
      const updatedUser = result?.data?.user;

      if (updatedUser) {
        const nextAuthUser = {
          ...authUser,
          data: {
            ...(authUser?.data || {}),
            user: updatedUser,
          },
        };

        dispatch(setUser(nextAuthUser));
        localStorage.setItem("user", JSON.stringify(nextAuthUser));
      }

      setShowPaymentForm(false);
      setToast({
        message: "Premium activated with TR Tokens.",
        appearence: true,
        type: "success",
      });
    } catch (error) {
      console.error("Initiate Tenant Premium Error", error);
      setToast({
        message:
          (error as any)?.data?.message ||
          (error as any)?.message ||
          "Something went wrong",
        appearence: true,
        type: "error",
      });
    }
  };

  const handleDeleteSavedSearch = async (id: string) => {
    try {
      await deleteSavedSearch(id).unwrap();
      await refetchSavedSearches();
      setToast({
        message: "Saved search deleted successfully",
        appearence: true,
        type: "success",
      });
    } catch (error) {
      console.error("Delete Saved Search Error", error);
      setToast({
        message:
          (error as any)?.data?.message ||
          (error as any)?.message ||
          "Something went wrong",
        appearence: true,
        type: "error",
      });
    }
  };

  return (
    <Box sx={{ background: "background.default", minHeight: "100vh" }}>
      <Box sx={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)", pt: { xs: 8, md: 10 }, pb: { xs: 8, md: 10 }, px: 3, mb: -6 }}>
        <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 50%, rgba(31,77,58,0.3) 0%, transparent 60%)", pointerEvents: "none" }} />
        <Box sx={{ maxWidth: 900, mx: "auto" }}>
          <Box sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, fontWeight: 800, color: "#fff" }}>{getGreeting(userName)}</Box>
          <Box sx={{ color: "rgba(255,255,255,0.7)", fontSize: "1rem", mt: 1 }}>Here's what's happening with your account</Box>
        </Box>
      </Box>
      <AppContainer sx={{ pb: { xs: 4, md: 6 } }}>
        <TRTokenOnboarding />
        <QuickActionsBar role="tenant" />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 340px" }, gap: 3, alignItems: "start" }}>
          <Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2,1fr)", md: "repeat(4,1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          {[
            { label: "Landlords Contacted", value: engagements.length },
            { label: "Approved", value: approvedEngagements.length },
            { label: "Pending", value: pendingEngagements.length },
            { label: "Properties Viewed", value: recentlyViewed.length },
          ].map((stat) => (
            <AppCard
              key={stat.label}
              sx={{
                p: { xs: 2, md: 2.5 },
                textAlign: "center",
                borderLeft: "3px solid #B8975A",
                transition: "box-shadow 0.2s ease",
                "&:hover": { boxShadow: "0 8px 24px rgba(31,77,58,0.15)" },
              }}
            >
              <Box sx={{ color: "primary.main", fontSize: "28px", fontWeight: 800 }}>
                {stat.value}
              </Box>
              <Box sx={{ color: "text.secondary", fontSize: "12px" }}>
                {stat.label}
              </Box>
            </AppCard>
          ))}
        </Box>

        <AppCard
          sx={{
            mt: "20px",
            p: { xs: 2, md: 2.5 },
            ...(premiumActive ? { borderLeft: "4px solid #B8975A" } : {}),
          }}
        >
          <Heading sx={{ fontSize: "20px", mb: 2 }}>Premium Membership</Heading>
          {premiumActive ? (
            <Box sx={{ marginTop: "12px" }}>
              <Box sx={{ display: "inline-block", background: "#D1EAE0", color: "#1F4D3A", borderRadius: "999px", padding: "4px 12px", fontSize: "12px", fontWeight: 700, mb: 1.5 }}>
                Premium Active
              </Box>
              <SubHeading sx={{ color: "text.secondary", marginBottom: "14px" }}>
                Active until: {formattedPremiumExpiry}
              </SubHeading>
              <SubHeading sx={{ color: "text.secondary", marginBottom: "14px" }}>
                {daysRemaining !== null
                  ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`
                  : "Expiry not available"}
              </SubHeading>
              {showRenew ? (
                <AppButton onClick={() => setShowPaymentForm(true)}>
                  Renew Premium
                </AppButton>
              ) : null}
            </Box>
          ) : (
            <Box sx={{ marginTop: "12px" }}>
              <Box sx={{ display: "inline-block", background: "action.selected", color: "text.secondary", borderRadius: "999px", padding: "4px 12px", fontSize: "12px", fontWeight: 700, mb: 1.5 }}>
                No Premium
              </Box>
              <SubHeading sx={{ color: "text.secondary", marginBottom: "14px" }}>
                Upgrade to Premium for early access to new listings.
              </SubHeading>
              {!showPaymentForm ? (
                <AppButton onClick={() => setShowPaymentForm(true)}>
                  Upgrade to Premium
                </AppButton>
              ) : null}
            </Box>
          )}
          {showPaymentForm ? (
            <Box sx={{ marginTop: "12px" }}>
              <SubHeading sx={{ color: "text.secondary", marginBottom: "10px" }}>
                Premium cost: {premiumAmountDisplay} TR
              </SubHeading>
              <SubHeading sx={{ color: "text.secondary", marginBottom: "10px" }}>
                Duration: 30-day membership
              </SubHeading>
              <Box sx={{ mt: 1.5, display: "flex", gap: 1 }}>
                <AppButton
                  onClick={handleInitiatePremium}
                  disabled={isInitiatingPremium}
                >
                  Spend TR Tokens
                </AppButton>
                <AppButton
                  variant="outlined"
                  onClick={() => setShowPaymentForm(false)}
                >
                  Cancel
                </AppButton>
              </Box>
            </Box>
          ) : null}
        </AppCard>

        <AppCard sx={{ mt: "20px", p: { xs: 2, md: 2.5 } }}>
          <Heading sx={{ fontSize: "20px", mb: 2 }}>
            Saved Searches
          </Heading>
          {savedSearchesLoading ? (
            <SubHeading sx={{ color: "text.secondary" }}>
              Loading saved searches...
            </SubHeading>
          ) : savedSearchesData?.data?.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Bookmark size={36} color="#B8975A" />
              <Heading sx={{ fontSize: "18px", mt: 1 }}>No saved searches</Heading>
              <SubHeading sx={{ color: "text.secondary" }}>Use the search page to save a search.</SubHeading>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {savedSearchesData?.data?.map((search: any) => (
                <AppCard
                  key={search?._id}
                  elevation="flat"
                  interactive
                  sx={{
                    p: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      {search?.name || "Saved Search"}
                    </Typography>
                    <SubHeading sx={{ color: "text.secondary", fontSize: "13px" }}>
                      Location: {search?.criteria?.location || "Any location"} | Rent:{" "}
                      {search?.criteria?.minRent && search?.criteria?.maxRent
                        ? `${search.criteria.minRent} - ${search.criteria.maxRent}`
                        : search?.criteria?.minRent
                        ? `Min ${search.criteria.minRent}`
                        : search?.criteria?.maxRent
                        ? `Max ${search.criteria.maxRent}`
                        : "Any"}{" "}
                      | Min beds: {search?.criteria?.minBedrooms || "Any"} | Amenities:{" "}
                      {Object.keys(search?.criteria?.amenities || {})
                        .filter((key) => search?.criteria?.amenities?.[key] === true)
                        .join(", ") || "None"}
                    </SubHeading>
                    <SubHeading sx={{ color: "text.secondary", fontSize: "13px" }}>
                      Last notified:{" "}
                      {search?.lastNotifiedAt
                        ? new Date(search.lastNotifiedAt).toLocaleString()
                        : "Never"}
                    </SubHeading>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <AppButton
                      size="small"
                      variant="outlined"
                      onClick={() => navigate("/search")}
                    >
                      View
                    </AppButton>
                    <AppButton
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={isDeletingSavedSearch}
                      onClick={() => handleDeleteSavedSearch(search?._id)}
                    >
                      Delete
                    </AppButton>
                  </Box>
                </AppCard>
              ))}
            </Box>
          )}
        </AppCard>

        <AppCard sx={{ mt: "20px", p: { xs: 2, md: 2.5 } }}>
          <Heading sx={{ fontSize: "20px", mb: 2 }}>
            My Engagement Requests
          </Heading>
          {engagementsLoading ? (
            <SubHeading sx={{ color: "text.secondary" }}>Loading...</SubHeading>
          ) : engagements.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <MessageSquare size={36} color="#B8975A" />
              <Heading sx={{ fontSize: "18px", mt: 1 }}>No engagement requests</Heading>
              <SubHeading sx={{ color: "text.secondary" }}>Browse listings and reach out to landlords.</SubHeading>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {engagements.map((engagement: any) => (
                <AppCard
                  key={engagement.id}
                  elevation="flat"
                  interactive
                  sx={{
                    p: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1,
                  }}
                  onClick={() => navigate(`/listing/${engagement.listing?.id}`)}
                >
                  <Box>
                    <Box sx={{ fontWeight: 700, cursor: "pointer" }}>
                      {engagement.listing?.name || "Listing"}
                    </Box>
                    <Box sx={{ fontSize: "12px", color: "text.secondary" }}>
                      Sent {new Date(engagement.createdAt).toLocaleString()}
                    </Box>
                  </Box>
                  {getEngagementStatusBadge(engagement.status)}
                </AppCard>
              ))}
            </Box>
          )}
        </AppCard>

        {approvedEngagements.length > 0 ? (
          <AppCard sx={{ mt: "20px", p: { xs: 2, md: 2.5 } }}>
            <Heading sx={{ fontSize: "20px", mb: 2 }}>Approved Contacts</Heading>
            {approvedEngagements.map((engagement: any) => (
              <AppCard
                key={engagement.id}
                elevation="flat"
                sx={{
                  borderLeft: "3px solid #1F4D3A",
                  p: "14px 16px",
                  mb: 1,
                }}
              >
                <Box sx={{ fontWeight: 700 }}>
                  {engagement.listing?.name || "Listing"}
                </Box>
                <Box sx={{ fontSize: "13px", color: "#1F4D3A", mt: 0.5 }}>
                  Address: {engagement.listing?.address || "Unavailable"}
                </Box>
                <Box sx={{ fontSize: "13px", color: "text.secondary", mt: 0.5 }}>
                  Phone: {engagement.listing?.phoneNumber || "Unavailable"}
                </Box>
              </AppCard>
            ))}
          </AppCard>
        ) : null}

        {recentlyViewed.length > 0 ? (
          <AppCard sx={{ mt: "20px", p: { xs: 2, md: 2.5 } }}>
            <Heading sx={{ fontSize: "20px", mb: 2 }}>Recently Viewed</Heading>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {recentlyViewed.slice(0, 5).map((item) => (
                <AppButton
                  key={item.id}
                  variant="outlined"
                  size="small"
                  onClick={() => navigate(`/listing/${item.id}`)}
                >
                  {item.name}
                </AppButton>
              ))}
            </Box>
          </AppCard>
        ) : null}
          </Box>
          <Box sx={{ display: "grid", gap: 2 }}>
            <AppCard sx={{ p: { xs: 2, md: 2.5 } }}>
              <WalletCard />
              <Box sx={{ mt: 2 }}>
                <Heading sx={{ fontSize: "20px", mb: 2 }}>Transactions</Heading>
                <TransactionList maxItems={5} />
              </Box>
            </AppCard>
            <VerificationStatusCard />
            <OnboardingChecklist />
          </Box>
        </Box>
      </AppContainer>

      <ToastAlert
        appearence={toast.appearence}
        type={toast.type}
        message={toast.message}
        handleClose={handleCloseToast}
      />
      <ToastAlert
        appearence={tokenToast.appearence}
        type={tokenToast.type}
        message={tokenToast.message}
        handleClose={handleCloseTokenToast}
      />
    </Box>
  );
};

export default TenantDashboard;
