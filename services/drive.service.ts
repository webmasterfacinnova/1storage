// services/drive.service.ts
import { getValidGoogleToken } from "./google-token";
import { Platform } from "react-native";

export interface DriveStorageQuota {
  limit: number | null;
  usage: number;
  usageInDrive: number;
  usageInDriveTrash: number;
}

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

class DriveService {
  private async getToken(): Promise<string | null> {
    const token = await getValidGoogleToken();
    console.log(
      `[DriveService] Platform: ${Platform.OS} | Token obtained:`,
      token ? `${token.substring(0, 10)}...` : "NULL",
    );
    return token;
  }

  async getStorageQuota(): Promise<DriveStorageQuota | null> {
    try {
      let token = await this.getToken();
      if (!token) {
        console.warn(
          "[DriveService] No valid Google token found for Drive API.",
        );
        return null;
      }

      let response = await fetch(
        `${DRIVE_API_BASE}/about?fields=storageQuota`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      if (response.status === 401) {
        console.warn(
          "[DriveService] Token 401 Unauthorized. Forcing token refresh...",
        );
        token = await getValidGoogleToken(); // O llama a tu servicio de refresh específico si aplica
        if (token) {
          response = await fetch(
            `${DRIVE_API_BASE}/about?fields=storageQuota`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            },
          );
        }
      }

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          "[DriveService] Drive API error details:",
          response.status,
          errorBody,
        );
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
      console.error("Failed to fetch Drive storage quota:", error);
      return null;
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(1)} ${units[i]}`;
  }

  usagePercentage(quota: DriveStorageQuota): number {
    if (!quota.limit || quota.limit === 0) return 0;
    return Math.min(100, (quota.usage / quota.limit) * 100);
  }
}

export const driveService = new DriveService();
export default DriveService;
