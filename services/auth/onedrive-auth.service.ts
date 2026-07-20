// services/auth/onedrive-auth.service.ts
// Microsoft OneDrive Authentication — Authorization Code + PKCE flow
// Uses expo-auth-session promptAsync with manual token exchange via fetch
// to ensure proper client_id / client_secret handling for Microsoft Graph.

import * as WebBrowser from 'expo-web-browser';
import {
  makeRedirectUri,
  AuthRequest,
  ResponseType,
} from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { AuthService, AuthResult, User } from '../auth.service';
import { saveSecureData, getSecureData, clearSecureData } from '../../utils/secureStorage';

WebBrowser.maybeCompleteAuthSession();

const AUTHORIZE_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

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
    // Load from process.env (Expo reads .env.local / .env)
    this.clientId = process.env.EXPO_PUBLIC_ONEDRIVE_CLIENT_ID ?? '';
    this.clientSecret = process.env.EXPO_PUBLIC_ONEDRIVE_CLIENT_SECRET ?? '';

    if (!this.clientId) {
      console.warn('OneDrive Auth: EXPO_PUBLIC_ONEDRIVE_CLIENT_ID not set');
    }
    if (!this.clientSecret) {
      console.warn('OneDrive Auth: EXPO_PUBLIC_ONEDRIVE_CLIENT_SECRET not set');
    }
  }

  async signIn(): Promise<AuthResult> {
    try {
      const redirectUri = makeRedirectUri({ preferLocalhost: true });
      console.log('[OneDriveAuth] redirectUri:', redirectUri);

      // Generate PKCE challenge
      const codeVerifier = await this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);

      // Build authorize URL manually to ensure all params are correct
      const authorizeUrl =
        `${AUTHORIZE_URL}?` +
        `client_id=${encodeURIComponent(this.clientId)}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(SCOPES.join(' '))}` +
        `&code_challenge=${encodeURIComponent(codeChallenge)}` +
        `&code_challenge_method=S256` +
        `&prompt=select_account`;

      console.log('[OneDriveAuth] Opening browser...');

      // Open browser for authentication
      const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, redirectUri);

      if (result.type !== 'success') {
        if (result.type === 'cancel' || result.type === 'dismiss') {
          throw new Error('Microsoft sign-in cancelled');
        }
        throw new Error('Microsoft sign-in was interrupted');
      }

      // Extract authorization code from the redirect URL
      const url = result.url;
      const parsedUrl = new URL(url);
      const code = parsedUrl.searchParams.get('code');
      const error = parsedUrl.searchParams.get('error');
      const errorDesc = parsedUrl.searchParams.get('error_description');

      if (error) {
        throw new Error(errorDesc || error || 'Microsoft sign-in failed');
      }

      if (!code) {
        throw new Error('No authorization code received from Microsoft');
      }

      // Exchange code for tokens manually via fetch
      const tokenResponse = await this.exchangeCodeForToken(code, redirectUri, codeVerifier);

      const accessToken = tokenResponse.access_token;
      const refreshToken = tokenResponse.refresh_token ?? '';

      if (!accessToken) {
        throw new Error('No access token received from Microsoft');
      }

      // Fetch user info from Microsoft Graph
      const userInfo = await this.getUserInfo(accessToken);

      const user: User = {
        id: userInfo.id ?? userInfo.userPrincipalName ?? '',
        email: userInfo.mail ?? userInfo.userPrincipalName ?? '',
        name: userInfo.displayName ?? '',
        photoURL: '',
      };

      // Save tokens
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
        id: userInfo.id ?? userInfo.userPrincipalName ?? '',
        email: userInfo.mail ?? userInfo.userPrincipalName ?? '',
        name: userInfo.displayName ?? '',
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

  // --- Private helpers ---

  /**
   * Exchange authorization code for tokens via direct POST to Microsoft.
   */
  private async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    codeVerifier: string,
  ): Promise<any> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    });

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OneDriveAuth] Token exchange failed:', response.status, errorText);
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Generate a PKCE code verifier (random string).
   */
  private async generateCodeVerifier(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return this.base64URLEncode(
      String.fromCharCode(...Array.from(randomBytes)),
    );
  }

  /**
   * Generate PKCE code challenge (S256 hash of verifier).
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
    );
    return this.base64URLEncode(digest);
  }

  private base64URLEncode(str: string): string {
    // Convert raw string to base64
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private async getUserInfo(token: string): Promise<any> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user info from Microsoft Graph');
    }
    return response.json();
  }

  private handleAuthError(error: any): Error {
    if (!error || !error.message) {
      return new Error('Microsoft authentication failed – please try again');
    }
    const msg = error.message.toLowerCase();
    if (msg.includes('network')) return new Error('Network error – check your connection');
    if (msg.includes('cancel')) return new Error('Sign-in cancelled');
    if (msg.includes('timeout')) return new Error('Request timed out – please try again');
    return new Error(error.message || 'Microsoft authentication failed – please try again');
  }
}

export default OneDriveAuthService;
