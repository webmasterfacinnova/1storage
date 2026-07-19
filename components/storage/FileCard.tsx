// components/storage/FileCard.tsx
// Individual file card with type icon, provider badge, size, and date

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ProviderBadge from './ProviderBadge';

export interface UnifiedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string;
  provider: string;
  providerName: string;
  webViewLink?: string;
  iconLink?: string;
  parents?: string[];
  trashed?: boolean;
}

interface FileCardProps {
  file: UnifiedFile;
  onPress: (file: UnifiedFile) => void;
}

/** Determine file type category from MIME type */
export function categorizeMimeType(mimeType: string): { label: string; icon: string } {
  if (mimeType === 'application/vnd.google-apps.folder') return { label: 'Folder', icon: '📁' };
  if (mimeType.startsWith('image/')) return { label: 'Image', icon: '🖼️' };
  if (mimeType.startsWith('video/')) return { label: 'Video', icon: '🎬' };
  if (mimeType.startsWith('audio/')) return { label: 'Audio', icon: '🎵' };
  if (mimeType.includes('pdf')) return { label: 'PDF', icon: '📄' };
  if (mimeType.includes('document') || mimeType.includes('spreadsheet') || mimeType.includes('presentation'))
    return { label: 'Doc', icon: '📝' };
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gz'))
    return { label: 'Archive', icon: '🗜️' };
  if (mimeType.includes('text/')) return { label: 'Text', icon: '📄' };
  if (mimeType === 'application/vnd.google-apps.folder') return { label: 'Folder', icon: '📁' };
  return { label: 'File', icon: '📦' };
}

/** Map MIME type to a category key for filtering */
export function mimeTypeToCategory(mimeType: string): string {
  if (mimeType === 'application/vnd.google-apps.folder') return 'folders';
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'videos';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdfs';
  if (mimeType.includes('document') || mimeType.includes('spreadsheet') || mimeType.includes('presentation'))
    return 'docs';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gz'))
    return 'archives';
  if (mimeType.includes('text/')) return 'docs';
  return 'other';
}

/** Format bytes to human-readable string */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(1)} ${units[i]}`;
}

/** Format ISO date to relative or short date */
export function formatFileDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const FileCard: React.FC<FileCardProps> = ({ file, onPress }) => {
  const typeInfo = categorizeMimeType(file.mimeType);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(file)} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{typeInfo.icon}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
            {file.name}
          </Text>
          <ProviderBadge providerId={file.provider} />
        </View>
        <View style={styles.bottomRow}>
          {file.size !== null && file.size > 0 && (
            <Text style={styles.meta}>{formatFileSize(file.size)}</Text>
          )}
          <Text style={styles.meta}>{formatFileDate(file.modifiedTime)}</Text>
        </View>
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  meta: {
    fontSize: 12,
    color: '#999',
  },
  chevron: {
    fontSize: 20,
    color: '#ccc',
    marginLeft: 8,
  },
});

export default FileCard;
