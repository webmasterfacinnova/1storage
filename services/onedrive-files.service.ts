// services/onedrive-files.service.ts
// OneDrive file listing service — fetches file previews, largest files, trash,
// and storage breakdown from Microsoft Graph API.

import { getSecureData } from '../utils/secureStorage';

/** Lightweight preview entry — shown in the Manager Files list. */
export interface OneDriveFilePreview {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string;
  webViewLink: string;
}

/** Full OneDrive file type. */
export interface OneDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string;
  webViewLink: string;
}

export interface StorageByType {
  type: string;
  label: string;
  size: number;
  count: number;
  percentage: number;
  icon: string;
}

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

class OneDriveFilesService {
  private static readonly PAGE_SIZE = 20;

  private async _getToken(): Promise<string | null> {
    return getSecureData('onedrive_token');
  }

  /**
   * Fetch lightweight previews from OneDrive root.
   * Returns null if token is missing.
   */
  async getPreviews(
    pageSize: number = OneDriveFilesService.PAGE_SIZE,
    pageToken?: string,
  ): Promise<{ files: OneDriveFilePreview[]; nextPageToken: string | null } | null> {
    const token = await this._getToken();
    if (!token) return null;

    const params = new URLSearchParams({
      $top: String(Math.min(pageSize, 200)),
      $select: 'id,name,file,mimeType,size,lastModifiedDateTime,webUrl',
    });
    if (pageToken) params.set('$skiptoken', pageToken);

    try {
      const res = await fetch(`${GRAPH_API_BASE}/me/drive/root/children?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;

      const data = await res.json();
      return {
        files: (data.value || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          mimeType: f.file?.mimeType ?? f.mimeType ?? 'unknown',
          size: f.size !== undefined ? f.size : null,
          modifiedTime: f.lastModifiedDateTime || '',
          webViewLink: f.webUrl || '',
        })),
        nextPageToken: data['@odata.nextLink'] || null,
      };
    } catch (err) {
      console.error('OneDrive getPreviews error:', err);
      return null;
    }
  }

  /**
   * Fetch the largest files in OneDrive root.
   */
  async getLargestFiles(
    pageSize: number = 50,
    pageToken?: string,
  ): Promise<{ files: OneDriveFile[]; nextPageToken: string | null } | null> {
    const token = await this._getToken();
    if (!token) return null;

    const params = new URLSearchParams({
      $top: String(Math.min(pageSize, 200)),
      $orderby: 'size desc',
      $select: 'id,name,size,file,mimeType,lastModifiedDateTime,webUrl',
    });
    if (pageToken) params.set('$skiptoken', pageToken);

    try {
      const res = await fetch(`${GRAPH_API_BASE}/me/drive/root/children?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;

      const data = await res.json();
      return {
        files: (data.value || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          mimeType: f.file?.mimeType ?? 'unknown',
          size: f.size !== undefined ? f.size : null,
          modifiedTime: f.lastModifiedDateTime || '',
          webViewLink: f.webUrl || '',
        })),
        nextPageToken: data['@odata.nextLink'] || null,
      };
    } catch (err) {
      console.error('OneDrive getLargestFiles error:', err);
      return null;
    }
  }

  /**
   * Fetch trashed files from OneDrive.
   * Graph API: deleted items are in /me/drive/items/{id}/children filtered by deleted.
   */
  async getTrashedFiles(
    pageSize: number = 100,
    pageToken?: string,
  ): Promise<{ files: OneDriveFile[]; nextPageToken: string | null } | null> {
    const token = await this._getToken();
    if (!token) return null;

    const params = new URLSearchParams({
      $top: String(Math.min(pageSize, 200)),
      $filter: 'deleted ne null',
      $select: 'id,name,size,file,mimeType,lastModifiedDateTime,webUrl,deleted',
    });
    if (pageToken) params.set('$skiptoken', pageToken);

    try {
      const res = await fetch(`${GRAPH_API_BASE}/me/drive/root/children?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;

      const data = await res.json();
      return {
        files: (data.value || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          mimeType: f.file?.mimeType ?? 'unknown',
          size: f.size !== undefined ? f.size : null,
          modifiedTime: f.lastModifiedDateTime || '',
          webViewLink: f.webUrl || '',
        })),
        nextPageToken: data['@odata.nextLink'] || null,
      };
    } catch (err) {
      console.error('OneDrive getTrashedFiles error:', err);
      return null;
    }
  }

  /**
   * Permanently delete a file from OneDrive.
   */
  async deleteFilePermanently(fileId: string): Promise<boolean> {
    const token = await this._getToken();
    if (!token) return false;

    try {
      const res = await fetch(`${GRAPH_API_BASE}/me/drive/items/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get storage usage breakdown by file type.
   * Iterates all non-trash files with pagination (up to 5000 files).
   */
  async getStorageByType(): Promise<StorageByType[] | null> {
    const token = await this._getToken();
    if (!token) return null;

    let allFiles: any[] = [];
    let nextLink: string | null = `${GRAPH_API_BASE}/me/drive/root/children?$top=200&$select=id,name,size,file,mimeType`;

    do {
      try {
        const res = await fetch(nextLink, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) break;
        const data = await res.json();
        allFiles.push(...(data.value || []));
        nextLink = data['@odata.nextLink'] || null;
      } catch {
        break;
      }
    } while (nextLink && allFiles.length < 5000);

    const typeMap = new Map<string, { size: number; count: number; icon: string }>();
    for (const file of allFiles) {
      const mimeType = file.file?.mimeType ?? 'unknown';
      const cat = this._categorize(file.name, mimeType);
      const size = file.size ?? 0;
      const e = typeMap.get(cat.label) || { size: 0, count: 0, icon: cat.icon };
      e.size += size;
      e.count += 1;
      typeMap.set(cat.label, e);
    }

    const total = Array.from(typeMap.values()).reduce((s, t) => s + t.size, 0);
    return Array.from(typeMap.entries())
      .map(([label, d]) => ({
        type: label,
        label,
        size: d.size,
        count: d.count,
        percentage: total > 0 ? (d.size / total) * 100 : 0,
        icon: d.icon,
      }))
      .sort((a, b) => b.size - a.size);
  }

  /**
   * Categorise a file by its MIME type and name (extension fallback).
   */
  private _categorize(name: string, mimeType: string): { label: string; icon: string } {
    // If there's a proper MIME type from the file object, use it
    if (mimeType && mimeType !== 'unknown') {
      if (mimeType.startsWith('image/')) return { label: 'Images', icon: '🖼️' };
      if (mimeType.startsWith('video/')) return { label: 'Videos', icon: '🎬' };
      if (mimeType.startsWith('audio/')) return { label: 'Audio', icon: '🎵' };
      if (mimeType.includes('pdf')) return { label: 'PDFs', icon: '📄' };
      if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gzip') || mimeType.includes('compress'))
        return { label: 'Archives', icon: '🗜️' };
      if (mimeType.includes('text/')) return { label: 'Text', icon: '📄' };
      if (mimeType.includes('document') || mimeType.includes('spreadsheet') || mimeType.includes('presentation'))
        return { label: 'Office Docs', icon: '📝' };
      if (mimeType.includes('folder') || mimeType === 'application/vnd.google-apps.folder')
        return { label: 'Folders', icon: '📁' };
    }

    // Fallback: use file extension
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    const extMap: Record<string, { label: string; icon: string }> = {
      jpg: { label: 'Images', icon: '🖼️' }, jpeg: { label: 'Images', icon: '🖼️' },
      png: { label: 'Images', icon: '🖼️' }, gif: { label: 'Images', icon: '🖼️' },
      webp: { label: 'Images', icon: '🖼️' }, svg: { label: 'Images', icon: '🖼️' },
      bmp: { label: 'Images', icon: '🖼️' },
      mp4: { label: 'Videos', icon: '🎬' }, mov: { label: 'Videos', icon: '🎬' },
      avi: { label: 'Videos', icon: '🎬' }, mkv: { label: 'Videos', icon: '🎬' },
      webm: { label: 'Videos', icon: '🎬' },
      mp3: { label: 'Audio', icon: '🎵' }, wav: { label: 'Audio', icon: '🎵' },
      flac: { label: 'Audio', icon: '🎵' }, ogg: { label: 'Audio', icon: '🎵' },
      pdf: { label: 'PDFs', icon: '📄' },
      zip: { label: 'Archives', icon: '🗜️' }, rar: { label: 'Archives', icon: '🗜️' },
      '7z': { label: 'Archives', icon: '🗜️' }, tar: { label: 'Archives', icon: '🗜️' },
      gz: { label: 'Archives', icon: '🗜️' },
      doc: { label: 'Office Docs', icon: '📝' }, docx: { label: 'Office Docs', icon: '📝' },
      xls: { label: 'Office Docs', icon: '📝' }, xlsx: { label: 'Office Docs', icon: '📝' },
      ppt: { label: 'Office Docs', icon: '📝' }, pptx: { label: 'Office Docs', icon: '📝' },
      txt: { label: 'Text', icon: '📄' }, md: { label: 'Text', icon: '📄' },
    };

    return extMap[ext] || { label: 'Other', icon: '📦' };
  }
}

export const oneDriveFilesService = new OneDriveFilesService();
export default OneDriveFilesService;
