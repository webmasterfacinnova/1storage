// services/drive-files.service.ts
// Google Drive file listing — fetches files with sizes, storage breakdown by type

import { getAuthToken } from '../utils/secureStorage';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string;
  iconLink: string;
  webViewLink: string;
  parents?: string[];
  trashed?: boolean;
}

export interface DriveFileListResponse {
  files: DriveFile[];
  nextPageToken: string | null;
}

export interface StorageByType {
  type: string;
  label: string;
  size: number;
  count: number;
  percentage: number;
  icon: string;
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

class DriveFilesService {
  private async getToken(): Promise<string | null> {
    const { getAuthToken } = require('../utils/secureStorage');
    return getAuthToken();
  }

  /**
   * Fetch files from Google Drive, sorted by size descending (largest first).
   * Uses the `files.list` endpoint with size, name, mimeType, etc.
   */
  async getFiles(
    pageSize: number = 100,
    pageToken?: string,
    query?: string,
  ): Promise<{ files: DriveFile[]; nextPageToken: string | null } | null> {
    try {
      const token = await this.getToken();
      if (!token) return null;

      const params = new URLSearchParams({
        pageSize: String(pageSize),
        fields: 'files(id,name,mimeType,size,modifiedTime,iconLink,webViewLink,parents,trashed),nextPageToken',
        orderBy: 'quotaBytesUsed desc,name',
        q: query || "trashed = false",
      });
      if (pageToken) params.set('pageToken', pageToken);

      const response = await fetch(
        `${DRIVE_API_BASE}/files?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.ok) {
        console.error('Drive files API error:', response.status, await response.text());
        return null;
      }

      const data = await response.json();
      return {
        files: (data.files || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size ? parseInt(f.size, 10) : null,
          modifiedTime: f.modifiedTime,
          iconLink: f.iconLink,
          webViewLink: f.webViewLink,
          parents: f.parents,
          trashed: f.trashed,
        })),
        nextPageToken: data.nextPageToken || null,
      };
    } catch (error) {
      console.error('Failed to fetch Drive files:', error);
      return null;
    }
  }

  /**
   * Fetch files in a specific folder.
   */
  async getFilesInFolder(
    folderId: string = 'root',
    pageSize: number = 100,
    pageToken?: string,
  ): Promise<{ files: DriveFile[]; nextPageToken: string | null } | null> {
    const query = `'${folderId}' in parents and trashed = false`;
    return this.getFiles(pageSize, pageToken, query);
  }

  /**
   * Fetch files sorted by size descending (largest files first).
   */
  async getLargestFiles(
    pageSize: number = 50,
    pageToken?: string,
  ): Promise<{ files: DriveFile[]; nextPageToken: string | null } | null> {
    const query = 'trashed = false and size > 0';
    return this.getFiles(pageSize, pageToken, query);
  }

  /**
   * Fetch trashed files.
   */
  async getTrashedFiles(
    pageSize: number = 100,
    pageToken?: string,
  ): Promise<{ files: DriveFile[]; nextPageToken: string | null } | null> {
    const query = 'trashed = true';
    return this.getFiles(pageSize, pageToken, query);
  }

  /**
   * Permanently delete a file from trash.
   */
  async deleteFilePermanently(fileId: string): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) return false;

      const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  /**
   * Empty the entire trash.
   */
  async emptyTrash(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) return false;

      const response = await fetch(`${DRIVE_API_BASE}/files/trash`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to empty trash:', error);
      return false;
    }
  }

  /**
   * Get storage breakdown by file type (MIME category).
   */
  async getStorageByType(): Promise<StorageByType[] | null> {
    try {
      const token = await this.getToken();
      if (!token) return null;

      // Fetch all files with their sizes and MIME types
      let allFiles: DriveFile[] = [];
      let pageToken: string | null = null;

      do {
        const params = new URLSearchParams({
          pageSize: '1000',
          fields: 'files(id,name,mimeType,size),nextPageToken',
          q: 'trashed = false and size > 0',
        });
        if (pageToken) params.set('pageToken', pageToken);

        const response = await fetch(
          `${DRIVE_API_BASE}/files?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (!response.ok) break;

        const data = await response.json();
        allFiles.push(...(data.files || []));
        pageToken = data.nextPageToken || null;
      } while (pageToken && allFiles.length < 5000); // safety limit

      // Group by MIME type category
      const typeMap = new Map<string, { size: number; count: number; icon: string }>();

      for (const file of allFiles) {
        const category = this.categorizeMimeType(file.mimeType);
        const size = file.size ? (typeof file.size === 'string' ? parseInt(file.size, 10) : file.size) : 0;
        const existing = typeMap.get(category.label) || { size: 0, count: 0, icon: category.icon };
        existing.size += size;
        existing.count += 1;
        typeMap.set(category.label, existing);
      }

      const totalSize = Array.from(typeMap.values()).reduce((sum, t) => sum + t.size, 0);

      return Array.from(typeMap.entries())
        .map(([label, data]) => ({
          type: label,
          label,
          size: data.size,
          count: data.count,
          percentage: totalSize > 0 ? (data.size / totalSize) * 100 : 0,
          icon: data.icon,
        }))
        .sort((a, b) => b.size - a.size);
    } catch (error) {
      console.error('Failed to get storage by type:', error);
      return null;
    }
  }

  /**
   * Categorize a MIME type into a human-readable group.
   */
  private categorizeMimeType(mimeType: string): { label: string; icon: string } {
    if (mimeType === 'application/vnd.google-apps.folder') return { label: 'Folders', icon: '📁' };
    if (mimeType.startsWith('image/')) return { label: 'Images', icon: '🖼️' };
    if (mimeType.startsWith('video/')) return { label: 'Videos', icon: '🎬' };
    if (mimeType.startsWith('audio/')) return { label: 'Audio', icon: '🎵' };
    if (mimeType.includes('pdf')) return { label: 'PDFs', icon: '📄' };
    if (mimeType.includes('document') || mimeType.includes('spreadsheet') || mimeType.includes('presentation'))
      return { label: 'Google Docs', icon: '📝' };
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gz'))
      return { label: 'Archives', icon: '🗜️' };
    if (mimeType.includes('text/')) return { label: 'Text Files', icon: '📄' };
    if (mimeType === 'application/vnd.google-apps.folder') return { label: 'Folders', icon: '📁' };
    return { label: 'Other', icon: '📦' };
  }
}

export const driveFilesService = new DriveFilesService();
export default DriveFilesService;