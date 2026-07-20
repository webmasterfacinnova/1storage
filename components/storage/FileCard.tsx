// components/storage/FileCard.tsx
// Individual file card — simple, stable, no fancy logic.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
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
  thumbnailLink?: string;
  parents?: string[];
  trashed?: boolean;
}

interface FileCardProps {
  file: UnifiedFile;
  onPress: (file: UnifiedFile) => void;
}

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
  return { label: 'File', icon: '📦' };
}

export function mimeTypeToCategory(mimeType: string): string {
  if (mimeType === 'application/vnd.google-apps.folder') return 'folders';
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'videos';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdfs';
  if (mimeType.includes('document') || mimeType.includes('spreadsheet') || mimeType.includes('presentation')) return 'docs';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gz')) return 'archives';
  if (mimeType.includes('text/')) return 'docs';
  return 'other';
}

export function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const FileCard: React.FC<FileCardProps> = ({ file, onPress }) => {
  const typeInfo = categorizeMimeType(file.mimeType);
  const isMedia = file.mimeType.startsWith('image/') || file.mimeType.startsWith('video/');
  const showThumb = !!file.thumbnailLink && isMedia;

  // Inline date formatting (no helper function to avoid any crash)
  let dateLabel = '—';
  if (file.modifiedTime) {
    try {
      const d = new Date(file.modifiedTime);
      const now = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (diff === 0) dateLabel = 'Today';
      else if (diff === 1) dateLabel = 'Yesterday';
      else if (diff < 7) dateLabel = `${diff}d ago`;
      else if (diff < 30) dateLabel = `${Math.floor(diff / 7)}w ago`;
      else dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch { dateLabel = file.modifiedTime; }
  }

  const sizeLabel = file.size != null && file.size > 0 ? formatFileSize(file.size) : null;

  return (
    <TouchableOpacity style={s.card} onPress={() => onPress(file)} activeOpacity={0.7}>
      <View style={[s.iconBox, showThumb && { padding: 0, overflow: 'hidden' }]}>
        {showThumb ? (
          <Image source={{ uri: file.thumbnailLink }} style={s.thumb} resizeMode="cover" />
        ) : file.iconLink ? (
          <Image source={{ uri: file.iconLink }} style={s.drIcon} resizeMode="contain" />
        ) : (
          <Text style={s.emoji}>{typeInfo.icon}</Text>
        )}
      </View>

      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{file.name}</Text>
        <View style={s.metaRow}>
          <Text style={s.meta}>{dateLabel}</Text>
          {sizeLabel && <Text style={s.meta}>{' • '}{sizeLabel}</Text>}
        </View>
      </View>

      <ProviderBadge providerId={file.provider} />
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e0ecf5',
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#e0f7ff',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  emoji: { fontSize: 20 },
  drIcon: { width: 32, height: 32 },
  thumb: { width: 40, height: 40, borderRadius: 10 },
  info: { flex: 1, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '500', color: '#333', marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  meta: { fontSize: 12, color: '#999999' },
});

export default FileCard;
