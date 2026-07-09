// services/drive.service.ts
// Google Drive API service — fetches storage quota and file listings

import { getAuthToken } from '../utils/secureStorage';

export interface DriveStorageQuota {
  /** Total storage limit in bytes (null = unlimited) */
  limit: number | null;
  /** Total usage across all Google services in bytes */
  usage: number;
  /** Usage by files in Google Drive in bytes */
  usageInDrive: number;
  /** Usage by trashed files in bytes */
  usageInDriveTrash: number;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string | null;
  modifiedTime: string;
  iconLink: string;
  webViewLink: string;
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

class DriveService {
  private async getToken(): Promise<string | null> {
    return getAuthToken();
  }

  /**
   * Fetch the user's Google Drive storage quota.
   * Returns null if the token is missing or the request fails.
   */
  async getStorageQuota(): Promise<DriveStorageQuota | null> {
    try {
      const token = await this.getToken();
      if (!token) return null;

      const response = await fetch(
        `${DRIVE_API_BASE}/about?fields=storageQuota`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        console.error('Drive API error:', response.status, await response.text());
        return null;
      }

      const data = await response.json();
      const quota = data.storageQuota;

      return {
        limit: quota.limit ? parseInt(quota.limit, 10) : null,
        usage: parseInt(quota.usage, 10) || 0,
        usageInDrive: parseInt(quota.usageInDrive, 10) || 0,
        usageInDriveTrash: parseInt(quota.usageInDriveTrash, 10) || 0,
      };
    } catch (error) {
      console.error('Failed to fetch Drive storage quota:', error);
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
  usagePercentage(quota: DriveStorageQuota): number {
    if (!quota.limit || quota.limit === 0) return 0;
    return Math.min(100, (quota.usage / quota.limit) * 100);
  }
}

export const driveService = new DriveService();
export default DriveService;