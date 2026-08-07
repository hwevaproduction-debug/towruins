import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { useDispatch } from "react-redux";
import Home from "./views/Home";
import NotFound from "./views/NotFound";
import Login from "./views/Login";
import SignUp from "./views/SignUp";
import ForgotPassword from "./views/ForgotPassword";
import ResetPassword from "./views/ResetPassword";
import Profile from "./views/Profile";
import About from "./views/About";
import Header from "./components/Header";
import PublicRoutes from "./routes/PublicRoutes";
import ProtectedRoutes from "./routes/ProtectedRoutes";
import CreateListing from "./views/Listing";
import ViewListing from "./views/Listing/components/viewListing";
import SearchPage from "./views/Search";
import SavedSearches from "./views/SavedSearches";
import Notifications from "./views/Notifications";
import LandlordDashboard from "./views/Dashboard/Landlord";
import ProviderDashboardShell from "./views/Dashboard/provider/ProviderDashboardShell";
import TenantDashboard from "./views/Dashboard/Tenant";
import ListingPayment from "./views/Dashboard/Payment";
import AdminDashboard from "./views/Dashboard/Admin";
import VerifyEmail from "./views/VerifyEmail";
import VerifyPhone from "./views/VerifyPhone";
import Onboarding from "./views/Onboarding";
import Stays from "./views/Stays";
import StayRoomDetail from "./views/Stays/RoomDetail";
import BookingConfirmation from "./views/Stays/BookingConfirmation";
import MyStayBookings from "./views/Stays/MyBookings";
import ProviderSignUp from "./views/ProviderSignUp";
import TermsOfUse from "./views/Legal/TermsOfUse";
import PrivacyPolicy from "./views/Legal/PrivacyPolicy";
import LandlordTerms from "./views/Legal/LandlordTerms";
import RefundPolicy from "./views/Legal/RefundPolicy";
import CommunityGuidelines from "./views/Legal/CommunityGuidelines";
import TrustSafety from "./views/Legal/TrustSafety";
import DocsHub from "./views/Docs";
import ReleaseNotes from "./views/Docs/ReleaseNotes";
import TRTokens from "./views/Docs/TRTokens";
import TenantGuide from "./views/Docs/TenantGuide";
import LandlordGuide from "./views/Docs/LandlordGuide";
import ProviderGuide from "./views/Docs/ProviderGuide";
import Roadmap from "./views/Docs/Roadmap";
import Footer from "./components/Footer";
import { createAppTheme } from "./theme";
import { FEATURE_FLAGS } from "./config/featureFlags";
import FloatingNotificationBubble from "./components/notifications/FloatingNotificationBubble";
import useTypedSelector from "./hooks/useTypedSelector";
import { selectedUserToken } from "./redux/auth/authSlice";
import {
  useGetWalletBalanceQuery,
  useGetWalletTransactionsQuery,
} from "./redux/api/walletApiSlice";
import { syncWalletFromServer } from "./redux/wallet/walletSlice";

export const ColorModeContext = React.createContext({ toggleColorMode: () => {} });

const AUTH_FOOTER_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/provider-signup",
  "/verify-email",
  "/verify-phone",
  "/onboarding",
];

const AppFooter = () => {
  const location = useLocation();
  if (AUTH_FOOTER_PATHS.some((path) => location.pathname.startsWith(path))) {
    return null;
  }
  return <Footer />;
};

const AuthenticatedBubble = () => {
  const token = useTypedSelector(selectedUserToken);
  if (!token) return null;
  return <FloatingNotificationBubble />;
};

const getInitialColorMode = (): "light" | "dark" => {
  const storedMode = localStorage.getItem("colorMode");

  return storedMode === "dark" ? "dark" : "light";
};

function App() {
  const [mode, setMode] = useState<"light" | "dark">(getInitialColorMode);
  const dispatch = useDispatch();
  const token = useTypedSelector(selectedUserToken);
  const { data: walletBalanceData } = useGetWalletBalanceQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  });
  const { data: walletTransactionsData } = useGetWalletTransactionsQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  });
  const colorModeValue = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prev) => {
          const next = prev === "light" ? "dark" : "light";
          localStorage.setItem("colorMode", next);
          return next;
        });
      },
    }),
    []
  );
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-color-scheme", mode);
  }, [mode]);

  useEffect(() => {
    if (!token) return;

    const serverBalance = walletBalanceData?.data?.tokenBalance;
    if (typeof serverBalance === "number") {
      const serverTransactions = walletTransactionsData?.data?.transactions?.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        label: transaction.label,
        timestamp: transaction.createdAt,
        reason: transaction.reason,
        balanceAfter: transaction.balanceAfter,
      }));

      dispatch(
        syncWalletFromServer({
          tokenBalance: serverBalance,
          transactions: serverTransactions,
        })
      );
    }
  }, [dispatch, token, walletBalanceData, walletTransactionsData]);

  return (
    <ColorModeContext.Provider value={colorModeValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Header />
          <AuthenticatedBubble />
          <Routes>
            <Route
              path="/signup"
              element={
                <PublicRoutes>
                  <SignUp />
                </PublicRoutes>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoutes>
                  <Login />
                </PublicRoutes>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoutes>
                  <ForgotPassword />
                </PublicRoutes>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicRoutes>
                  <ResetPassword />
                </PublicRoutes>
              }
            />
            <Route
              path="/provider-signup"
              element={<ProviderSignUp />}
            />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/verify-phone" element={<VerifyPhone />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/landlord-terms" element={<LandlordTerms />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/community-guidelines" element={<CommunityGuidelines />} />
            <Route path="/trust-safety" element={<TrustSafety />} />
            <Route path="/docs" element={<DocsHub />} />
            <Route path="/docs/release-notes" element={<ReleaseNotes />} />
            <Route path="/docs/tr-tokens" element={<TRTokens />} />
            <Route path="/docs/tenant-guide" element={<TenantGuide />} />
            <Route path="/docs/landlord-guide" element={<LandlordGuide />} />
            <Route
              path="/docs/roadmap"
              element={FEATURE_FLAGS.PUBLIC_ROADMAP ? <Roadmap /> : <Navigate to="/docs" replace />}
            />
            <Route path="/docs/provider-guide" element={<ProviderGuide />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/stays" element={<Stays />} />
            <Route path="/stays/rooms/:roomId" element={<StayRoomDetail />} />
            <Route path="/listing/:id" element={<ViewListing />} />
            {/* Protected Routes */}
            <Route
              path="/saved-searches"
              element={
                <ProtectedRoutes>
                  <SavedSearches />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoutes>
                  <Profile />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoutes>
                  <Notifications />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/stays/bookings/:id"
              element={
                <ProtectedRoutes>
                  <BookingConfirmation />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/stays/bookings"
              element={
                <ProtectedRoutes>
                  <MyStayBookings />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/dashboard/landlord"
              element={
                <ProtectedRoutes allowedRoles={["landlord"]}>
                  <LandlordDashboard />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/dashboard/provider"
              element={
                <ProtectedRoutes allowedRoles={["provider"]}>
                  <ProviderDashboardShell />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/dashboard/tenant"
              element={
                <ProtectedRoutes allowedRoles={["tenant"]}>
                  <TenantDashboard />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoutes allowedRoles={["admin", "super_admin"]}>
                  <AdminDashboard />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/create-listing"
              element={
                <ProtectedRoutes allowedRoles={["landlord"]}>
                  <CreateListing />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/listings/:id/pay"
              element={
                <ProtectedRoutes allowedRoles={["landlord"]}>
                  <ListingPayment />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/listings"
              element={
                <ProtectedRoutes allowedRoles={["landlord"]}>
                  <Navigate to="/dashboard/landlord" replace />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/listings/:id"
              element={
                <ProtectedRoutes allowedRoles={["landlord"]}>
                  <CreateListing />
                </ProtectedRoutes>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AppFooter />
        </Router>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
