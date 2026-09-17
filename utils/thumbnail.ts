// utils/thumbnail.ts
import { ImageSourcePropType } from 'react-native';
import { UnifiedFile } from '../types/storage';

/**
 * Determina si un archivo es de tipo imagen o video mediante su mimeType o su extensión.
 */
export function isMediaFile(mimeType?: string, fileName?: string): boolean {
  const safeMime = (mimeType || '').toLowerCase();
  const safeName = (fileName || '').toLowerCase();

  return (
    safeMime.startsWith('image/') ||
    safeMime.startsWith('video/') ||
    /\.(jpg|jpeg|png|gif|webp|bmp|svg|mp4|mov|avi|mkv|webm)$/i.test(safeName)
  );
}

/**
 * Genera el objeto source compatible con <Image /> de React Native, inyectando token si aplica.
 */
export function getThumbnailSource(file: UnifiedFile, token?: string | null): ImageSourcePropType | null {
  if (!file.thumbnailUrl || !isMediaFile(file.mimeType, file.name)) {
    return null;
  }

  if (token) {
    return {
      uri: file.thumbnailUrl,
      headers: { Authorization: `Bearer ${token}` },
    };
  }

  return { uri: file.thumbnailUrl };
}