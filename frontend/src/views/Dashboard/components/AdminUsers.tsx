import React, { FormEvent, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Link,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
  Typography,
} from "@mui/material";
import AppButton from "../../../components/ui/AppButton";
import AppInput from "../../../components/ui/AppInput";
import AppSelect from "../../../components/ui/AppSelect";
import ToastAlert from "../../../components/ToastAlert/ToastAlert";
import { convertToFormattedDate } from "../../../utils";
import {
  AdminUser,
  AdminUserActivityRecord,
  AdminUsersParams,
  useCreateAdminUserMutation,
  useGetAdminUserActivityQuery,
  useGetAdminUserQuery,
  useGetAdminUsersQuery,
  useReactivateAdminUserMutation,
  useResetAdminUserPasswordMutation,
  useSuspendAdminUserMutation,
  useUpdateAdminUserMutation,
} from "../../../redux/api/adminApiSlice";

type SortField = "createdAt" | "username" | "email" | "role";
type UserSection = "overview" | "listings" | "engagements" | "bookings";

interface UserFormState {
  username: string;
  email: string;
  phoneNumber: string;
  role: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  verificationStatus: string;
  password: string;
}

interface ToastState {
  open: boolean;
  message: string;
  type: "success" | "error" | "warning";
}

const PAGE_SIZE = 20;
const isStrongPassword = (value: string) =>
  value.length >= 8 && /[A-Z]/.test(value) && /\d/.test(value) && /[@$!%*?&]/.test(value);
const emptyForm: UserFormState = {
  username: "",
  email: "",
  phoneNumber: "",
  role: "tenant",
  isEmailVerified: true,
  isPhoneVerified: false,
  verificationStatus: "UNVERIFIED",
  password: "",
};

const verificationOptions = [
  { value: "UNVERIFIED", label: "Unverified" },
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
];

const roleOptions = [
  { value: "tenant", label: "Tenant" },
  { value: "landlord", label: "Landlord" },
  { value: "provider", label: "Provider" },
];

const accountStatusOptions = [
  { value: "", label: "All account statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null) {
    const value = error as { data?: { message?: string }; message?: string };
    if (value.data?.message) return value.data.message;
    if (value.message) return value.message;
  }
  return fallback;
};

const formatLabel = (value?: string | null) =>
  value
    ? value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Unknown";

const statusColor = (value?: string | null): "default" | "success" | "warning" | "error" => {
  switch ((value || "").toLowerCase()) {
    case "active":
    case "approved":
    case "verified":
    case "completed":
    case "settled":
      return "success";
    case "suspended":
    case "pending":
    case "pending_review":
    case "pending_confirmation":
    case "pending_payment":
      return "warning";
    case "rejected":
    case "declined":
    case "cancelled":
    case "expired":
      return "error";
    default:
      return "default";
  }
};

const ActivityTable: React.FC<{
  section: Exclude<UserSection, "overview">;
  records: AdminUserActivityRecord[];
  onPageChange: (page: number) => void;
  page: number;
  total: number;
}> = ({ section, records, onPageChange, page, total }) => {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const date = (value?: string | null) => (value ? convertToFormattedDate(value) : "—");

  if (records.length === 0) {
    return <Alert severity="info">No {section} found for this user.</Alert>;
  }

  return (
    <Box>
      <TableContainer sx={{ maxHeight: "45dvh", overflow: "auto" }}>
        <Table size="small" stickyHeader>
          {section === "listings" && (
            <>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Added</TableCell>
                  <TableCell>Open</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={`${record.kind}-${record.id}`} hover>
                    <TableCell>{record.name || "Untitled"}</TableCell>
                    <TableCell>
                      {record.kind === "listing" && record.studentAccommodation
                        ? "Student accommodation"
                        : formatLabel(record.kind || record.type)}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={formatLabel(record.status || record.moderationStatus)} />
                    </TableCell>
                    <TableCell>{record.location || "—"}</TableCell>
                    <TableCell>{date(record.createdAt)}</TableCell>
                    <TableCell>
                      {record.href ? (
                        <Link href={record.href} target="_blank" rel="noreferrer">
                          Open
                        </Link>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}
          {section === "engagements" && (
            <>
              <TableHead>
                <TableRow>
                  <TableCell>Listing / request</TableCell>
                  <TableCell>Activity</TableCell>
                  <TableCell>Other party</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>
                      {record.listing?.id ? (
                        <Link href={`/listing/${record.listing.id}`} target="_blank" rel="noreferrer">
                          {record.listing.name || "View listing"}
                        </Link>
                      ) : record.listing?.name || "Listing unavailable"}
                      {record.message && (
                        <Typography variant="caption" display="block" color="text.secondary" noWrap>
                          {record.message}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{record.relationToUser || "Engagement"}</TableCell>
                    <TableCell>
                      {record.relationToUser === "Made by user"
                        ? record.landlord?.username || "—"
                        : record.tenant?.username || "—"}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={formatLabel(record.status)} color={statusColor(record.status)} />
                    </TableCell>
                    <TableCell>{date(record.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}
          {section === "bookings" && (
            <>
              <TableHead>
                <TableRow>
                  <TableCell>Stay</TableCell>
                  <TableCell>User role</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Booking status</TableCell>
                  <TableCell>Payment / settlement</TableCell>
                  <TableCell>Open</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>
                      {record.room?.accommodation?.name || record.room?.name || "Stay unavailable"}
                      {record.room?.accommodation?.name && record.room?.name && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {record.room.name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{record.relationToUser || "Guest / provider"}</TableCell>
                    <TableCell>{date(record.checkIn)} – {date(record.checkOut)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={formatLabel(record.status)} color={statusColor(record.status)} />
                    </TableCell>
                    <TableCell>
                      {formatLabel(record.paymentStatus)} / {formatLabel(record.settlementStatus)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/stays/bookings/${record.id}`} target="_blank" rel="noreferrer">
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}
        </Table>
      </TableContainer>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pt: 1 }}>
        <Typography variant="body2">
          {total ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}` : "0 records"}
        </Typography>
        <Stack direction="row" spacing={1}>
          <AppButton size="small" variant="outlined" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </AppButton>
          <AppButton size="small" variant="outlined" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next
          </AppButton>
        </Stack>
      </Stack>
    </Box>
  );
};

const AdminUsers: React.FC = () => {
  const [filters, setFilters] = useState<AdminUsersParams>({
    page: 1,
    limit: PAGE_SIZE,
    role: "",
    verificationStatus: "",
    accountStatus: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [section, setSection] = useState<UserSection>("overview");
  const [activityPage, setActivityPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordReset, setConfirmPasswordReset] = useState(false);
  const [confirmAccountAction, setConfirmAccountAction] = useState<"suspend" | "reactivate" | null>(null);
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "success" });

  const queryParams = { ...filters, search: debouncedSearch };
  const { data: usersData, isFetching, isError } = useGetAdminUsersQuery(queryParams);
  const { data: selectedUserData, isFetching: isFetchingUser, isError: isUserError } =
    useGetAdminUserQuery(selectedUserId || "", { skip: !selectedUserId });
  const activitySection = section === "overview" ? "listings" : section;
  const { data: activityData, isFetching: isFetchingActivity, isError: isActivityError } =
    useGetAdminUserActivityQuery(
      {
        id: selectedUserId || "",
        section: activitySection,
        page: activityPage,
        limit: PAGE_SIZE,
      },
      { skip: !selectedUserId || section === "overview" }
    );
  const [createUser, { isLoading: isCreating }] = useCreateAdminUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateAdminUserMutation();
  const [resetPassword, { isLoading: isResettingPassword }] = useResetAdminUserPasswordMutation();
  const [suspendUser, { isLoading: isSuspending }] = useSuspendAdminUserMutation();
  const [reactivateUser, { isLoading: isReactivating }] = useReactivateAdminUserMutation();

  const users = usersData?.data || [];
  const total = usersData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedUser = selectedUserData?.data;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setFilters((previous) => ({ ...previous, page: 1 }));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if ((filters.page || 1) > totalPages) {
      setFilters((previous) => ({ ...previous, page: totalPages }));
    }
  }, [filters.page, totalPages]);

  const setFilter = (key: "role" | "verificationStatus" | "accountStatus", value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value, page: 1 }));
  };

  const changeSort = (sortBy: SortField) => {
    setFilters((previous) => ({
      ...previous,
      sortBy,
      sortOrder: previous.sortBy === sortBy && previous.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    }));
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setForm({
      username: user.username || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      verificationStatus: user.verificationStatus || "UNVERIFIED",
      password: "",
    });
    setFormError("");
    setFormOpen(true);
  };

  const closeUserForm = () => {
    if (isCreating || isUpdating) return;
    setFormOpen(false);
    setForm(emptyForm);
    setEditingUser(null);
  };

  const closePasswordDialog = () => {
    if (isResettingPassword) return;
    setPasswordOpen(false);
    setNewPassword("");
    setConfirmPassword("");
    setConfirmPasswordReset(false);
  };

  const submitUserForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    try {
      if (editingUser) {
        const result = await updateUser({
          id: editingUser.id,
          username: form.username.trim(),
          email: form.email.trim(),
          phoneNumber: form.phoneNumber.trim(),
          role: form.role,
          isEmailVerified: form.isEmailVerified,
          isPhoneVerified: form.isPhoneVerified,
          verificationStatus: form.verificationStatus,
        }).unwrap();
        setToast({ open: true, message: "User details updated.", type: "success" });
        setSelectedUserId(result.data.id);
      } else {
        const result = await createUser({
          username: form.username.trim(),
          email: form.email.trim(),
          phoneNumber: form.phoneNumber.trim(),
          role: form.role,
          password: form.password,
        }).unwrap();
        setToast({ open: true, message: "User created.", type: "success" });
        setSelectedUserId(result.data.id);
        setSection("overview");
      }
      setFormOpen(false);
      setForm(emptyForm);
      setEditingUser(null);
    } catch (error) {
      setFormError(getErrorMessage(error, "Unable to save user."));
    }
  };

  const confirmResetPassword = async () => {
    if (!selectedUserId || newPassword !== confirmPassword) return;
    try {
      await resetPassword({ id: selectedUserId, password: newPassword }).unwrap();
      setPasswordOpen(false);
      setConfirmPasswordReset(false);
      setNewPassword("");
      setConfirmPassword("");
      setToast({ open: true, message: "Password reset successfully.", type: "success" });
    } catch (error) {
      setConfirmPasswordReset(false);
      setToast({ open: true, message: getErrorMessage(error, "Unable to reset password."), type: "error" });
    }
  };

  const confirmUserStatus = async () => {
    if (!selectedUserId || !confirmAccountAction) return;
    try {
      if (confirmAccountAction === "suspend") {
        await suspendUser(selectedUserId).unwrap();
        setToast({ open: true, message: "User account suspended.", type: "success" });
      } else {
        await reactivateUser(selectedUserId).unwrap();
        setToast({ open: true, message: "User account reactivated.", type: "success" });
      }
    } catch (error) {
      setToast({
        open: true,
        message: getErrorMessage(error, "Unable to update account status."),
        type: "error",
      });
    } finally {
      setConfirmAccountAction(null);
    }
  };

  const renderUserForm = () => (
    <Dialog open={formOpen} onClose={closeUserForm} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={submitUserForm}>
        <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <AppInput
            label="Name"
            required
            value={form.username}
            onChange={(event) => setForm((previous) => ({ ...previous, username: event.target.value }))}
            inputProps={{ maxLength: 100 }}
          />
          <AppInput
            label="Email"
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
          />
          <AppInput
            label="Phone"
            value={form.phoneNumber}
            onChange={(event) => setForm((previous) => ({ ...previous, phoneNumber: event.target.value }))}
          />
          <AppSelect
            label="Role / account type"
            value={form.role}
            onChange={(event) => setForm((previous) => ({ ...previous, role: String(event.target.value) }))}
            options={
              editingUser && ["admin", "super_admin"].includes(editingUser.role)
                ? [{ value: editingUser.role, label: formatLabel(editingUser.role) }]
                : roleOptions
            }
            disabled={Boolean(editingUser && ["admin", "super_admin"].includes(editingUser.role))}
          />
          {!editingUser ? (
            <>
              <AppInput
                label="Initial password"
                type="password"
                required
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
                error={Boolean(form.password && !isStrongPassword(form.password))}
                helperText={
                  form.password && !isStrongPassword(form.password)
                    ? "Use at least 8 characters, including uppercase, number, and special character (@$!%*?&)."
                    : "At least 8 characters with uppercase, number, and special character (@$!%*?&)."
                }
              />
              <Alert severity="info">
                Admin-created accounts are email-verified so the user can sign in with this password immediately.
              </Alert>
            </>
          ) : (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.isEmailVerified}
                    onChange={(event) => setForm((previous) => ({ ...previous, isEmailVerified: event.target.checked }))}
                  />
                }
                label="Email verified"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.isPhoneVerified}
                    onChange={(event) => setForm((previous) => ({ ...previous, isPhoneVerified: event.target.checked }))}
                  />
                }
                label="Phone verified"
              />
              <AppSelect
                label="Verification status"
                value={form.verificationStatus}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, verificationStatus: String(event.target.value) }))
                }
                options={verificationOptions}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton variant="outlined" onClick={closeUserForm} disabled={isCreating || isUpdating}>
            Cancel
          </AppButton>
          <AppButton
            type="submit"
            disabled={
              isCreating ||
              isUpdating ||
              (!editingUser && !isStrongPassword(form.password))
            }
          >
            {isCreating || isUpdating ? <CircularProgress size={18} color="inherit" /> : editingUser ? "Save changes" : "Create user"}
          </AppButton>
        </DialogActions>
      </Box>
    </Dialog>
  );

  const renderSelectedUser = () => (
    <Dialog
      open={Boolean(selectedUserId)}
      onClose={() => setSelectedUserId(null)}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { minHeight: { xs: "90vh", md: "75vh" } } }}
    >
      <DialogTitle sx={{ pr: 7 }}>
        {isFetchingUser ? "Loading user…" : selectedUser?.username || "User management"}
        {selectedUser && (
          <Typography variant="body2" color="text.secondary">{selectedUser.email}</Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {isUserError && <Alert severity="error">Unable to load this user.</Alert>}
        {isFetchingUser && <Box sx={{ py: 5, textAlign: "center" }}><CircularProgress /></Box>}
        {selectedUser && (
          <>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
              <AppButton onClick={() => openEdit(selectedUser)}>Edit</AppButton>
              <AppButton variant="outlined" onClick={() => { setPasswordOpen(true); setNewPassword(""); setConfirmPassword(""); }}>
                Reset password
              </AppButton>
              {selectedUser.accountSuspendedAt ? (
                <AppButton color="success" variant="outlined" onClick={() => setConfirmAccountAction("reactivate")}>
                  Reactivate account
                </AppButton>
              ) : (
                <AppButton color="error" variant="outlined" onClick={() => setConfirmAccountAction("suspend")}>
                  Suspend account
                </AppButton>
              )}
            </Stack>
            <Tabs
              value={section}
              onChange={(_event, value: UserSection) => { setSection(value); setActivityPage(1); }}
              variant="scrollable"
              allowScrollButtonsMobile
              sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
            >
              <Tab value="overview" label="Overview" />
              <Tab value="listings" label="Listings" />
              <Tab value="engagements" label="Engagements / requests" />
              <Tab value="bookings" label="Bookings" />
            </Tabs>
            {section === "overview" && (
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} useFlexGap flexWrap="wrap">
                  <Typography><strong>Role:</strong> {formatLabel(selectedUser.role)}</Typography>
                  <Box component="div">
                    <Typography component="span">
                    <strong>Account:</strong>{" "}
                    <Chip
                      size="small"
                      label={selectedUser.accountSuspendedAt ? "Suspended" : "Active"}
                      color={selectedUser.accountSuspendedAt ? "warning" : "success"}
                    />
                    </Typography>
                  </Box>
                  <Typography><strong>Email:</strong> {selectedUser.isEmailVerified ? "Verified" : "Unverified"}</Typography>
                  <Typography><strong>Phone:</strong> {selectedUser.isPhoneVerified ? "Verified" : "Unverified"}</Typography>
                  <Typography><strong>Verification:</strong> {formatLabel(selectedUser.verificationStatus)}</Typography>
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} useFlexGap flexWrap="wrap">
                  <Typography><strong>Phone:</strong> {selectedUser.phoneNumber || "—"}</Typography>
                  <Typography><strong>Registered:</strong> {convertToFormattedDate(selectedUser.createdAt)}</Typography>
                  <Typography><strong>Onboarding:</strong> {formatLabel(selectedUser.onboardingStatus)}</Typography>
                </Stack>
                {selectedUser.providerProfile && (
                  <Box>
                    <Typography variant="subtitle2">Provider profile</Typography>
                    <Typography variant="body2">
                      {selectedUser.providerProfile.businessName || "—"} · {formatLabel(selectedUser.providerProfile.businessType)}
                      {" · "}Verification: {formatLabel(selectedUser.providerProfile.verificationStatus)}
                      {selectedUser.providerProfile.suspendedAt ? " · Provider-specific suspension active" : ""}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="subtitle2">Related activity</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedUser._count?.listings || 0} rentals · {selectedUser._count?.accommodations || 0} stays · {selectedUser._count?.rooms || 0} rooms · {(selectedUser._count?.tenantEngagements || 0) + (selectedUser._count?.landlordEngagements || 0)} engagements · {(selectedUser._count?.guestBookings || 0) + (selectedUser._count?.providerBookings || 0)} bookings
                  </Typography>
                </Box>
                <Alert severity="info">
                  Sign-in activity is not recorded by the current account model.
                </Alert>
              </Stack>
            )}
            {section !== "overview" && (
              isFetchingActivity ? (
                <Box sx={{ py: 5, textAlign: "center" }}><CircularProgress /></Box>
              ) : isActivityError ? (
                <Alert severity="error">Unable to load this user activity.</Alert>
              ) : (
                <ActivityTable
                  section={section}
                  records={activityData?.data || []}
                  page={activityPage}
                  total={activityData?.total || 0}
                  onPageChange={setActivityPage}
                />
              )
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 700 }}>Users</Typography>
        <AppButton onClick={openCreate} aria-haspopup="dialog" aria-expanded={formOpen}>
          Add User
        </AppButton>
      </Stack>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
        <AppInput
          label="Search name, email, or phone"
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <AppSelect
          label="Role"
          size="small"
          value={filters.role || ""}
          onChange={(event) => setFilter("role", String(event.target.value))}
          options={[{ value: "", label: "All roles" }, ...roleOptions]}
        />
        <AppSelect
          label="Verification"
          size="small"
          value={filters.verificationStatus || ""}
          onChange={(event) => setFilter("verificationStatus", String(event.target.value))}
          options={[{ value: "", label: "All verification statuses" }, ...verificationOptions]}
        />
        <AppSelect
          label="Account"
          size="small"
          value={filters.accountStatus || ""}
          onChange={(event) => setFilter("accountStatus", String(event.target.value))}
          options={accountStatusOptions}
        />
      </Stack>
      {isError ? (
        <Alert severity="error">Unable to load users. Please try again.</Alert>
      ) : isFetching && users.length === 0 ? (
        <Box sx={{ py: 4, textAlign: "center" }}><CircularProgress /></Box>
      ) : users.length === 0 ? (
        <Alert severity="info">No users found.</Alert>
      ) : (
        <>
          <TableContainer sx={{ maxHeight: "60dvh", overflow: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel active={filters.sortBy === "username"} direction={filters.sortBy === "username" ? filters.sortOrder || "desc" : "asc"} onClick={() => changeSort("username")}>
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel active={filters.sortBy === "email"} direction={filters.sortBy === "email" ? filters.sortOrder || "desc" : "asc"} onClick={() => changeSort("email")}>
                      Email
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Role / type</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Verification</TableCell>
                  <TableCell>
                    <TableSortLabel active={filters.sortBy === "createdAt"} direction={filters.sortBy === "createdAt" ? filters.sortOrder || "desc" : "asc"} onClick={() => changeSort("createdAt")}>
                      Registered
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      {user.username || "—"}
                      {user.providerProfile?.businessName && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {user.providerProfile.businessName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phoneNumber || "—"}</TableCell>
                    <TableCell>{formatLabel(user.role)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={user.accountSuspendedAt ? "Suspended" : "Active"} color={user.accountSuspendedAt ? "warning" : "success"} />
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5} alignItems="flex-start">
                        <Chip
                          size="small"
                          label={user.isEmailVerified ? "Email verified" : "Email unverified"}
                          color={user.isEmailVerified ? "success" : "warning"}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={formatLabel(user.verificationStatus)}
                          color={statusColor(user.verificationStatus)}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell>{user.createdAt ? convertToFormattedDate(user.createdAt) : "—"}</TableCell>
                    <TableCell>
                      <AppButton size="small" onClick={() => { setSelectedUserId(user.id); setSection("overview"); }}>
                        View / Manage
                      </AppButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pt: 1 }}>
            <Typography variant="body2">
              {`Page ${filters.page} of ${totalPages} · ${total} users`}
            </Typography>
            <Stack direction="row" spacing={1}>
              <AppButton size="small" variant="outlined" disabled={(filters.page || 1) <= 1 || isFetching} onClick={() => setFilters((previous) => ({ ...previous, page: Math.max(1, (previous.page || 1) - 1) }))}>
                Previous
              </AppButton>
              <AppButton size="small" variant="outlined" disabled={(filters.page || 1) >= totalPages || isFetching} onClick={() => setFilters((previous) => ({ ...previous, page: (previous.page || 1) + 1 }))}>
                Next
              </AppButton>
            </Stack>
          </Stack>
        </>
      )}

      {formOpen && renderUserForm()}
      {selectedUserId && renderSelectedUser()}
      <Dialog open={passwordOpen} onClose={closePasswordDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          <AppInput
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            error={Boolean(newPassword && !isStrongPassword(newPassword))}
            helperText={
              newPassword && !isStrongPassword(newPassword)
                ? "Use at least 8 characters with uppercase, number, and special character (@$!%*?&)."
                : "At least 8 characters with uppercase, number, and special character (@$!%*?&)."
            }
          />
          <AppInput
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            error={Boolean(confirmPassword && newPassword !== confirmPassword)}
            helperText={confirmPassword && newPassword !== confirmPassword ? "Passwords do not match." : ""}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton variant="outlined" onClick={closePasswordDialog} disabled={isResettingPassword}>Cancel</AppButton>
          <AppButton
            onClick={() => setConfirmPasswordReset(true)}
            disabled={
              isResettingPassword ||
              !isStrongPassword(newPassword) ||
              newPassword !== confirmPassword
            }
          >
            Continue
          </AppButton>
        </DialogActions>
      </Dialog>
      <Dialog open={confirmPasswordReset} onClose={() => setConfirmPasswordReset(false)}>
        <DialogTitle>Confirm Password Reset</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Reset the password for {selectedUser?.username || "this user"}? Their current password will stop working.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <AppButton variant="outlined" onClick={() => setConfirmPasswordReset(false)} disabled={isResettingPassword}>Cancel</AppButton>
          <AppButton onClick={confirmResetPassword} disabled={isResettingPassword}>
            {isResettingPassword ? <CircularProgress size={18} color="inherit" /> : "Reset password"}
          </AppButton>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(confirmAccountAction)} onClose={() => setConfirmAccountAction(null)}>
        <DialogTitle>{confirmAccountAction === "suspend" ? "Suspend this user?" : "Reactivate this user?"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmAccountAction === "suspend"
              ? "This user will no longer be able to log in or use authenticated account features. Existing listings, engagements, bookings, and other records will remain unchanged."
              : "This restores the user's account access. Their existing records will remain unchanged."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <AppButton variant="outlined" onClick={() => setConfirmAccountAction(null)} disabled={isSuspending || isReactivating}>Cancel</AppButton>
          <AppButton
            color={confirmAccountAction === "suspend" ? "error" : "success"}
            onClick={confirmUserStatus}
            disabled={isSuspending || isReactivating}
          >
            {isSuspending || isReactivating
              ? <CircularProgress size={18} color="inherit" />
              : confirmAccountAction === "suspend" ? "Suspend account" : "Reactivate account"}
          </AppButton>
        </DialogActions>
      </Dialog>
      <ToastAlert
        appearence={toast.open}
        type={toast.type}
        message={toast.message}
        handleClose={() => setToast((previous) => ({ ...previous, open: false }))}
      />
    </Box>
  );
};

export default AdminUsers;
