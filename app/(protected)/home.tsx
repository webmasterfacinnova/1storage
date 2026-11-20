import React, { useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "expo-router";

import { ScreenContainer } from "../../components/common/ScreenContainer";
import { HomeHeader } from "../../components/home/HomeHeader";
import { TotalStorageCard } from "../../components/home/TotalStorageCard";
import { ProviderStorageCard } from "../../components/home/ProviderStorageCard";
import { QuickActionCard } from "../../components/home/QuickActionCard";
import { Colors } from "../../components/theme/colors";

import { selectCurrentUser, logout } from "../../store/slices/authSlice";
import { authService } from "../../services/auth.service";
import { driveService } from "@/services/drive.service";
import {
  setQuotaLoading,
  setQuota,
  setQuotaError,
  selectDriveQuota,
  selectDriveLoading,
} from "../../store/slices/driveSlice";
import { oneDriveService } from "../../services/onedrive.service";
import {
  setQuotaLoading as setODQuotaLoading,
  setQuota as setODQuota,
  setQuotaError as setODQuotaError,
  selectOnedriveQuota,
  selectOnedriveLoading,
} from "../../store/slices/onedriveSlice";
import {
  selectConnectedProviders,
  clearAllProviders,
} from "../../store/slices/connectedProvidersSlice";

const DEFAULT_DRIVE_LIMIT = 15 * 1024 * 1024 * 1024;
const DEFAULT_ONEDRIVE_LIMIT = 5 * 1024 * 1024 * 1024;

const HomeScreen = () => {
  const user = useSelector(selectCurrentUser);
  const quota = useSelector(selectDriveQuota);
  const quotaLoading = useSelector(selectDriveLoading);
  const odQuota = useSelector(selectOnedriveQuota);
  const odQuotaLoading = useSelector(selectOnedriveLoading);

  const connectedProviders = useSelector(selectConnectedProviders);
  const isGoogleDriveConnected = !!connectedProviders["google-drive"];
  const isOneDriveConnected = !!connectedProviders["onedrive"];

  const router = useRouter();
  const dispatch = useDispatch();

  const fetchStorageQuota = useCallback(async () => {
    dispatch(setQuotaLoading(true));
    const result = await driveService.getStorageQuota();
    if (result) {
      dispatch(setQuota(result));
    } else {
      dispatch(
        setQuotaError("No se pudo obtener la información de almacenamiento"),
      );
    }
  }, [dispatch]);

  const fetchOneDriveQuota = useCallback(async () => {
    dispatch(setODQuotaLoading(true));
    const result = await oneDriveService.getStorageQuota();
    if (result) {
      dispatch(setODQuota(result));
    } else {
      dispatch(
        setODQuotaError(
          "No se pudo obtener la información de almacenamiento de OneDrive",
        ),
      );
    }
  }, [dispatch]);

  const refreshQuotas = useCallback(() => {
    if (isGoogleDriveConnected) fetchStorageQuota();
    if (isOneDriveConnected) fetchOneDriveQuota();
  }, [isGoogleDriveConnected, isOneDriveConnected, fetchStorageQuota, fetchOneDriveQuota]);

  useEffect(() => {
    if (isGoogleDriveConnected) {
      fetchStorageQuota();
    }
  }, [isGoogleDriveConnected, fetchStorageQuota]);

  useEffect(() => {
    if (isOneDriveConnected) {
      fetchOneDriveQuota();
    }
  }, [isOneDriveConnected, fetchOneDriveQuota]);

  const handleLogout = async () => {
    try {
      await authService.signOut();
      dispatch(clearAllProviders());
      dispatch(logout());
      router.replace("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const driveUsage = isGoogleDriveConnected ? quota?.usage || 0 : 0;
  const driveLimit = isGoogleDriveConnected
    ? quota?.limit || DEFAULT_DRIVE_LIMIT
    : 0;

  const odUsage = isOneDriveConnected ? odQuota?.usage || 0 : 0;
  const odLimit = isOneDriveConnected
    ? odQuota?.limit || DEFAULT_ONEDRIVE_LIMIT
    : 0;

  const totalUsage = driveUsage + odUsage;
  const totalLimit = driveLimit + odLimit;

  const overallPercent = totalLimit > 0 ? (totalUsage / totalLimit) * 100 : 0;
  const drivePercentOfTotal = totalLimit > 0 ? (driveUsage / totalLimit) * 100 : 0;
  const odPercentOfTotal = totalLimit > 0 ? (odUsage / totalLimit) * 100 : 0;

  const driveUsagePercent = driveLimit > 0 ? (driveUsage / driveLimit) * 100 : 0;
  const odUsagePercent = odLimit > 0 ? (odUsage / odLimit) * 100 : 0;

  const trashUsage =
    (quota?.usageInDriveTrash || 0) + (odQuota?.usageInDriveTrash || 0);

  return (
    <View style={styles.container}>
      <ScreenContainer
        refreshControl={
          <RefreshControl
            refreshing={quotaLoading || odQuotaLoading}
            onRefresh={refreshQuotas}
          />
        }
      >
        <HomeHeader
          name={user?.name}
          email={user?.email}
          photoURL={user?.photoURL}
          onLogout={handleLogout}
        />

        <TotalStorageCard
          totalUsageBytes={totalUsage}
          totalLimitBytes={totalLimit}
          overallPercent={overallPercent}
          drivePercentOfTotal={drivePercentOfTotal}
          odPercentOfTotal={odPercentOfTotal}
          isGoogleDriveConnected={isGoogleDriveConnected}
          isOneDriveConnected={isOneDriveConnected}
        />

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Conexiones</Text>
          <TouchableOpacity
            onPress={() => router.push("/(protected)/add-provider")}
          >
            <Text style={styles.addProviderLink}>+ Agregar proveedores</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.connectionsRow}>
          <ProviderStorageCard
            name="Google Drive"
            isConnected={isGoogleDriveConnected}
            iconSource={require("../../assets/images/google_drive.png")}
            formattedUsage={driveService.formatBytes(driveUsage)}
            formattedLimit={driveService.formatBytes(driveLimit)}
            usagePercent={driveUsagePercent}
            barColor={Colors.providers.googleDrive}
          />

          {isOneDriveConnected && (
            <ProviderStorageCard
              name="OneDrive"
              isConnected={isOneDriveConnected}
              iconSource={require("../../assets/images/one_drive.png")}
              formattedUsage={oneDriveService.formatBytes(odUsage)}
              formattedLimit={oneDriveService.formatBytes(odLimit)}
              usagePercent={odUsagePercent}
              barColor={Colors.providers.oneDrive}
            />
          )}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
          ¿Qué necesitas hacer?
        </Text>

        <View style={styles.actionsColumn}>
          <QuickActionCard
            emoji="📁"
            iconBgColor={Colors.actions.folderBg}
            title="Gestionar archivos"
            description="Explora tus archivos en todos los almacenes"
            onPress={() => router.push("/(protected)/manager-files")}
          />

          <QuickActionCard
            emoji="🗑️"
            iconBgColor={Colors.actions.trashBg}
            title="Limpiar papelera"
            description={`${driveService.formatBytes(trashUsage)} recuperables`}
            onPress={() => router.push("/(protected)/clean-trash")}
          />
        </View>
      </ScreenContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  addProviderLink: {
    color: Colors.brand.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  connectionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionsColumn: {
    flexDirection: "column",
    gap: 10,
    marginTop: 12,
  },
});

export default HomeScreen;