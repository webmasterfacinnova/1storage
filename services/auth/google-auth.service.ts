// services/auth/google-auth.service.ts
// Google Authentication service — direct OAuth, no Firebase
// Uses expo-auth-session's promptAsync (non-hook-based approach) for
// environments where hooks cannot be used (service class context).

import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import { AuthService, AuthResult, User } from '../auth.service';
import { saveAuthToken, getAuthToken, clearAuthToken } from '../../utils/secureStorage';
import { userService } from '../user.service';

// Required for any auth session to work
WebBrowser.maybeCompleteAuthSession();

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

  async initialize(): Promise<void> {
    this.clientId = Constants.expoConfig?.extra?.googleWebClientId ?? Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

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
      const config = {
        clientId: this.clientId,
        scopes: SCOPES,
        redirectUri: makeRedirectUri({
          // useProxy: true is required for Expo Go
          // For production builds, use a custom scheme
          useProxy: true,
        }),
      };

      // Build the authorization URL manually using the discovery doc
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        new URLSearchParams({
          client_id: this.clientId,
          redirect_uri: config.redirectUri,
          response_type: 'token id_token',
          scope: SCOPES.join(' '),
          prompt: 'select_account',
          include_granted_scopes: 'true',
        }).toString();

      // Open the browser for OAuth
      const result = await WebBrowser.openAuthSessionAsync(authUrl, config.redirectUri);

      if (result.type !== 'success') {
        throw result.type === 'cancel'
          ? new Error('Google sign-in cancelled')
          : new Error('Google sign-in failed');
      }

      // Parse the redirect URL params
      const params = new URLSearchParams(result.url.split('#')[1] || result.url.split('?')[1]);
      const accessToken = params.get('access_token');
      const idToken = params.get('id_token');

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
