
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../../contexts/AuthContext';
import DeviceRegistration from '../DeviceRegistration';

// Mock the AuthContext
const mockAuth = {
  currentUser: {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
  },
};

// Mock the useAuth hook
vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...(actual as object),
    useAuth: () => mockAuth,
  };
});

describe('DeviceRegistration', () => {
  const renderComponent = () => {
    return render(
      <Router>
        <AuthProvider>
          <DeviceRegistration />
        </AuthProvider>
      </Router>
    );
  };

  beforeEach(() => {
    // Mock window.btoa which is used in the component
    global.btoa = vi.fn((str) => Buffer.from(str, 'binary').toString('base64'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the device registration form', () => {
    renderComponent();
    
    expect(screen.getByText('Device Registration')).toBeInTheDocument();
    expect(screen.getByLabelText('Device ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Device Name')).toBeInTheDocument();
    expect(screen.getByText('Register Device')).toBeInTheDocument();
  });

  it('shows validation errors when form is submitted empty', async () => {
    renderComponent();
    
    const registerButton = screen.getByText('Register Device');
    fireEvent.click(registerButton);
    
    expect(await screen.findByText('Device ID and Name are required')).toBeInTheDocument();
  });

  it('allows entering device ID and name', () => {
    renderComponent();
    
    const deviceIdInput = screen.getByLabelText('Device ID');
    const deviceNameInput = screen.getByLabelText('Device Name');
    
    fireEvent.change(deviceIdInput, { target: { value: 'DEV-123' } });
    fireEvent.change(deviceNameInput, { target: { value: 'Test Device' } });
    
    expect(deviceIdInput).toHaveValue('DEV-123');
    expect(deviceNameInput).toHaveValue('Test Device');
  });

  it('generates a new PIN when New PIN button is clicked', () => {
    renderComponent();
    
    const newPinButton = screen.getByText('New PIN');
    const pinInput = screen.getByLabelText('Verification PIN:');
    const initialPin = pinInput.getAttribute('value');
    
    fireEvent.click(newPinButton);
    
    expect(pinInput).not.toHaveValue(initialPin);
  });

  it('toggles PIN visibility', () => {
    renderComponent();
    
    const visibilityButton = screen.getByLabelText('toggle password visibility');
    const pinInput = screen.getByLabelText('Verification PIN:');
    
    // Initially should be password type
    expect(pinInput).toHaveAttribute('type', 'password');
    
    // Click to show
    fireEvent.click(visibilityButton);
    expect(pinInput).toHaveAttribute('type', 'text');
    
    // Click to hide again
    fireEvent.click(visibilityButton);
    expect(pinInput).toHaveAttribute('type', 'password');
  });

  it('copies PIN to clipboard', async () => {
    // Mock the clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    renderComponent();
    
    const copyButton = screen.getByLabelText('copy');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(screen.getByText('Copied to clipboard!')).toBeInTheDocument();
    });
  });

  it('switches between register and device list tabs', () => {
    renderComponent();
    
    // Initially on the register tab
    expect(screen.getByText('Register New Device')).toHaveAttribute('aria-selected', 'true');
    
    // Click on the My Devices tab
    const devicesTab = screen.getByText('My Devices');
    fireEvent.click(devicesTab);
    
    // Should now be on the devices tab
    expect(devicesTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Office Desktop')).toBeInTheDocument();
  });

  it('handles device verification', async () => {
    renderComponent();
    
    // Switch to the devices tab
    const devicesTab = screen.getByText('My Devices');
    fireEvent.click(devicesTab);
    
    // Find and click the verify button for the pending device
    const verifyButton = screen.getByText('Verify');
    fireEvent.click(verifyButton);
    
    // Wait for the success message
    await waitFor(() => {
      expect(screen.getByText('Device verified successfully')).toBeInTheDocument();
    });
  });

  it('handles device removal', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);
    
    renderComponent();
    
    // Switch to the devices tab
    const devicesTab = screen.getByText('My Devices');
    fireEvent.click(devicesTab);
    
    // Find and click the remove button for a device
    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);
    
    // Should show confirmation dialog
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to remove this device?');
    
    // Wait for the success message
    await waitFor(() => {
      expect(screen.getByText('Device removed successfully')).toBeInTheDocument();
    });
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });
});
