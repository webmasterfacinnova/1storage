// services/onedrive.service.ts
// OneDrive API service — fetches storage quota from Microsoft Graph API

import { getSecureData } from '../utils/secureStorage';

export interface OneDriveStorageQuota {
  /** Total storage limit in bytes (null = unlimited) */
  limit: number | null;
  /** Total usage across OneDrive in bytes */
  usage: number;
  /** Usage by files in OneDrive in bytes */
  usageInDrive: number;
  /** Usage by trashed files in bytes */
  usageInDriveTrash: number;
}

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

class OneDriveService {
  private async _getToken(): Promise<string | null> {
    return getSecureData('onedrive_token');
  }

  /**
   * Fetch the user's OneDrive storage quota.
   * Returns null if the token is missing or the request fails.
   */
  async getStorageQuota(): Promise<OneDriveStorageQuota | null> {
    try {
      const token = await this._getToken();
      if (!token) return null;

      const response = await fetch(
        `${GRAPH_API_BASE}/me/drive`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        console.error('OneDrive API error:', response.status, await response.text());
        return null;
      }

      const data = await response.json();
      const quota = data.quota;

      return {
        limit: quota?.total ? parseInt(quota.total, 10) : null,
        usage: parseInt(quota?.used, 10) || 0,
        usageInDrive: parseInt(quota?.used, 10) || 0,
        usageInDriveTrash: parseInt(quota?.deleted ?? '0', 10) || 0,
      };
    } catch (error) {
      console.error('Failed to fetch OneDrive storage quota:', error);
      return null;
    }
  }

  /**
   * Format bytes into a human-readable string (e.g., "2.5 GB").
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(1)} ${units[i]}`;
  }

  /**
   * Calculate usage percentage (0-100).
   */
  usagePercentage(quota: OneDriveStorageQuota): number {
    if (!quota.limit || quota.limit === 0) return 0;
    return Math.min(100, (quota.usage / quota.limit) * 100);
  }
}

export const oneDriveService = new OneDriveService();
export default OneDriveService;
