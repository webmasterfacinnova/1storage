import { oneDriveFilesService, OneDriveFilePreview } from './onedrive-files.service';
import { driveFilesService, DriveFilePreview } from './drive-files.service';
import { UnifiedFile, ProviderPageResult } from '../types/storage';

function gdToUnified(p: DriveFilePreview): UnifiedFile {
  return {
    id: p.id,
    name: p.name,
    mimeType: p.mimeType,
    size: p.details?.size ?? null,
    modifiedTime: p.details?.modifiedTime ?? '',
    provider: 'google-drive',
    providerName: 'Google Drive',
    iconLink: p.iconLink,
    thumbnailLink: p.details?.thumbnailLink,
    webViewLink: p.details?.webViewLink,
  };
}

function odToUnified(p: OneDriveFilePreview): UnifiedFile {
  return {
    id: p.id,
    name: p.name,
    mimeType: p.mimeType,
    size: p.size ?? null,
    modifiedTime: p.modifiedTime ?? '',
    provider: 'onedrive',
    providerName: 'OneDrive',
    webViewLink: p.webViewLink,
  };
}

export const fetchProviderFilesPage = async (
  providerId: string,
  pageSize = 20,
  pageToken?: string
): Promise<ProviderPageResult | null> => {
  try {
    if (providerId === 'onedrive') {
      const r = await oneDriveFilesService.getPreviews(pageSize, pageToken);
      if (!r) return null;
      return { files: r.files.map(odToUnified), nextPageToken: r.nextPageToken };
    }

    if (providerId === 'google-drive') {
      const r = await driveFilesService.getPreviews(pageSize, pageToken);
      if (!r) return null;
      return { files: r.files.map(gdToUnified), nextPageToken: r.nextPageToken };
    }

    // 🚀 Aquí añades nuevos proveedores en el futuro (ej. dropbox, box, etc.)

    return null;
  } catch (err) {
    console.error(`Error fetching page for ${providerId}:`, err);
    return null;
  }
};