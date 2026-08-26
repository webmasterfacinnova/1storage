// services/onedrive-token.ts
// Shared helper to retrieve and validate the stored OneDrive access token.

import { getSecureData, clearSecureData } from '../utils/secureStorage';
import OneDriveAuthService from './auth/onedrive-auth.service';

const onedriveAuth = new OneDriveAuthService();

/**
 * Returns the stored OneDrive access token if it exists and is valid.
 * Attempts to auto-refresh using the refresh token if expired.
 */
export async function getValidOneDriveToken(): Promise<string | null> {
  let token = await getSecureData('onedrive_token');

  // Se eliminó la validación 'token.split('.').length !== 3' 
  // ya que los tokens de OneDrive para cuentas personales no son JWTs.
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    console.log('[OneDriveToken] Token expired or missing. Attempting refresh...');
    
    await onedriveAuth.initialize();
    token = await onedriveAuth.refreshAccessToken();

    if (!token) {
      console.warn('[OneDriveToken] Unable to refresh token, clearing stored session');
      await clearSecureData('onedrive_token');
      await clearSecureData('onedrive_id_token');
      await clearSecureData('onedrive_refresh_token');
      return null;
    }
  }

  return token;
}