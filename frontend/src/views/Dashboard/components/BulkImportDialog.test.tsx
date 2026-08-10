import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkImportDialog from './BulkImportDialog';
import * as adminApiSlice from '../../../redux/api/adminApiSlice';

jest.mock('../../../redux/api/adminApiSlice', () => ({
  useValidateImportMutation: jest.fn(),
  useCreateImportMutation: jest.fn(),
}));

describe('BulkImportDialog Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders dialog when open prop is true', () => {
    (adminApiSlice.useValidateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);
    (adminApiSlice.useCreateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);

    render(<BulkImportDialog open={true} onClose={mockOnClose} />);

    expect(screen.getByText(/bulk import users/i)).toBeInTheDocument();
  });

  test('does not render when open prop is false', () => {
    (adminApiSlice.useValidateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);
    (adminApiSlice.useCreateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);

    render(<BulkImportDialog open={false} onClose={mockOnClose} />);

    expect(screen.queryByText(/bulk import users/i)).not.toBeInTheDocument();
  });

  test('shows CSV format help text', () => {
    (adminApiSlice.useValidateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);
    (adminApiSlice.useCreateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);

    render(<BulkImportDialog open={true} onClose={mockOnClose} />);

    expect(screen.getByText(/firstName,lastName,email,phone,role/i)).toBeInTheDocument();
  });

  test('displays loading state during validation', async () => {
    const mockValidate = jest.fn(() => Promise.resolve());
    (adminApiSlice.useValidateImportMutation as jest.Mock).mockReturnValue([mockValidate]);
    (adminApiSlice.useCreateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);

    render(<BulkImportDialog open={true} onClose={mockOnClose} />);

    const file = new File(['a,b,c'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { name: '' }) as HTMLInputElement;

    // Simulate file selection
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockValidate).toHaveBeenCalled();
    });
  });

  test('displays preview data after validation', async () => {
    const mockValidate = jest.fn().mockResolvedValue({
      data: {
        valid: [
          { raw: { firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '1234567890', role: 'tenant' } },
          { raw: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '0987654321', role: 'landlord' } },
        ],
        invalid: [],
      },
    });

    (adminApiSlice.useValidateImportMutation as jest.Mock).mockReturnValue([mockValidate]);
    (adminApiSlice.useCreateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);

    render(<BulkImportDialog open={true} onClose={mockOnClose} />);

    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { name: '' }) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/valid rows: 2/i)).toBeInTheDocument();
    });
  });

  test('shows error rows with error messages', async () => {
    const mockValidate = jest.fn().mockResolvedValue({
      data: {
        valid: [
          { raw: { firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '1234567890', role: 'tenant' } },
        ],
        invalid: [
          { row: 2, errors: ['Invalid email format'], raw: { firstName: 'Jane', email: 'invalid', role: 'tenant' } },
          { row: 3, errors: ['Missing required field: phone'], raw: { firstName: 'Bob', email: 'bob@test.com', role: 'landlord' } },
        ],
      },
    });

    (adminApiSlice.useValidateImportMutation as jest.Mock).mockReturnValue([mockValidate]);
    (adminApiSlice.useCreateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);

    render(<BulkImportDialog open={true} onClose={mockOnClose} />);

    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { name: '' }) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/invalid rows/i)).toBeInTheDocument();
      expect(screen.getByText(/row 2/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  test('provides download failures CSV button', async () => {
    const mockValidate = jest.fn().mockResolvedValue({
      data: {
        valid: [],
        invalid: [
          { row: 1, errors: ['Invalid email'], raw: { firstName: 'John', email: 'invalid', role: 'tenant' } },
        ],
      },
    });

    (adminApiSlice.useValidateImportMutation as jest.Mock).mockReturnValue([mockValidate]);
    (adminApiSlice.useCreateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);

    render(<BulkImportDialog open={true} onClose={mockOnClose} />);

    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { name: '' }) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download failures csv/i })).toBeInTheDocument();
    });
  });

  test('disables create button until file is selected', () => {
    (adminApiSlice.useValidateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);
    (adminApiSlice.useCreateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);

    render(<BulkImportDialog open={true} onClose={mockOnClose} />);

    const createButton = screen.getByRole('button', { name: /create accounts/i });
    expect(createButton).toBeDisabled();
  });

  test('successfully creates accounts with valid CSV', async () => {
    const mockValidate = jest.fn().mockResolvedValue({
      data: {
        valid: [{ raw: { firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '123', role: 'tenant' } }],
        invalid: [],
      },
    });

    const mockCreate = jest.fn().mockResolvedValue({ data: { success: true } });

    (adminApiSlice.useValidateImportMutation as jest.Mock).mockReturnValue([mockValidate]);
    (adminApiSlice.useCreateImportMutation as jest.Mock).mockReturnValue([mockCreate]);

    render(<BulkImportDialog open={true} onClose={mockOnClose} />);

    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { name: '' }) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const createButton = screen.getByRole('button', { name: /create accounts/i });
      expect(createButton).not.toBeDisabled();
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  test('cancel button closes dialog', () => {
    (adminApiSlice.useValidateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);
    (adminApiSlice.useCreateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);

    render(<BulkImportDialog open={true} onClose={mockOnClose} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('shows selected valid rows count', async () => {
    const mockValidate = jest.fn().mockResolvedValue({
      data: {
        valid: [
          { raw: { firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '123', role: 'tenant' } },
          { raw: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '456', role: 'landlord' } },
        ],
        invalid: [],
      },
    });

    (adminApiSlice.useValidateImportMutation as jest.Mock).mockReturnValue([mockValidate]);
    (adminApiSlice.useCreateImportMutation as jest.Mock).mockReturnValue([jest.fn()]);

    render(<BulkImportDialog open={true} onClose={mockOnClose} />);

    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { name: '' }) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/valid rows: 2 • invalid rows: 0/i)).toBeInTheDocument();
    });
  });
});
