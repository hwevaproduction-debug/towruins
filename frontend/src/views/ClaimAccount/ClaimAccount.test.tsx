import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import ClaimAccount from './index';
import * as adminApiSlice from '../../redux/api/adminApiSlice';

// Mock Redux store
const mockStore = {
  getState: () => ({}),
  dispatch: jest.fn(),
  subscribe: jest.fn(),
  replaceReducer: jest.fn(),
};

// Mock the RTK Query hooks
jest.mock('../../redux/api/adminApiSlice', () => ({
  useValidateClaimQuery: jest.fn(),
  useClaimAccountMutation: jest.fn(),
}));

// Mock useNavigate and useSearchParams
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams('token=test-token-123')],
}));

// Mock Redux hooks
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

describe('ClaimAccount Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders claim account page with missing token message', () => {
    jest.spyOn(require('react-router-dom'), 'useSearchParams').mockReturnValue([new URLSearchParams('')]);
    (adminApiSlice.useValidateClaimQuery as jest.Mock).mockReturnValue({
      data: null,
      isFetching: false,
      isLoading: false,
    });

    render(
      <Provider store={mockStore as any}>
        <Router>
          <ClaimAccount />
        </Router>
      </Provider>
    );

    expect(screen.getByText(/missing token/i)).toBeInTheDocument();
  });

  test('displays loading state while validating token', () => {
    (adminApiSlice.useValidateClaimQuery as jest.Mock).mockReturnValue({
      data: null,
      isFetching: true,
      isLoading: true,
    });

    render(
      <Provider store={mockStore as any}>
        <Router>
          <ClaimAccount />
        </Router>
      </Provider>
    );

    expect(screen.getByText(/validating token/i)).toBeInTheDocument();
  });

  test('displays error for invalid/expired token', () => {
    (adminApiSlice.useValidateClaimQuery as jest.Mock).mockReturnValue({
      data: { error: 'Token expired' },
      isFetching: false,
    });

    render(
      <Provider store={mockStore as any}>
        <Router>
          <ClaimAccount />
        </Router>
      </Provider>
    );

    expect(screen.getByText(/token expired/i)).toBeInTheDocument();
  });

  test('shows user email and password form for valid token', () => {
    (adminApiSlice.useValidateClaimQuery as jest.Mock).mockReturnValue({
      data: { user: { email: 'john@example.com', role: 'tenant' } },
      isFetching: false,
    });

    render(
      <Provider store={mockStore as any}>
        <Router>
          <ClaimAccount />
        </Router>
      </Provider>
    );

    expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('validates password length requirement', async () => {
    (adminApiSlice.useValidateClaimQuery as jest.Mock).mockReturnValue({
      data: { user: { email: 'john@example.com', role: 'tenant' } },
      isFetching: false,
    });
    (adminApiSlice.useClaimAccountMutation as jest.Mock).mockReturnValue([jest.fn()]);

    render(
      <Provider store={mockStore as any}>
        <Router>
          <ClaimAccount />
        </Router>
      </Provider>
    );

    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value: 'short' } });

    const claimButton = screen.getByRole('button', { name: /claim account/i });
    fireEvent.click(claimButton);

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  test('successfully claims account and navigates to onboarding', async () => {
    const mockClaimFn = jest.fn().mockResolvedValue({
      data: { user: { id: '1', email: 'john@example.com', role: 'tenant', firstName: 'John' } },
    });

    (adminApiSlice.useValidateClaimQuery as jest.Mock).mockReturnValue({
      data: { user: { email: 'john@example.com', role: 'tenant' } },
      isFetching: false,
    });
    (adminApiSlice.useClaimAccountMutation as jest.Mock).mockReturnValue([
      {
        unwrap: () => Promise.resolve({ data: { email: 'john@example.com', role: 'tenant', firstName: 'John' } }),
      },
      { isLoading: false },
    ]);

    render(
      <Provider store={mockStore as any}>
        <Router>
          <ClaimAccount />
        </Router>
      </Provider>
    );

    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });

    const claimButton = screen.getByRole('button', { name: /claim account/i });
    fireEvent.click(claimButton);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled(); // setUser dispatch
    });
  });

  test('displays error message on claim failure', async () => {
    const mockError = { data: { message: 'Token already used' } };
    const mockClaimFn = jest.fn().mockRejectedValue(mockError);

    (adminApiSlice.useValidateClaimQuery as jest.Mock).mockReturnValue({
      data: { user: { email: 'john@example.com', role: 'tenant' } },
      isFetching: false,
    });
    (adminApiSlice.useClaimAccountMutation as jest.Mock).mockReturnValue([
      {
        unwrap: () => Promise.reject(mockError),
      },
      { isLoading: false },
    ]);

    render(
      <Provider store={mockStore as any}>
        <Router>
          <ClaimAccount />
        </Router>
      </Provider>
    );

    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });

    const claimButton = screen.getByRole('button', { name: /claim account/i });
    fireEvent.click(claimButton);

    await waitFor(() => {
      expect(screen.getByText(/token already used/i)).toBeInTheDocument();
    });
  });

  test('cancel button navigates to home', async () => {
    (adminApiSlice.useValidateClaimQuery as jest.Mock).mockReturnValue({
      data: { user: { email: 'john@example.com', role: 'tenant' } },
      isFetching: false,
    });

    render(
      <Provider store={mockStore as any}>
        <Router>
          <ClaimAccount />
        </Router>
      </Provider>
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
