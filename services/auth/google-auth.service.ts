// services/auth/google-auth.service.ts
// Google Authentication service — direct OAuth, no Firebase

import * as AuthSession from 'expo-auth-session';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AuthService, AuthResult, User } from '../auth.service';
import { saveAuthToken, getAuthToken, clearAuthToken } from '../../utils/secureStorage';
import { userService } from '../user.service';

// OAuth scopes we request
const SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/drive.file',
];

class GoogleAuthService implements AuthService {
  private clientId: string = '';

  async initialize(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants');
    this.clientId = Constants.expoConfig?.extra?.googleWebClientId ?? '';

    if (!this.clientId) {
      console.warn('Google Auth: GOOGLE_WEB_CLIENT_ID not found in app config');
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
      // Step 1: Launch Expo AuthSession OAuth flow
      const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
      const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');

      const authUrl = `${discovery.authorizationEndpoint}?` +
        new URLSearchParams({
          client_id: this.clientId,
          redirect_uri: redirectUri,
          response_type: 'id_token token',
          scope: SCOPES.join(' '),
          prompt: 'select_account',
        }).toString();

      const result = await AuthSession.startAsync({
        authUrl,
        returnUrl: redirectUri,
      });

      if (result.type !== 'success') {
        throw result.type === 'error'
          ? new Error(result.error?.message || 'Google sign-in failed')
          : new Error('Google sign-in cancelled');
      }

      const { access_token, id_token } = result.params;

      // Step 2: Fetch user info from Google
      const userInfo = await this.getUserInfo(access_token);

      const user: User = {
        id: userInfo.sub ?? userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        photoURL: userInfo.picture,
      };

      // Step 3: Save tokens locally
      await saveAuthToken(access_token);

      // Step 4: Sync user to MongoDB (create/update profile)
      try {
        await userService.upsertUser({
          googleId: user.id,
          email: user.email,
          name: user.name,
          photoURL: user.photoURL,
          idToken: id_token,
          accessToken: access_token,
        });
      } catch (dbError) {
        // Non-critical: user can still use the app with local session
        console.error('Failed to sync user to database:', dbError);
      }

      return { user, token: access_token, provider: 'google' };
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw this.handleAuthError(error);
    }
  }

  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
      await clearAuthToken();
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

  // Unused methods – kept for interface compatibility
  async signUp(_email: string, _password: string): Promise<AuthResult> {
    throw new Error('Sign up not available – use Google sign-in');
  }
  async resetPassword(_email: string): Promise<void> {
    throw new Error('Password reset not available for Google authentication');
  }
  async linkProvider(_provider: string): Promise<AuthResult> {
    throw new Error('Provider linking not implemented');
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
    const msg = (error.message ?? '').toLowerCase();
    if (msg.includes('network')) return new Error('Network error – check your connection');
    if (msg.includes('cancelled')) return new Error('Sign-in cancelled');
    return new Error('Google authentication failed – please try again');
  }
}

export default GoogleAuthService;
