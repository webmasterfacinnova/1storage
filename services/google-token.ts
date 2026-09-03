// services/google-token.ts
// Shared helper to retrieve and validate the stored Google access token.

import { getAuthToken, clearAuthToken } from '../utils/secureStorage';
import GoogleAuthService from './auth/google-auth.service';

const googleAuth = new GoogleAuthService();

/**
 * Returns the stored Google access token if valid.
 * Auto-refreshes using refresh_token if expired or missing.
 */
export async function getValidGoogleToken(): Promise<string | null> {
  let token = await getAuthToken();

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    console.log('[GoogleToken] Token missing or expired. Attempting refresh...');

    await googleAuth.initialize();
    token = await googleAuth.refreshAccessToken();

    if (!token) {
      console.warn('[GoogleToken] Unable to refresh token, clearing session');
      await clearAuthToken();
      return null;
    }
  }

  return token;
}