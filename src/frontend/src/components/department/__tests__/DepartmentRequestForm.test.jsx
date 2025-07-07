import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DepartmentRequestForm from '../DepartmentRequestForm';

// Create a theme for testing
const theme = createTheme();

// Test wrapper component
const renderWithTheme = (ui) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('DepartmentRequestForm', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();
  
  // Mock existing request for edit mode
  const mockRequest = {
    id: 'REQ-2023-001',
    title: 'Existing Request',
    description: 'This is an existing request',
    type: 'equipment',
    priority: 'high',
    department: 'Engineering',
    due_date: '2023-11-15',
    attachments: [
      { id: 1, name: 'test.pdf', size: 1024000, type: 'application/pdf' }
    ],
    approvers: ['jane.smith@example.com']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders form dialog when open', () => {
    renderWithTheme(
      <DepartmentRequestForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );
    
    // Check if the dialog title is displayed
    expect(screen.getByText('New Department Request')).toBeInTheDocument();
    
    // Check if form fields are rendered
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/request type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/department/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/approvers/i)).toBeInTheDocument();
  });

  test('does not render form when closed', () => {
    renderWithTheme(
      <DepartmentRequestForm
        open={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );
    
    // Check if the dialog is not rendered
    expect(screen.queryByText('New Department Request')).not.toBeInTheDocument();
  });

  test('calls onClose when cancel button is clicked', () => {
    renderWithTheme(
      <DepartmentRequestForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );
    
    // Click the cancel button
    fireEvent.click(screen.getByText('Cancel'));
    
    // Check if onClose was called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('validates required fields before submission', async () => {
    renderWithTheme(
      <DepartmentRequestForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );
    
    // Try to submit the form without filling required fields
    const submitButton = screen.getByText(/submit request/i);
    expect(submitButton).toBeDisabled();
    
    // Fill in the title field
    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'Test Request' } });
    
    // Submit button should still be disabled
    expect(submitButton).toBeDisabled();
    
    // Fill in the description field
    const descriptionInput = screen.getByLabelText(/description/i);
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    
    // Submit button should now be enabled
    expect(submitButton).not.toBeDisabled();
  });

  test('submits form with correct data', async () => {
    renderWithTheme(
      <DepartmentRequestForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );
    
    // Fill in the form fields
    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'Test Request' } });
    
    const descriptionInput = screen.getByLabelText(/description/i);
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    
    const typeSelect = screen.getByLabelText(/request type/i);
    fireEvent.mouseDown(typeSelect);
    const equipmentOption = screen.getByText('Equipment');
    fireEvent.click(equipmentOption);
    
    const prioritySelect = screen.getByLabelText(/priority/i);
    fireEvent.mouseDown(prioritySelect);
    const highOption = screen.getByText('High');
    fireEvent.click(highOption);
    
    const departmentSelect = screen.getByLabelText(/department/i);
    fireEvent.mouseDown(departmentSelect);
    const hrOption = screen.getByText('Human Resources');
    fireEvent.click(hrOption);
    
    const dueDateInput = screen.getByLabelText(/due date/i);
    fireEvent.change(dueDateInput, { target: { value: '2023-12-31' } });
    
    // Submit the form
    fireEvent.click(screen.getByText(/submit request/i));
    
    // Check if onSubmit was called with the correct data
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test Request',
        description: 'Test Description',
        type: 'equipment',
        priority: 'high',
        department: 'HR',
        due_date: '2023-12-31'
      }));
    });
  });

  test('pre-fills form fields when editing an existing request', () => {
    renderWithTheme(
      <DepartmentRequestForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        request={mockRequest}
      />
    );
    
    // Check if the form fields are pre-filled with the existing request data
    expect(screen.getByLabelText(/title/i)).toHaveValue(mockRequest.title);
    expect(screen.getByLabelText(/description/i)).toHaveValue(mockRequest.description);
    
    // Check if the dialog title indicates edit mode
    expect(screen.getByText('Edit Request')).toBeInTheDocument();
  });

  test('handles attachment operations correctly', async () => {
    renderWithTheme(
      <DepartmentRequestForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        request={mockRequest}
      />
    );
    
    // Check if existing attachment is displayed
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    
    // Mock file input change
    const file = new File(['dummy content'], 'new-file.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/add file/i);
    
    // Simulate file selection
    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });
    fireEvent.change(fileInput);
    
    // Check if the new file name is displayed
    expect(screen.getByText('new-file.txt')).toBeInTheDocument();
    
    // Click the Add button to add the file to attachments
    fireEvent.click(screen.getByText('Add'));
    
    // Now both files should be in the attachments list
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    expect(screen.getByText('new-file.txt')).toBeInTheDocument();
    
    // Remove the original attachment
    const removeButtons = screen.getAllByLabelText('remove');
    fireEvent.click(removeButtons[0]);
    
    // Check if the original attachment is removed
    expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('new-file.txt')).toBeInTheDocument();
  });

  test('shows error when form submission fails', async () => {
    // Mock onSubmit to reject with an error
    const mockOnSubmitWithError = jest.fn().mockRejectedValue(new Error('Submission failed'));
    
    renderWithTheme(
      <DepartmentRequestForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmitWithError}
      />
    );
    
    // Fill in required fields
    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'Test Request' } });
    
    const descriptionInput = screen.getByLabelText(/description/i);
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    
    // Submit the form
    fireEvent.click(screen.getByText(/submit request/i));
    
    // Check if error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/submission failed/i)).toBeInTheDocument();
    });
  });
});
