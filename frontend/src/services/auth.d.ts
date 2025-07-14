// Type definitions for auth service
declare module '../services/auth' {
  export interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    role: string;
    preferences?: NotificationPreferences;
  }

  export interface LoginResponse {
    user: User;
    token: string;
  }

  export interface NotificationPreferences {
    email?: boolean;
    push?: boolean;
    inApp?: boolean;
    frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly';
    [key: string]: any;
  }

  const authService: {
    login(email: string, password: string): Promise<LoginResponse>;
    logout(): Promise<void>;
    getCurrentUser(): Promise<User>;
    updateUserPreferences(preferences: NotificationPreferences): Promise<User>;
  };

  export default authService;
}
