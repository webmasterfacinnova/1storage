import { driveFilesService } from './drive-files.service';
import { oneDriveFilesService } from './onedrive-files.service';

export type ProviderType = 'google-drive' | 'onedrive';

export interface TransferParams {
  fileId: string;
  fileName: string;
  mimeType: string;
  fromProvider: ProviderType;
  toProvider: ProviderType;
  conflictStrategy?: 'replace' | 'rename' | 'cancel';
}

class TransferService {
  async checkDestinationConflict(fileName: string, toProvider: ProviderType): Promise<boolean> {
    if (toProvider === 'google-drive') {
      const existing = await driveFilesService.checkFileExists(fileName);
      return existing !== null;
    } else {
      const existing = await oneDriveFilesService.checkFileExists(fileName);
      return existing !== null;
    }
  }

  getModifiedFileName(fileName: string, existingNames: string[] = []): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    const name = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
    const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';

    let counter = 1;
    let newName = `${name} (${counter})${ext}`;

    if (existingNames.length > 0) {
      while (existingNames.includes(newName)) {
        counter++;
        newName = `${name} (${counter})${ext}`;
      }
    }

    return newName;
  }

  async transferToDestination(params: TransferParams): Promise<boolean> {
    const { fileId, mimeType, fromProvider, toProvider, conflictStrategy } = params;
    const fileName = params.fileName;

    try {
      if (conflictStrategy === 'cancel') {
        return false;
      }

      let blob: Blob | null = null;
      if (fromProvider === 'google-drive') {
        blob = await driveFilesService.downloadFile(fileId);
      } else if (fromProvider === 'onedrive') {
        blob = await oneDriveFilesService.downloadFile(fileId);
      }

      if (!blob) {
        console.error('[TransferService] Error al descargar el archivo de origen');
        return false;
      }

      let uploadedFile = null;
      if (toProvider === 'google-drive') {
        uploadedFile = await driveFilesService.uploadFile(blob, fileName, mimeType);
      } else if (toProvider === 'onedrive') {
        uploadedFile = await oneDriveFilesService.uploadFile(blob, fileName);
      }

      return uploadedFile !== null;
    } catch (error) {
      console.error('[TransferService] Error durante la transferencia:', error);
      return false;
    }
  }

  /**
   * Envía el archivo a la papelera del proveedor (eliminación directa o origen tras transferir).
   */
  async deleteFromSource(fileId: string, provider: ProviderType): Promise<boolean> {
    try {
      if (provider === 'google-drive') {
        return await driveFilesService.moveToTrash(fileId);
      } else if (provider === 'onedrive') {
        return await oneDriveFilesService.moveToTrash(fileId);
      }
      return false;
    } catch (error) {
      console.error('[TransferService] Error al mover archivo a papelera:', error);
      return false;
    }
  }

  /**
   * Elimina el archivo de forma definitiva (para usar desde la vista de papelera).
   */
  async deletePermanently(fileId: string, provider: ProviderType): Promise<boolean> {
    try {
      if (provider === 'google-drive') {
        return await driveFilesService.deleteFilePermanently(fileId);
      } else if (provider === 'onedrive') {
        return await oneDriveFilesService.deleteFilePermanently(fileId);
      }
      return false;
    } catch (error) {
      console.error('[TransferService] Error al eliminar permanentemente:', error);
      return false;
    }
  }
}

export const transferService = new TransferService();
export default TransferService;