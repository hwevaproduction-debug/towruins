import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ArchiveIcon from "@mui/icons-material/Archive";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import AppInput from "../../components/ui/AppInput";
import AppSelect from "../../components/ui/AppSelect";
import MUITable from "../../components/MUITable";
import BulkImportDialog from "./components/BulkImportDialog";
import { Heading, SubHeading } from "../../components/Heading";
import TemporaryStays from "./TemporaryStays";
import ToastAlert from "../../components/ToastAlert/ToastAlert";
import {
  AdminBooking,
  BulkReviveFailure,
  LegalDocument,
  ProviderRecord,
  useArchiveLegalDocMutation,
  useBulkReviveListingsMutation,
  useCreateLegalDocMutation,
  useGetAllBookingsQuery,
  useGetLegalDocsQuery,
  useGetProvidersQuery,
  useDeleteAdminListingMutation,
  useDeleteListingsByOwnerMutation,
  useLazyGetAdminListingsQuery,
  usePurgeSeededListingsMutation,
  useSettleBookingMutation,
  useUpdateLegalDocMutation,
  useUpdateCommissionRateMutation,
  useVerifyProviderMutation,
  // onboarding / users
  useValidateImportMutation,
  useCreateImportMutation,
  useListInvitationsQuery,
  useResendInvitationMutation,
  useRevokeInvitationMutation,
  useGetAdminUsersQuery,
} from "../../redux/api/adminApiSlice";
import { convertToFormattedDate } from "../../utils";

interface ExpiredListingFilters {
  status: string;
  category: string;
  province: string;
  city: string;
  expiredFrom: string;
  expiredTo: string;
  uploadedFrom: string;
  uploadedTo: string;
  landlord: string;
  page: number;
}

interface ProviderFilters {
  verificationStatus: string;
  search: string;
}

interface BookingFilters {
  status: string;
  provider: string;
  dateFrom: string;
  dateTo: string;
  settlementStatus: string;
}

interface ToastState {
  open: boolean;
  message: string;
  type: "success" | "error" | "warning";
}

type AdminTab = "expired" | "providers" | "bookings" | "legal" | "users" | "temporaryStays";
type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

const MAX_BULK_REVIVE_IDS = 100;

function getBulkReviveLimitMessage() {
  return `You can revive up to ${MAX_BULK_REVIVE_IDS} listings at once. Split your selection into smaller batches.`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const errorWithData = error as {
      data?: { message?: string };
      message?: string;
    };

    if (errorWithData.data?.message) {
      return errorWithData.data.message;
    }

    if (errorWithData.message) {
      return errorWithData.message;
    }
  }

  return fallback;
}

function buildPageArray(totalPages: number, currentPage: number): PaginationItem[] {
  const pages: number[] = [];
  const addPage = (page: number) => {
    if (page >= 1 && page <= totalPages && pages.indexOf(page) === -1) {
      pages.push(page);
    }
  };

  addPage(1);

  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    addPage(page);
  }

  addPage(totalPages);
  pages.sort((left, right) => left - right);

  const items: PaginationItem[] = [];

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const previousPage = index > 0 ? pages[index - 1] : null;

    if (previousPage !== null && page - previousPage > 1) {
      items.push(previousPage === 1 ? "ellipsis-start" : "ellipsis-end");
    }

    items.push(page);
  }

  return items;
}

function formatStatusLabel(value?: string | null) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const statusChipColors = {
  success: { background: "#D1EAE0", color: "#1F4D3A", fontWeight: 700 },
  info: { background: "#DBEAFE", color: "#1E3A8A", fontWeight: 700 },
  warning: { background: "#FEF3C7", color: "#92400E", fontWeight: 700 },
  error: { background: "#FEE2E2", color: "#991B1B", fontWeight: 700 },
  default: { background: "#F1F5F9", color: "#64748B", fontWeight: 700 },
};

function getStatusChipColor(value?: string | null) {
  switch ((value || "").toLowerCase()) {
    case "approved":
    case "active":
    case "completed":
    case "confirmed":
    case "paid":
    case "settled":
    case "success":
    case "verified":
      return statusChipColors.success;
    case "checked_in":
    case "refunded":
      return statusChipColors.info;
    case "pending":
    case "pending_confirmation":
    case "pending_payment":
    case "unsettled":
    case "warning":
      return statusChipColors.warning;
    case "error":
    case "failed":
    case "failure":
    case "declined":
    case "rejected":
    case "cancelled":
    case "canceled":
    case "expired":
      return statusChipColors.error;
    default:
      return statusChipColors.default;
  }
}

function formatLocation(
  value?: { province?: string; city?: string } | null
) {
  return [value?.province, value?.city].filter(Boolean).join(" / ") || "—";
}

const AdminDashboard: React.FC = () => {
  const ROWS_PER_PAGE = 20;

  const [activeTab, setActiveTab] = useState<AdminTab>("expired");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "success",
  });

  const [expiredFilters, setExpiredFilters] = useState<ExpiredListingFilters>({
    status: "",
    category: "",
    province: "",
    city: "",
    expiredFrom: "",
    expiredTo: "",
    uploadedFrom: "",
    uploadedTo: "",
    landlord: "",
    page: 1,
  });
  const [hasSearchedExpired, setHasSearchedExpired] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  const [providerDraftFilters, setProviderDraftFilters] = useState<ProviderFilters>({
    verificationStatus: "",
    search: "",
  });
  const [providerFilters, setProviderFilters] = useState<ProviderFilters>({
    verificationStatus: "",
    search: "",
  });
  const [bookingDraftFilters, setBookingDraftFilters] = useState<BookingFilters>({
    status: "",
    provider: "",
    dateFrom: "",
    dateTo: "",
    settlementStatus: "",
  });
  const [bookingFilters, setBookingFilters] = useState<BookingFilters>({
    status: "",
    provider: "",
    dateFrom: "",
    dateTo: "",
    settlementStatus: "",
  });
  const [commissionDrafts, setCommissionDrafts] = useState<Record<string, string>>({});
  const [activeProviderAction, setActiveProviderAction] = useState<string | null>(null);
  const [activeBookingAction, setActiveBookingAction] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    title: string;
    body: string;
    onConfirm: (() => void) | null;
    commissionRate?: string;
  }>({ open: false, title: "", body: "", onConfirm: null });
  const [legalDialog, setLegalDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    doc: LegalDocument | null;
    slug: string;
    title: string;
    content: string;
  }>({ open: false, mode: "create", doc: null, slug: "", title: "", content: "" });

  const [triggerSearch, { data: inactiveData, isFetching: isFetchingInactive }] =
    useLazyGetAdminListingsQuery();
  const [deleteAdminListing, { isLoading: isDeletingAdminListing }] =
    useDeleteAdminListingMutation();
  const [deleteListingsByOwner, { isLoading: isDeletingOwnerListings }] =
    useDeleteListingsByOwnerMutation();
  const [bulkRevive, { isLoading: isReviving }] = useBulkReviveListingsMutation();
  const [purgeSeededListings, { isLoading: isPurgingSeededListings }] =
    usePurgeSeededListingsMutation();
  const { data: providersData, isFetching: isFetchingProviders } =
    useGetProvidersQuery(providerFilters);
  const { data: providerOptionsData } = useGetProvidersQuery({});
  const [verifyProvider, { isLoading: isVerifyingProvider }] =
    useVerifyProviderMutation();
  const [updateCommissionRate, { isLoading: isSavingCommission }] =
    useUpdateCommissionRateMutation();
  const { data: bookingsData, isFetching: isFetchingBookings } =
    useGetAllBookingsQuery(bookingFilters);
  const [settleBooking, { isLoading: isSettlingBooking }] =
    useSettleBookingMutation();
  const { data: legalDocsData, isFetching: isFetchingLegalDocs } =
    useGetLegalDocsQuery();
  const [createLegalDoc, { isLoading: isCreatingLegalDoc }] =
    useCreateLegalDocMutation();
  const [updateLegalDoc, { isLoading: isUpdatingLegalDoc }] =
    useUpdateLegalDocMutation();
  const [archiveLegalDoc, { isLoading: isArchivingLegalDoc }] =
    useArchiveLegalDocMutation();

  const { data: usersData, isFetching: isFetchingUsers } =
    useGetAdminUsersQuery({ page: 1, limit: 50 });
  const { data: invitationsData, isFetching: isFetchingInv } = useListInvitationsQuery();
  const [resendInvitation, { isLoading: isResendingInvitation }] =
    useResendInvitationMutation();
  const [revokeInvitation, { isLoading: isRevokingInvitation }] =
    useRevokeInvitationMutation();

  const listings = inactiveData?.data ?? [];
  const totalListings = inactiveData?.total ?? 0;
  const totalPages = Math.ceil(totalListings / ROWS_PER_PAGE);
  const paginationItems = buildPageArray(totalPages, expiredFilters.page);
  const currentPageIds = listings
    .filter((listing) => listing.status === "inactive")
    .map((listing) => listing._id);
  const selectedCount = Object.keys(selectedIds).length;
  const currentPageSelectedCount = currentPageIds.filter(
    (id) => selectedIds[id] === true
  ).length;
  const allCurrentPageSelected =
    currentPageIds.length > 0 && currentPageSelectedCount === currentPageIds.length;
  const someCurrentPageSelected =
    currentPageSelectedCount > 0 && !allCurrentPageSelected;
  const providers = useMemo(
    () => providersData?.data ?? [],
    [providersData?.data]
  );
  const allProviders = providerOptionsData?.data ?? [];
  const bookings = bookingsData?.data.bookings ?? [];
  const settledBookingsCount = bookings.filter(
    (booking) => booking.settlementStatus === "settled"
  ).length;
  const pendingSettlementCount = bookings.filter(
    (booking) => booking.settlementStatus !== "settled"
  ).length;
  const uniqueBookingProviders = Array.from(
    new Set(bookings.map((booking) => booking.provider?._id).filter(Boolean))
  ).length;
  const legalDocs = legalDocsData?.data ?? [];

  useEffect(() => {
    if (selectedCount === 0 && showConfirm) {
      setShowConfirm(false);
    }
  }, [selectedCount, showConfirm]);

  useEffect(() => {
    if (!providers.length) {
      return;
    }

    setCommissionDrafts((previous) => {
      const next = { ...previous };

      providers.forEach((provider) => {
        if (next[provider._id] === undefined) {
          next[provider._id] = String(provider.providerProfile?.commissionRate ?? 0);
        }
      });

      return next;
    });
  }, [providers]);

  const handleExpiredFilterChange = (
    field: keyof ExpiredListingFilters,
    value: string | number
  ) => {
    setExpiredFilters((previous) => ({ ...previous, [field]: value }));
  };

  const handleSearchExpired = () => {
    const nextFilters = { ...expiredFilters, page: 1 };
    setHasSearchedExpired(true);
    setExpiredFilters(nextFilters);
    setSelectedIds({});
    setShowConfirm(false);
    triggerSearch({ ...nextFilters, limit: ROWS_PER_PAGE });
  };

  const handleExpiredPageChange = (newPage: number) => {
    const nextFilters = { ...expiredFilters, page: newPage };
    setExpiredFilters(nextFilters);
    triggerSearch({ ...nextFilters, limit: ROWS_PER_PAGE });
  };

  const handleRowCheck = (id: string) => {
    setSelectedIds((previous) => {
      const next = { ...previous };

      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }

      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds((previous) => {
      const next = { ...previous };

      if (allCurrentPageSelected) {
        currentPageIds.forEach((id) => {
          delete next[id];
        });
      } else {
        currentPageIds.forEach((id) => {
          next[id] = true;
        });
      }

      return next;
    });
  };

  const handleReviveClick = () => {
    if (selectedCount > MAX_BULK_REVIVE_IDS) {
      setToast({
        open: true,
        message: getBulkReviveLimitMessage(),
        type: "error",
      });
      setShowConfirm(false);
      return;
    }

    setShowConfirm(true);
  };

  const handlePurgeSeededClick = () => {
    setShowPurgeConfirm(true);
  };

  const handleConfirmRevive = async () => {
    if (selectedCount === 0) {
      setShowConfirm(false);
      return;
    }

    try {
      const idNameMap: Record<string, string> = {};
      listings.forEach((item) => {
        idNameMap[item._id] = item.name;
      });

      const result = await bulkRevive({ ids: Object.keys(selectedIds) }).unwrap();
      const revivedCount = result.revived.length;
      const failedCount = result.failed.length;

      let message = `${revivedCount} listings revived successfully.`;

      if (failedCount > 0) {
        const failureDetails = result.failed
          .slice(0, 1)
          .map((failure: BulkReviveFailure) => {
            const label =
              idNameMap[failure.id ?? ""] || failure.id || "Unknown listing";
            return `${label} - ${failure.reason || "Unknown error"}`;
          })
          .join(", ");

        message =
          revivedCount > 0
            ? `${revivedCount} revived. ${failedCount} failed: ${failureDetails}`
            : `Revival failed. ${failureDetails}`;
      }

      setToast({
        open: true,
        message,
        type:
          revivedCount > 0 && failedCount === 0
            ? "success"
            : revivedCount > 0
            ? "warning"
            : "error",
      });
      setSelectedIds({});
      setShowConfirm(false);
      triggerSearch({ ...expiredFilters, limit: ROWS_PER_PAGE });
    } catch (error) {
      setToast({
        open: true,
        message: getErrorMessage(error, "An error occurred during revival."),
        type: "error",
      });
    }
  };

  const handleConfirmPurgeSeeded = async () => {
    try {
      const result = await purgeSeededListings().unwrap();
      setToast({
        open: true,
        message: `${result.data.deletedCount} seeded listings purged successfully.`,
        type: "success",
      });
      setShowPurgeConfirm(false);
      triggerSearch({ ...expiredFilters, limit: ROWS_PER_PAGE });
    } catch (error) {
      setToast({
        open: true,
        message: getErrorMessage(error, "Unable to purge seeded listings."),
        type: "error",
      });
    }
  };

  const handleDeleteListing = (listingId: string, listingName: string) => {
    setActionDialog({
      open: true,
      title: "Delete Listing",
      body: `Permanently delete "${listingName}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteAdminListing(listingId).unwrap();
          setToast({ open: true, message: "Listing deleted.", type: "success" });
          triggerSearch({ ...expiredFilters, limit: ROWS_PER_PAGE });
        } catch (error) {
          setToast({
            open: true,
            message: getErrorMessage(error, "Unable to delete listing."),
            type: "error",
          });
        }
      },
    });
  };

  const handleDeleteOwnerListings = (userId: string, ownerLabel: string) => {
    setActionDialog({
      open: true,
      title: "Delete Landlord Listings",
      body: `Permanently delete every listing owned by ${ownerLabel}? The user account will remain.`,
      onConfirm: async () => {
        try {
          const result = await deleteListingsByOwner(userId).unwrap();
          setToast({
            open: true,
            message: `${result.data.deletedCount} landlord listings deleted.`,
            type: "success",
          });
          triggerSearch({ ...expiredFilters, limit: ROWS_PER_PAGE });
        } catch (error) {
          setToast({
            open: true,
            message: getErrorMessage(error, "Unable to delete landlord listings."),
            type: "error",
          });
        }
      },
    });
  };

  const handleVerifyProvider = async (
    providerId: string,
    verificationStatus: "approved" | "rejected"
  ) => {
    setActiveProviderAction(providerId);

    try {
      await verifyProvider({ id: providerId, verificationStatus }).unwrap();
      setToast({
        open: true,
        message: `Provider ${verificationStatus} successfully.`,
        type: "success",
      });
    } catch (error) {
      setToast({
        open: true,
        message: getErrorMessage(error, "Unable to update provider verification."),
        type: "error",
      });
    } finally {
      setActiveProviderAction(null);
    }
  };

  const handleSaveCommission = async (provider: ProviderRecord) => {
    const draftValue = commissionDrafts[provider._id];
    const commissionRate = Number(draftValue);

    if (!Number.isFinite(commissionRate) || commissionRate < 0) {
      setToast({
        open: true,
        message: "Commission rate must be a non-negative number.",
        type: "error",
      });
      return;
    }

    setActiveProviderAction(provider._id);

    try {
      await updateCommissionRate({ id: provider._id, commissionRate }).unwrap();
      setToast({
        open: true,
        message: "Commission rate updated successfully.",
        type: "success",
      });
    } catch (error) {
      setToast({
        open: true,
        message: getErrorMessage(error, "Unable to save commission rate."),
        type: "error",
      });
    } finally {
      setActiveProviderAction(null);
    }
  };

  const handleSettleBooking = async (booking: AdminBooking) => {
    setActiveBookingAction(booking._id);

    try {
      await settleBooking({ id: booking._id }).unwrap();
      setToast({
        open: true,
        message: "Booking marked as settled.",
        type: "success",
      });
    } catch (error) {
      setToast({
        open: true,
        message: getErrorMessage(error, "Unable to settle booking."),
        type: "error",
      });
    } finally {
      setActiveBookingAction(null);
    }
  };

  const renderEmptyState = (message: string) => (
    <Box
      sx={{
        py: 6,
        px: 2,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
      }}
    >
      <SearchOffIcon sx={{ color: "text.secondary", fontSize: 42 }} />
      <SubHeading sx={{ color: "text.secondary" }}>{message}</SubHeading>
    </Box>
  );

  const renderExpiredListings = () => (
    <>
      <Heading sx={{ mb: "20px" }}>Admin - All Listings</Heading>

      <AppCard
        elevation="flat"
        sx={{
          p: 2,
          mb: 2,
          borderRadius: "10px",
          border: "1px solid #e5e7eb",
          boxShadow: "none",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-end" }}>
          <Box sx={{ minWidth: { xs: "100%", sm: 170 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Status</Typography>
            <AppSelect
              value={expiredFilters.status}
              onChange={(event) => handleExpiredFilterChange("status", String(event.target.value))}
              size="small"
              options={[
                { label: "All", value: "" },
                { label: "Active", value: "active" },
                { label: "Early Access", value: "early_access" },
                { label: "Pending Payment", value: "pending_payment" },
                { label: "Expired", value: "expired" },
                { label: "Inactive", value: "inactive" },
              ]}
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 170 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Category</Typography>
            <AppSelect
              value={expiredFilters.category}
              onChange={(event) => handleExpiredFilterChange("category", String(event.target.value))}
              size="small"
              options={[
                { label: "All", value: "" },
                { label: "Rent", value: "rent" },
                { label: "Student", value: "student" },
              ]}
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 160 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Province
            </Typography>
            <AppInput
              value={expiredFilters.province}
              onChange={(event) =>
                handleExpiredFilterChange("province", event.target.value)
              }
              disabled={isReviving}
              size="small"
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 160 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              City
            </Typography>
            <AppInput
              value={expiredFilters.city}
              onChange={(event) =>
                handleExpiredFilterChange("city", event.target.value)
              }
              disabled={isReviving}
              size="small"
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 180 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Expired From
            </Typography>
            <AppInput
              type="date"
              value={expiredFilters.expiredFrom}
              onChange={(event) =>
                handleExpiredFilterChange("expiredFrom", event.target.value)
              }
              disabled={isReviving}
              size="small"
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 180 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Expired To
            </Typography>
            <AppInput
              type="date"
              value={expiredFilters.expiredTo}
              onChange={(event) =>
                handleExpiredFilterChange("expiredTo", event.target.value)
              }
              disabled={isReviving}
              size="small"
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 180 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Uploaded From
            </Typography>
            <AppInput
              type="date"
              value={expiredFilters.uploadedFrom}
              onChange={(event) =>
                handleExpiredFilterChange("uploadedFrom", event.target.value)
              }
              disabled={isReviving}
              size="small"
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 180 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Uploaded To
            </Typography>
            <AppInput
              type="date"
              value={expiredFilters.uploadedTo}
              onChange={(event) =>
                handleExpiredFilterChange("uploadedTo", event.target.value)
              }
              disabled={isReviving}
              size="small"
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 200 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Landlord email / username
            </Typography>
            <AppInput
              value={expiredFilters.landlord}
              onChange={(event) =>
                handleExpiredFilterChange("landlord", event.target.value)
              }
              disabled={isReviving}
              size="small"
            />
          </Box>
          <AppButton onClick={handleSearchExpired} disabled={isReviving}>
            Search
          </AppButton>
        </Box>
      </AppCard>

      {hasSearchedExpired && (
        <>
          {showConfirm && (
            <Box
              sx={{
                background: "#fef9c3",
                border: "1px solid #fde68a",
                borderRadius: "8px",
                p: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: 1.5,
                fontSize: "13px",
                color: "#92400e",
              }}
            >
              <Typography variant="body2" sx={{ flex: 1, color: "#92400e" }}>
                Revive {selectedCount} listing{selectedCount !== 1 ? "s" : ""}? Each
                landlord will receive a 48-hour payment window and an email
                notification.
              </Typography>
              <AppButton
                size="small"
                onClick={handleConfirmRevive}
                disabled={selectedCount === 0 || isReviving}
              >
                {isReviving ? <CircularProgress size={16} color="inherit" /> : "Confirm"}
              </AppButton>
              <AppButton
                size="small"
                variant="outlined"
                onClick={() => setShowConfirm(false)}
                disabled={isReviving || isPurgingSeededListings}
              >
                Cancel
              </AppButton>
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1.5,
            }}
          >
            <Typography variant="body2" sx={{ color: "#374151", fontWeight: 500 }}>
              {selectedCount > 0
                ? `${selectedCount} listing${selectedCount !== 1 ? "s" : ""} selected`
                : ""}
            </Typography>
            <AppButton
              onClick={handleReviveClick}
              disabled={selectedCount === 0 || isReviving || isPurgingSeededListings}
            >
              Revive Selected
            </AppButton>
            <AppButton
              variant="outlined"
              color="error"
              onClick={handlePurgeSeededClick}
              disabled={isReviving || isPurgingSeededListings}
            >
              Purge Seeded Listings
            </AppButton>
          </Box>
        </>
      )}

      {!hasSearchedExpired ? (
        renderEmptyState("Use the filters above to find listings.")
      ) : isFetchingInactive ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : listings.length === 0 ? (
        renderEmptyState("No listings match your filters.")
      ) : (
        <AppCard
          sx={{
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
            overflow: "hidden",
          }}
        >
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table>
            <TableHead>
              <TableRow sx={{ background: "background.paper" }}>
                <TableCell padding="checkbox">
                    <Checkbox
                      checked={allCurrentPageSelected}
                      indeterminate={someCurrentPageSelected}
                      onChange={handleSelectAll}
                      disabled={isReviving || isPurgingSeededListings}
                    />
                </TableCell>
                {["Listing", "Landlord", "Category", "Status", "Location", "Date Uploaded", "Expires", "Actions"].map(
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
              {listings.map((item) => (
                <TableRow key={item._id} hover sx={{ "&:last-child td": { border: 0 } }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds[item._id] === true}
                      onChange={() => handleRowCheck(item._id)}
                      disabled={
                        item.status !== "inactive" || isReviving || isPurgingSeededListings
                      }
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                  <TableCell>
                    <Box>{item.user?.username ?? "—"}</Box>
                    <Box sx={{ fontSize: "11px", color: "#9ca3af" }}>
                      {item.user?.email ?? ""}
                    </Box>
                  </TableCell>
                  <TableCell>{item.studentAccommodation ? "Student" : "Rent"}</TableCell>
                  <TableCell>
                    <Chip
                      label={formatStatusLabel(item.status)}
                      size="small"
                      sx={getStatusChipColor(item.status)}
                    />
                  </TableCell>
                  <TableCell sx={{ color: "#6b7280", fontSize: "14px" }}>
                    {formatLocation(item.location)}
                  </TableCell>
                  <TableCell sx={{ color: "#6b7280", fontSize: "14px" }}>
                    {item.createdAt ? convertToFormattedDate(item.createdAt) : "—"}
                  </TableCell>
                  <TableCell sx={{ color: "#6b7280", fontSize: "14px" }}>
                    {item.expiresAt
                      ? convertToFormattedDate(item.expiresAt)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Delete listing">
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleDeleteListing(item._id, item.name)}
                        disabled={isDeletingAdminListing || isDeletingOwnerListings}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {item.user?.id ? (
                      <Button
                        color="error"
                        size="small"
                        onClick={() =>
                          handleDeleteOwnerListings(
                            item.user!.id!,
                            item.user?.email || item.user?.username || "this user"
                          )
                        }
                        disabled={isDeletingAdminListing || isDeletingOwnerListings}
                      >
                        Remove by user
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </TableContainer>
        </AppCard>
      )}

      {hasSearchedExpired && !isFetchingInactive && totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1.5 }}>
          {paginationItems.map((item) =>
            typeof item !== "number" ? (
              <Typography
                key={item}
                variant="body2"
                sx={{ display: "flex", alignItems: "center", px: 0.5, color: "#9ca3af" }}
              >
                ...
              </Typography>
            ) : (
                <AppButton
                  key={item}
                  size="small"
                  variant={expiredFilters.page === item ? "contained" : "outlined"}
                  onClick={() => handleExpiredPageChange(item)}
                  disabled={isReviving || isPurgingSeededListings}
                >
                  {item}
                </AppButton>
            )
          )}
        </Box>
      )}
    </>
  );

  const renderProviders = () => (
    <>
      <Heading sx={{ mb: "20px" }}>Admin - Providers</Heading>

      <AppCard
        elevation="flat"
        sx={{
          p: 2,
          mb: 2,
          borderRadius: "10px",
          border: "1px solid #e5e7eb",
          boxShadow: "none",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-end" }}>
          <Box sx={{ minWidth: { xs: "100%", sm: 220 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Verification Status
            </Typography>
            <AppSelect
              value={providerDraftFilters.verificationStatus}
              onChange={(event) =>
                setProviderDraftFilters((previous) => ({
                  ...previous,
                  verificationStatus: String(event.target.value),
                }))
              }
              size="small"
              options={[
                { label: "All", value: "" },
                { label: "Pending", value: "pending" },
                { label: "Approved", value: "approved" },
                { label: "Rejected", value: "rejected" },
              ]}
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 280 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Search Provider
            </Typography>
            <AppInput
              value={providerDraftFilters.search}
              onChange={(event) =>
                setProviderDraftFilters((previous) => ({
                  ...previous,
                  search: event.target.value,
                }))
              }
              size="small"
              placeholder="Name, email, or phone"
            />
          </Box>
          <AppButton onClick={() => setProviderFilters(providerDraftFilters)}>
            Search
          </AppButton>
        </Box>
      </AppCard>

      {isFetchingProviders ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : providers.length === 0 ? (
        renderEmptyState("No providers match the current filters.")
      ) : (
        <MUITable
          tableHead={[
            "Provider",
            "Contact",
            "Rooms",
            "Verification",
            "Commission",
            "Joined",
            "Actions",
          ]}
        >
          {providers.map((provider) => {
            const verificationStatus =
              provider.providerProfile?.verificationStatus || "pending";
            const isPending = verificationStatus === "pending";
            const isApproved = verificationStatus === "approved";
            const isBusy =
              activeProviderAction === provider._id &&
              (isVerifyingProvider || isSavingCommission);

            return (
              <TableRow key={provider._id}>
                <TableCell sx={{ fontWeight: 600 }}>{provider.username}</TableCell>
                <TableCell>
                  <Box>{provider.email || "—"}</Box>
                  <Box sx={{ fontSize: "12px", color: "#6b7280" }}>
                    {provider.phoneNumber || "No phone number"}
                  </Box>
                </TableCell>
                <TableCell>{provider.roomCount ?? 0}</TableCell>
                <TableCell>
                  <Chip
                    label={formatStatusLabel(verificationStatus)}
                    size="small"
                    sx={getStatusChipColor(verificationStatus)}
                  />
                </TableCell>
                <TableCell sx={{ minWidth: 170 }}>
                  {isApproved ? (
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <AppInput
                        size="small"
                        type="number"
                        value={commissionDrafts[provider._id] ?? ""}
                        onChange={(event) =>
                          setCommissionDrafts((previous) => ({
                            ...previous,
                            [provider._id]: event.target.value,
                          }))
                        }
                        inputProps={{ min: 0, step: "0.01" }}
                      />
                      <AppButton
                        size="small"
                        onClick={() =>
                          setActionDialog({
                            open: true,
                            title: "Update Commission",
                            body: `Update commission rate to ${commissionDrafts[provider._id]}%? This will apply to all future bookings for this provider.`,
                            onConfirm: () => handleSaveCommission(provider),
                            commissionRate: commissionDrafts[provider._id],
                          })
                        }
                        disabled={isBusy}
                      >
                        Save
                      </AppButton>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: "#6b7280" }}>
                      {provider.providerProfile?.commissionRate ?? 0}%
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {provider.createdAt ? convertToFormattedDate(provider.createdAt) : "—"}
                </TableCell>
                <TableCell>
                  {isPending ? (
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <AppButton
                        size="small"
                        onClick={() =>
                          setActionDialog({
                            open: true,
                            title: "Approve Provider",
                            body: "Approve this provider? They will gain access to create rooms and accept bookings.",
                            onConfirm: () =>
                              handleVerifyProvider(provider._id, "approved"),
                          })
                        }
                        disabled={isBusy}
                      >
                        Approve
                      </AppButton>
                      <AppButton
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() =>
                          setActionDialog({
                            open: true,
                            title: "Reject Provider",
                            body: "Reject this provider? They will be notified.",
                            onConfirm: () =>
                              handleVerifyProvider(provider._id, "rejected"),
                          })
                        }
                        disabled={isBusy}
                      >
                        Reject
                      </AppButton>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: "#6b7280" }}>
                      {isApproved ? "Approved provider" : "Review completed"}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </MUITable>
      )}
    </>
  );

  const renderBookings = () => (
    <>
      <Heading sx={{ mb: "20px" }}>Admin - Bookings & Settlements</Heading>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
          gap: 2,
          mb: 2,
        }}
      >
        <AppCard sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ color: "#6b7280", mb: 0.5 }}>
            Total Bookings
          </Typography>
          <Typography variant="h5" sx={{ color: "#B8975A", fontWeight: 800 }}>
            {bookings.length}
          </Typography>
        </AppCard>
        <AppCard sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ color: "#6b7280", mb: 0.5 }}>
            Pending Settlement
          </Typography>
          <Typography variant="h5" sx={{ color: "#B8975A", fontWeight: 800 }}>
            {pendingSettlementCount}
          </Typography>
        </AppCard>
        <AppCard sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ color: "#6b7280", mb: 0.5 }}>
            Settled
          </Typography>
          <Typography variant="h5" sx={{ color: "#B8975A", fontWeight: 800 }}>
            {settledBookingsCount}
          </Typography>
        </AppCard>
        <AppCard sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ color: "#6b7280", mb: 0.5 }}>
            Providers in View
          </Typography>
          <Typography variant="h5" sx={{ color: "#B8975A", fontWeight: 800 }}>
            {uniqueBookingProviders}
          </Typography>
        </AppCard>
      </Box>

      <AppCard
        elevation="flat"
        sx={{
          p: 2,
          mb: 2,
          borderRadius: "10px",
          border: "1px solid #e5e7eb",
          boxShadow: "none",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-end" }}>
          <Box sx={{ minWidth: { xs: "100%", sm: 200 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Booking Status
            </Typography>
            <AppSelect
              value={bookingDraftFilters.status}
              onChange={(event) =>
                setBookingDraftFilters((previous) => ({
                  ...previous,
                  status: String(event.target.value),
                }))
              }
              size="small"
              options={[
                { label: "All", value: "" },
                { label: "Confirmed", value: "confirmed" },
                { label: "Pending", value: "pending" },
                { label: "Completed", value: "completed" },
                { label: "Cancelled", value: "cancelled" },
              ]}
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 220 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Provider
            </Typography>
            <AppSelect
              value={bookingDraftFilters.provider}
              onChange={(event) =>
                setBookingDraftFilters((previous) => ({
                  ...previous,
                  provider: String(event.target.value),
                }))
              }
              size="small"
              options={[
                { label: "All", value: "" },
                ...allProviders.map((provider) => ({
                  label: provider.username,
                  value: provider._id,
                })),
              ]}
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 180 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Date From
            </Typography>
            <AppInput
              type="date"
              size="small"
              value={bookingDraftFilters.dateFrom}
              onChange={(event) =>
                setBookingDraftFilters((previous) => ({
                  ...previous,
                  dateFrom: event.target.value,
                }))
              }
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 180 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Date To
            </Typography>
            <AppInput
              type="date"
              size="small"
              value={bookingDraftFilters.dateTo}
              onChange={(event) =>
                setBookingDraftFilters((previous) => ({
                  ...previous,
                  dateTo: event.target.value,
                }))
              }
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 220 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Settlement Status
            </Typography>
            <AppSelect
              value={bookingDraftFilters.settlementStatus}
              onChange={(event) =>
                setBookingDraftFilters((previous) => ({
                  ...previous,
                  settlementStatus: String(event.target.value),
                }))
              }
              size="small"
              options={[
                { label: "All", value: "" },
                { label: "Pending", value: "pending" },
                { label: "Settled", value: "settled" },
              ]}
            />
          </Box>
          <AppButton onClick={() => setBookingFilters(bookingDraftFilters)}>
            Search
          </AppButton>
        </Box>
      </AppCard>

      {isFetchingBookings ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : bookings.length === 0 ? (
        renderEmptyState("No bookings match the current filters.")
      ) : (
        <MUITable
          tableHead={[
            "Booking",
            "Provider",
            "Stay Dates",
            "Booked On",
            "Status",
            "Settlement",
            "Action",
          ]}
        >
          {bookings.map((booking) => {
            const canSettle =
              booking.settlementStatus !== "settled" &&
              !["cancelled", "canceled", "rejected", "expired"].includes(
                String(booking.status || "").toLowerCase()
              );

            return (
              <TableRow key={booking._id}>
                <TableCell>
                  <Box sx={{ fontWeight: 600 }}>{booking.room?.name || "Room booking"}</Box>
                  <Box sx={{ fontSize: "12px", color: "#6b7280" }}>
                    {formatLocation(booking.room?.location)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>{booking.provider?.username || "—"}</Box>
                  <Box sx={{ fontSize: "12px", color: "#6b7280" }}>
                    {booking.provider?.email || ""}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    {booking.checkIn ? convertToFormattedDate(booking.checkIn) : "—"}
                  </Box>
                  <Box sx={{ fontSize: "12px", color: "#6b7280" }}>
                    to {booking.checkOut ? convertToFormattedDate(booking.checkOut) : "—"}
                  </Box>
                </TableCell>
                <TableCell>
                  {booking.createdAt ? convertToFormattedDate(booking.createdAt) : "—"}
                </TableCell>
                <TableCell>
                  <Chip
                    label={formatStatusLabel(booking.status)}
                    size="small"
                    sx={getStatusChipColor(booking.status)}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Chip
                      label={formatStatusLabel(booking.settlementStatus)}
                      size="small"
                      sx={getStatusChipColor(booking.settlementStatus)}
                    />
                    <Typography variant="caption" sx={{ color: "#6b7280" }}>
                      {booking.settledAt
                        ? `Settled ${convertToFormattedDate(booking.settledAt)}`
                        : "Awaiting settlement"}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {canSettle ? (
                    <AppButton
                      size="small"
                      onClick={() =>
                        setActionDialog({
                          open: true,
                          title: "Settle Booking",
                          body: "Mark this booking as settled? This records the payout as complete.",
                          onConfirm: () => handleSettleBooking(booking),
                        })
                      }
                      disabled={
                        activeBookingAction === booking._id && isSettlingBooking
                      }
                    >
                      Mark as Settled
                    </AppButton>
                  ) : (
                    <Typography variant="body2" sx={{ color: "#6b7280" }}>
                      No action available
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </MUITable>
      )}
    </>
  );

  const openCreateLegalDialog = () =>
    setLegalDialog({
      open: true,
      mode: "create",
      doc: null,
      slug: "",
      title: "",
      content: "",
    });

  const openEditLegalDialog = (doc: LegalDocument) =>
    setLegalDialog({
      open: true,
      mode: "edit",
      doc,
      slug: doc.slug,
      title: doc.title,
      content: doc.content,
    });

  const closeLegalDialog = () =>
    setLegalDialog({
      open: false,
      mode: "create",
      doc: null,
      slug: "",
      title: "",
      content: "",
    });

  const handleSaveLegalDoc = async () => {
    try {
      if (legalDialog.mode === "edit" && legalDialog.doc) {
        await updateLegalDoc({
          id: legalDialog.doc.id,
          title: legalDialog.title,
          content: legalDialog.content,
        }).unwrap();
      } else {
        await createLegalDoc({
          slug: legalDialog.slug,
          title: legalDialog.title,
          content: legalDialog.content,
        }).unwrap();
      }
      setToast({ open: true, message: "Legal document saved.", type: "success" });
      closeLegalDialog();
    } catch (error) {
      setToast({
        open: true,
        message: getErrorMessage(error, "Unable to save legal document."),
        type: "error",
      });
    }
  };

  const handleArchiveLegalDoc = async (doc: LegalDocument) => {
    if (!window.confirm(`Archive ${doc.title}?`)) return;

    try {
      await archiveLegalDoc(doc.id).unwrap();
      setToast({ open: true, message: "Legal document archived.", type: "success" });
    } catch (error) {
      setToast({
        open: true,
        message: getErrorMessage(error, "Unable to archive legal document."),
        type: "error",
      });
    }
  };

  const renderLegalDocs = () => (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2, flexWrap: "wrap" }}>
        <Heading sx={{ mb: 0 }}>Legal Documents</Heading>
        <Button variant="contained" onClick={openCreateLegalDialog}>
          New Document
        </Button>
      </Box>
      <AppCard sx={{ boxShadow: "0 4px 24px rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {isFetchingLegalDocs ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : legalDocs.length === 0 ? (
          renderEmptyState("No legal documents yet.")
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {["Title", "Slug", "Version", "Status", "Last Updated", "Actions"].map((header) => (
                    <TableCell key={header} sx={{ fontWeight: 800 }}>{header}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {legalDocs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{doc.title}</TableCell>
                    <TableCell>{doc.slug}</TableCell>
                    <TableCell>{doc.version}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={doc.isActive ? "Active" : "Archived"}
                        sx={getStatusChipColor(doc.isActive ? "active" : "archived")}
                      />
                    </TableCell>
                    <TableCell>{convertToFormattedDate(doc.updatedAt)}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => openEditLegalDialog(doc)} size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => handleArchiveLegalDoc(doc)}
                        size="small"
                        disabled={isArchivingLegalDoc}
                      >
                        <ArchiveIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </AppCard>
    </>
  );

  const renderUsers = () => {

    const users = usersData?.data ?? [];
    const invitations = invitationsData?.data ?? [];

    const handleResend = async (id: string) => {
      try {
        await resendInvitation({ id }).unwrap();
        setToast({ open: true, message: "Invitation resent.", type: "success" });
      } catch (err) {
        setToast({ open: true, message: getErrorMessage(err, "Unable to resend."), type: "error" });
      }
    };

    const handleRevoke = async (id: string) => {
      try {
        await revokeInvitation({ id }).unwrap();
        setToast({ open: true, message: "Invitation revoked.", type: "success" });
      } catch (err) {
        setToast({ open: true, message: getErrorMessage(err, "Unable to revoke."), type: "error" });
      }
    };

    return (
      <>
        <Heading sx={{ mb: "20px" }}>Admin - Users</Heading>

        <AppCard sx={{ mb: 2 }}>
          <Typography sx={{ mb: 1, fontWeight: 700 }}>Invitations</Typography>
          {isFetchingInv ? (
            <Box sx={{ py: 4, textAlign: "center" }}>Loading...</Box>
          ) : invitations.length === 0 ? (
            renderEmptyState("No invitations found.")
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Sent At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invitations.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email || inv.user?.email}</TableCell>
                    <TableCell>{inv.role || inv.user?.role}</TableCell>
                    <TableCell>{inv.status}</TableCell>
                    <TableCell>{inv.sentAt || inv.createdAt || "-"}</TableCell>
                    <TableCell>
                      <AppButton size="small" onClick={() => handleResend(inv.id)}>Resend</AppButton>
                      <AppButton size="small" variant="outlined" color="error" onClick={() => handleRevoke(inv.id)} sx={{ ml: 1 }}>Revoke</AppButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </AppCard>

        <AppCard>
          <Typography sx={{ mb: 1, fontWeight: 700 }}>Users</Typography>
          {isFetchingUsers ? (
            <Box sx={{ py: 4, textAlign: "center" }}>Loading...</Box>
          ) : users.length === 0 ? (
            renderEmptyState("No users found.")
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Joined</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.id || u._id}>
                    <TableCell>{u.firstName || u.name || "-"}</TableCell>
                    <TableCell>{u.email || "-"}</TableCell>
                    <TableCell>{u.role || "-"}</TableCell>
                    <TableCell>{u.createdAt || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </AppCard>
      </>
    );
  };

  return (
    <Box sx={{ mt: { xs: 5, md: 6 } }}>
      <AppContainer>
        <Box sx={{ mb: 3, position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)", borderRadius: "18px", p: 3 }}>
          <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 50%, rgba(31,77,58,0.3) 0%, transparent 60%)", pointerEvents: "none" }} />
          <Heading>Admin Dashboard</Heading>
          <SubHeading sx={{ color: "text.secondary" }}>
            Manage listings, providers, and bookings.
          </SubHeading>
          <Box sx={{ mt: 2 }}>
            <AppButton onClick={() => setBulkImportOpen(true)}>Bulk Import Users</AppButton>
          </Box>
        </Box>

        <Tabs
          value={activeTab}
          onChange={(_event, value: AdminTab) => setActiveTab(value)}
          sx={{ mb: 3 }}
          textColor="primary"
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab
            value="expired"
            label="All Listings"
            sx={{ textTransform: "none", fontWeight: 600 }}
          />
          <Tab
            value="providers"
            label="Providers"
            sx={{ textTransform: "none", fontWeight: 600 }}
          />
          <Tab
            value="temporaryStays"
            label="Temporary Stays"
            sx={{ textTransform: "none", fontWeight: 600 }}
          />
          <Tab
            value="bookings"
            label="Bookings & Settlements"
            sx={{ textTransform: "none", fontWeight: 600 }}
          />
          <Tab
            value="legal"
            label="Legal Documents"
            sx={{ textTransform: "none", fontWeight: 600 }}
          />
          <Tab
            value="users"
            label="Users"
            sx={{ textTransform: "none", fontWeight: 600 }}
          />
        </Tabs>

        {activeTab === "expired" && renderExpiredListings()}
        {activeTab === "providers" && renderProviders()}
        {activeTab === "temporaryStays" && <TemporaryStays />}
        {activeTab === "bookings" && renderBookings()}
        {activeTab === "legal" && renderLegalDocs()}
        {activeTab === "users" && renderUsers()}
      </AppContainer>

      <BulkImportDialog open={bulkImportOpen} onClose={() => setBulkImportOpen(false)} />

      <ToastAlert
      appearence={toast.open}
      type={toast.type}
      message={toast.message}
      handleClose={() => setToast((previous) => ({ ...previous, open: false }))}
      />
      <Dialog
        open={actionDialog.open}
        onClose={() =>
          setActionDialog({
            open: false,
            title: "",
            body: "",
            onConfirm: null,
          })
        }
      >
        <DialogTitle>{actionDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{actionDialog.body}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <AppButton
            variant="outlined"
            onClick={() =>
              setActionDialog({
                open: false,
                title: "",
                body: "",
                onConfirm: null,
              })
            }
          >
            Cancel
          </AppButton>
          <AppButton
            disabled={isVerifyingProvider || isSavingCommission || isSettlingBooking || isDeletingAdminListing || isDeletingOwnerListings}
            onClick={() => {
              actionDialog.onConfirm?.();
              setActionDialog({
                open: false,
                title: "",
                body: "",
                onConfirm: null,
              });
            }}
          >
            Confirm
          </AppButton>
        </DialogActions>
      </Dialog>
      <Dialog
        open={showPurgeConfirm}
        onClose={() => setShowPurgeConfirm(false)}
      >
        <DialogTitle>Purge Seeded Listings</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete all demo listings created from the seeded landlord accounts? This
            removes the records from Prisma and cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <AppButton
            variant="outlined"
            onClick={() => setShowPurgeConfirm(false)}
            disabled={isPurgingSeededListings}
          >
            Cancel
          </AppButton>
          <AppButton onClick={handleConfirmPurgeSeeded} disabled={isPurgingSeededListings}>
            {isPurgingSeededListings ? <CircularProgress size={16} color="inherit" /> : "Purge"}
          </AppButton>
        </DialogActions>
      </Dialog>
      <Dialog open={legalDialog.open} onClose={closeLegalDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {legalDialog.mode === "edit" ? "Edit Legal Document" : "New Legal Document"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Slug"
            value={legalDialog.slug}
            disabled={legalDialog.mode === "edit"}
            onChange={(event) =>
              setLegalDialog((previous) => ({ ...previous, slug: event.target.value }))
            }
          />
          <TextField
            label="Title"
            value={legalDialog.title}
            onChange={(event) =>
              setLegalDialog((previous) => ({ ...previous, title: event.target.value }))
            }
          />
          <TextField
            label="Content"
            value={legalDialog.content}
            multiline
            minRows={10}
            onChange={(event) =>
              setLegalDialog((previous) => ({ ...previous, content: event.target.value }))
            }
          />
        </DialogContent>
        <DialogActions>
          <AppButton variant="outlined" onClick={closeLegalDialog}>
            Cancel
          </AppButton>
          <AppButton
            disabled={isCreatingLegalDoc || isUpdatingLegalDoc}
            onClick={handleSaveLegalDoc}
          >
            Save
          </AppButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
