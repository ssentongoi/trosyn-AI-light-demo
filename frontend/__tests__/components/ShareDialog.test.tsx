import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import ShareDialog from '@/components/document/ShareDialog';
import { mockDocument } from '../utils/testUtils';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('ShareDialog', () => {
  const mockOnClose = vi.fn();
  
  const renderComponent = (props = {}) => {
    return render(
      <ShareDialog
        open={true}
        onClose={mockOnClose}
        document={mockDocument}
        {...props}
      />
    );
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders the share dialog', () => {
    renderComponent();
    expect(screen.getByText(/share "/i)).toBeInTheDocument();
  });
  
  it('allows entering an email address', async () => {
    renderComponent();
    
    const emailInput = screen.getByPlaceholderText('Enter email addresses');
    await userEvent.type(emailInput, 'test@example.com');
    
    expect(emailInput).toHaveValue('test@example.com');
  });
  
  it('allows selecting permission level', async () => {
    renderComponent();
    
    // Default should be 'Can view'
    expect(screen.getByText('Can view')).toBeInTheDocument();
    
    // Open the permission dropdown
    const permissionSelect = screen.getByRole('combobox');
    await userEvent.click(permissionSelect);
    
    // Select 'Can edit'
    const editOption = screen.getByText('Can edit');
    await userEvent.click(editOption);
    
    // Should now show 'Can edit'
    expect(screen.getByText('Can edit')).toBeInTheDocument();
  });
  
  it('shows an error for invalid email format', async () => {
    renderComponent();
    
    const emailInput = screen.getByPlaceholderText('Enter email addresses');
    const inviteButton = screen.getByRole('button', { name: /invite/i });
    
    // Enter invalid email
    await userEvent.type(emailInput, 'invalid-email');
    await userEvent.click(inviteButton);
    
    // Should show error message
    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
  });
  
  it('copies the shareable link to clipboard', async () => {
    renderComponent();
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    await userEvent.click(copyButton);
    
    // Should call clipboard API
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining(`/document/${mockDocument.id}`)
    );
    
    // Should show success message
    expect(screen.getByText(/link copied to clipboard/i)).toBeInTheDocument();
  });
  
  it('shows a list of existing collaborators', () => {
    renderComponent();
    
    // Should show the mock collaborator
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Can edit')).toBeInTheDocument();
  });
  
  it('allows removing a collaborator', async () => {
    renderComponent();
    
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await userEvent.click(removeButtons[0]);
    
    // Should show success message
    expect(screen.getByText(/collaborator removed/i)).toBeInTheDocument();
  });
  
  it('shows loading state when sending invitation', async () => {
    // Mock a slow API call
    const mockInvite = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    renderComponent({
      // In a real app, you would mock the API call that handles the invitation
    });
    
    const emailInput = screen.getByPlaceholderText('Enter email addresses');
    const inviteButton = screen.getByRole('button', { name: /invite/i });
    
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.click(inviteButton);
    
    // Button should show loading state
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(inviteButton).toBeDisabled();
  });
  
  it('shows an error when invitation fails', async () => {
    // Mock a failed API call
    const mockInvite = vi.fn().mockRejectedValue(new Error('Failed to send invitation'));
    
    renderComponent({
      // In a real app, you would mock the API call to reject
    });
    
    const emailInput = screen.getByPlaceholderText('Enter email addresses');
    const inviteButton = screen.getByRole('button', { name: /invite/i });
    
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.click(inviteButton);
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/failed to send invitation/i)).toBeInTheDocument();
    });
  });
  
  it('calls onClose when close button is clicked', async () => {
    renderComponent();
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  
  it('handles keyboard navigation', async () => {
    renderComponent();
    
    // Focus the email input
    const emailInput = screen.getByPlaceholderText('Enter email addresses');
    emailInput.focus();
    
    // Tab to the permission select
    await userEvent.tab();
    expect(screen.getByRole('combobox')).toHaveFocus();
    
    // Tab to the invite button
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /invite/i })).toHaveFocus();
    
    // Tab to the shareable link input
    await userEvent.tab();
    expect(screen.getByRole('textbox', { name: /shareable link/i })).toHaveFocus();
    
    // Tab to the copy button
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /copy/i })).toHaveFocus();
  });
});
