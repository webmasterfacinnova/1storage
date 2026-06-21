// services/auth.service.ts
// Core authentication service interface and factory

import { FirebaseAuthService } from './auth/firebase-auth.service';

export interface AuthCredentials {
  email?: string;
  password?: string;
  provider?: 'google' | 'apple' | 'email';
  token?: string;
}

export interface AuthResult {
  user: User;
  token: string;
  provider: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  photoURL?: string;
}

export interface AuthService {
  initialize(): Promise<void>;
  signIn(credentials: AuthCredentials): Promise<AuthResult>;
  signUp(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  getAuthToken(): Promise<string | null>;
  resetPassword(email: string): Promise<void>;
  linkProvider(provider: string): Promise<AuthResult>;
}

// Factory function for creating auth service instances
const createAuthService = (): AuthService => {
  // In a real implementation, this would be configurable
  return new FirebaseAuthService();
};

export const authService = createAuthService();

export default createAuthService;