import React, { useEffect, useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";

import { driveFilesService } from "../../services/drive-files.service";
import { driveService } from "../../services/drive.service";
import { Colors } from "../../components/theme/colors";
import { TrashSummaryCard } from "../../components/trash/TrashSummaryCard";
import { TrashSelectionToolbar } from "../../components/trash/TrashSelectionToolbar";
import { TrashedFileItem } from "../../components/trash/TrashedFileItem";
import { TrashEmptyState } from "../../components/trash/TrashEmptyState";
import {
  setTrashedFilesLoading,
  setTrashedFiles,
  setTrashedFilesError,
  removeTrashedFile,
  clearTrashedFiles,
  selectTrashedFiles,
  selectTrashedFilesLoading,
  selectTrashedFilesNextPage,
} from "../../store/slices/driveFilesSlice";

const CleanTrashScreen = () => {
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
        append ? nextPageToken || undefined : undefined,
      );
      if (result) {
        dispatch(
          setTrashedFiles({
            files: result.files,
            nextPageToken: result.nextPageToken,
            append,
          }),
        );
      } else {
        dispatch(
          setTrashedFilesError(
            "No se pudieron obtener los archivos de la papelera",
          ),
        );
      }
    },
    [dispatch, nextPageToken],
  );

  const onRefresh = useCallback(() => {
    setSelectedFiles(new Set());
    fetchTrashedFiles(false);
  }, [fetchTrashedFiles]);

  useEffect(() => {
    onRefresh();
  }, []);

  const handleSelectFile = useCallback((fileId: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedFiles((prev) =>
      prev.size === trashedFiles.length
        ? new Set()
        : new Set(trashedFiles.map((f) => f.id)),
    );
  }, [trashedFiles]);

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;

    Alert.alert(
      "Eliminar permanentemente",
      `¿Estás seguro de que deseas eliminar permanentemente ${selectedFiles.size} archivo(s)? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            let successCount = 0;
            for (const fileId of selectedFiles) {
              const success =
                await driveFilesService.deleteFilePermanently(fileId);
              if (success) {
                dispatch(removeTrashedFile(fileId));
                successCount++;
              }
            }
            setSelectedFiles(new Set());
            setIsDeleting(false);
            Alert.alert(
              "Eliminado(s)",
              `${successCount} archivo(s) eliminado(s) permanentemente.`,
            );
          },
        },
      ],
    );
  };

  const handleEmptyTrash = async () => {
    Alert.alert(
      "Vaciar papelera",
      "¿Estás seguro de que deseas eliminar permanentemente TODOS los archivos de la papelera? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Vaciar papelera",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            const success = await driveFilesService.emptyTrash();
            if (success) {
              dispatch(clearTrashedFiles());
              setSelectedFiles(new Set());
              Alert.alert(
                "Papelera vaciada",
                "Todos los archivos han sido eliminados permanentemente.",
              );
            } else {
              Alert.alert("Error", "No se pudo vaciar la papelera.");
            }
            setIsDeleting(false);
          },
        },
      ],
    );
  };

  const totalTrashSize = useMemo(
    () => trashedFiles.reduce((sum, file) => sum + (file.size || 0), 0),
    [trashedFiles],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <View style={styles.container}>
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={loading && !isDeleting}
              onRefresh={onRefresh}
              tintColor={Colors.brand.primary}
            />
          }
          contentContainerStyle={styles.scrollContent}
        >
          <TrashSummaryCard
            fileCount={trashedFiles.length}
            formattedTotalSize={driveService.formatBytes(totalTrashSize)}
            isDeleting={isDeleting}
            onEmptyTrash={handleEmptyTrash}
          />

          <TrashSelectionToolbar
            selectedCount={selectedFiles.size}
            totalCount={trashedFiles.length}
            isDeleting={isDeleting}
            onSelectAll={handleSelectAll}
            onDeleteSelected={handleDeleteSelected}
          />

          <View style={styles.secHeader}>
            <Text style={styles.secTitle}>Archivos en papelera</Text>
            <Text style={styles.secCount}>
              {trashedFiles.length} archivo
              {trashedFiles.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {loading && trashedFiles.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.brand.primary} />
              <Text style={styles.loadingText}>Cargando papelera...</Text>
            </View>
          ) : trashedFiles.length > 0 ? (
            trashedFiles.map((file) => (
              <TrashedFileItem
                key={file.id}
                id={file.id}
                name={file.name}
                mimeType={file.mimeType}
                formattedSize={
                  file.size ? driveService.formatBytes(file.size) : "—"
                }
                isSelected={selectedFiles.has(file.id)}
                onToggleSelect={handleSelectFile}
              />
            ))
          ) : (
            <TrashEmptyState />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  secHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  secTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text.heading,
  },
  secCount: {
    fontSize: 12,
    color: Colors.text.neutral,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: Colors.text.iconMuted,
    fontSize: 13,
  },
});

export default CleanTrashScreen;