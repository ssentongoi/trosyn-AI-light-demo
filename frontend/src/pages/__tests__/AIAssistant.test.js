import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import AIAssistant from '../AIAssistant';

// Create a theme for testing
const theme = createTheme();

// Mock the AI service module
jest.mock('../../services/aiService', () => ({
  __esModule: true,
  default: {
    getConversations: jest.fn().mockResolvedValue([
      { id: '1', title: 'Test Conversation 1', timestamp: new Date() },
      { id: '2', title: 'Test Conversation 2', timestamp: new Date() }
    ]),
    sendMessage: jest.fn().mockResolvedValue({
      id: '1',
      content: 'Test response',
      role: 'assistant',
      timestamp: new Date()
    }),
    getMessages: jest.fn().mockResolvedValue([
      {
        id: '1',
        content: 'Test message',
        role: 'user',
        timestamp: new Date()
      },
      {
        id: '2',
        content: 'Test response',
        role: 'assistant',
        timestamp: new Date()
      }
    ]),
    createConversation: jest.fn().mockResolvedValue({ id: '3', title: 'New Conversation', timestamp: new Date() }),
    deleteConversation: jest.fn().mockResolvedValue(true),
    renameConversation: jest.fn().mockResolvedValue(true)
  }
}));

// Mock the useSnackbar hook
const mockEnqueueSnackbar = jest.fn();
jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: () => ({
    enqueueSnackbar: mockEnqueueSnackbar,
    closeSnackbar: jest.fn()
  })
}));

// Create a mock for react-router-dom functions
const mockUseParams = jest.fn().mockReturnValue({ conversationId: '1' });
const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockUseParams(),
  useNavigate: () => mockUseNavigate
}));

describe('AIAssistant Component', () => {
  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <SnackbarProvider>
            <AIAssistant />
          </SnackbarProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the AI Assistant component', async () => {
    await act(async () => {
      renderComponent();
    });
    
    // Check if the component renders with the correct title
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('renders the message input field', async () => {
    await act(async () => {
      renderComponent();
    });
    
    // Check if the message input is present
    const inputField = screen.getByTestId('message-input');
    expect(inputField).toBeInTheDocument();
  });

  it('renders the send button', async () => {
    await act(async () => {
      renderComponent();
    });
    
    // Check if the send button is present
    const sendButton = screen.getByTestId('send-button');
    expect(sendButton).toBeInTheDocument();
  });

  it('renders the welcome message when no conversation is active', async () => {
    // Change the mock implementation for this specific test
    mockUseParams.mockReturnValueOnce({ conversationId: undefined });
    
    await act(async () => {
      renderComponent();
    });
    
    // Check if the welcome message is displayed
    expect(screen.getByText(/welcome to trosyn ai assistant/i)).toBeInTheDocument();
    
    // Reset the mock for subsequent tests
    mockUseParams.mockReturnValue({ conversationId: '1' });
  });
});
