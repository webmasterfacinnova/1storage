// services/onedrive.service.ts
import { getValidOneDriveToken } from './onedrive-token';
import OneDriveAuthService from './auth/onedrive-auth.service';

const onedriveAuth = new OneDriveAuthService();

export interface OneDriveStorageQuota {
  limit: number | null;
  usage: number;
  usageInDrive: number;
  usageInDriveTrash: number;
}

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

class OneDriveService {
  private async _getToken(): Promise<string | null> {
    return getValidOneDriveToken();
  }

  async getStorageQuota(): Promise<OneDriveStorageQuota | null> {
    try {
      let token = await this._getToken();

      // Intento inicial si no hay token directo
      if (!token) {
        token = await onedriveAuth.refreshAccessToken();
        if (!token) return null;
      }

      let response = await fetch(`${GRAPH_API_BASE}/me/drive`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Si el token expiró (401), intentar refrescarlo
      if (response.status === 401) {
        console.log('[OneDriveService] Received 401 Unauthorized. Attempting token refresh...');
        token = await onedriveAuth.refreshAccessToken();

        if (token) {
          response = await fetch(`${GRAPH_API_BASE}/me/drive`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } else {
          return null;
        }
      }

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

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(1)} ${units[i]}`;
  }

  usagePercentage(quota: OneDriveStorageQuota): number {
    if (!quota.limit || quota.limit === 0) return 0;
    return Math.min(100, (quota.usage / quota.limit) * 100);
  }
}

export const oneDriveService = new OneDriveService();
export default OneDriveService;