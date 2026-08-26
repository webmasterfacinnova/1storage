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
import { saveAuthToken, getAuthToken, clearAuthToken, saveSecureData, getSecureData } from '../../utils/secureStorage';
import { userService } from '../user.service';

WebBrowser.maybeCompleteAuthSession();

const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const getGoogleSignin = (): any | null => {
  if (Platform.OS === 'web') return null;
  try {
    return require('@react-native-google-signin/google-signin').GoogleSignin;
  } catch {
    return null;
  }
};

const SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/drive.readonly',
];

class GoogleAuthService implements AuthService {
  private clientId: string = '';
  private clientSecret: string = '';

  async initialize(): Promise<void> {
    this.clientId =
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
      Constants.expoConfig?.extra?.googleWebClientId ??
      Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
      '';
    this.clientSecret =
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET ??
      Constants.expoConfig?.extra?.googleClientSecret ??
      Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET ??
      '';

    if (!this.clientId) {
      console.warn('Google Auth: GOOGLE_WEB_CLIENT_ID not found');
    }
    if (!this.clientSecret) {
      console.warn('Google Auth: GOOGLE_CLIENT_SECRET not found');
    }

    const GoogleSignin = getGoogleSignin();
    if (!GoogleSignin) {
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
      const redirectUri = makeRedirectUri({ preferLocalhost: true });
      console.log('[GoogleAuth] redirectUri =', redirectUri);

      const request = new AuthRequest({
        clientId: this.clientId,
        scopes: SCOPES,
        redirectUri,
        responseType: ResponseType.Code,
        usePKCE: true,
        extraParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      });

      const result = await request.promptAsync(DISCOVERY);

      if (result.type !== 'success' || !result.params?.code) {
        if (result.type === 'cancel' || result.type === 'dismiss') {
          throw new Error('Google sign-in cancelled');
        }
        const errDesc = (result as any)?.params?.error_description || (result as any)?.error?.message;
        throw new Error(errDesc || 'Google sign-in failed');
      }

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
      const refreshToken = tokenResponse.refreshToken ?? '';
      const idToken = tokenResponse.idToken ?? '';

      if (!accessToken) {
        throw new Error('No access token received from Google');
      }

      const userInfo = await this.getUserInfo(accessToken);

      if (!userInfo) {
        throw new Error('Failed to fetch user info from Google');
      }

      const user: User = {
        id: userInfo.sub ?? userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        photoURL: userInfo.picture,
      };

      // Guardar access_token y refresh_token
      await saveAuthToken(accessToken);
      if (refreshToken) {
        await saveSecureData('google_refresh_token', refreshToken);
      }

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
        console.error('Failed to sync user to database:', dbError);
      }

      return { user, token: accessToken, provider: 'google' };
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw this.handleAuthError(error);
    }
  }

  async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = await getSecureData('google_refresh_token');
      if (!refreshToken) return null;

      const tokenBody = new URLSearchParams({
        client_id: this.clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });

      if (this.clientSecret) {
        tokenBody.append('client_secret', this.clientSecret);
      }

      const response = await fetch(DISCOVERY.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody.toString(),
      });

      if (!response.ok) {
        console.warn('[GoogleAuth] Failed to refresh token:', response.status);
        return null;
      }

      const tokenData = await response.json();
      const newAccessToken = tokenData.access_token;

      if (newAccessToken) {
        await saveAuthToken(newAccessToken);
      }

      return newAccessToken;
    } catch (error) {
      console.error('[GoogleAuth] Error refreshing token:', error);
      return null;
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
      if (!userInfo) {
        await clearAuthToken();
        await userService.clearCache();
        return null;
      }

      return {
        id: userInfo.sub ?? userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        photoURL: userInfo.picture,
      };
    } catch (error) {
      await clearAuthToken();
      await userService.clearCache();
      return null;
    }
  }

  async getAuthToken(): Promise<string | null> {
    return getAuthToken();
  }

  private async getUserInfo(token: string): Promise<any> {
    if (!token) return null;

    try {
      const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    }
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