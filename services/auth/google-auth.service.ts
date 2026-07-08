// services/auth/google-auth.service.ts
// Google Authentication service — direct OAuth, no Firebase
// Uses expo-auth-session's promptAsync (non-hook-based approach) for
// environments where hooks cannot be used (service class context).

import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
  makeRedirectUri,
  AuthRequest,
  ResponseType,
  exchangeCodeAsync,
} from 'expo-auth-session';
import Constants from 'expo-constants';
import { AuthService, AuthResult, User } from '../auth.service';
import { saveAuthToken, getAuthToken, clearAuthToken } from '../../utils/secureStorage';
import { userService } from '../user.service';

// Required for any auth session to work (closes the popup/redirect on web)
WebBrowser.maybeCompleteAuthSession();

// Google's OpenID Connect endpoints (Authorization Code + PKCE flow)
const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// @react-native-google-signin/google-signin is a native-only module and is
// not available on web. Load it lazily so the web bundle stays clean.
const getGoogleSignin = (): any | null => {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-google-signin/google-signin').GoogleSignin;
  } catch {
    return null;
  }
};

// OAuth scopes we request
const SCOPES = [
  'openid',
  'profile',
  'email',
];

class GoogleAuthService implements AuthService {
  private clientId: string = '';
  private clientSecret: string = '';

  async initialize(): Promise<void> {
    this.clientId = Constants.expoConfig?.extra?.googleWebClientId ?? Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
    // Google "Web application" clients require the client secret at the token
    // exchange step. It is read from EXPO_PUBLIC_GOOGLE_CLIENT_SECRET (kept in
    // .env.local, which is git-ignored). See the security note in signIn().
    this.clientSecret = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET ?? '';

    if (!this.clientId) {
      console.warn('Google Auth: GOOGLE_WEB_CLIENT_ID not found in app config');
    }

    const GoogleSignin = getGoogleSignin();
    if (!GoogleSignin) {
      // Web (or module unavailable): OAuth runs through expo-auth-session,
      // so no native configuration is required.
      return;
    }

    try {
      GoogleSignin.configure({
        webClientId: this.clientId,
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });
    } catch (error) {
      console.error('Google Sign-In initialization error:', error);
      throw new Error('Failed to initialize Google Sign-In');
    }
  }

  async signIn(): Promise<AuthResult> {
    try {
      // Exact redirect URI must be registered in the Google Cloud Console
      // (APIs & Services → Credentials → OAuth Web Client → Authorized redirect URIs).
      const redirectUri = makeRedirectUri({ preferLocalhost: true });
      console.log('[GoogleAuth] redirectUri =', redirectUri);

      // Authorization Code + PKCE flow (replaces the deprecated implicit flow).
      // NOTE: client_secret must NOT be sent in the authorization request —
      // Google rejects it ("Parameter not allowed... client_secret"). It is
      // only used later in the token exchange (exchangeCodeAsync).
      const request = new AuthRequest({
        clientId: this.clientId,
        scopes: SCOPES,
        redirectUri,
        responseType: ResponseType.Code,
        usePKCE: true,
        extraParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      });

      // Opens the OAuth screen (popup on web, in-app browser on native)
      const result = await request.promptAsync(DISCOVERY);

      if (result.type !== 'success' || !result.params?.code) {
        if (result.type === 'cancel' || result.type === 'dismiss') {
          throw new Error('Google sign-in cancelled');
        }
        const errDesc = (result as any)?.params?.error_description || (result as any)?.error?.message;
        throw new Error(errDesc || 'Google sign-in failed');
      }

      // Exchange the authorization code for tokens (PKCE code_verifier proves
      // this is the same client that started the flow).
      const tokenResponse = await exchangeCodeAsync(
        {
          clientId: this.clientId,
          clientSecret: this.clientSecret || undefined,
          code: result.params.code,
          redirectUri,
          extraParams: request.codeVerifier
            ? { code_verifier: request.codeVerifier }
            : {},
        },
        DISCOVERY,
      );

      const accessToken = tokenResponse.accessToken;
      const idToken = tokenResponse.idToken ?? '';

      if (!accessToken) {
        throw new Error('No access token received from Google');
      }

      // Fetch user info from Google
      const userInfo = await this.getUserInfo(accessToken);

      const user: User = {
        id: userInfo.sub ?? userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        photoURL: userInfo.picture,
      };

      // Save tokens locally
      await saveAuthToken(accessToken);

      // Sync user to MongoDB (create/update profile) — non-critical
      try {
        if (userInfo.sub) {
          await userService.upsertUser({
            googleId: userInfo.sub,
            email: user.email || '',
            name: user.name,
            photoURL: user.photoURL,
            idToken: idToken || '',
            accessToken,
          });
        }
      } catch (dbError) {
        // Non-critical: user can still use the app with local session
        console.error('Failed to sync user to database:', dbError);
      }

      return { user, token: accessToken, provider: 'google' };
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw this.handleAuthError(error);
    }
  }

  async signOut(): Promise<void> {
    try {
      const GoogleSignin = getGoogleSignin();
      if (GoogleSignin) {
        await GoogleSignin.signOut();
      }
      await clearAuthToken();
      await userService.clearCache();
    } catch (error) {
      console.error('Google sign-out error:', error);
      throw this.handleAuthError(error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = await getAuthToken();
      if (!token) return null;

      const userInfo = await this.getUserInfo(token);
      if (!userInfo) return null;

      return {
        id: userInfo.sub ?? userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        photoURL: userInfo.picture,
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async getAuthToken(): Promise<string | null> {
    return getAuthToken();
  }

  // Private helpers
  private async getUserInfo(token: string): Promise<any> {
    const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user info from Google');
    }
    return response.json();
  }

  private handleAuthError(error: any): Error {
    if (!error || !error.message) {
      return new Error('Google authentication failed – please try again');
    }
    const msg = error.message.toLowerCase();
    if (msg.includes('network')) return new Error('Network error – check your connection');
    if (msg.includes('cancelled') || msg.includes('cancel')) return new Error('Sign-in cancelled');
    if (msg.includes('timeout')) return new Error('Request timed out – please try again');
    return new Error(error.message || 'Google authentication failed – please try again');
  }
}

export default GoogleAuthService;
