// services/auth/google-auth.service.ts
// Native (Android/iOS) Google authentication using @react-native-google-signin/google-signin

import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";
import { AuthService, AuthResult, User } from "../auth.service";
import {
  saveAuthToken,
  getAuthToken,
  clearAuthToken,
  saveSecureData,
  clearSecureData,
} from "../../utils/secureStorage";
import { userService } from "../user.service";

const SCOPES = [
  "openid",
  "profile",
  "email",
  "https://www.googleapis.com/auth/drive",
];

class GoogleAuthService implements AuthService {
  private clientId: string = "";
  private clientSecret: string = "";
  private androidClientId: string = "";

  async initialize(): Promise<void> {
    if (this.clientId) return;

    this.clientId =
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
      Constants.expoConfig?.extra?.googleWebClientId ??
      Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
      "";
    this.clientSecret =
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET ??
      Constants.expoConfig?.extra?.googleClientSecret ??
      Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET ??
      "";
    this.androidClientId =
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ??
      Constants.expoConfig?.extra?.googleAndroidClientId ??
      Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ??
      "";

    if (!this.clientId) {
      console.warn("Google Auth: GOOGLE_WEB_CLIENT_ID not found");
    }
    if (!this.clientSecret) {
      console.warn("Google Auth: GOOGLE_CLIENT_SECRET not found");
    }
    if (!this.androidClientId) {
      console.warn("Google Auth: GOOGLE_ANDROID_CLIENT_ID not found");
    }

    GoogleSignin.configure({
      webClientId: this.clientId,
      // androidClientId: this.androidClientId || undefined,
      scopes: SCOPES,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  }

  async signIn(): Promise<AuthResult> {
    try {
      await this.initialize();

      await GoogleSignin.hasPlayServices();

      const signInResult = await GoogleSignin.signIn();

      const tokens = await GoogleSignin.getTokens();
      const accessToken = tokens.accessToken;
      const idToken = tokens.idToken;

      if (!accessToken) {
        throw new Error("No access token received from Google");
      }

      const user: User = {
        id: signInResult.user.id,
        email: signInResult.user.email,
        name: signInResult.user.name ?? undefined,
        photoURL: signInResult.user.photo ?? undefined,
      };

      await saveAuthToken(accessToken);
      if (idToken) {
        await saveSecureData("google_id_token", idToken);
      }

      try {
        if (signInResult.user.id) {
          await userService.upsertUser({
            googleId: signInResult.user.id,
            email: user.email || "",
            name: user.name,
            photoURL: user.photoURL,
            idToken: idToken || "",
            accessToken,
          });
        }
      } catch (dbError) {
        console.error("Failed to sync user to database:", dbError);
      }

      return { user, token: accessToken, provider: "google" };
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      throw this.handleAuthError(error);
    }
  }

  // services/auth/google-auth.service.ts

  async refreshAccessToken(): Promise<string | null> {
    try {
      await this.initialize();

      // 1. Obtener el token actual para limpiar la caché si es necesario
      const currentTokens = await GoogleSignin.getTokens();
      if (currentTokens.accessToken) {
        // Limpia el token de acceso de la caché local (efectivo en Android)
        await GoogleSignin.clearCachedAccessToken(currentTokens.accessToken);
      }

      // 2. Ahora intenta obtener tokens frescos
      const freshTokens = await GoogleSignin.getTokens();
      let newAccessToken = freshTokens.accessToken;

      if (!newAccessToken) {
        // Si aún no hay token, intenta un inicio de sesión silencioso
        await GoogleSignin.signInSilently();
        const silentTokens = await GoogleSignin.getTokens();
        newAccessToken = silentTokens.accessToken;
      }

      if (newAccessToken) {
        await saveAuthToken(newAccessToken);
      }
      return newAccessToken || null;
    } catch (error) {
      console.error("[GoogleAuth] Failed to refresh access token:", error);
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
      await clearAuthToken();
      await clearSecureData("google_id_token");
      await userService.clearCache();
    } catch (error) {
      console.error("Google sign-out error:", error);
      throw this.handleAuthError(error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      let currentUser = await GoogleSignin.getCurrentUser();

      if (!currentUser) {
        try {
          currentUser = await GoogleSignin.signInSilently();
        } catch {
          return null;
        }
      }

      if (!currentUser) return null;

      return {
        id: currentUser.user.id,
        email: currentUser.user.email,
        name: currentUser.user.name ?? undefined,
        photoURL: currentUser.user.photo ?? undefined,
      };
    } catch (error) {
      console.error("[GoogleAuth] Error getting current user:", error);
      await clearAuthToken();
      await userService.clearCache();
      return null;
    }
  }

  async getAuthToken(): Promise<string | null> {
    return getAuthToken();
  }

  private handleAuthError(error: any): Error {
    if (!error) {
      return new Error("Google authentication failed – please try again");
    }

    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return new Error("Sign-in cancelled");
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      return new Error("Sign-in already in progress");
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return new Error("Google Play Services are not available");
    }

    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("network"))
      return new Error("Network error – check your connection");
    if (msg.includes("timeout"))
      return new Error("Request timed out – please try again");

    return new Error(
      error.message || "Google authentication failed – please try again",
    );
  }
}

export default GoogleAuthService;
