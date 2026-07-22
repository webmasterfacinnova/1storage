// screens/FileListScreen.tsx
// File browser: browse files in a folder, filter by type, sort by size/name/date
// Supports both Google Drive and OneDrive via the `provider` route param.

import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { driveFilesService } from '../services/drive-files.service';
import { driveService } from '../services/drive.service';
import { oneDriveFilesService } from '../services/onedrive-files.service';
import { oneDriveService } from '../services/onedrive.service';
import {
  setFolderFilesLoading,
  setFolderFiles,
  setFolderFilesError,
  selectCurrentFolderFiles,
  selectCurrentFolderId,
  selectCurrentFolderName,
  selectFolderFilesLoading,
  selectFolderFilesNextPage,
} from '../store/slices/driveFilesSlice';
import {
  setFolderFilesLoading as setODFolderFilesLoading,
  setFolderFiles as setODFolderFiles,
  setFolderFilesError as setODFolderFilesError,
  selectOnedriveCurrentFolderFiles,
  selectOnedriveCurrentFolderId,
  selectOnedriveCurrentFolderName,
  selectOnedriveFolderFilesLoading,
  selectOnedriveFolderFilesNextPage,
} from '../store/slices/onedriveFilesSlice';

type FileListRouteParams = {
  folderId?: string;
  folderName?: string;
  typeFilter?: string;
  sort?: 'size' | 'name' | 'date';
  fileId?: string;
  provider?: 'google-drive' | 'onedrive';
};

const FileListScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: FileListRouteParams }, 'params'>>();
  const dispatch = useDispatch();

  // Determine which provider we're browsing
  const provider = route.params?.provider || 'google-drive';
  const isOneDrive = provider === 'onedrive';

  // Select from the correct Redux slice
  const files = useSelector(isOneDrive ? selectOnedriveCurrentFolderFiles : selectCurrentFolderFiles);
  const folderId = useSelector(isOneDrive ? selectOnedriveCurrentFolderId : selectCurrentFolderId);
  const folderName = useSelector(isOneDrive ? selectOnedriveCurrentFolderName : selectCurrentFolderName);
  const loading = useSelector(isOneDrive ? selectOnedriveFolderFilesLoading : selectFolderFilesLoading);
  const nextPageToken = useSelector(isOneDrive ? selectOnedriveFolderFilesNextPage : selectFolderFilesNextPage);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'size' | 'name' | 'date'>('size');

  // Track the last folder we loaded to avoid re-fetch loops
  const lastLoadedFolderRef = React.useRef<string | null>(null);
  // Keep a ref to the current nextPageToken so fetchFiles doesn't need it as a dependency
  const nextPageTokenRef = React.useRef(nextPageToken);
  nextPageTokenRef.current = nextPageToken;

  const fetchFiles = useCallback(async (append = false) => {
    const targetFolderId = route.params?.folderId || 'root';
    const targetFolderName = route.params?.folderName || (isOneDrive ? 'OneDrive' : 'My Drive');

    // Prevent re-fetching the same folder (avoids loop on push navigation)
    if (!append && lastLoadedFolderRef.current === targetFolderId) return;
    if (!append) lastLoadedFolderRef.current = targetFolderId;

    if (isOneDrive) {
      dispatch(setODFolderFilesLoading(true));
      const result = await oneDriveFilesService.getFilesInFolder(
        targetFolderId,
        50,
        append ? nextPageTokenRef.current || undefined : undefined,
      );
      if (result) {
        dispatch(setODFolderFiles({
          files: result.files,
          nextPageToken: result.nextPageToken,
          folderId: targetFolderId,
          folderName: targetFolderName,
          append,
        }));
      } else {
        dispatch(setODFolderFilesError('Could not fetch files'));
      }
    } else {
      dispatch(setFolderFilesLoading(true));
      const result = await driveFilesService.getFilesInFolder(
        targetFolderId,
        50,
        append ? nextPageTokenRef.current || undefined : undefined,
      );
      if (result) {
        dispatch(setFolderFiles({
          files: result.files,
          nextPageToken: result.nextPageToken,
          folderId: targetFolderId,
          folderName: targetFolderName,
          append,
        }));
      } else {
        dispatch(setFolderFilesError('Could not fetch files'));
      }
    }
  }, [dispatch, isOneDrive]);

  const onRefresh = useCallback(() => {
    fetchFiles(false);
  }, [fetchFiles]);

  useEffect(() => {
    fetchFiles(false);
  }, [fetchFiles, route.params?.folderId]);

  const isFolder = (file: any): boolean => {
    if (isOneDrive) {
      // OneDrive folders have a `folder` property (not a mimeType)
      return file.mimeType === 'application/vnd.google-apps.folder' || file.folder !== undefined;
    }
    return file.mimeType === 'application/vnd.google-apps.folder';
  };

  const handleFolderPress = (file: any) => {
    (navigation as any).push('FileList', {
      folderId: file.id,
      folderName: file.name,
      provider,
    });
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('StorageBreakdown');
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (bytes == null) return '—';
    if (isOneDrive) return oneDriveService.formatBytes(bytes);
    return driveService.formatBytes(bytes);
  };

  const providerColor = isOneDrive ? '#0078d4' : '#1a73e8';
  const providerLabel = isOneDrive ? 'OneDrive' : 'Google Drive';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{folderName}</Text>
          <Text style={[styles.providerLabel, { color: providerColor }]}>{providerLabel}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.controls}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search files..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'size' && styles.sortButtonActive]}
            onPress={() => setSortBy('size')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'size' && styles.sortButtonTextActive]}>Size</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'name' && styles.sortButtonActive]}
            onPress={() => setSortBy('name')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'name' && styles.sortButtonTextActive]}>Name</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
            onPress={() => setSortBy('date')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'date' && styles.sortButtonTextActive]}>Date</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
      >
        {loading && files.length === 0 ? (
          <ActivityIndicator size="large" color={providerColor} />
        ) : files.length > 0 ? (
          files
            .filter((file: any) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a: any, b: any) => {
              if (sortBy === 'size') {
                return (b.size || 0) - (a.size || 0);
              } else if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
              } else {
                return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime();
              }
            })
            .map((file: any) => (
              <TouchableOpacity
                key={file.id}
                style={styles.fileCard}
                onPress={() => isFolder(file) ? handleFolderPress(file) : null}
              >
                <View style={styles.fileIcon}>
                  {isFolder(file) ? '📁' : '📄'}
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                  <Text style={styles.fileDetails}>
                    {formatFileSize(file.size)} • {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : '—'}
                  </Text>
                </View>
                {isFolder(file) && <Text style={styles.fileArrow}>›</Text>}
              </TouchableOpacity>
            ))
        ) : (
          <Text style={styles.loadingText}>No files found</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f7fe',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#d7eefb',
    borderBottomWidth: 1,
    borderBottomColor: '#e0ecf5',
  },
  backButton: {
    fontSize: 24,
    color: '#1a73e8',
  },
  titleRow: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  providerLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  controls: {
    padding: 12,
    backgroundColor: '#d7eefb',
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  sortButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0ecf5',
  },
  sortButtonActive: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  sortButtonText: {
    color: '#1a73e8',
    fontSize: 14,
  },
  sortButtonTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  fileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  fileIcon: {
    marginRight: 12,
    fontSize: 20,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  fileDetails: {
    fontSize: 13,
    color: '#5f6368',
    marginTop: 2,
  },
  fileArrow: {
    fontSize: 20,
    color: '#ccc',
  },
  loadingText: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default FileListScreen;
