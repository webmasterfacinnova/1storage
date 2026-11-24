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
import { useSelector, useDispatch } from "react-redux";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeftRight, Trash2 } from "lucide-react-native";

import { driveFilesService } from "../../services/drive-files.service";
import { oneDriveFilesService } from "../../services/onedrive-files.service";
import { transferService, ProviderType } from "../../services/transfer.service";
import { Colors } from "../../components/theme/colors";
import FileCard from "../../components/storage/FileCard";
import { FileListHeader } from "../../components/storage/FileListHeader";
import {
  FileSearchAndSortBar,
  FileSortOption,
} from "../../components/storage/FileSearchAndSortBar";
import {
  TransferConfirmDialog,
  DialogStep,
} from "../../components/modals/TransferConfirmDialog";
import {
  FileActionsModal,
  FileActionOption,
} from "../../components/modals/FileActionsModal";
import { UnifiedFile } from "../../types/storage";
import { selectConnectedProviders } from "../../store/slices/connectedProvidersSlice";
import {
  setFolderFilesLoading,
  setFolderFiles,
  setFolderFilesError,
  selectCurrentFolderFiles,
  selectCurrentFolderName,
  selectFolderFilesLoading,
  selectFolderFilesNextPage,
} from "../../store/slices/driveFilesSlice";
import {
  setFolderFilesLoading as setODFolderFilesLoading,
  setFolderFiles as setODFolderFiles,
  setFolderFilesError as setODFolderFilesError,
  selectOnedriveCurrentFolderFiles,
  selectOnedriveCurrentFolderName,
  selectOnedriveFolderFilesLoading,
  selectOnedriveFolderFilesNextPage,
} from "../../store/slices/onedriveFilesSlice";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

const FileListScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    folderId?: string;
    folderName?: string;
    typeFilter?: string;
    sort?: FileSortOption;
    fileId?: string;
    provider?: "google-drive" | "onedrive";
  }>();

  const dispatch = useDispatch();

  const provider = params.provider || "google-drive";
  const isOneDrive = provider === "onedrive";

  const connectedProviders = useSelector(selectConnectedProviders);

  const files = useSelector((state: any) =>
    isOneDrive
      ? selectOnedriveCurrentFolderFiles(state)
      : selectCurrentFolderFiles(state),
  );
  const folderName = useSelector((state: any) =>
    isOneDrive
      ? selectOnedriveCurrentFolderName(state)
      : selectCurrentFolderName(state),
  );
  const loading = useSelector((state: any) =>
    isOneDrive
      ? selectOnedriveFolderFilesLoading(state)
      : selectFolderFilesLoading(state),
  );
  const nextPageToken = useSelector((state: any) =>
    isOneDrive
      ? selectOnedriveFolderFilesNextPage(state)
      : selectFolderFilesNextPage(state),
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<FileSortOption>(params.sort || "size");

  const [menuFile, setMenuFile] = useState<UnifiedFile | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState<DialogStep>("SELECT_PROVIDER");
  const [selectedFile, setSelectedFile] = useState<UnifiedFile | null>(null);
  const [targetProvider, setTargetProvider] = useState<ProviderType>("onedrive");

  const lastLoadedFolderRef = React.useRef<string | null>(null);
  const nextPageTokenRef = React.useRef(nextPageToken);
  nextPageTokenRef.current = nextPageToken;

  const fetchFiles = useCallback(
    async (append = false) => {
      const targetFolderId = params.folderId || "root";
      const targetFolderName =
        params.folderName || (isOneDrive ? "OneDrive" : "Mi unidad");

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
          dispatch(
            setODFolderFiles({
              files: result.files,
              nextPageToken: result.nextPageToken,
              folderId: targetFolderId,
              folderName: targetFolderName,
              append,
            }),
          );
        } else {
          lastLoadedFolderRef.current = null;
          dispatch(
            setODFolderFilesError("No se pudieron obtener los archivos"),
          );
        }
      } else {
        dispatch(setFolderFilesLoading(true));
        const result = await driveFilesService.getFilesInFolder(
          targetFolderId,
          50,
          append ? nextPageTokenRef.current || undefined : undefined,
        );
        if (result) {
          dispatch(
            setFolderFiles({
              files: result.files,
              nextPageToken: result.nextPageToken,
              folderId: targetFolderId,
              folderName: targetFolderName,
              append,
            }),
          );
        } else {
          lastLoadedFolderRef.current = null;
          dispatch(setFolderFilesError("No se pudieron obtener los archivos"));
        }
      }
    },
    [dispatch, isOneDrive, params.folderId, params.folderName],
  );

  const onRefresh = useCallback(() => {
    lastLoadedFolderRef.current = null;
    fetchFiles(false);
  }, [fetchFiles]);

  useEffect(() => {
    fetchFiles(false);
  }, [fetchFiles, params.folderId]);

  const isFolder = useCallback(
    (file: any): boolean => {
      if (isOneDrive) {
        return file.mimeType === FOLDER_MIME_TYPE || file.folder !== undefined;
      }
      return file.mimeType === FOLDER_MIME_TYPE;
    },
    [isOneDrive],
  );

  const handleFolderPress = useCallback(
    (file: any) => {
      router.push({
        pathname: "/(protected)/file-list",
        params: {
          folderId: file.id,
          folderName: file.name,
          provider,
        },
      });
    },
    [provider, router],
  );

  const handleBackPress = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(protected)/storage-breakdown");
    }
  }, [router]);

  const handleStartTransfer = useCallback(
    (file: UnifiedFile) => {
      const connectedCount = Object.keys(connectedProviders || {}).length;

      if (connectedCount < 2) {
        Alert.alert(
          "Conecta otra cuenta de almacenamiento",
          "Para transferir archivos entre servicios necesitas tener al menos 2 nubes vinculadas (por ejemplo, Google Drive y OneDrive). Agrega otra cuenta para empezar a mover tus archivos fácilmente.",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Conectar nube",
              onPress: () => router.push("/(protected)/add-provider"),
            },
          ],
        );
        return;
      }

      setSelectedFile(file);
      setModalStep("SELECT_PROVIDER");
      setModalVisible(true);
    },
    [connectedProviders, router],
  );

  const handleSelectDestination = async (destination: ProviderType) => {
    if (!selectedFile) return;
    setTargetProvider(destination);

    const hasConflict = await transferService.checkDestinationConflict(
      selectedFile.name,
      destination,
    );
    if (hasConflict) {
      setModalStep("CONFLICT_RESOLUTION");
    } else {
      await executeTransfer(selectedFile, destination, "replace");
    }
  };

  const handleResolveConflict = async (
    strategy: "replace" | "rename" | "cancel",
  ) => {
    if (strategy === "cancel" || !selectedFile) {
      setModalVisible(false);
      return;
    }
    await executeTransfer(selectedFile, targetProvider, strategy);
  };

  const executeTransfer = async (
    file: UnifiedFile,
    toProvider: ProviderType,
    conflictStrategy: "replace" | "rename" | "cancel",
  ) => {
    try {
      const success = await transferService.transferToDestination({
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType || "",
        fromProvider: file.provider as ProviderType,
        toProvider,
        conflictStrategy,
      });

      if (success) {
        setModalStep("DELETE_SOURCE");
      } else {
        setModalVisible(false);
        Alert.alert("Error", "La transferencia falló.");
      }
    } catch (err: any) {
      setModalVisible(false);
      Alert.alert("Error", err?.message || "Error durante la transferencia");
    }
  };

  const handleDeleteSource = async () => {
    if (!selectedFile) return;
    const success = await transferService.deleteFromSource(
      selectedFile.id,
      selectedFile.provider as ProviderType,
    );
    setModalVisible(false);
    if (success) {
      onRefresh();
    } else {
      Alert.alert(
        "Aviso",
        "El archivo se transfirió pero no se pudo eliminar el original.",
      );
    }
  };

  const handleDeleteFile = useCallback(
    async (file: UnifiedFile) => {
      const success = await transferService.deleteFromSource(
        file.id,
        file.provider as ProviderType,
      );
      if (success) {
        onRefresh();
      } else {
        Alert.alert("Error", "No se pudo eliminar el archivo.");
      }
    },
    [onRefresh],
  );

  const visibleFiles = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase();
    return [...(files || [])]
      .filter((file: any) =>
        (file.name || "").toLowerCase().includes(normalizedQuery),
      )
      .sort((a: any, b: any) => {
        if (sortBy === "size") {
          return (b.size || 0) - (a.size || 0);
        }
        if (sortBy === "name") {
          return (a.name || "").localeCompare(b.name || "");
        }
        return (
          new Date(b.modifiedTime || 0).getTime() -
          new Date(a.modifiedTime || 0).getTime()
        );
      });
  }, [files, searchQuery, sortBy]);

  const providerColor = isOneDrive
    ? Colors.providers.oneDriveAlt
    : Colors.providers.googleDriveAlt;
  const providerLabel = isOneDrive ? "OneDrive" : "Google Drive";

  const fileMenuActions: FileActionOption[] = useMemo(() => {
    if (!menuFile) return [];
    return [
      {
        id: "transfer",
        label: "Transferir archivo",
        icon: ArrowLeftRight,
        color: Colors.text.navy,
        onPress: () => handleStartTransfer(menuFile),
      },
      {
        id: "delete",
        label: "Eliminar archivo",
        icon: Trash2,
        destructive: true,
        onPress: () => handleDeleteFile(menuFile),
      },
    ];
  }, [menuFile, handleStartTransfer, handleDeleteFile]);

  return (
    <View style={styles.container}>
      <FileListHeader
        title={folderName || (isOneDrive ? "OneDrive" : "Mi unidad")}
        providerLabel={providerLabel}
        providerColor={providerColor}
        onBack={handleBackPress}
      />

      <FileSearchAndSortBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      >
        {loading && files.length === 0 ? (
          <ActivityIndicator size="large" color={providerColor} />
        ) : visibleFiles.length > 0 ? (
          visibleFiles.map((file: any) => {
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
                onOpenMenu={setMenuFile}
              />
            );
          })
        ) : (
          <Text style={styles.loadingText}>No se encontraron archivos</Text>
        )}
      </ScrollView>

      <FileActionsModal
        visible={!!menuFile}
        title={menuFile?.name || "Opciones del archivo"}
        subtitle={`Proveedor: ${providerLabel}`}
        actions={fileMenuActions}
        onClose={() => setMenuFile(null)}
      />

      <TransferConfirmDialog
        visible={modalVisible}
        step={modalStep}
        fileName={selectedFile?.name}
        targetProvider={
          targetProvider === "google-drive" ? "Google Drive" : "OneDrive"
        }
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
    backgroundColor: Colors.background.login,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingText: {
    color: Colors.text.caption,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default FileListScreen;