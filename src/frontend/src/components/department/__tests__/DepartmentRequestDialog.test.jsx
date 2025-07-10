import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DepartmentRequestDialog from '../DepartmentRequestDialog';

// Mock data for testing
const mockRequest = {
  id: 'REQ-2023-001',
  title: 'Test Request',
  description: 'This is a test request description',
  status: 'pending',
  priority: 'high',
  type: 'equipment',
  requester: { id: 1, name: 'John Doe', email: 'john.doe@example.com', avatar: 'JD' },
  department: { id: 101, name: 'Engineering' },
  created_at: new Date('2023-10-15T10:30:00'),
  updated_at: new Date('2023-10-15T10:30:00'),
  due_date: new Date('2023-11-15T23:59:59'),
  attachments: [
    { id: 1, name: 'test.pdf', size: 1024000, type: 'application/pdf' }
  ],
  comments: [
    { id: 1, user: { name: 'John Doe' }, text: 'Test comment', created_at: new Date('2023-10-15T10:30:00') }
  ],
  history: [
    { id: 1, action: 'created', user: { name: 'John Doe' }, timestamp: new Date('2023-10-15T10:30:00') }
  ],
  approvers: [
    { id: 2, name: 'Jane Smith', email: 'jane.smith@example.com', status: 'pending', role: 'Department Head' }
  ]
};

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

describe('DepartmentRequestDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnApprove = vi.fn();
  const mockOnReject = vi.fn();
  const mockOnComment = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders dialog with request details when open', () => {
    renderWithTheme(
      <DepartmentRequestDialog
        open={true}
        onClose={mockOnClose}
        request={mockRequest}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onComment={mockOnComment}
      />
    );
    
    // Check if the dialog title contains the request title
    expect(screen.getByText(mockRequest.title)).toBeInTheDocument();
    
    // Check if the request ID is displayed
    expect(screen.getByText(mockRequest.id)).toBeInTheDocument();
    
    // Check if the status chip is displayed
    expect(screen.getByText('Pending')).toBeInTheDocument();
    
    // Check if the priority chip is displayed
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  test('does not render dialog when closed', () => {
    renderWithTheme(
      <DepartmentRequestDialog
        open={false}
        onClose={mockOnClose}
        request={mockRequest}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onComment={mockOnComment}
      />
    );
    
    // Check if the dialog is not rendered
    expect(screen.queryByText(mockRequest.title)).not.toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    renderWithTheme(
      <DepartmentRequestDialog
        open={true}
        onClose={mockOnClose}
        request={mockRequest}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onComment={mockOnComment}
      />
    );
    
    // Click the close button
    fireEvent.click(screen.getByLabelText('close'));
    
    // Check if onClose was called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onApprove when approve button is clicked', () => {
    renderWithTheme(
      <DepartmentRequestDialog
        open={true}
        onClose={mockOnClose}
        request={mockRequest}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onComment={mockOnComment}
      />
    );
    
    // Click the approve button
    fireEvent.click(screen.getByText('Approve'));
    
    // Check if onApprove was called
    expect(mockOnApprove).toHaveBeenCalledTimes(1);
  });

  test('switches tabs when tab is clicked', () => {
    renderWithTheme(
      <DepartmentRequestDialog
        open={true}
        onClose={mockOnClose}
        request={mockRequest}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onComment={mockOnComment}
      />
    );
    
    // Initially the Details tab should be active
    expect(screen.getByText('Request Details')).toBeInTheDocument();
    
    // Click the Comments tab
    fireEvent.click(screen.getByText('Comments'));
    
    // Check if the Comments tab content is displayed
    expect(screen.getByText('Add a comment')).toBeInTheDocument();
    
    // Click the Attachments tab
    fireEvent.click(screen.getByText('Attachments'));
    
    // Check if the Attachments tab content is displayed
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    
    // Click the History tab
    fireEvent.click(screen.getByText('History'));
    
    // Check if the History tab content is displayed
    expect(screen.getByText(/created this request/i)).toBeInTheDocument();
  });

  test('submits comment when post comment button is clicked', async () => {
    renderWithTheme(
      <DepartmentRequestDialog
        open={true}
        onClose={mockOnClose}
        request={mockRequest}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onComment={mockOnComment}
      />
    );
    
    // Click the Comments tab
    fireEvent.click(screen.getByText('Comments'));
    
    // Type a comment
    const commentInput = screen.getByPlaceholderText('Type your comment here...');
    fireEvent.change(commentInput, { target: { value: 'New test comment' } });
    
    // Click the Post Comment button
    fireEvent.click(screen.getByText('Post Comment'));
    
    // Wait for the comment to be submitted
    await waitFor(() => {
      expect(mockOnComment).toHaveBeenCalledWith('New test comment');
    });
  });

  test('does not submit empty comment', () => {
    renderWithTheme(
      <DepartmentRequestDialog
        open={true}
        onClose={mockOnClose}
        request={mockRequest}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onComment={mockOnComment}
      />
    );
    
    // Click the Comments tab
    fireEvent.click(screen.getByText('Comments'));
    
    // Click the Post Comment button without typing anything
    fireEvent.click(screen.getByText('Post Comment'));
    
    // Check that onComment was not called
    expect(mockOnComment).not.toHaveBeenCalled();
  });

  test('displays requester information correctly', () => {
    renderWithTheme(
      <DepartmentRequestDialog
        open={true}
        onClose={mockOnClose}
        request={mockRequest}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onComment={mockOnComment}
      />
    );
    
    // Check if the requester name is displayed
    expect(screen.getByText(mockRequest.requester.name)).toBeInTheDocument();
    
    // Check if the requester email is displayed
    expect(screen.getByText(mockRequest.requester.email)).toBeInTheDocument();
  });
});
