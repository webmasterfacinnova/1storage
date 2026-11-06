// app/(protected)/clean-trash.tsx
import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import {
  Trash2,
  FileText,
  Folder,
  CheckCircle2,
  Circle,
} from 'lucide-react-native';

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

const CleanTrashScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const trashedFiles = useSelector(selectTrashedFiles);
  const loading = useSelector(selectTrashedFilesLoading);
  const nextPageToken = useSelector(selectTrashedFilesNextPage);

  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const fetchTrashedFiles = useCallback(
    async (append = false) => {
      dispatch(setTrashedFilesLoading(true));
      const result = await driveFilesService.getTrashedFiles(
        50,
        append ? nextPageToken || undefined : undefined
      );
      if (result) {
        dispatch(
          setTrashedFiles({
            files: result.files,
            nextPageToken: result.nextPageToken,
            append,
          })
        );
      } else {
        dispatch(
          setTrashedFilesError('No se pudieron obtener los archivos de la papelera')
        );
      }
    },
    [dispatch, nextPageToken]
  );

  const onRefresh = useCallback(() => {
    setSelectedFiles(new Set());
    fetchTrashedFiles(false);
  }, [fetchTrashedFiles]);

  useEffect(() => {
    onRefresh();
  }, []);

  const handleSelectFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === trashedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(trashedFiles.map((f) => f.id)));
    }
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
            Alert.alert(
              'Eliminado(s)',
              `${successCount} archivo(s) eliminado(s) permanentemente.`
            );
          },
        },
      ]
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
              setSelectedFiles(new Set());
              Alert.alert(
                'Papelera vaciada',
                'Todos los archivos han sido eliminados permanentemente.'
              );
            } else {
              Alert.alert('Error', 'No se pudo vaciar la papelera.');
            }
            setIsDeleting(false);
          },
        },
      ]
    );
  };

  const totalTrashSize = useMemo(
    () => trashedFiles.reduce((sum, file) => sum + (file.size || 0), 0),
    [trashedFiles]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={loading && !isDeleting}
              onRefresh={onRefresh}
              tintColor="#FF6B35"
            />
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Tarjeta de Estadísticas de Papelera */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.iconCircle}>
                <Trash2 size={20} color="#FF6B35" />
              </View>
              <View style={styles.summaryTitleContainer}>
                <Text style={styles.summaryTitle}>Espacio ocupado</Text>
                <Text style={styles.summarySubtitle}>
                  Los elementos aquí se eliminarán definitivamente al vaciarse
                </Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{trashedFiles.length}</Text>
                <Text style={styles.statLabel}>Archivos</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {driveService.formatBytes(totalTrashSize)}
                </Text>
                <Text style={styles.statLabel}>Tamaño total</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.emptyButton,
                (isDeleting || trashedFiles.length === 0) && styles.disabledButton,
              ]}
              onPress={handleEmptyTrash}
              disabled={isDeleting || trashedFiles.length === 0}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyButtonText}>Vaciar papelera</Text>
            </TouchableOpacity>
          </View>

          {/* Barra de Acciones de Selección */}
          {trashedFiles.length > 0 && (
            <View style={styles.actionToolbar}>
              <TouchableOpacity
                style={styles.selectAllBtn}
                onPress={handleSelectAll}
              >
                {selectedFiles.size === trashedFiles.length ? (
                  <CheckCircle2 size={18} color="#FF6B35" />
                ) : (
                  <Circle size={18} color="#757575" />
                )}
                <Text style={styles.selectAllText}>
                  {selectedFiles.size === trashedFiles.length
                    ? 'Deseleccionar todos'
                    : 'Seleccionar todos'}
                </Text>
              </TouchableOpacity>

              {selectedFiles.size > 0 && (
                <TouchableOpacity
                  style={styles.deleteSelectedBtn}
                  onPress={handleDeleteSelected}
                  disabled={isDeleting}
                >
                  <Text style={styles.deleteSelectedText}>
                    Eliminar ({selectedFiles.size})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Cabecera de la Sección de Lista */}
          <View style={styles.secHeader}>
            <Text style={styles.secTitle}>Archivos en papelera</Text>
            <Text style={styles.secCount}>
              {trashedFiles.length} archivo{trashedFiles.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Lista de Archivos */}
          {loading && trashedFiles.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text style={styles.loadingText}>Cargando papelera...</Text>
            </View>
          ) : trashedFiles.length > 0 ? (
            trashedFiles.map((file) => {
              const isFolder = file.mimeType?.includes('folder');
              const isSelected = selectedFiles.has(file.id);

              return (
                <TouchableOpacity
                  key={file.id}
                  style={[
                    styles.fileCard,
                    isSelected && styles.fileCardSelected,
                  ]}
                  onPress={() => handleSelectFile(file.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.fileIconContainer,
                      isFolder ? styles.folderIconBg : styles.fileIconBg,
                    ]}
                  >
                    {isFolder ? (
                      <Folder size={22} color="#f57c00" />
                    ) : (
                      <FileText size={22} color="#FF6B35" />
                    )}
                  </View>

                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.fileSize}>
                      {file.size ? driveService.formatBytes(file.size) : '—'}
                    </Text>
                  </View>

                  <View style={styles.checkboxContainer}>
                    {isSelected ? (
                      <CheckCircle2 size={22} color="#FF6B35" />
                    ) : (
                      <Circle size={22} color="#bdbdbd" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Trash2 size={40} color="#9e9e9e" />
              </View>
              <Text style={styles.emptyTitle}>La papelera está vacía</Text>
              <Text style={styles.emptySubtitle}>
                Los archivos que elimines aparecerán aquí antes de borrarse permanentemente.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryTitleContainer: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  summarySubtitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: '#e0e0e0',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#616161',
    marginTop: 2,
  },
  emptyButton: {
    backgroundColor: '#d32f2f',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  deleteSelectedBtn: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteSelectedText: {
    color: '#c62828',
    fontSize: 13,
    fontWeight: '600',
  },
  secHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  secTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333333',
  },
  secCount: {
    fontSize: 12,
    color: '#9e9e9e',
  },
  fileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  fileCardSelected: {
    backgroundColor: '#FFF4E5',
    borderColor: '#FFD8BD',
  },
  fileIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  folderIconBg: {
    backgroundColor: '#fff3e0',
  },
  fileIconBg: {
    backgroundColor: '#FFF4E5',
  },
  fileInfo: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  fileSize: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  checkboxContainer: {
    paddingLeft: 4,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#424242',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9e9e9e',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default CleanTrashScreen;