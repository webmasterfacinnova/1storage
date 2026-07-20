// services/auth/onedrive-auth.service.ts
// Microsoft OneDrive Authentication service — Authorization Code + PKCE flow
// Uses expo-auth-session's promptAsync (non-hook-based approach) for
// environments where hooks cannot be used (service class context).

import * as WebBrowser from 'expo-web-browser';
import {
  makeRedirectUri,
  AuthRequest,
  ResponseType,
  exchangeCodeAsync,
} from 'expo-auth-session';
import Constants from 'expo-constants';
import { AuthService, AuthResult, User } from '../auth.service';
import { saveSecureData, getSecureData, clearSecureData, clearAuthToken } from '../../utils/secureStorage';

// Required for any auth session to work (closes the popup/redirect on web)
WebBrowser.maybeCompleteAuthSession();

// Microsoft's OAuth 2.0 endpoints (common endpoint — works with personal + work/school accounts)
const DISCOVERY = {
  authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
};

// OAuth scopes we request
const SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'Files.Read',
  'Files.Read.All',
  'Files.ReadWrite.All',
];

class OneDriveAuthService implements AuthService {
  private clientId: string = '';
  private clientSecret: string = '';

  async initialize(): Promise<void> {
    this.clientId = Constants.expoConfig?.extra?.ONEDRIVE_CLIENT_ID ?? '';
    this.clientSecret = process.env.EXPO_PUBLIC_ONEDRIVE_CLIENT_SECRET ?? '';

    if (!this.clientId) {
      console.warn('OneDrive Auth: ONEDRIVE_CLIENT_ID not found in app config');
    }
  }

  async signIn(): Promise<AuthResult> {
    try {
      // Exact redirect URI must be registered in the Azure Portal
      // (App registrations → Authentication → Redirect URIs).
      const redirectUri = makeRedirectUri({ preferLocalhost: true });
      console.log('[OneDriveAuth] redirectUri =', redirectUri);

      // Authorization Code + PKCE flow
      const request = new AuthRequest({
        clientId: this.clientId,
        scopes: SCOPES,
        redirectUri,
        responseType: ResponseType.Code,
        usePKCE: true,
        extraParams: {
          prompt: 'select_account',
        },
      });

      // Opens the Microsoft OAuth consent screen
      const result = await request.promptAsync(DISCOVERY);

      if (result.type !== 'success' || !result.params?.code) {
        if (result.type === 'cancel' || result.type === 'dismiss') {
          throw new Error('Microsoft sign-in cancelled');
        }
        const errDesc =
          (result as any)?.params?.error_description ||
          (result as any)?.error?.message;
        throw new Error(errDesc || 'Microsoft sign-in failed');
      }

      // Exchange the authorization code for tokens
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

      if (!accessToken) {
        throw new Error('No access token received from Microsoft');
      }

      // Fetch user info from Microsoft Graph
      const userInfo = await this.getUserInfo(accessToken);

      const user: User = {
        id: userInfo.id ?? userInfo.userPrincipalName,
        email: userInfo.mail ?? userInfo.userPrincipalName ?? '',
        name: userInfo.displayName,
        photoURL: userInfo.photo?.toString() ?? '',
      };

      // Save tokens to secure storage
      await saveSecureData('onedrive_token', accessToken);
      if (refreshToken) {
        await saveSecureData('onedrive_refresh_token', refreshToken);
      }

      return { user, token: accessToken, provider: 'onedrive' };
    } catch (error) {
      console.error('OneDrive sign-in error:', error);
      throw this.handleAuthError(error);
    }
  }

  async signOut(): Promise<void> {
    try {
      await clearSecureData('onedrive_token');
      await clearSecureData('onedrive_refresh_token');
      // We clear the general auth token only if it belongs to OneDrive.
      // The store's auth slice manages provider-level state.
    } catch (error) {
      console.error('OneDrive sign-out error:', error);
      throw this.handleAuthError(error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = await getSecureData('onedrive_token');
      if (!token) return null;

      const userInfo = await this.getUserInfo(token);
      if (!userInfo) return null;

      return {
        id: userInfo.id ?? userInfo.userPrincipalName,
        email: userInfo.mail ?? userInfo.userPrincipalName ?? '',
        name: userInfo.displayName,
        photoURL: '',
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async getAuthToken(): Promise<string | null> {
    return getSecureData('onedrive_token');
  }

  // Private helpers

  /**
   * Fetch user info from Microsoft Graph API.
   */
  private async getUserInfo(token: string): Promise<any> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user info from Microsoft Graph');
    }
    return response.json();
  }

  /**
   * Normalise authentication errors into user-friendly messages.
   */
  private handleAuthError(error: any): Error {
    if (!error || !error.message) {
      return new Error('Microsoft authentication failed – please try again');
    }
    const msg = error.message.toLowerCase();
    if (msg.includes('network')) return new Error('Network error – check your connection');
    if (msg.includes('cancelled') || msg.includes('cancel')) return new Error('Sign-in cancelled');
    if (msg.includes('timeout')) return new Error('Request timed out – please try again');
    return new Error(error.message || 'Microsoft authentication failed – please try again');
  }
}

export default OneDriveAuthService;
