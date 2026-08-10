import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import AdminDashboard from './Admin';
import * as adminApiSlice from '../../redux/api/adminApiSlice';

// Mock RTK Query hooks
jest.mock('../../redux/api/adminApiSlice', () => ({
  useLazyGetAdminListingsQuery: jest.fn(),
  useDeleteAdminListingMutation: jest.fn(),
  useDeleteListingsByOwnerMutation: jest.fn(),
  useBulkReviveListingsMutation: jest.fn(),
  usePurgeSeededListingsMutation: jest.fn(),
  useGetProvidersQuery: jest.fn(),
  useVerifyProviderMutation: jest.fn(),
  useUpdateCommissionRateMutation: jest.fn(),
  useGetAllBookingsQuery: jest.fn(),
  useSettleBookingMutation: jest.fn(),
  useGetModerationQueueQuery: jest.fn(),
  useGetAccommodationsQuery: jest.fn(),
  useApproveAccommodationMutation: jest.fn(),
  useRejectAccommodationMutation: jest.fn(),
  useSuspendAccommodationMutation: jest.fn(),
  useReinstateAccommodationMutation: jest.fn(),
  useSuspendProviderMutation: jest.fn(),
  useReinstateProviderMutation: jest.fn(),
  useGetAllReviewsQuery: jest.fn(),
  useModerateReviewMutation: jest.fn(),
  useGetDisputesQuery: jest.fn(),
  useGetDisputeByIdQuery: jest.fn(),
  useMarkDisputeUnderReviewMutation: jest.fn(),
  useResolveDisputeMutation: jest.fn(),
  useCloseDisputeMutation: jest.fn(),
  useGetReportsQuery: jest.fn(),
  useGetReportByIdQuery: jest.fn(),
  useReviewReportMutation: jest.fn(),
  useResolveReportMutation: jest.fn(),
  useDismissReportMutation: jest.fn(),
  useGetAuditLogsQuery: jest.fn(),
  useGetAuditLogByIdQuery: jest.fn(),
  useGetLegalDocsQuery: jest.fn(),
  useGetLegalDocHistoryQuery: jest.fn(),
  useCreateLegalDocMutation: jest.fn(),
  useUpdateLegalDocMutation: jest.fn(),
  useArchiveLegalDocMutation: jest.fn(),
  useListInvitationsQuery: jest.fn(),
  useGetAdminUsersQuery: jest.fn(),
  useResendInvitationMutation: jest.fn(),
  useRevokeInvitationMutation: jest.fn(),
  useValidateImportMutation: jest.fn(),
  useCreateImportMutation: jest.fn(),
}));

// Mock store
const mockStore = {
  getState: () => ({}),
  dispatch: jest.fn(),
  subscribe: jest.fn(),
  replaceReducer: jest.fn(),
};

describe('Admin Dashboard - Users Tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns for all endpoints
    (adminApiSlice.useLazyGetAdminListingsQuery as jest.Mock).mockReturnValue([jest.fn(), { data: null, isFetching: false }]);
    (adminApiSlice.useDeleteAdminListingMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (adminApiSlice.useDeleteListingsByOwnerMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (adminApiSlice.useBulkReviveListingsMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (adminApiSlice.usePurgeSeededListingsMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (adminApiSlice.useGetProvidersQuery as jest.Mock).mockReturnValue({ data: { data: [] }, isFetching: false });
    (adminApiSlice.useVerifyProviderMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (adminApiSlice.useUpdateCommissionRateMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (adminApiSlice.useGetAllBookingsQuery as jest.Mock).mockReturnValue({ data: { data: { bookings: [] } }, isFetching: false });
    (adminApiSlice.useSettleBookingMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (adminApiSlice.useGetLegalDocsQuery as jest.Mock).mockReturnValue({ data: { data: [] }, isFetching: false });
    (adminApiSlice.useCreateLegalDocMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (adminApiSlice.useUpdateLegalDocMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (adminApiSlice.useArchiveLegalDocMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    
    // New onboarding endpoints
    (adminApiSlice.useListInvitationsQuery as jest.Mock).mockReturnValue({
      data: { data: [] },
      isFetching: false,
    });
    (adminApiSlice.useGetAdminUsersQuery as jest.Mock).mockReturnValue({
      data: { data: [] },
      isFetching: false,
    });
    (adminApiSlice.useResendInvitationMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (adminApiSlice.useRevokeInvitationMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (adminApiSlice.useValidateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);
    (adminApiSlice.useCreateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);
  });

  test('renders admin dashboard with tabs including Users', () => {
    render(
      <Provider store={mockStore as any}>
        <Router>
          <AdminDashboard />
        </Router>
      </Provider>
    );

    const usersTab = screen.getByRole('tab', { name: /users/i });
    expect(usersTab).toBeInTheDocument();
  });

  test('displays Users tab content when clicked', async () => {
    (adminApiSlice.useListInvitationsQuery as jest.Mock).mockReturnValue({
      data: { data: [] },
      isFetching: false,
    });
    (adminApiSlice.useGetAdminUsersQuery as jest.Mock).mockReturnValue({
      data: { data: [] },
      isFetching: false,
    });

    render(
      <Provider store={mockStore as any}>
        <Router>
          <AdminDashboard />
        </Router>
      </Provider>
    );

    const usersTab = screen.getByRole('tab', { name: /users/i });
    fireEvent.click(usersTab);

    await waitFor(() => {
      expect(screen.getByText(/Admin - Users/i)).toBeInTheDocument();
    });
  });

  test('displays invitations table with correct columns', async () => {
    const mockInvitations = [
      {
        id: 'inv1',
        email: 'john@example.com',
        role: 'tenant',
        status: 'SENT',
        sentAt: '2026-08-10T00:00:00Z',
      },
    ];

    (adminApiSlice.useListInvitationsQuery as jest.Mock).mockReturnValue({
      data: { data: mockInvitations },
      isFetching: false,
    });
    (adminApiSlice.useGetAdminUsersQuery as jest.Mock).mockReturnValue({
      data: { data: [] },
      isFetching: false,
    });

    render(
      <Provider store={mockStore as any}>
        <Router>
          <AdminDashboard />
        </Router>
      </Provider>
    );

    const usersTab = screen.getByRole('tab', { name: /users/i });
    fireEvent.click(usersTab);

    await waitFor(() => {
      expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/tenant/i)).toBeInTheDocument();
      expect(screen.getByText(/SENT/i)).toBeInTheDocument();
    });
  });

  test('displays resend and revoke buttons for each invitation', async () => {
    const mockInvitations = [
      {
        id: 'inv1',
        email: 'john@example.com',
        role: 'tenant',
        status: 'SENT',
        sentAt: '2026-08-10T00:00:00Z',
      },
    ];

    (adminApiSlice.useListInvitationsQuery as jest.Mock).mockReturnValue({
      data: { data: mockInvitations },
      isFetching: false,
    });
    (adminApiSlice.useGetAdminUsersQuery as jest.Mock).mockReturnValue({
      data: { data: [] },
      isFetching: false,
    });

    render(
      <Provider store={mockStore as any}>
        <Router>
          <AdminDashboard />
        </Router>
      </Provider>
    );

    const usersTab = screen.getByRole('tab', { name: /users/i });
    fireEvent.click(usersTab);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /resend/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /revoke/i }).length).toBeGreaterThan(0);
    });
  });

  test('calls resend mutation when resend button is clicked', async () => {
    const mockResend = jest.fn().mockReturnValue({ unwrap: () => Promise.resolve() });

    const mockInvitations = [
      {
        id: 'inv1',
        email: 'john@example.com',
        role: 'tenant',
        status: 'SENT',
        sentAt: '2026-08-10T00:00:00Z',
      },
    ];

    (adminApiSlice.useListInvitationsQuery as jest.Mock).mockReturnValue({
      data: { data: mockInvitations },
      isFetching: false,
    });
    (adminApiSlice.useGetAdminUsersQuery as jest.Mock).mockReturnValue({
      data: { data: [] },
      isFetching: false,
    });
    (adminApiSlice.useResendInvitationMutation as jest.Mock).mockReturnValue([
      mockResend,
      { isLoading: false },
    ]);

    render(
      <Provider store={mockStore as any}>
        <Router>
          <AdminDashboard />
        </Router>
      </Provider>
    );

    const usersTab = screen.getByRole('tab', { name: /users/i });
    fireEvent.click(usersTab);

    await waitFor(() => {
      const resendButtons = screen.getAllByRole('button', { name: /resend/i });
      fireEvent.click(resendButtons[0]);
    });

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith({ id: 'inv1' });
    });
  });

  test('calls revoke mutation when revoke button is clicked', async () => {
    const mockRevoke = jest.fn().mockReturnValue({ unwrap: () => Promise.resolve() });

    const mockInvitations = [
      {
        id: 'inv1',
        email: 'john@example.com',
        role: 'tenant',
        status: 'SENT',
        sentAt: '2026-08-10T00:00:00Z',
      },
    ];

    (adminApiSlice.useListInvitationsQuery as jest.Mock).mockReturnValue({
      data: { data: mockInvitations },
      isFetching: false,
    });
    (adminApiSlice.useGetAdminUsersQuery as jest.Mock).mockReturnValue({
      data: { data: [] },
      isFetching: false,
    });
    (adminApiSlice.useRevokeInvitationMutation as jest.Mock).mockReturnValue([
      mockRevoke,
      { isLoading: false },
    ]);

    render(
      <Provider store={mockStore as any}>
        <Router>
          <AdminDashboard />
        </Router>
      </Provider>
    );

    const usersTab = screen.getByRole('tab', { name: /users/i });
    fireEvent.click(usersTab);

    await waitFor(() => {
      const revokeButtons = screen.getAllByRole('button', { name: /revoke/i });
      fireEvent.click(revokeButtons[0]);
    });

    await waitFor(() => {
      expect(mockRevoke).toHaveBeenCalledWith({ id: 'inv1' });
    });
  });

  test('displays users table with correct columns', async () => {
    const mockUsers = [
      {
        id: 'user1',
        firstName: 'John',
        email: 'john@example.com',
        role: 'tenant',
        createdAt: '2026-08-01T00:00:00Z',
      },
    ];

    (adminApiSlice.useListInvitationsQuery as jest.Mock).mockReturnValue({
      data: { data: [] },
      isFetching: false,
    });
    (adminApiSlice.useGetAdminUsersQuery as jest.Mock).mockReturnValue({
      data: { data: mockUsers },
      isFetching: false,
    });

    render(
      <Provider store={mockStore as any}>
        <Router>
          <AdminDashboard />
        </Router>
      </Provider>
    );

    const usersTab = screen.getByRole('tab', { name: /users/i });
    fireEvent.click(usersTab);

    await waitFor(() => {
      expect(screen.getByText(/John/i)).toBeInTheDocument();
      expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/tenant/i)).toBeInTheDocument();
    });
  });

  test('displays bulk import button in dashboard header', async () => {
    render(
      <Provider store={mockStore as any}>
        <Router>
          <AdminDashboard />
        </Router>
      </Provider>
    );

    expect(screen.getByRole('button', { name: /bulk import users/i })).toBeInTheDocument();
  });

  test('opens bulk import dialog when button is clicked', async () => {
    render(
      <Provider store={mockStore as any}>
        <Router>
          <AdminDashboard />
        </Router>
      </Provider>
    );

    const bulkImportButton = screen.getByRole('button', { name: /bulk import users/i });
    fireEvent.click(bulkImportButton);

    await waitFor(() => {
      expect(screen.getByText(/bulk import users/i)).toBeInTheDocument();
    });
  });

  test('shows loading state for invitations', async () => {
    (adminApiSlice.useListInvitationsQuery as jest.Mock).mockReturnValue({
      data: null,
      isFetching: true,
    });
    (adminApiSlice.useGetAdminUsersQuery as jest.Mock).mockReturnValue({
      data: { data: [] },
      isFetching: false,
    });

    render(
      <Provider store={mockStore as any}>
        <Router>
          <AdminDashboard />
        </Router>
      </Provider>
    );

    const usersTab = screen.getByRole('tab', { name: /users/i });
    fireEvent.click(usersTab);

    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  test('shows empty state when no invitations exist', async () => {
    (adminApiSlice.useListInvitationsQuery as jest.Mock).mockReturnValue({
      data: { data: [] },
      isFetching: false,
    });
    (adminApiSlice.useGetAdminUsersQuery as jest.Mock).mockReturnValue({
      data: { data: [] },
      isFetching: false,
    });

    render(
      <Provider store={mockStore as any}>
        <Router>
          <AdminDashboard />
        </Router>
      </Provider>
    );

    const usersTab = screen.getByRole('tab', { name: /users/i });
    fireEvent.click(usersTab);

    await waitFor(() => {
      expect(screen.getByText(/no invitations found/i)).toBeInTheDocument();
    });
  });
});
