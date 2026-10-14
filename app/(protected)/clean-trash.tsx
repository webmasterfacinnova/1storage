// app/(protected)/clean-trash.tsx
// Limpiar papelera: ver y eliminar permanentemente archivos en la papelera

import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import { driveFilesService } from '../../services/drive-files.service';
import { driveService } from '../../services/drive.service';
import {
  setTrashedFilesLoading,
  setTrashedFiles,
  setTrashedFilesError,
  removeTrashedFile,
  clearTrashedFiles,
  selectTrashedFiles,
  selectTrashedFilesLoading,
  selectTrashedFilesNextPage,
} from '../../store/slices/driveFilesSlice';
import { selectDriveQuota } from '../../store/slices/driveSlice';

const CleanTrashScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const trashedFiles = useSelector(selectTrashedFiles);
  const loading = useSelector(selectTrashedFilesLoading);
  const nextPageToken = useSelector(selectTrashedFilesNextPage);
  const quota = useSelector(selectDriveQuota);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const fetchTrashedFiles = useCallback(async (append = false) => {
    dispatch(setTrashedFilesLoading(true));
    const result = await driveFilesService.getTrashedFiles(50, append ? nextPageToken || undefined : undefined);
    if (result) {
      dispatch(setTrashedFiles({ files: result.files, nextPageToken: result.nextPageToken, append }));
    } else {
      dispatch(setTrashedFilesError('No se pudieron obtener los archivos de la papelera'));
    }
  }, [dispatch, nextPageToken]);

  const onRefresh = useCallback(() => {
    fetchTrashedFiles(false);
  }, [fetchTrashedFiles]);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const handleSelectFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;

    Alert.alert(
      'Eliminar permanentemente',
      `¿Estás seguro de que deseas eliminar permanentemente ${selectedFiles.size} archivo(s)? Esta acción no se puede deshacer.`, 
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            let successCount = 0;
            for (const fileId of selectedFiles) {
              const success = await driveFilesService.deleteFilePermanently(fileId);
              if (success) {
                dispatch(removeTrashedFile(fileId));
                successCount++;
              }
            }
            setSelectedFiles(new Set());
            setIsDeleting(false);
            Alert.alert('Eliminado(s)', `${successCount} archivo(s) eliminado(s) permanentemente.`);
          },
        },
      ],
    );
  };

  const handleEmptyTrash = async () => {
    Alert.alert(
      'Vaciar papelera',
      '¿Estás seguro de que deseas eliminar permanentemente TODOS los archivos de la papelera? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar papelera',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const success = await driveFilesService.emptyTrash();
            if (success) {
              dispatch(clearTrashedFiles());
              Alert.alert('Papelera vaciada', 'Todos los archivos han sido eliminados permanentemente.');
            } else {
              Alert.alert('Error', 'No se pudo vaciar la papelera.');
            }
            setIsDeleting(false);
          },
        },
      ],
    );
  };

  const totalTrashSize = trashedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
  const usagePercent = quota ? driveService.usagePercentage(quota) : 0;
  const barColor = usagePercent > 90 ? '#e53935' : usagePercent > 70 ? '#fb8c00' : '#4285f4';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Papelera</Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Estadísticas de la papelera</Text>
        <View style={styles.statsRow}>
          <View style={styles.statsItem}>
            <Text style={styles.statsValue}>{trashedFiles.length}</Text>
            <Text style={styles.statsLabel}>Archivos</Text>
          </View>
          <View style={styles.statsItem}>
            <Text style={styles.statsValue}>{driveService.formatBytes(totalTrashSize)}</Text>
            <Text style={styles.statsLabel}>Tamaño total</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={handleEmptyTrash}
          disabled={isDeleting || trashedFiles.length === 0}
        >
          <Text style={styles.emptyButtonText}>Vaciar papelera</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.deleteSelectedButton}
          onPress={handleDeleteSelected}
          disabled={isDeleting || selectedFiles.size === 0}
        >
          <Text style={styles.deleteSelectedButtonText}>Eliminar seleccionados ({selectedFiles.size})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
      >
        {loading && trashedFiles.length === 0 ? (
          <ActivityIndicator size="large" color="#4285f4" />
        ) : trashedFiles.length > 0 ? (
          trashedFiles.map(file => (
            <TouchableOpacity
              key={file.id}
              style={[styles.fileCard, selectedFiles.has(file.id) && styles.fileCardSelected]}
              onPress={() => handleSelectFile(file.id)}
            >
              <View style={styles.fileIcon}>
                {file.mimeType.includes('folder') ? '📁' : '📄'}
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                <Text style={styles.fileSize}>{file.size ? driveService.formatBytes(file.size) : '—'}</Text>
              </View>
              {selectedFiles.has(file.id) && <Text style={styles.selectedCheck}>✓</Text>}
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.loadingText}>La papelera está vacía</Text>
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
    padding: 16,
    backgroundColor: '#d7eefb',
    borderBottomWidth: 1,
    borderBottomColor: '#e0ecf5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a237e',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statsItem: {
    alignItems: 'center',
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  statsLabel: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 2,
  },
  emptyButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  controls: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  deleteSelectedButton: {
    backgroundColor: '#e53935',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  deleteSelectedButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
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
  fileCardSelected: {
    backgroundColor: '#e3f2fd',
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
  fileSize: {
    fontSize: 13,
    color: '#5f6368',
    marginTop: 2,
  },
  selectedCheck: {
    fontSize: 20,
    color: '#1a73e8',
    marginLeft: 8,
  },
  loadingText: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default CleanTrashScreen;