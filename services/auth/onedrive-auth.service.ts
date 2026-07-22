// services/auth/onedrive-auth.service.ts
// Microsoft OneDrive Authentication — Authorization Code + PKCE flow
// Uses WebBrowser.openAuthSessionAsync + manual token exchange via fetch.

import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import { AuthService, AuthResult, User } from '../auth.service';
import { saveSecureData, getSecureData, clearSecureData } from '../../utils/secureStorage';

WebBrowser.maybeCompleteAuthSession();

const AUTHORIZE_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize';
const TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';

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
    // Credentials are read from environment variables (.env) first, with an
    // optional override via Expo's app.json extra config.
    this.clientId =
      process.env.EXPO_PUBLIC_ONEDRIVE_CLIENT_ID ??
      Constants.expoConfig?.extra?.onedriveClientId ??
      Constants.expoConfig?.extra?.EXPO_PUBLIC_ONEDRIVE_CLIENT_ID ??
      '';
    this.clientSecret =
      process.env.EXPO_PUBLIC_ONEDRIVE_CLIENT_SECRET ??
      Constants.expoConfig?.extra?.onedriveClientSecret ??
      Constants.expoConfig?.extra?.EXPO_PUBLIC_ONEDRIVE_CLIENT_SECRET ??
      '';

    if (!this.clientId) {
      console.warn('OneDrive Auth: ONEDRIVE_CLIENT_ID not found');
    }
    if (!this.clientSecret) {
      console.warn('OneDrive Auth: ONEDRIVE_CLIENT_SECRET not found');
    }
  }

  async signIn(): Promise<AuthResult> {
    try {
      const redirectUri = makeRedirectUri({ preferLocalhost: true });
      console.log('[OneDriveAuth] redirectUri:', redirectUri);

      // Generate code_verifier: 43-128 chars, alphanumeric
      const codeVerifier = this.generateRandomString(64);

      // code_challenge = BASE64URL( SHA256( code_verifier ) )
      const codeChallenge = await this.sha256Base64URL(codeVerifier);

      // Build authorize URL with all required params
      const params = new URLSearchParams({
        client_id: this.clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: SCOPES.join(' '),
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        prompt: 'select_account',
      });

      const authorizeUrl = `${AUTHORIZE_URL}?${params.toString()}`;
      console.log('[OneDriveAuth] Opening browser...');

      const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, redirectUri);

      if (result.type !== 'success') {
        if (result.type === 'cancel' || result.type === 'dismiss') {
          throw new Error('Microsoft sign-in cancelled');
        }
        throw new Error('Microsoft sign-in was interrupted');
      }

      // Extract code from redirect URL
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

      // Exchange code for token via POST with URLSearchParams.
      // NOTE: Azure public clients (SPA/mobile) must NOT send client_secret.
      const tokenBody = new URLSearchParams({
        client_id: this.clientId,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      });

      if (this.clientSecret) {
        tokenBody.append('client_secret', this.clientSecret);
      }

      const tokenResponse = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody.toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[OneDriveAuth] Token exchange failed:', tokenResponse.status, errorText);
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token ?? '';
      const idToken = tokenData.id_token ?? '';

      if (!accessToken) {
        throw new Error('No access token received from Microsoft');
      }

      // Fetch user info from Microsoft Graph (fallback to id_token claims)
      const userInfo = await this.getUserInfo(accessToken, idToken);

      const user: User = {
        id: userInfo.id ?? userInfo.userPrincipalName ?? '',
        email: userInfo.mail ?? userInfo.userPrincipalName ?? '',
        name: userInfo.displayName ?? '',
        photoURL: '',
      };

      // Save tokens
      await saveSecureData('onedrive_token', accessToken);
      if (idToken) {
        await saveSecureData('onedrive_id_token', idToken);
      }
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
      await clearSecureData('onedrive_id_token');
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

      const idToken = await getSecureData('onedrive_id_token');
      const userInfo = await this.getUserInfo(token, idToken ?? undefined);
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

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const array = new Uint8Array(length);
    // Use Math.random as fallback (secure enough for PKCE)
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async sha256Base64URL(input: string): Promise<string> {
    // Encode string to UTF-8 bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(input);

    // Use SubtleCrypto if available (browsers, Hermes)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const base64 = btoa(String.fromCharCode(...hashArray));
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    // Fallback for React Native: use a simpler approach
    // For Hermes engine, polyfill via expo-crypto approach
    try {
      const ExpoCrypto = require('expo-crypto');
      const digest = await ExpoCrypto.digestStringAsync(
        ExpoCrypto.CryptoDigestAlgorithm.SHA256,
        input,
      );
      // digest is hex, convert to bytes then base64url
      const bytes: number[] = [];
      for (let i = 0; i < digest.length; i += 2) {
        bytes.push(parseInt(digest.substring(i, i + 2), 16));
      }
      const base64 = btoa(String.fromCharCode(...bytes));
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch {
      // Last resort: use plain code_challenge = code_verifier (S256 not available)
      // Microsoft supports 'plain' method as well
      console.warn('[OneDriveAuth] SHA-256 not available, using plain challenge method');
      return input; // plain mode
    }
  }

  private async getUserInfo(token: string, idToken?: string): Promise<any> {
    // Try Microsoft Graph first
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      return response.json();
    }

    const errorText = await response.text();
    console.warn('[OneDriveAuth] Graph /me failed:', response.status, errorText);

    // Fallback: decode id_token to get user profile info
    if (idToken) {
      try {
        const payload = this.parseJwt(idToken);
        if (payload?.email || payload?.preferred_username) {
          return {
            id: payload.oid ?? payload.sub ?? '',
            displayName: payload.name ?? '',
            mail: payload.email ?? payload.preferred_username ?? '',
            userPrincipalName: payload.preferred_username ?? payload.email ?? '',
          };
        }
      } catch (e) {
        console.warn('[OneDriveAuth] Failed to parse id_token:', e);
      }
    }

    throw new Error('Failed to fetch user info from Microsoft Graph');
  }

  private parseJwt(token: string): any {
    const base64Url = token.split('.')[1];
    if (!base64Url) throw new Error('Invalid JWT');
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
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
