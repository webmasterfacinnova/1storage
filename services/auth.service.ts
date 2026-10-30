// services/auth.service.ts
// Core authentication service interface and factory
// Auth is handled via Google OAuth directly – no Firebase dependency.

import { Platform } from "react-native";

export interface AuthCredentials {
  email?: string;
  password?: string;
  provider?: "google" | "apple";
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
  refreshAccessToken(): Promise<string | null>;
}

// Platform-aware factory: picks the correct Google Auth implementation
// - Native (Android/iOS): uses @react-native-google-signin/google-signin
// - Web: uses expo-auth-session (OAuth 2.0 code flow with PKCE)
const GoogleAuthServiceCtor: { new (): AuthService } =
  Platform.OS === "web"
    ? require("./auth/google-auth.service.web").default
    : require("./auth/google-auth.service").default;

const createAuthService = (): AuthService => {
  return new GoogleAuthServiceCtor();
};

export const authService = createAuthService();

export default createAuthService;
