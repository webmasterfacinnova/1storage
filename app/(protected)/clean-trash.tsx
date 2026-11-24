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
import { oneDriveFilesService } from "../../services/onedrive-files.service";
import { transferService, ProviderType } from "../../services/transfer.service";
import { driveService } from "../../services/drive.service";
import { Colors } from "../../components/theme/colors";
import { TrashSummaryCard } from "../../components/trash/TrashSummaryCard";
import { TrashSelectionToolbar } from "../../components/trash/TrashSelectionToolbar";
import { TrashedFileItem } from "../../components/trash/TrashedFileItem";
import { TrashEmptyState } from "../../components/trash/TrashEmptyState";
import { selectConnectedProviders } from "../../store/slices/connectedProvidersSlice";
import {
  setTrashedFilesLoading,
  setTrashedFiles,
  setTrashedFilesError,
  removeTrashedFile,
  clearTrashedFiles,
  selectTrashedFiles,
  selectTrashedFilesLoading,
} from "../../store/slices/driveFilesSlice";
import {
  setTrashedFilesLoading as setODTrashedFilesLoading,
  setTrashedFiles as setODTrashedFiles,
  setTrashedFilesError as setODTrashedFilesError,
  removeTrashedFile as removeODTrashedFile,
  clearTrashedFiles as clearODTrashedFiles,
  selectOnedriveTrashedFiles,
  selectOnedriveTrashedFilesLoading,
} from "../../store/slices/onedriveFilesSlice";

interface UnifiedTrashEntry {
  key: string;
  id: string;
  provider: ProviderType;
  name: string;
  mimeType: string;
  size: number;
}

const CleanTrashScreen = () => {
  const dispatch = useDispatch();

  const connectedProviders = useSelector(selectConnectedProviders);
  const hasGoogleDrive = Boolean(connectedProviders?.["google-drive"]);
  const hasOneDrive = Boolean(connectedProviders?.["onedrive"]);

  const driveTrashed = useSelector(selectTrashedFiles);
  const driveLoading = useSelector(selectTrashedFilesLoading);

  const odTrashed = useSelector(selectOnedriveTrashedFiles);
  const odLoading = useSelector(selectOnedriveTrashedFilesLoading);

  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const combinedTrashed: UnifiedTrashEntry[] = useMemo(() => {
    const items: UnifiedTrashEntry[] = [];
    if (hasGoogleDrive) {
      for (const f of driveTrashed || []) {
        items.push({
          key: `google-drive:${f.id}`,
          id: f.id,
          provider: "google-drive",
          name: f.name,
          mimeType: f.mimeType,
          size: f.size || 0,
        });
      }
    }
    if (hasOneDrive) {
      for (const f of odTrashed || []) {
        items.push({
          key: `onedrive:${f.id}`,
          id: f.id,
          provider: "onedrive",
          name: f.name,
          mimeType: f.mimeType,
          size: f.size || 0,
        });
      }
    }
    return items;
  }, [hasGoogleDrive, hasOneDrive, driveTrashed, odTrashed]);

  const loading =
    (hasGoogleDrive && driveLoading) || (hasOneDrive && odLoading);

  const fetchAllTrashed = useCallback(async () => {
    const tasks: Promise<void>[] = [];

    if (hasGoogleDrive) {
      tasks.push(
        (async () => {
          dispatch(setTrashedFilesLoading(true));
          const res = await driveFilesService.getTrashedFiles(100);
          if (res) {
            dispatch(
              setTrashedFiles({
                files: res.files,
                nextPageToken: res.nextPageToken,
                append: false,
              }),
            );
          } else {
            dispatch(
              setTrashedFilesError(
                "No se pudieron obtener los archivos de papelera de Google Drive",
              ),
            );
          }
        })(),
      );
    }

    if (hasOneDrive) {
      tasks.push(
        (async () => {
          dispatch(setODTrashedFilesLoading(true));
          const res = await oneDriveFilesService.getTrashedFiles(100);
          if (res) {
            dispatch(
              setODTrashedFiles({
                files: res.files,
                nextPageToken: res.nextPageToken,
                append: false,
              }),
            );
          } else {
            dispatch(
              setODTrashedFilesError(
                "No se pudieron obtener los archivos de papelera de OneDrive",
              ),
            );
          }
        })(),
      );
    }

    await Promise.all(tasks);
  }, [dispatch, hasGoogleDrive, hasOneDrive]);

  const onRefresh = useCallback(() => {
    setSelectedKeys(new Set());
    fetchAllTrashed();
  }, [fetchAllTrashed]);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const handleSelectFile = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedKeys((prev) =>
      prev.size === combinedTrashed.length
        ? new Set()
        : new Set(combinedTrashed.map((f) => f.key)),
    );
  }, [combinedTrashed]);

  const handleDeleteSelected = async () => {
    if (selectedKeys.size === 0) return;

    Alert.alert(
      "Eliminar permanentemente",
      `¿Estás seguro de que deseas eliminar permanentemente ${selectedKeys.size} archivo(s)? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            let successCount = 0;
            const targets = combinedTrashed.filter((item) =>
              selectedKeys.has(item.key),
            );

            for (const item of targets) {
              const ok = await transferService.deletePermanently(
                item.id,
                item.provider,
              );
              if (ok) {
                if (item.provider === "google-drive") {
                  dispatch(removeTrashedFile(item.id));
                } else {
                  dispatch(removeODTrashedFile(item.id));
                }
                successCount++;
              }
            }

            setSelectedKeys(new Set());
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
            let allOk = true;

            if (hasGoogleDrive) {
              const okDrive = await driveFilesService.emptyTrash();
              if (okDrive) dispatch(clearTrashedFiles());
              else allOk = false;
            }

            if (hasOneDrive) {
              const okOD = await oneDriveFilesService.emptyTrash();
              if (okOD) dispatch(clearODTrashedFiles());
              else allOk = false;
            }

            setSelectedKeys(new Set());
            setIsDeleting(false);

            if (allOk) {
              Alert.alert(
                "Papelera vaciada",
                "Todos los archivos han sido eliminados permanentemente.",
              );
            } else {
              Alert.alert(
                "Aviso",
                "No se pudieron vaciar todos los elementos de la papelera.",
              );
            }
          },
        },
      ],
    );
  };

  const totalTrashSize = useMemo(
    () => combinedTrashed.reduce((sum, file) => sum + (file.size || 0), 0),
    [combinedTrashed],
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
            fileCount={combinedTrashed.length}
            formattedTotalSize={driveService.formatBytes(totalTrashSize)}
            isDeleting={isDeleting}
            onEmptyTrash={handleEmptyTrash}
          />

          <TrashSelectionToolbar
            selectedCount={selectedKeys.size}
            totalCount={combinedTrashed.length}
            isDeleting={isDeleting}
            onSelectAll={handleSelectAll}
            onDeleteSelected={handleDeleteSelected}
          />

          <View style={styles.secHeader}>
            <Text style={styles.secTitle}>Archivos en papelera</Text>
            <Text style={styles.secCount}>
              {combinedTrashed.length} archivo
              {combinedTrashed.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {loading && combinedTrashed.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.brand.primary} />
              <Text style={styles.loadingText}>Cargando papelera...</Text>
            </View>
          ) : combinedTrashed.length > 0 ? (
            combinedTrashed.map((file) => (
              <TrashedFileItem
                key={file.key}
                id={file.key}
                name={file.name}
                mimeType={file.mimeType}
                formattedSize={
                  file.size ? driveService.formatBytes(file.size) : "—"
                }
                isSelected={selectedKeys.has(file.key)}
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