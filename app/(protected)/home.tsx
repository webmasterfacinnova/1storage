import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "expo-router";
import { LogOut } from "lucide-react-native";

import { ScreenContainer } from "../../components/common/ScreenContainer";
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
    ? quota?.limit || 15 * 1024 * 1024 * 1024
    : 0;

  const odUsage = isOneDriveConnected ? odQuota?.usage || 0 : 0;
  const odLimit = isOneDriveConnected
    ? odQuota?.limit || 5 * 1024 * 1024 * 1024
    : 0;

  const totalUsage = driveUsage + odUsage;
  const totalLimit = driveLimit + odLimit;

  const overallPercent = totalLimit > 0 ? (totalUsage / totalLimit) * 100 : 0;
  const drivePercentOfTotal =
    totalLimit > 0 ? (driveUsage / totalLimit) * 100 : 0;
  const odPercentOfTotal = totalLimit > 0 ? (odUsage / totalLimit) * 100 : 0;

  const driveUsagePercent =
    driveLimit > 0 ? (driveUsage / driveLimit) * 100 : 0;
  const odUsagePercent = odLimit > 0 ? (odUsage / odLimit) * 100 : 0;

  const trashUsage =
    (quota?.usageInDriveTrash || 0) + (odQuota?.usageInDriveTrash || 0);

  return (
    <View style={styles.container}>
      <ScreenContainer
        refreshControl={
          <RefreshControl
            refreshing={quotaLoading || odQuotaLoading}
            onRefresh={() => {
              if (isGoogleDriveConnected) fetchStorageQuota();
              if (isOneDriveConnected) fetchOneDriveQuota();
            }}
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.greetingText} numberOfLines={1}>
              Hola, {user?.name || "Mario Alejandro"}
            </Text>
          </View>

          <View style={styles.userControlsWrapper}>
            {user?.photoURL !== undefined && user?.photoURL !== null ? (
              <Image
                source={{ uri: user?.photoURL }}
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: Colors.background.card,
                  borderRadius: 50,
                }}
              />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {(user?.name || user?.email || "MA")
                    .substring(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.headerLogoutBtn}
              onPress={handleLogout}
              accessibilityLabel="Cerrar sesión"
            >
              <LogOut size={18} color={Colors.text.muted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.totalSpaceCard}>
            <Text style={styles.totalSpaceLabel}>
              Espacio total utilizado
            </Text>
            <View style={styles.totalSpaceValueRow}>
              <Text style={styles.totalSpaceNumber}>
                {(totalUsage / (1024 * 1024 * 1024)).toFixed(1)}
              </Text>
              <Text style={styles.totalSpaceUnit}>GB utilizados</Text>
            </View>

            <View style={styles.mainProgressBarBg}>
              {isGoogleDriveConnected && (
                <View
                  style={[
                    styles.mainProgressBarFill,
                    {
                      width: `${Math.min(drivePercentOfTotal, 100)}%`,
                      backgroundColor: Colors.providers.googleDrive,
                    },
                  ]}
                />
              )}
              {isOneDriveConnected && (
                <View
                  style={[
                    styles.mainProgressBarFill,
                    {
                      width: `${Math.min(odPercentOfTotal, 100)}%`,
                      backgroundColor: Colors.providers.oneDrive,
                    },
                  ]}
                />
              )}
            </View>

            <View style={styles.totalSpaceFooter}>
              <Text style={styles.totalSpaceFooterText}>
                {overallPercent.toFixed(1)}% usado
              </Text>
              <Text style={styles.totalSpaceFooterText}>
                {totalLimit > 0
                  ? `${(totalLimit / (1024 * 1024 * 1024)).toFixed(0)} GB total`
                  : "--"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Conexiones</Text>
          <TouchableOpacity
            onPress={() => router.push("/(protected)/add-provider")}
          >
            <Text style={styles.addProviderLink}>+ Agregar proveedores</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.connectionsRow}>
          <View style={styles.providerCard}>
            <View style={styles.providerCardHeader}>
              <View style={styles.providerIconWrapper}>
                <Image
                  source={require("../../assets/images/google_drive.png")}
                  style={styles.providerImageIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.providerMeta}>
                <Text style={styles.providerName}>Google Drive</Text>
                <Text style={styles.providerSubtext}>
                  {isGoogleDriveConnected ? "Sincronizado" : "No conectado"}
                </Text>
              </View>
            </View>

            <View style={styles.providerUsageRow}>
              <Text style={styles.providerUsageValue}>
                {driveService.formatBytes(driveUsage)}
              </Text>
              <View style={styles.percentBadge}>
                <Text style={styles.percentBadgeText}>
                  {driveUsagePercent.toFixed(1)}%
                </Text>
              </View>
            </View>

            <Text style={styles.providerLimitText}>
              de {driveService.formatBytes(driveLimit)}
            </Text>

            <View style={styles.providerProgressBarBg}>
              <View
                style={[
                  styles.providerProgressBarFill,
                  {
                    width: `${Math.min(driveUsagePercent, 100)}%`,
                    backgroundColor: Colors.providers.googleDrive,
                  },
                ]}
              />
            </View>
          </View>

          {isOneDriveConnected && (
            <View style={styles.providerCard}>
              <View style={styles.providerCardHeader}>
                <View style={styles.providerIconWrapper}>
                  <Image
                    source={require("../../assets/images/one_drive.png")}
                    style={styles.providerImageIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.providerMeta}>
                  <Text style={styles.providerName}>OneDrive</Text>
                  <Text style={styles.providerSubtext}>Sincronizado</Text>
                </View>
              </View>

              <View style={styles.providerUsageRow}>
                <Text style={styles.providerUsageValue}>
                  {oneDriveService.formatBytes(odUsage)}
                </Text>
                <View style={styles.percentBadge}>
                  <Text style={styles.percentBadgeText}>
                    {odUsagePercent.toFixed(1)}%
                  </Text>
                </View>
              </View>

              <Text style={styles.providerLimitText}>
                de {oneDriveService.formatBytes(odLimit)}
              </Text>

              <View style={styles.providerProgressBarBg}>
                <View
                  style={[
                    styles.providerProgressBarFill,
                    {
                      width: `${Math.min(odUsagePercent, 100)}%`,
                      backgroundColor: Colors.providers.oneDrive,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
          ¿Qué necesitas hacer?
        </Text>

        <View style={styles.actionsColumn}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(protected)/manager-files")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: Colors.actions.folderBg },
              ]}
            >
              <Text style={{ fontSize: 18 }}>📁</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Gestionar archivos</Text>
              <Text style={styles.actionDescription} numberOfLines={1}>
                Explora tus archivos en todos los almacenes
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(protected)/clean-trash")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: Colors.actions.trashBg },
              ]}
            >
              <Text style={{ fontSize: 18 }}>🗑️</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Limpiar papelera</Text>
              <Text style={styles.actionDescription} numberOfLines={1}>
                {driveService.formatBytes(trashUsage)} recuperables
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerInfo: {
    flex: 1,
    paddingRight: 10,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text.primary,
  },
  userControlsWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brand.accentLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: Colors.brand.accentDark,
    fontWeight: "700",
    fontSize: 13,
  },
  headerLogoutBtn: {
    backgroundColor: Colors.background.card,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  summaryRow: {
    marginBottom: 24,
  },
  totalSpaceCard: {
    width: "100%",
    backgroundColor: Colors.background.cardDark,
    borderRadius: 16,
    padding: 18,
  },
  totalSpaceLabel: {
    color: Colors.text.subtle,
    fontSize: 12,
  },
  totalSpaceValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginVertical: 10,
  },
  totalSpaceNumber: {
    color: Colors.text.inverse,
    fontSize: 32,
    fontWeight: "800",
    marginRight: 6,
  },
  totalSpaceUnit: {
    color: Colors.text.subtle,
    fontSize: 13,
  },
  mainProgressBarBg: {
    height: 8,
    backgroundColor: Colors.border.dark,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
    flexDirection: "row",
  },
  mainProgressBarFill: {
    height: "100%",
  },
  totalSpaceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalSpaceFooterText: {
    color: Colors.text.subtle,
    fontSize: 11,
    fontWeight: "500",
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
  providerCard: {
    flex: 1,
    backgroundColor: Colors.background.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  providerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  providerIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.background.subtle,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  providerImageIcon: {
    width: 18,
    height: 18,
  },
  providerMeta: {
    flex: 1,
  },
  providerName: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  providerSubtext: {
    fontSize: 9,
    color: Colors.text.subtle,
  },
  providerUsageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  providerUsageValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text.primary,
  },
  percentBadge: {
    backgroundColor: Colors.background.muted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  percentBadgeText: {
    fontSize: 9,
    color: Colors.text.secondary,
    fontWeight: "600",
  },
  providerLimitText: {
    fontSize: 10,
    color: Colors.text.subtle,
    marginTop: 2,
    marginBottom: 8,
  },
  providerProgressBarBg: {
    height: 4,
    backgroundColor: Colors.background.muted,
    borderRadius: 2,
    overflow: "hidden",
  },
  providerProgressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  actionsColumn: {
    flexDirection: "column",
    gap: 10,
    marginTop: 12,
  },
  actionCard: {
    width: "100%",
    backgroundColor: Colors.background.card,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  actionDescription: {
    fontSize: 11,
    color: Colors.text.subtle,
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 18,
    color: Colors.border.arrow,
    marginLeft: 4,
  },
});

export default HomeScreen;
