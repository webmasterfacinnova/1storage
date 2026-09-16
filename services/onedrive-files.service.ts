// services/onedrive-files.service.ts
import { getValidOneDriveToken } from './onedrive-token';
import OneDriveAuthService from './auth/onedrive-auth.service';

const onedriveAuth = new OneDriveAuthService();
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

export interface OneDriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
  folder?: { childCount: number };
  provider?: string;
}

export interface StorageByType {
  type: string;
  bytes: number;
  count: number;
}

class OneDriveFilesService {
  private async _getToken(): Promise<string | null> {
    return getValidOneDriveToken();
  }

  /**
   * Helper privado para ejecutar peticiones a Microsoft Graph
   * con soporte automático de renovación de token ante respuestas HTTP 401.
   */
  private async _fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response | null> {
    try {
      let token = await this._getToken();

      if (!token) {
        token = await onedriveAuth.refreshAccessToken();
        if (!token) return null;
      }

      let response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });

      // Si el token caducó (401), renovarlo y reintentar la llamada
      if (response.status === 401) {
        console.log('[OneDriveFilesService] 401 recibido. Renovando token...');
        token = await onedriveAuth.refreshAccessToken();

        if (token) {
          response = await fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${token}`,
            },
          });
        } else {
          return null;
        }
      }

      return response;
    } catch (error) {
      console.error('[OneDriveFilesService] Error de red o ejecución:', error);
      return null;
    }
  }

  /**
   * Helper para normalizar la respuesta de Microsoft Graph a objetos compatibles con la app.
   * Garantiza que `mimeType` sea siempre un string para evitar crashes con .startsWith().
   */
  private _mapOneDriveItem(item: any): OneDriveFile {
    let mimeType = item.file && item.file.mimeType ? item.file.mimeType : '';

    // Asignar MimeType estándar para carpetas
    if (item.folder) {
      mimeType = 'application/vnd.google-apps.folder';
    }

    return {
      id: item.id,
      name: item.name,
      size: item.size || 0,
      mimeType,
      modifiedTime: item.lastModifiedDateTime || new Date().toISOString(),
      webViewLink: item.webUrl || null,
      folder: item.folder,
      provider: 'onedrive',
    };
  }

  /**
   * Método requerido por `storage-registry.service.ts` para ManagerFilesScreen.
   * Trae los archivos paginados con sus enlaces e información de tipo.
   */
  async getPreviews(
    pageSize: number = 20,
    pageToken?: string
  ): Promise<{ files: OneDriveFile[]; nextPageToken: string | null } | null> {
    const endpoint = `${GRAPH_API_BASE}/me/drive/root/children?$top=${pageSize}&$select=id,name,size,file,folder,lastModifiedDateTime,webUrl`;
    const url = pageToken || endpoint;

    const response = await this._fetchWithAuth(url);

    if (!response || !response.ok) {
      if (response) console.error('OneDrive getPreviews API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const files: OneDriveFile[] = (data.value || []).map((item: any) => this._mapOneDriveItem(item));
    const nextPageToken = data['@odata.nextLink'] || null;

    return { files, nextPageToken };
  }

  /**
   * Obtiene la lista de archivos de una carpeta específica o de la raíz.
   */
  async getFilesInFolder(
    folderId: string = 'root',
    pageSize: number = 50,
    pageToken?: string
  ): Promise<{ files: OneDriveFile[]; nextPageToken: string | null } | null> {
    const token = await this._getToken();
    if (!token) return null;

    const params = new URLSearchParams({
      $top: String(Math.min(pageSize, 200)),
      $select: 'id,name,file,folder,package,specialFolder,mimeType,size,lastModifiedDateTime,webUrl',
    });
    if (pageToken) params.set('$skiptoken', pageToken);

    const endpoint =
      folderId === 'root'
        ? `${GRAPH_API_BASE}/me/drive/root/children?$top=${pageSize}&$select=id,name,size,file,folder,lastModifiedDateTime,webUrl`
        : `${GRAPH_API_BASE}/me/drive/items/${folderId}/children?$top=${pageSize}&$select=id,name,size,file,folder,lastModifiedDateTime,webUrl`;

    const url = pageToken || endpoint;
    const response = await this._fetchWithAuth(url);

    if (!response || !response.ok) {
      if (response) console.error('OneDrive Files API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const files: OneDriveFile[] = (data.value || []).map((item: any) => this._mapOneDriveItem(item));
    const nextPageToken = data['@odata.nextLink'] || null;

    return { files, nextPageToken };
  }

  /**
   * Obtiene los archivos más grandes del almacenamiento.
   */
  async getLargestFiles(
    pageSize: number = 20,
    pageToken?: string
  ): Promise<{ files: OneDriveFile[]; nextPageToken: string | null } | null> {
    const endpoint = `${GRAPH_API_BASE}/me/drive/root/search(q='')?$orderby=size desc&$top=${pageSize}&$select=id,name,size,file,folder,lastModifiedDateTime,webUrl`;
    const url = pageToken || endpoint;

    const response = await this._fetchWithAuth(url);

    if (!response || !response.ok) {
      if (response) console.error('OneDrive Largest Files API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const files: OneDriveFile[] = (data.value || [])
      .filter((item: any) => !item.folder)
      .map((item: any) => this._mapOneDriveItem(item));

    const nextPageToken = data['@odata.nextLink'] || null;

    return { files, nextPageToken };
  }

  /**
   * Obtiene los archivos de la papelera de reciclaje.
   */
  async getTrashedFiles(
    pageSize: number = 50,
    pageToken?: string
  ): Promise<{ files: OneDriveFile[]; nextPageToken: string | null } | null> {
    const endpoint = `${GRAPH_API_BASE}/me/drive/special/trash/children?$top=${pageSize}&$select=id,name,size,file,folder,lastModifiedDateTime,webUrl`;
    const url = pageToken || endpoint;

    const response = await this._fetchWithAuth(url);

    if (!response || !response.ok) {
      if (response) console.error('OneDrive Trash API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const files: OneDriveFile[] = (data.value || []).map((item: any) => this._mapOneDriveItem(item));
    const nextPageToken = data['@odata.nextLink'] || null;

    return { files, nextPageToken };
  }

  /**
   * Elimina un archivo permanentemente.
   */
  async deleteFilePermanently(fileId: string): Promise<boolean> {
    const token = await this._getToken();
    if (!token) return false;

    try {
      const res: Response = await fetch(`${GRAPH_API_BASE}/me/drive/items/${fileId}`, {
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

    const allFiles: any[] = [];
    let nextLink: string | null = `${GRAPH_API_BASE}/me/drive/root/children?$top=200&$select=id,name,size,file,folder,package,specialFolder,mimeType`;

    while (nextLink && allFiles.length < 5000) {
      try {
        const res: Response = await fetch(nextLink, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) break;

        const data: any = await res.json();
        allFiles.push(...(data.value || []));
        nextLink = data['@odata.nextLink'] || null;
      } catch {
        break;
      }
    }

    const typeMap = new Map<string, { size: number; count: number; icon: string }>();
    for (const file of allFiles) {
      const isDirectory = Boolean(file.folder || file.package || file.specialFolder);
      const mimeType = file.file?.mimeType ?? (isDirectory ? 'application/vnd.google-apps.folder' : 'unknown');

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