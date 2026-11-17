// services/drive-files.service.ts
import { getAuthToken } from '../utils/secureStorage';
import GoogleAuthService from './auth/google-auth.service';
import GoogleAuthServiceWeb from './auth/google-auth.service.web';
import { Platform } from 'react-native';

const googleAuth = Platform.OS === 'web' ? new GoogleAuthServiceWeb() : new GoogleAuthService();

export interface FileDetails {
  size: number | null;
  modifiedTime: string;
  webViewLink: string;
  thumbnailUrl?: string;
}

export interface DriveFilePreview {
  id: string;
  name: string;
  mimeType: string;
  iconLink: string;
  thumbnailUrl?: string;
  parents?: string[];
  trashed?: boolean;
  details?: FileDetails | null;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string;
  iconLink: string;
  thumbnailUrl?: string;
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
  private static readonly FIELDS_PREVIEW = 'files(id,name,mimeType,iconLink,thumbnailLink,parents,size,modifiedTime),nextPageToken';
  private static readonly FIELDS_FULL = 'files(id,name,mimeType,size,modifiedTime,iconLink,webViewLink,thumbnailLink,parents,trashed),nextPageToken';
  private static readonly PAGE_SIZE = 20;

  /**
   * Realiza peticiones HTTP a la API de Google Drive manejando el reintento automático
   * ante un error 401 (Unauthorized) mediante el refresco silencioso del token.
   */
  private async _fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response | null> {
    let token = await getAuthToken();
    if (!token) return null;

    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    let response = await fetch(url, options);

    // Si el token expira (401 Unauthorized), intentamos renovarlo de forma silenciosa
    if (response.status === 401) {
      console.log('[DriveFilesService] 401 recibido. Renovando token de forma silenciosa...');
      try {
        const newToken = await googleAuth.refreshAccessToken();
        if (newToken) {
          options.headers = {
            ...options.headers,
            Authorization: `Bearer ${newToken}`,
          };
          // Reintentamos la petición original con el nuevo token
          response = await fetch(url, options);
          console.log('[DriveFilesService] Token renovado y petición reintentada con éxito.');
        }
      } catch (err) {
        console.error('[DriveFilesService] Error al intentar refrescar el token:', err);
        return null;
      }
    }

    return response;
  }

  async checkFileExists(fileName: string, folderId: string = 'root'): Promise<DriveFile | null> {
    const safeName = fileName.replace(/'/g, "\\'");
    const query = `'${folderId}' in parents and name = '${safeName}' and trashed = false`;
    const params = new URLSearchParams({
      pageSize: '1',
      fields: 'files(id, name, mimeType, size)',
      q: query,
    });

    try {
      const res = await this._fetchWithAuth(`${DRIVE_API_BASE}/files?${params}`);
      if (!res || !res.ok) return null;
      const data = await res.json();
      return data.files && data.files.length > 0 ? data.files[0] : null;
    } catch {
      return null;
    }
  }

  async getPreviews(
    pageSize: number = DriveFilesService.PAGE_SIZE,
    pageToken?: string,
  ): Promise<{ files: DriveFilePreview[]; nextPageToken: string | null } | null> {
    const params = new URLSearchParams({
      pageSize: String(Math.min(pageSize, 1000)),
      fields: DriveFilesService.FIELDS_PREVIEW,
      orderBy: 'name',
      q: "'root' in parents and trashed = false",
    });
    if (pageToken) params.set('pageToken', pageToken);

    try {
      const res = await this._fetchWithAuth(`${DRIVE_API_BASE}/files?${params}`);
      if (!res || !res.ok) return null;

      const data = await res.json();
      return {
        files: (data.files || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          iconLink: f.iconLink,
          thumbnailUrl: f.thumbnailLink,
          parents: f.parents,
          trashed: f.trashed,
          details: {
            size: f.size ? parseInt(f.size, 10) : null,
            modifiedTime: f.modifiedTime || '',
            webViewLink: '',
            thumbnailUrl: f.thumbnailLink,
          },
        })),
        nextPageToken: data.nextPageToken || null,
      };
    } catch (err) {
      console.error('getPreviews error:', err);
      return null;
    }
  }

  async getDetail(fileId: string): Promise<FileDetails | null> {
    try {
      const res = await this._fetchWithAuth(
        `${DRIVE_API_BASE}/files/${fileId}?fields=id,size,modifiedTime,webViewLink,thumbnailLink,iconLink`
      );
      if (!res || !res.ok) return null;

      const f = await res.json();
      return {
        size: f.size ? parseInt(f.size, 10) : null,
        modifiedTime: f.modifiedTime,
        webViewLink: f.webViewLink,
        thumbnailUrl: f.thumbnailLink,
      };
    } catch (err) {
      console.error('getDetail error:', err);
      return null;
    }
  }

  async downloadFile(fileId: string): Promise<Blob | null> {
    try {
      const res = await this._fetchWithAuth(`${DRIVE_API_BASE}/files/${fileId}?alt=media`);
      if (!res || !res.ok) return null;
      return await res.blob();
    } catch (err) {
      console.error('downloadFile Drive error:', err);
      return null;
    }
  }

  async uploadFile(blob: Blob, name: string, mimeType: string): Promise<DriveFile | null> {
    const metadata = { name, mimeType };
    const formData = new FormData();

    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', blob);

    try {
      const token = await getAuthToken();
      if (!token) return null;

      let res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 401) {
        const newToken = await googleAuth.refreshAccessToken();
        if (newToken) {
          res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { Authorization: `Bearer ${newToken}` },
            body: formData,
          });
        }
      }

      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error('uploadFile Drive error:', err);
      return null;
    }
  }

  async getLargestFiles(
    pageSize: number = 50,
    pageToken?: string,
  ): Promise<{ files: DriveFile[]; nextPageToken: string | null } | null> {
    return this._list({
      pageSize,
      pageToken,
      fields: DriveFilesService.FIELDS_FULL,
      orderBy: 'quotaBytesUsed desc',
      query: "'me' in owners and trashed = false",
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
    try {
      const res = await this._fetchWithAuth(`${DRIVE_API_BASE}/files/${fileId}`, {
        method: 'DELETE',
      });

      if (res && res.ok) return true;

      // Si falla por falta de permisos de borrado permanente (403), mover a la papelera
      if (res && res.status === 403) {
        const token = await getAuthToken();
        if (!token) return false;
        const trashRes = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ trashed: true }),
        });
        return trashRes.ok;
      }

      return false;
    } catch {
      return false;
    }
  }

  async emptyTrash(): Promise<boolean> {
    try {
      const res = await this._fetchWithAuth(`${DRIVE_API_BASE}/files/trash`, {
        method: 'DELETE',
      });
      return res ? res.ok : false;
    } catch { return false; }
  }

  async getStorageByType(): Promise<StorageByType[] | null> {
    let allFiles: any[] = [];
    let pt: string | null = null;

    do {
      const params = new URLSearchParams({
        pageSize: '1000',
        fields: 'files(id,name,mimeType,size),nextPageToken',
        q: "'me' in owners and trashed = false and size > 0",
      });
      if (pt) params.set('pageToken', pt);
      try {
        const res = await this._fetchWithAuth(`${DRIVE_API_BASE}/files?${params}`);
        if (!res || !res.ok) break;
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
    const params = new URLSearchParams({
      pageSize: String(Math.min(opts.pageSize, 1000)),
      fields: opts.fields,
      q: opts.query,
    });
    if (opts.pageToken) params.set('pageToken', opts.pageToken);
    if (opts.orderBy) params.set('orderBy', opts.orderBy);

    try {
      const res = await this._fetchWithAuth(`${DRIVE_API_BASE}/files?${params}`);
      if (!res || !res.ok) return null;
      const data = await res.json();
      return {
        files: (data.files || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size ? parseInt(f.size, 10) : null,
          modifiedTime: f.modifiedTime,
          iconLink: f.iconLink,
          thumbnailUrl: f.thumbnailLink,
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
