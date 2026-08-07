// React Imports
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
// MUI Imports
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import { ClipboardList, GraduationCap, Pencil, Trash2 } from "lucide-react";
// Hook Imports
import useTypedSelector from "../../hooks/useTypedSelector";
// Redux Imports
import { selectedUserId, selectedUserName } from "../../redux/auth/authSlice";
import { selectTokenBalance, syncWalletFromServer } from "../../redux/wallet/walletSlice";
import {
  useDeleteListingMutation,
  useDeleteListingDraftMutation,
  useGetListingDraftQuery,
  useGetListingQuery,
} from "../../redux/api/listingApiSlice";
import { useGetMyPaymentsQuery } from "../../redux/api/paymentApiSlice";
import {
  useGetIncomingEngagementsQuery,
  useRespondToEngagementMutation,
} from "../../redux/api/engagementApiSlice";
import { useGetWalletBalanceQuery } from "../../redux/api/walletApiSlice";
// Utils Imports
import { convertToFormattedDate } from "../../utils";
// Component Imports
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import { Heading, SubHeading } from "../../components/Heading";
import OverlayLoader from "../../components/Spinner/OverlayLoader";
import DotLoader from "../../components/Spinner/dotLoader";
import ToastAlert from "../../components/ToastAlert/ToastAlert";
import { studentAccommodationBadgeSx } from "../../styles/listingBadges";
import WalletCard from "../../components/wallet/WalletCard";
import TransactionList from "../../components/wallet/TransactionList";
import { getGreeting } from "../../utils/greeting";
import useTokenNotifications from "../../hooks/useTokenNotifications";
import OnboardingChecklist from "./components/OnboardingChecklist";
import QuickActionsBar from "./components/QuickActionsBar";
import TRTokenOnboarding from "./components/TRTokenOnboarding";
import VerificationStatusCard from "./components/VerificationStatusCard";
import ListingRestoreModal from "../../components/listing/ListingRestoreModal";

const getListingStatusBadge = (status: string) => {
  if (status === "pending_payment") {
    return (
      <Box
        sx={{
          background: "#FEF3C7",
          color: "#92400E",
          borderRadius: "999px",
          padding: "6px 12px",
          fontSize: "12px",
          display: "inline-block",
        }}
      >
        Pending Payment
      </Box>
    );
  }

  if (status === "early_access") {
    return (
      <Box
        sx={{
          background: "warning.light",
          color: "warning.main",
          borderRadius: "999px",
          padding: "6px 12px",
          fontSize: "12px",
          display: "inline-block",
        }}
      >
        Early Access
      </Box>
    );
  }

  if (status === "active") {
    return (
      <Box
        sx={{
          background: "#D1EAE0",
          color: "#1F4D3A",
          borderRadius: "999px",
          padding: "6px 12px",
          fontSize: "12px",
          display: "inline-block",
        }}
      >
        Active
      </Box>
    );
  }

  if (status === "expired") {
    return (
      <Box sx={{ background: "#FEE2E2", color: "#991B1B", borderRadius: "999px", padding: "6px 12px", fontSize: "12px", display: "inline-block" }}>
        Expired
      </Box>
    );
  }

  return (
    <Box
      sx={{
        background: "background.default",
        color: "text.disabled",
        borderRadius: "999px",
        padding: "6px 12px",
        fontSize: "12px",
        display: "inline-block",
      }}
    >
      Inactive
    </Box>
  );
};

const getPaymentStatusBadge = (status: string) => {
  if (status === "pending") {
    return (
      <Box
        sx={{
          background: "#FEF3C7",
          color: "#92400E",
          borderRadius: "999px",
          padding: "6px 12px",
          fontSize: "12px",
          display: "inline-block",
        }}
      >
        Pending
      </Box>
    );
  }

  if (status === "success") {
    return (
      <Box
        sx={{
          background: "#D1EAE0",
          color: "#1F4D3A",
          borderRadius: "999px",
          padding: "6px 12px",
          fontSize: "12px",
          display: "inline-block",
        }}
      >
        Success
      </Box>
    );
  }

  return (
    <Box
      sx={{
        background: "#FEE2E2",
        color: "#991B1B",
        borderRadius: "999px",
        padding: "6px 12px",
        fontSize: "12px",
        display: "inline-block",
      }}
    >
      Failed
    </Box>
  );
};

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

const formatDraftTimestamp = (value?: string) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const LandlordDashboard = () => {
  const userId = useTypedSelector(selectedUserId);
  const userName = useTypedSelector(selectedUserName);
  const tokenBalance = useTypedSelector(selectTokenBalance);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toast: tokenToast, handleCloseToast: handleCloseTokenToast } =
    useTokenNotifications();
  const [toast, setToast] = useState({
    message: "",
    appearence: false,
    type: "",
  });
  const [restoreListingId, setRestoreListingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const {
    data: listingsData,
    isLoading: listingsLoading,
    refetch: refetchListings,
  } = useGetListingQuery(userId);
  const [deletingListingId, setDeletingListingId] = useState<string | null>(null);
  const [deleteListing] = useDeleteListingMutation();
  const { data: listingDraft } = useGetListingDraftQuery(undefined, {
    skip: !userId,
  });
  const [deleteListingDraft, { isLoading: isDeletingDraft }] =
    useDeleteListingDraftMutation();
  const listingDraftId = listingDraft?._id || listingDraft?.id;
  const draftSavedAt = formatDraftTimestamp(
    listingDraft?.updatedAt || listingDraft?.data?.savedAt
  );

  const { data: paymentsData, isLoading: paymentsLoading } =
    useGetMyPaymentsQuery(undefined);
  const {
    data: incomingEngagementsData,
    isLoading: incomingEngagementsLoading,
    refetch: refetchIncomingEngagements,
  } = useGetIncomingEngagementsQuery(undefined);
  const [respondToEngagement, { isLoading: isRespondingToEngagement }] =
    useRespondToEngagementMutation();
  const { refetch: refetchWalletBalance } = useGetWalletBalanceQuery(undefined, {
    skip: !userId,
  });

  const listingItems = listingsData?.data || [];
  const activeListingsCount = listingItems.filter((listing: any) => listing?.status === "active").length;
  const expiringSoonCount = listingItems.filter((listing: any) => {
    if (!listing?.expiresAt) return false;
    const expiresAt = new Date(listing.expiresAt).getTime();
    return expiresAt > Date.now() && expiresAt - Date.now() <= 24 * 60 * 60 * 1000;
  }).length;
  const pendingRequestsCount = (incomingEngagementsData?.data || []).filter(
    (engagement: any) => engagement?.status === "PENDING"
  ).length;
  const restoreListing = restoreListingId
    ? listingItems.find((listing: any) => listing?._id === restoreListingId || listing?.id === restoreListingId)
    : null;

  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, appearence: false }));
  };

  const handleDeleteListing = async (listingId?: string) => {
    if (!listingId) return;

    setDeletingListingId(listingId);
    try {
      await deleteListing(listingId).unwrap();
      setDeleteConfirm(null);
      setToast({ message: "Listing deleted", appearence: true, type: "success" });
    } catch (error: any) {
      setToast({
        message: error?.data?.message || error?.message || "Unable to delete listing",
        appearence: true,
        type: "error",
      });
    } finally {
      setDeletingListingId(null);
    }
  };

  const handleRespondToEngagement = async (
    engagement: { id: string; tenant?: { username?: string } },
    action: "approve" | "decline"
  ) => {
    try {
      await respondToEngagement({ id: engagement.id, action }).unwrap();
      await refetchIncomingEngagements();
      if (action === "approve") {
        const refreshedWallet = await refetchWalletBalance();
        const serverBalance = refreshedWallet.data?.data?.tokenBalance;
        if (typeof serverBalance === "number") {
          dispatch(syncWalletFromServer({ tokenBalance: serverBalance }));
        }
      }
      setToast({
        message:
          action === "approve" ? "Engagement approved" : "Engagement declined",
        appearence: true,
        type: "success",
      });
    } catch (error: any) {
      setToast({
        message:
          error?.data?.message || error?.message || "Unable to update request",
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
          <Box sx={{ color: "rgba(255,255,255,0.7)", fontSize: "1rem", mt: 1 }}>Manage your listings and track engagement</Box>
        </Box>
      </Box>
      <AppContainer sx={{ pb: { xs: 4, md: 6 } }}>
        <TRTokenOnboarding />
        <QuickActionsBar role="landlord" />

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
            { label: "Active Listings", value: activeListingsCount },
            { label: "Expiring Soon", value: expiringSoonCount },
            { label: "Token Balance", value: tokenBalance },
            { label: "Pending Requests", value: pendingRequestsCount },
          ].map((item) => (
            <AppCard
              key={item.label}
              sx={{
                borderLeft: "3px solid #B8975A",
                p: { xs: 2, md: 2.5 },
                textAlign: "center",
              }}
            >
              <Box sx={{ fontSize: "12px", color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {item.label}
              </Box>
              <Box sx={{ fontSize: "28px", fontWeight: 800, color: "primary.main", mt: 0.5 }}>
                {item.value}
              </Box>
            </AppCard>
          ))}
        </Box>
        <AppCard sx={{ mb: 6, p: { xs: 2, md: 2.5 }, boxShadow: "0 4px 24px rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.07)", "&:hover": { transform: "translateY(-2px)", transition: "transform 0.2s ease" } }}>
          <Heading sx={{ fontSize: "20px", mb: 2 }}>
            Incoming Engagement Requests
          </Heading>
          {incomingEngagementsLoading ? (
            <SubHeading sx={{ color: "text.secondary" }}>Loading...</SubHeading>
          ) : incomingEngagementsData?.data?.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <ClipboardList size={36} color="#B8975A" />
              <Heading sx={{ fontSize: "18px", mt: 1 }}>No engagement requests</Heading>
              <SubHeading sx={{ color: "text.secondary" }}>New tenant requests will appear here.</SubHeading>
            </Box>
          ) : (
            incomingEngagementsData?.data?.map((engagement: any) => (
              <Box
                key={engagement.id}
                sx={{
                  border: "1.5px solid",
                  borderColor: "divider",
                  borderRadius: "12px",
                  p: "16px",
                  mb: 1.5,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 1.5,
                    flexWrap: "wrap",
                  }}
                >
                  <Box>
                    <Box sx={{ fontWeight: 700 }}>
                      {engagement.tenant?.username || "Tenant"}
                    </Box>
                    <Box sx={{ fontSize: "13px", color: "text.secondary" }}>
                      {engagement.listing?.name || "Listing"}
                    </Box>
                  </Box>
                  {getEngagementStatusBadge(engagement.status)}
                </Box>
                <Box
                  sx={{
                    background: "action.hover",
                    borderRadius: "8px",
                    p: "10px 12px",
                    fontSize: "13px",
                    color: "text.secondary",
                    fontStyle: "italic",
                    maxHeight: 60,
                    overflow: "hidden",
                    my: 1.5,
                  }}
                >
                  {engagement.message}
                </Box>
                <Box sx={{ fontSize: "12px", color: "text.secondary" }}>
                  Sent {new Date(engagement.createdAt).toLocaleString()}
                </Box>
                {engagement.status === "PENDING" ? (
                  <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
                    <AppButton
                      size="small"
                      disabled={isRespondingToEngagement}
                      onClick={() =>
                        handleRespondToEngagement(engagement, "approve")
                      }
                      sx={{
                        background: "#1F4D3A",
                        color: "#fff",
                        "&:hover": { background: "#173B2C" },
                      }}
                    >
                      Approve
                    </AppButton>
                    <AppButton
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={isRespondingToEngagement}
                      onClick={() =>
                        handleRespondToEngagement(engagement, "decline")
                      }
                    >
                      Decline
                    </AppButton>
                  </Box>
                ) : null}
              </Box>
            ))
          )}
        </AppCard>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Heading>My Listings</Heading>
            {listingDraftId ? (
              <Box
                sx={{
                  background: "primary.light",
                  color: "primary.dark",
                  borderRadius: "999px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                Draft
              </Box>
            ) : null}
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {listingDraftId ? (
              <AppButton
                variant="outlined"
                onClick={() => navigate("/create-listing")}
              >
                Resume Draft
              </AppButton>
            ) : null}
            <AppButton onClick={() => navigate("/create-listing")}>
              + Create New Listing
            </AppButton>
          </Box>
        </Box>

        {listingDraftId ? (
          <AppCard
            sx={{
              width: "100%",
              padding: "16px 20px",
              margin: "12px 0 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 2,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <Box>
              <Box sx={{ fontWeight: 700, color: "secondary.main" }}>
                Unsaved listing draft
              </Box>
              {draftSavedAt ? (
                <Box sx={{ color: "text.secondary", fontSize: "14px", mt: 0.5 }}>
                  Last saved {draftSavedAt}
                </Box>
              ) : null}
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <AppButton onClick={() => navigate("/create-listing")}>
                Resume
              </AppButton>
              <AppButton
                variant="outlined"
                color="inherit"
                disabled={isDeletingDraft}
                onClick={() => deleteListingDraft(listingDraftId)}
              >
                Discard
              </AppButton>
            </Box>
          </AppCard>
        ) : null}

        {listingsLoading ? (
          <OverlayLoader />
        ) : listingsData?.data?.length === 0 ? (
          <AppCard
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              padding: "20px",
              margin: "20px 0",
              justifyContent: "center",
              flexDirection: "column",
              gap: 1,
            }}
          >
            No listings yet. Create your first listing.
            <AppButton onClick={() => navigate("/create-listing")}>
              Create Listing
            </AppButton>
          </AppCard>
        ) : (
          <AppCard
            sx={{
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
            }}
          >
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table>
              <TableHead>
                <TableRow sx={{ background: "background.paper" }}>
                  {["Listing", "Location", "Status", "Published", "Actions"].map(
                    (header) => (
                      <TableCell
                        key={header}
                        sx={{
                          fontWeight: 700,
                          fontSize: "12px",
                          color: "text.secondary",
                          textTransform: "uppercase",
                        }}
                      >
                        {header}
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {listingsData?.data?.map((item: any) => (
                  <TableRow
                    key={item?._id}
                    hover
                    sx={{ "&:last-child td": { border: 0 } }}
                  >
                     <TableCell>
                       <Box
                         sx={{
                           fontWeight: 600,
                           color: "secondary.main",
                           cursor: "pointer",
                           "&:hover": {
                             textDecoration: "underline",
                           },
                         }}
                         onClick={() => {
                           navigate(`/listing/${item?._id}`);
                         }}
                       >
                         {item?.name}
                       </Box>
                      {item?.studentAccommodation ? (
                        <Box
                          sx={{
                            ...studentAccommodationBadgeSx,
                            mt: 0.5,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <GraduationCap size={16} />
                          Student Accommodation
                        </Box>
                      ) : null}
                    </TableCell>
                     <TableCell sx={{ color: "text.secondary", fontSize: "14px" }}>
                       {typeof item?.location === "object"
                         ? item?.location?.province || item?.location?.city || "—"
                         : item?.location ?? "—"}
                     </TableCell>
                     <TableCell>{getListingStatusBadge(item?.status)}</TableCell>
                     <TableCell sx={{ color: "text.secondary", fontSize: "14px" }}>
                       {item?.publishedAt
                         ? convertToFormattedDate(item?.publishedAt)
                         : "—"}
                     </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                      {item?.status === "expired" ? (
                        <AppButton
                          variant="contained"
                          size="small"
                          sx={{ background: "#B8975A", "&:hover": { background: "#9E7E45" } }}
                          onClick={() => setRestoreListingId(item?._id || item?.id)}
                        >
                          Restore
                        </AppButton>
                      ) : item?.status === "pending_payment" ? (
                        <AppButton
                          variant="contained"
                          onClick={() => navigate(`/listings/${item?._id}/pay`)}
                        >
                          Activate with TR Tokens
                        </AppButton>
                      ) : item?.status === "inactive" ? (
                        <AppButton
                          variant="contained"
                          sx={{
                            background: "#6b7280",
                            "&:hover": { background: "#4b5563" },
                          }}
                          onClick={() => navigate(`/listings/${item?._id}/pay`)}
                        >
                          Revive (Restore with TR Tokens)
                        </AppButton>
                      ) : (
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/listings/${item?._id}`)}
                              sx={{
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: "8px",
                              }}
                            >
                              <Pencil size={18} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => setDeleteConfirm({ id: item?._id || item?.id, name: item?.name || "listing" })}
                          disabled={deletingListingId === (item?._id || item?.id)}
                          sx={{
                            border: "1px solid",
                            borderColor: "error.light",
                            borderRadius: "8px",
                            color: "error.main",
                            "&:hover": { background: "rgba(220,38,38,0.08)" },
                          }}
                        >
                          {deletingListingId === (item?._id || item?.id) ? (
                            <DotLoader color="#dc2626" size={10} />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </IconButton>
                      </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </TableContainer>
          </AppCard>
        )}

        <Heading sx={{ mt: { xs: 4, md: 5 }, mb: "16px" }}>
          Payment History
        </Heading>

        {paymentsLoading ? (
          <Box>Loading...</Box>
        ) : paymentsData?.data?.length === 0 ? (
          <AppCard sx={{ width: "100%", padding: "16px 20px", margin: "12px 0" }}>
            No payment history yet.
          </AppCard>
        ) : (
          <AppCard
            sx={{
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
            }}
          >
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table>
              <TableHead>
                <TableRow sx={{ background: "background.paper" }}>
                  {["Date", "Listing", "Amount", "Status"].map((header) => (
                    <TableCell
                      key={header}
                      sx={{
                        fontWeight: 700,
                        fontSize: "12px",
                        color: "text.secondary",
                        textTransform: "uppercase",
                      }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paymentsData?.data?.map((payment: any) => (
                  <TableRow
                    key={payment?._id}
                    hover
                    sx={{ "&:last-child td": { border: 0 } }}
                  >
                     <TableCell sx={{ color: "text.secondary", fontSize: "14px" }}>
                       {convertToFormattedDate(payment?.createdAt)}
                     </TableCell>
                     <TableCell sx={{ fontWeight: 500, fontSize: "14px" }}>
                       {payment?.listing?.name ?? "—"}
                     </TableCell>
                     <TableCell sx={{ fontWeight: 600, fontSize: "14px" }}>
                       USD {payment?.amount}
                     </TableCell>
                    <TableCell>{getPaymentStatusBadge(payment?.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </TableContainer>
          </AppCard>
        )}
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
      <ListingRestoreModal
        open={Boolean(restoreListingId)}
        listingId={restoreListingId}
        listingName={restoreListing?.name || ""}
        onClose={() => setRestoreListingId(null)}
        onSuccess={async () => {
          refetchListings();
          const refreshedWallet = await refetchWalletBalance();
          const serverBalance = refreshedWallet.data?.data?.tokenBalance;
          if (typeof serverBalance === "number") {
            dispatch(syncWalletFromServer({ tokenBalance: serverBalance }));
          }
        }}
      />
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Listing</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Permanently delete "{deleteConfirm?.name}"? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <AppButton variant="outlined" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </AppButton>
          <AppButton
            color="error"
            disabled={Boolean(deletingListingId)}
            onClick={() => handleDeleteListing(deleteConfirm?.id)}
          >
            Delete
          </AppButton>
        </DialogActions>
      </Dialog>
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

export default LandlordDashboard;
