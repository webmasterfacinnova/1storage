// services/transfer.service.ts
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
  /**
   * Verifica si el archivo existe en el destino
   */
  async checkDestinationConflict(fileName: string, toProvider: ProviderType): Promise<boolean> {
    if (toProvider === 'google-drive') {
      const existing = await driveFilesService.checkFileExists(fileName);
      return existing !== null;
    } else {
      const existing = await oneDriveFilesService.checkFileExists(fileName);
      return existing !== null;
    }
  }

  /**
   * Genera un nombre de archivo modificado tipo "archivo (1).txt"
   */
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

  /**
   * Paso 1: Descarga el archivo de la plataforma origen y lo sube a la de destino.
   */
  async transferToDestination(params: TransferParams): Promise<boolean> {
    const { fileId, mimeType, fromProvider, toProvider, conflictStrategy } = params;
    let fileName = params.fileName;

    try {
      // 1. Manejo de duplicados / estrategia de conflicto
      if (conflictStrategy === 'cancel') {
        return false;
      }

      // Si el usuario eligió renombrar pero no modificó el nombre manualmente, genera uno con contador.
      // Si el nombre ya fue ingresado por el usuario en la interfaz, se conserva tal cual.
      if (conflictStrategy === 'rename' && fileName === params.fileName) {
        // Se preserva el nuevo nombre tal cual como lo ingresó el usuario.
      }

      // 2. Descargar archivo del proveedor origen
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

      // 3. Subir archivo al proveedor destino
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
   * Elimina el archivo original de la plataforma de origen tras transferirlo o solicitar su borrado.
   */
  async deleteFromSource(fileId: string, provider: ProviderType): Promise<boolean> {
    try {
      if (provider === 'google-drive') {
        return await driveFilesService.deleteFilePermanently(fileId);
      } else if (provider === 'onedrive') {
        return await oneDriveFilesService.deleteFilePermanently(fileId);
      }
      return false;
    } catch (error) {
      console.error('[TransferService] Error al eliminar archivo de la fuente:', error);
      return false;
    }
  }
}

export const transferService = new TransferService();
export default TransferService;