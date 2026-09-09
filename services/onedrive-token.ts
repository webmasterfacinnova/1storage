// Shared helper to retrieve and validate the stored OneDrive access token.

import { getSecureData } from '../utils/secureStorage';
import OneDriveAuthService from './auth/onedrive-auth.service';

const onedriveAuth = new OneDriveAuthService();

/**
 * Returns the stored OneDrive access token if it exists.
 * Attempts to auto-refresh using the refresh token if missing or empty.
 */
export async function getValidOneDriveToken(): Promise<string | null> {
  let token = await getSecureData('onedrive_token');

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    console.log('[OneDriveToken] Access token missing/empty. Attempting refresh...');
    
    await onedriveAuth.initialize();
    token = await onedriveAuth.refreshAccessToken();
  }

  return token;
}