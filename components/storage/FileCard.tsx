import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { UnifiedFile } from '../../types/storage';
import { getAuthToken } from '../../utils/secureStorage';
import OneDriveAuthService from '../../services/auth/onedrive-auth.service';

const onedriveAuth = new OneDriveAuthService();

export const categorizeMimeType = (
  mimeType?: string,
  fileName?: string
): { label: string } => {
  if (mimeType === 'application/vnd.google-apps.folder') {
    return { label: 'Folder' };
  }
  if (mimeType?.startsWith('image/')) return { label: 'Image' };
  if (mimeType?.startsWith('video/')) return { label: 'Video' };
  if (mimeType?.startsWith('audio/')) return { label: 'Audio' };
  if (mimeType?.includes('pdf')) return { label: 'PDF' };

  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (['doc', 'docx', 'txt', 'rtf'].includes(ext || '')) return { label: 'Doc' };
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return { label: 'Archive' };

  return { label: 'Other' };
};

interface FileCardProps {
  file: UnifiedFile;
  onPress?: (file: UnifiedFile) => void;
  onDelete?: (file: UnifiedFile) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onPress, onDelete }) => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const isFolder =
    file.mimeType === 'application/vnd.google-apps.folder' ||
    (file as any).folder !== undefined;

  const isMedia =
    file.mimeType?.startsWith('image/') ||
    file.mimeType?.startsWith('video/') ||
    Boolean(file.thumbnailUrl);

  useEffect(() => {
    let isMounted = true;
    async function loadToken() {
      if (file.provider === 'google-drive') {
        const token = await getAuthToken();
        if (isMounted) setAuthToken(token);
      } else if (file.provider === 'onedrive') {
        const token = await onedriveAuth.getAuthToken();
        if (isMounted) setAuthToken(token);
      }
    }

    if (isMedia) {
      loadToken();
    }
    return () => {
      isMounted = false;
    };
  }, [file.provider, isMedia]);

  const formatFileSize = (bytes: number | null | undefined): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (isFolder) return '📁';
    if (file.mimeType?.startsWith('image/')) return '🖼️';
    if (file.mimeType?.startsWith('video/')) return '🎬';
    if (file.mimeType?.startsWith('audio/')) return '🎵';
    if (file.mimeType?.includes('pdf')) return '📄';
    return '📄';
  };

  const renderThumbnail = () => {
    if (file.thumbnailUrl && !imgError) {
      const headers =
        file.provider === 'google-drive' && authToken
          ? { Authorization: `Bearer ${authToken}` }
          : undefined;

      return (
        <Image
          source={{
            uri: file.thumbnailUrl,
            headers,
          }}
          style={styles.thumbnail}
          onError={() => setImgError(true)}
        />
      );
    }

    return <Text style={styles.iconText}>{getFileIcon()}</Text>;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress && onPress(file)}
      activeOpacity={0.7}
    >
      <View style={styles.thumbnailContainer}>{renderThumbnail()}</View>

      <View style={styles.infoContainer}>
        <Text style={styles.fileName} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={styles.fileDetails}>
          {isFolder ? 'Folder' : formatFileSize(file.size)} •{' '}
          {file.modifiedTime
            ? new Date(file.modifiedTime).toLocaleDateString()
            : '—'}
        </Text>
      </View>

      {isFolder ? (
        <Text style={styles.arrow}>›</Text>
      ) : (
        onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(file)}
          >
            <Text style={styles.deleteText}>🗑️</Text>
          </TouchableOpacity>
        )
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnailContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f0f4f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  iconText: {
    fontSize: 22,
  },
  infoContainer: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333333',
  },
  fileDetails: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  arrow: {
    fontSize: 20,
    color: '#ccc',
    paddingLeft: 8,
  },
  deleteButton: {
    padding: 8,
  },
  deleteText: {
    fontSize: 16,
  },
});

export default FileCard;