import { driveFilesService } from './drive-files.service';
import { oneDriveFilesService } from './onedrive-files.service';

export type ProviderType = 'google-drive' | 'onedrive';

export interface TransferParams {
  fileId: string;
  fileName: string;
  mimeType: string;
  fromProvider: ProviderType;
  toProvider: ProviderType;
}

class TransferService {
  /**
   * Paso 1: Descarga el archivo de la plataforma origen y lo sube a la de destino.
   */
  async transferToDestination(params: TransferParams): Promise<boolean> {
    const { fileId, fileName, mimeType, fromProvider, toProvider } = params;

    let blob: Blob | null = null;
    if (fromProvider === 'google-drive') {
      blob = await driveFilesService.downloadFile(fileId);
    } else {
      blob = await oneDriveFilesService.downloadFile(fileId);
    }

    if (!blob) throw new Error('No se pudo descargar el archivo del servicio de origen.');

    // Forzar el mimeType si el Blob resultante no tiene tipo asignado
    if ((!blob.type || blob.type === 'application/octet-stream') && mimeType) {
      blob = new Blob([blob], { type: mimeType });
    }

    let uploadSuccess = false;
    if (toProvider === 'google-drive') {
      const res = await driveFilesService.uploadFile(blob, fileName, mimeType);
      uploadSuccess = Boolean(res);
    } else {
      const res = await oneDriveFilesService.uploadFile(blob, fileName);
      uploadSuccess = Boolean(res);
    }

    return uploadSuccess;
  }

  /**
   * Paso 2: Elimina permanentemente el archivo original de la plataforma de origen.
   */
  async deleteFromSource(fileId: string, provider: ProviderType): Promise<boolean> {
    if (provider === 'google-drive') {
      return await driveFilesService.deleteFilePermanently(fileId);
    } else {
      return await oneDriveFilesService.deleteFilePermanently(fileId);
    }
  }
}

export const transferService = new TransferService();