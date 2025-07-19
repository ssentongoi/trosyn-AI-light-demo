import { vi } from 'vitest';

export default {
  login: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  isAuthenticated: vi.fn(),
  getAuthHeader: vi.fn(),
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setAuthTokens: vi.fn(),
  clearAuth: vi.fn(),
  isTokenExpired: vi.fn(),
  isRefreshTokenExpired: vi.fn(),
  refreshToken: vi.fn(),
  parseJwt: vi.fn(),
};
