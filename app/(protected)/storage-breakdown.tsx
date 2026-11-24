import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "expo-router";

import { driveFilesService } from "../../services/drive-files.service";
import { driveService } from "../../services/drive.service";
import { Colors } from "../../components/theme/colors";
import { DriveQuotaCard } from "../../components/storage/DriveQuotaCard";
import { StorageByTypeList } from "../../components/storage/StorageByTypeList";
import { LargestFilesList } from "../../components/storage/LargestFilesList";
import { StorageBottomNav } from "../../components/storage/StorageBottomNav";

import {
  setStorageByTypeLoading,
  setStorageByType,
  setStorageByTypeError,
  setLargestFilesLoading,
  setLargestFiles,
  setLargestFilesError,
  selectStorageByType,
  selectStorageByTypeLoading,
  selectLargestFiles,
  selectLargestFilesLoading,
} from "../../store/slices/driveFilesSlice";
import { selectDriveQuota } from "../../store/slices/driveSlice";

const StorageBreakdownScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const quota = useSelector(selectDriveQuota);
  const storageByType = useSelector(selectStorageByType);
  const storageByTypeLoading = useSelector(selectStorageByTypeLoading);
  const largestFiles = useSelector(selectLargestFiles);
  const largestFilesLoading = useSelector(selectLargestFilesLoading);

  const fetchStorageBreakdown = useCallback(async () => {
    dispatch(setStorageByTypeLoading(true));
    const result = await driveFilesService.getStorageByType();
    if (result) {
      dispatch(setStorageByType(result));
    } else {
      dispatch(
        setStorageByTypeError("No se pudo obtener el desglose del almacenamiento"),
      );
    }
  }, [dispatch]);

  const fetchLargestFiles = useCallback(async () => {
    dispatch(setLargestFilesLoading(true));
    const result = await driveFilesService.getLargestFiles(20);
    if (result) {
      dispatch(
        setLargestFiles({
          files: result.files,
          nextPageToken: result.nextPageToken,
        }),
      );
    } else {
      dispatch(
        setLargestFilesError("No se pudieron obtener los archivos más grandes"),
      );
    }
  }, [dispatch]);

  const onRefresh = useCallback(() => {
    fetchStorageBreakdown();
    fetchLargestFiles();
  }, [fetchStorageBreakdown, fetchLargestFiles]);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const usagePercent = quota ? driveService.usagePercentage(quota) : 0;
  const barColor =
    usagePercent > 90
      ? Colors.status.quotaCritical
      : usagePercent > 70
        ? Colors.status.quotaWarning
        : Colors.status.quotaNormal;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Desglose de almacenamiento</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={storageByTypeLoading || largestFilesLoading}
            onRefresh={onRefresh}
          />
        }
      >
        <DriveQuotaCard
          isLoaded={!!quota}
          formattedUsage={
            quota ? driveService.formatBytes(quota.usage) : undefined
          }
          hasLimit={!!quota?.limit}
          formattedLimit={
            quota?.limit ? driveService.formatBytes(quota.limit) : undefined
          }
          usagePercent={usagePercent}
          barColor={barColor}
        />

        <Text style={styles.sectionTitle}>
          Almacenamiento por tipo de archivo
        </Text>
        <StorageByTypeList
          items={storageByType}
          loading={storageByTypeLoading}
          barColor={barColor}
          onSelectType={(type) =>
            router.push({
              pathname: "/(protected)/file-list",
              params: { typeFilter: type },
            })
          }
        />

        <Text style={styles.sectionTitle}>Archivos más grandes</Text>
        <LargestFilesList
          files={largestFiles}
          loading={largestFilesLoading}
          onSelectFile={(fileId) =>
            router.push({
              pathname: "/(protected)/file-list",
              params: { fileId },
            })
          }
          onViewAllLargest={() =>
            router.push({
              pathname: "/(protected)/file-list",
              params: { sort: "size" },
            })
          }
        />
      </ScrollView>

      <StorageBottomNav
        onHomePress={() => router.replace("/(protected)/home")}
        onFilesPress={() => router.push("/(protected)/file-list")}
        onTrashPress={() => router.push("/(protected)/clean-trash")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.login,
  },
  header: {
    padding: 16,
    backgroundColor: Colors.background.headerSoft,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.headerSoft,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text.navy,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text.navy,
    marginBottom: 12,
    marginTop: 8,
  },
});

export default StorageBreakdownScreen;