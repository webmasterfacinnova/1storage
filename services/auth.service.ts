// services/auth.service.ts
// Core authentication service interface and factory
// Auth is handled via Google OAuth directly – no Firebase dependency.

import GoogleAuthService from './auth/google-auth.service';

export interface AuthCredentials {
  email?: string;
  password?: string;
  provider?: 'google' | 'apple';
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
  signIn(): Promise<AuthResult>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  getAuthToken(): Promise<string | null>;
}

// Only Google Auth is active for now.
// Extend the factory when Apple / other providers are added.
const createAuthService = (): AuthService => {
  return new GoogleAuthService();
};

export const authService = createAuthService();

export default createAuthService;
