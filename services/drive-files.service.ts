// services/drive-files.service.ts
// Optimised Google Drive file listing — lightweight previews first, full details on demand.

import { getAuthToken } from '../utils/secureStorage';

/** Full detail set (fetched on demand when user interacts with a file). */
export interface FileDetails {
  size: number | null;
  modifiedTime: string;
  webViewLink: string;
  thumbnailLink?: string;
}

/** Lightweight preview entry — shown in the Manager Files list. */
export interface DriveFilePreview {
  id: string;
  name: string;
  mimeType: string;
  iconLink: string;
  parents?: string[];
  trashed?: boolean;
  /** Populated lazily when user taps/focuses this file. */
  details?: FileDetails | null;
}

/** Full legacy DriveFile type (kept for backward compat with other screens). */
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
  // Minimal fields for the preview list — no sizes, no dates
  private static readonly FIELDS_PREVIEW = 'files(id,name,mimeType,iconLink,parents),nextPageToken';
  // Full fields when details are needed
  private static readonly FIELDS_FULL = 'files(id,name,mimeType,size,modifiedTime,iconLink,webViewLink,thumbnailLink,parents,trashed),nextPageToken';
  private static readonly PAGE_SIZE = 20;

  /**
   * Fetch lightweight previews from Google Drive.
   * Only returns id, name, mimeType, iconLink — tiny payload, very fast.
   * Ordered by name for a clean, browsable list.
   */
  async getPreviews(
    pageSize: number = DriveFilesService.PAGE_SIZE,
    pageToken?: string,
  ): Promise<{ files: DriveFilePreview[]; nextPageToken: string | null } | null> {
    const token = await getAuthToken();
    if (!token) return null;

    const params = new URLSearchParams({
      pageSize: String(Math.min(pageSize, 1000)),
      fields: DriveFilesService.FIELDS_PREVIEW,
      orderBy: 'name',
      q: "trashed = false",
    });
    if (pageToken) params.set('pageToken', pageToken);

    try {
      const res = await fetch(`${DRIVE_API_BASE}/files?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;

      const data = await res.json();
      return {
        files: (data.files || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          iconLink: f.iconLink,
          parents: f.parents,
          trashed: f.trashed,
          details: null,
        })),
        nextPageToken: data.nextPageToken || null,
      };
    } catch (err) {
      console.error('getPreviews error:', err);
      return null;
    }
  }

  /**
   * Fetch full details (size, date, links, thumbnail) for a specific file.
   * Called only when the user selects/interacts with a file.
   */
  async getDetail(fileId: string): Promise<FileDetails | null> {
    const token = await getAuthToken();
    if (!token) return null;

    try {
      const res = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}?fields=id,size,modifiedTime,webViewLink,thumbnailLink,iconLink`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return null;

      const f = await res.json();
      return {
        size: f.size ? parseInt(f.size, 10) : null,
        modifiedTime: f.modifiedTime,
        webViewLink: f.webViewLink,
        thumbnailLink: f.thumbnailLink,
      };
    } catch (err) {
      console.error('getDetail error:', err);
      return null;
    }
  }

  // --- Legacy / backward compat methods (used by other screens) ---

  async getLargestFiles(
    pageSize: number = 50,
    pageToken?: string,
  ): Promise<{ files: DriveFile[]; nextPageToken: string | null } | null> {
    return this._list({
      pageSize,
      pageToken,
      fields: DriveFilesService.FIELDS_FULL,
      orderBy: 'quotaBytesUsed desc',
      query: 'trashed = false',
    });
  }

  async getFilesInFolder(
    folderId: string = 'root',
    pageSize: number = 100,
    pageToken?: string,
  ): Promise<{ files: DriveFile[]; nextPageToken: string | null } | null> {
    return this._list({
      pageSize,
      pageToken,
      fields: DriveFilesService.FIELDS_FULL,
      query: `'${folderId}' in parents and trashed = false`,
    });
  }

  async getTrashedFiles(
    pageSize: number = 100,
    pageToken?: string,
  ): Promise<{ files: DriveFile[]; nextPageToken: string | null } | null> {
    return this._list({
      pageSize,
      pageToken,
      fields: DriveFilesService.FIELDS_FULL,
      query: 'trashed = true',
    });
  }

  async deleteFilePermanently(fileId: string): Promise<boolean> {
    const token = await getAuthToken();
    if (!token) return false;
    try {
      const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok;
    } catch { return false; }
  }

  async emptyTrash(): Promise<boolean> {
    const token = await getAuthToken();
    if (!token) return false;
    try {
      const res = await fetch(`${DRIVE_API_BASE}/files/trash`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok;
    } catch { return false; }
  }

  async getStorageByType(): Promise<StorageByType[] | null> {
    const token = await getAuthToken();
    if (!token) return null;
    let allFiles: any[] = [];
    let pt: string | null = null;

    do {
      const params = new URLSearchParams({
        pageSize: '1000',
        fields: 'files(id,name,mimeType,size),nextPageToken',
        q: 'trashed = false and size > 0',
      });
      if (pt) params.set('pageToken', pt);
      try {
        const res = await fetch(`${DRIVE_API_BASE}/files?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) break;
        const data = await res.json();
        allFiles.push(...(data.files || []));
        pt = data.nextPageToken || null;
      } catch { break; }
    } while (pt && allFiles.length < 5000);

    const typeMap = new Map<string, { size: number; count: number; icon: string }>();
    for (const file of allFiles) {
      const cat = this._categorize(file.mimeType);
      const size = file.size ? parseInt(file.size, 10) : 0;
      const e = typeMap.get(cat.label) || { size: 0, count: 0, icon: cat.icon };
      e.size += size;
      e.count += 1;
      typeMap.set(cat.label, e);
    }
    const total = Array.from(typeMap.values()).reduce((s, t) => s + t.size, 0);
    return Array.from(typeMap.entries())
      .map(([label, d]) => ({ type: label, label, size: d.size, count: d.count, percentage: total > 0 ? (d.size / total) * 100 : 0, icon: d.icon }))
      .sort((a, b) => b.size - a.size);
  }

  private async _list(opts: {
    pageSize: number;
    pageToken?: string;
    fields: string;
    orderBy?: string;
    query: string;
  }): Promise<{ files: DriveFile[]; nextPageToken: string | null } | null> {
    const token = await getAuthToken();
    if (!token) return null;
    const params = new URLSearchParams({
      pageSize: String(Math.min(opts.pageSize, 1000)),
      fields: opts.fields,
      q: opts.query,
    });
    if (opts.pageToken) params.set('pageToken', opts.pageToken);
    if (opts.orderBy) params.set('orderBy', opts.orderBy);

    try {
      const res = await fetch(`${DRIVE_API_BASE}/files?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
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
    } catch { return null; }
  }

  private _categorize(mimeType: string): { label: string; icon: string } {
    if (mimeType === 'application/vnd.google-apps.folder') return { label: 'Folders', icon: '📁' };
    if (mimeType.startsWith('image/')) return { label: 'Images', icon: '🖼️' };
    if (mimeType.startsWith('video/')) return { label: 'Videos', icon: '🎬' };
    if (mimeType.startsWith('audio/')) return { label: 'Audio', icon: '🎵' };
    if (mimeType.includes('pdf')) return { label: 'PDFs', icon: '📄' };
    if (mimeType.includes('document') || mimeType.includes('spreadsheet') || mimeType.includes('presentation'))
      return { label: 'Google Docs', icon: '📝' };
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gz'))
      return { label: 'Archives', icon: '🗜️' };
    if (mimeType.includes('text/')) return { label: 'Text', icon: '📄' };
    return { label: 'Other', icon: '📦' };
  }
}

export const driveFilesService = new DriveFilesService();
export default DriveFilesService;
