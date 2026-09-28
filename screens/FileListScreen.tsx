// screens/FileListScreen.tsx
import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { driveFilesService } from '../services/drive-files.service';
import { oneDriveFilesService } from '../services/onedrive-files.service';
import { transferService, ProviderType } from '../services/transfer.service';
import FileCard from '../components/storage/FileCard';
import { TransferConfirmDialog, DialogStep } from '../components/modals/TransferConfirmDialog';
import { UnifiedFile } from '../types/storage';
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

  const provider = route.params?.provider || 'google-drive';
  const isOneDrive = provider === 'onedrive';

  const files = useSelector((state: any) => isOneDrive ? selectOnedriveCurrentFolderFiles(state) : selectCurrentFolderFiles(state));
  const folderId = useSelector((state: any) => isOneDrive ? selectOnedriveCurrentFolderId(state) : selectCurrentFolderId(state));
  const folderName = useSelector((state: any) => isOneDrive ? selectOnedriveCurrentFolderName(state) : selectCurrentFolderName(state));
  const loading = useSelector((state: any) => isOneDrive ? selectOnedriveFolderFilesLoading(state) : selectFolderFilesLoading(state));
  const nextPageToken = useSelector((state: any) => isOneDrive ? selectOnedriveFolderFilesNextPage(state) : selectFolderFilesNextPage(state));

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'size' | 'name' | 'date'>('size');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState<DialogStep>('SELECT_PROVIDER');
  const [selectedFile, setSelectedFile] = useState<UnifiedFile | null>(null);
  const [targetProvider, setTargetProvider] = useState<ProviderType>('onedrive');

  const lastLoadedFolderRef = React.useRef<string | null>(null);
  const nextPageTokenRef = React.useRef(nextPageToken);
  nextPageTokenRef.current = nextPageToken;

  const fetchFiles = useCallback(async (append = false) => {
    const targetFolderId = route.params?.folderId || 'root';
    const targetFolderName = route.params?.folderName || (isOneDrive ? 'OneDrive' : 'My Drive');

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
        lastLoadedFolderRef.current = null;
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
        lastLoadedFolderRef.current = null;
        dispatch(setFolderFilesError('Could not fetch files'));
      }
    }
  }, [dispatch, isOneDrive, route.params?.folderId, route.params?.folderName]);

  const onRefresh = useCallback(() => {
    lastLoadedFolderRef.current = null;
    fetchFiles(false);
  }, [fetchFiles]);

  useEffect(() => {
    fetchFiles(false);
  }, [fetchFiles, route.params?.folderId]);

  const isFolder = (file: any): boolean => {
    if (isOneDrive) {
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

  // Manejo de la transferencia
  const handleStartTransfer = (file: UnifiedFile) => {
    setSelectedFile(file);
    setModalStep('SELECT_PROVIDER');
    setModalVisible(true);
  };

  const handleSelectDestination = async (destination: ProviderType) => {
    if (!selectedFile) return;
    setTargetProvider(destination);

    const hasConflict = await transferService.checkDestinationConflict(selectedFile.name, destination);
    if (hasConflict) {
      setModalStep('CONFLICT_RESOLUTION');
    } else {
      await executeTransfer(selectedFile, destination, 'replace');
    }
  };

  const handleResolveConflict = async (strategy: 'replace' | 'rename' | 'cancel') => {
    if (strategy === 'cancel' || !selectedFile) {
      setModalVisible(false);
      return;
    }
    await executeTransfer(selectedFile, targetProvider, strategy);
  };

  const executeTransfer = async (file: UnifiedFile, toProvider: ProviderType, conflictStrategy: 'replace' | 'rename' | 'cancel') => {
    try {
      const success = await transferService.transferToDestination({
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType || '',
        fromProvider: file.provider as ProviderType,
        toProvider,
        conflictStrategy,
      });

      if (success) {
        setModalStep('DELETE_SOURCE');
      } else {
        setModalVisible(false);
        Alert.alert('Error', 'La transferencia falló.');
      }
    } catch (err: any) {
      setModalVisible(false);
      Alert.alert('Error', err?.message || 'Error durante la transferencia');
    }
  };

  const handleDeleteSource = async () => {
    if (!selectedFile) return;
    const success = await transferService.deleteFromSource(selectedFile.id, selectedFile.provider as ProviderType);
    setModalVisible(false);
    if (success) {
      onRefresh();
    } else {
      Alert.alert('Aviso', 'El archivo se transfirió pero no se pudo eliminar el original.');
    }
  };

  const handleDeleteFile = async (file: UnifiedFile) => {
    const success = await transferService.deleteFromSource(file.id, file.provider as ProviderType);
    if (success) {
      onRefresh();
    } else {
      Alert.alert('Error', 'No se pudo eliminar el archivo.');
    }
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
            .map((file: any) => {
              const unifiedFile: UnifiedFile = {
                ...file,
                provider: file.provider || provider,
              };

              return (
                <FileCard
                  key={file.id}
                  file={unifiedFile}
                  onPress={(f) => {
                    if (isFolder(f)) {
                      handleFolderPress(f);
                    }
                  }}
                  onTransfer={handleStartTransfer}
                  onDelete={handleDeleteFile}
                />
              );
            })
        ) : (
          <Text style={styles.loadingText}>No files found</Text>
        )}
      </ScrollView>

      <TransferConfirmDialog
        visible={modalVisible}
        step={modalStep}
        fileName={selectedFile?.name}
        targetProvider={targetProvider === 'google-drive' ? 'Google Drive' : 'OneDrive'}
        onSelectDestination={handleSelectDestination}
        onResolveConflict={handleResolveConflict}
        onKeepSource={() => setModalVisible(false)}
        onDestroySource={handleDeleteSource}
        onClose={() => setModalVisible(false)}
      />
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
  loadingText: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default FileListScreen;