// services/onedrive-token.ts
// Shared helper to retrieve and validate the stored OneDrive access token.

import { getSecureData, clearSecureData } from '../utils/secureStorage';

/**
 * Returns the stored OneDrive access token if it exists and is non-empty.
 * Clears corrupt/empty tokens from secure storage and returns null.
 */
export async function getValidOneDriveToken(): Promise<string | null> {
  const token = await getSecureData('onedrive_token');
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    console.warn('[OneDriveToken] Empty or missing token found, clearing stored session');
    await clearSecureData('onedrive_token');
    await clearSecureData('onedrive_id_token');
    await clearSecureData('onedrive_refresh_token');
    return null;
  }

  return token;
}
