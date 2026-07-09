// screens/FileListScreen.tsx
// File browser: browse files in a folder, filter by type, sort by size/name/date

import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { driveFilesService } from '../services/drive-files.service';
import { driveService } from '../services/drive.service';
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

type FileListRouteParams = {
  folderId?: string;
  folderName?: string;
  typeFilter?: string;
  sort?: 'size' | 'name' | 'date';
  fileId?: string;
};

const FileListScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: FileListRouteParams }, 'params'>>();
  const dispatch = useDispatch();
  const files = useSelector(selectCurrentFolderFiles);
  const folderId = useSelector(selectCurrentFolderId);
  const folderName = useSelector(selectCurrentFolderName);
  const loading = useSelector(selectFolderFilesLoading);
  const nextPageToken = useSelector(selectFolderFilesNextPage);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'size' | 'name' | 'date'>('size');

  const fetchFiles = useCallback(async (append = false) => {
    dispatch(setFolderFilesLoading(true));
    const result = await driveFilesService.getFilesInFolder(
      route.params?.folderId || folderId,
      50,
      append ? nextPageToken || undefined : undefined,
    );
    if (result) {
      dispatch(setFolderFiles({
        files: result.files,
        nextPageToken: result.nextPageToken,
        folderId: route.params?.folderId || folderId,
        folderName: route.params?.folderName || folderName,
        append,
      }));
    } else {
      dispatch(setFolderFilesError('Could not fetch files'));
    }
  }, [dispatch, folderId, folderName, nextPageToken, route.params]);

  const onRefresh = useCallback(() => {
    fetchFiles(false);
  }, [fetchFiles]);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const handleFolderPress = (folder: any) => {
    (navigation as any).push('FileList', {
      folderId: folder.id,
      folderName: folder.name,
    });
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('StorageBreakdown');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{folderName}</Text>
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
          <ActivityIndicator size="large" color="#4285f4" />
        ) : files.length > 0 ? (
          files
            .filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => {
              if (sortBy === 'size') {
                return (b.size || 0) - (a.size || 0);
              } else if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
              } else {
                return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime();
              }
            })
            .map(file => (
              <TouchableOpacity
                key={file.id}
                style={styles.fileCard}
                onPress={() => file.mimeType === 'application/vnd.google-apps.folder' ? handleFolderPress(file) : null}
              >
                <View style={styles.fileIcon}>
                  {file.mimeType === 'application/vnd.google-apps.folder' ? '📁' : '📄'}
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                  <Text style={styles.fileDetails}>
                    {file.size ? driveService.formatBytes(file.size) : '—'} • {new Date(file.modifiedTime).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.fileArrow}>›</Text>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    fontSize: 24,
    color: '#4285f4',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
    flex: 1,
    textAlign: 'center',
  },
  controls: {
    padding: 12,
    backgroundColor: '#ffffff',
  },
  searchInput: {
    backgroundColor: '#f0f4ff',
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
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f4ff',
  },
  sortButtonActive: {
    backgroundColor: '#4285f4',
  },
  sortButtonText: {
    color: '#4285f4',
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
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    color: '#666',
    marginTop: 2,
  },
  fileArrow: {
    fontSize: 20,
    color: '#ccc',
  },
  loadingText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default FileListScreen;