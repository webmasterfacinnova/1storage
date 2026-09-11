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
    const url = `${GRAPH_API_BASE}/me/drive/items/${fileId}`;
    const response = await this._fetchWithAuth(url, { method: 'DELETE' });

    return !!(response && (response.ok || response.status === 204));
  }
}

export const oneDriveFilesService = new OneDriveFilesService();
export default OneDriveFilesService;