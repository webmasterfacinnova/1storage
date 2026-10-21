import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { selectCurrentUser, logout } from '../../store/slices/authSlice';
import { authService } from '../../services/auth.service';
import { driveService } from '../../services/drive.service';
import {
  setQuotaLoading,
  setQuota,
  setQuotaError,
  selectDriveQuota,
  selectDriveLoading,
} from '../../store/slices/driveSlice';
import { oneDriveService } from '../../services/onedrive.service';
import {
  setQuotaLoading as setODQuotaLoading,
  setQuota as setODQuota,
  setQuotaError as setODQuotaError,
  selectOnedriveQuota,
  selectOnedriveLoading,
} from '../../store/slices/onedriveSlice';
import { selectConnectedProviders, clearAllProviders } from '../../store/slices/connectedProvidersSlice';

const HomeScreen = () => {
  const user = useSelector(selectCurrentUser);
  const quota = useSelector(selectDriveQuota);
  const quotaLoading = useSelector(selectDriveLoading);
  const odQuota = useSelector(selectOnedriveQuota);
  const odQuotaLoading = useSelector(selectOnedriveLoading);

  const connectedProviders = useSelector(selectConnectedProviders);
  const isGoogleDriveConnected = !!connectedProviders['google-drive'];
  const isOneDriveConnected = !!connectedProviders['onedrive'];

  const router = useRouter();
  const dispatch = useDispatch();

  // Fecha dinámica actualizada automáticamente del dispositivo
  const currentDateFormatted = useMemo(() => {
    const now = new Date();
    return now
      .toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
      .toUpperCase();
  }, []);

  const fetchStorageQuota = useCallback(async () => {
    dispatch(setQuotaLoading(true));
    const result = await driveService.getStorageQuota();
    if (result) {
      dispatch(setQuota(result));
    } else {
      dispatch(setQuotaError('No se pudo obtener la información de almacenamiento'));
    }
  }, [dispatch]);

  const fetchOneDriveQuota = useCallback(async () => {
    dispatch(setODQuotaLoading(true));
    const result = await oneDriveService.getStorageQuota();
    if (result) {
      dispatch(setODQuota(result));
    } else {
      dispatch(setODQuotaError('No se pudo obtener la información de almacenamiento de OneDrive'));
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
      router.replace('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Cálculos de almacenamiento unificado
  const driveUsage = isGoogleDriveConnected ? (quota?.usage || 0) : 0;
  const driveLimit = isGoogleDriveConnected ? (quota?.limit || 15 * 1024 * 1024 * 1024) : 0;

  const odUsage = isOneDriveConnected ? (odQuota?.usage || 0) : 0;
  const odLimit = isOneDriveConnected ? (odQuota?.limit || 5 * 1024 * 1024 * 1024) : 0;

  const totalUsage = driveUsage + odUsage;
  const totalLimit = driveLimit + odLimit;

  const overallPercent = totalLimit > 0 ? (totalUsage / totalLimit) * 100 : 0;
  const drivePercentOfTotal = totalLimit > 0 ? (driveUsage / totalLimit) * 100 : 0;
  const odPercentOfTotal = totalLimit > 0 ? (odUsage / totalLimit) * 100 : 0;

  const driveUsagePercent = driveLimit > 0 ? (driveUsage / driveLimit) * 100 : 0;
  const odUsagePercent = odLimit > 0 ? (odUsage / odLimit) * 100 : 0;

  const trashUsage = (quota?.usageInDriveTrash || 0) + (odQuota?.usageInDriveTrash || 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Header superior con logo S1 storage */}
        <View style={styles.topBar}>
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>S1</Text>
            </View>
            <Text style={styles.brandTitle}>storage</Text>
          </View>
        </View>

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
          {/* Encabezado del usuario */}
          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              <Text style={styles.dateText}>{currentDateFormatted}</Text>
              <Text style={styles.greetingText} numberOfLines={1}>
                Hola, {user?.name || 'Mario Alejandro'}
              </Text>
              <Text style={styles.subtitleText}>Tu resumen de almacenamiento está listo.</Text>
            </View>

            {/* Avatar limpio y botón de salir con Lucide */}
            <View style={styles.userControlsWrapper}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {(user?.name || user?.email || 'MA').substring(0, 2).toUpperCase()}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.headerLogoutBtn}
                onPress={handleLogout}
                accessibilityLabel="Cerrar sesión"
              >
                <LogOut size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tarjeta de Espacio Total Unificado */}
          <View style={styles.summaryRow}>
            <View style={styles.totalSpaceCard}>
              <Text style={styles.totalSpaceLabel}>Espacio total utilizado</Text>
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
                      { width: `${Math.min(drivePercentOfTotal, 100)}%`, backgroundColor: '#4285F4' },
                    ]}
                  />
                )}
                {isOneDriveConnected && (
                  <View
                    style={[
                      styles.mainProgressBarFill,
                      { width: `${Math.min(odPercentOfTotal, 100)}%`, backgroundColor: '#0078D4' },
                    ]}
                  />
                )}
              </View>

              <View style={styles.totalSpaceFooter}>
                <Text style={styles.totalSpaceFooterText}>
                  {overallPercent.toFixed(1)}% usado
                </Text>
                <Text style={styles.totalSpaceFooterText}>
                  {totalLimit > 0 ? `${(totalLimit / (1024 * 1024 * 1024)).toFixed(0)} GB total` : '--'}
                </Text>
              </View>
            </View>
          </View>

          {/* Sección de Conexiones */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Conexiones</Text>
            <TouchableOpacity onPress={() => router.push('/(protected)/add-provider')}>
              <Text style={styles.addProviderLink}>+ Añadir</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.connectionsRow}>
            {/* Google Drive */}
            <View style={styles.providerCard}>
              <View style={styles.providerCardHeader}>
                <View style={styles.providerIconWrapper}>
                  <Image
                    source={require('../../assets/googledrive.png')}
                    style={styles.providerImageIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.providerMeta}>
                  <Text style={styles.providerName}>Google Drive</Text>
                  <Text style={styles.providerSubtext}>
                    {isGoogleDriveConnected ? 'Sincronizado' : 'No conectado'}
                  </Text>
                </View>
              </View>

              <View style={styles.providerUsageRow}>
                <Text style={styles.providerUsageValue}>
                  {driveService.formatBytes(driveUsage)}
                </Text>
                <View style={styles.percentBadge}>
                  <Text style={styles.percentBadgeText}>{driveUsagePercent.toFixed(1)}%</Text>
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
                      backgroundColor: '#4285F4',
                    },
                  ]}
                />
              </View>
            </View>

            {/* OneDrive */}
            <View style={styles.providerCard}>
              <View style={styles.providerCardHeader}>
                <View style={styles.providerIconWrapper}>
                  <Image
                    source={require('../../assets/onedrive.png')}
                    style={styles.providerImageIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.providerMeta}>
                  <Text style={styles.providerName}>OneDrive</Text>
                  <Text style={styles.providerSubtext}>
                    {isOneDriveConnected ? 'Sincronizado' : 'No conectado'}
                  </Text>
                </View>
              </View>

              <View style={styles.providerUsageRow}>
                <Text style={styles.providerUsageValue}>
                  {oneDriveService.formatBytes(odUsage)}
                </Text>
                <View style={styles.percentBadge}>
                  <Text style={styles.percentBadgeText}>{odUsagePercent.toFixed(1)}%</Text>
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
                      backgroundColor: '#0078D4',
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Acciones rápidas */}
          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>¿Qué necesitas hacer?</Text>

          <View style={styles.actionsColumn}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(protected)/manager-files')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#FFF4E5' }]}>
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
              onPress={() => router.push('/(protected)/clean-trash')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#FFF0F0' }]}>
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

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(protected)/add-provider')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#E0F2FE' }]}>
                <Text style={{ fontSize: 18 }}>🔗</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Agregar proveedor</Text>
                <Text style={styles.actionDescription} numberOfLines={1}>
                  Conecta OneDrive, Dropbox u otros servicios
                </Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </ScreenContainer>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FF6B35',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  topBar: {
    height: 56,
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
  },
  logoBadgeText: {
    color: '#FF6B35',
    fontWeight: '800',
    fontSize: 14,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerInfo: {
    flex: 1,
    paddingRight: 10,
  },
  dateText: {
    color: '#FF6B35',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  userControlsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#C2410C',
    fontWeight: '700',
    fontSize: 13,
  },
  headerLogoutBtn: {
    backgroundColor: '#FFFFFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryRow: {
    marginBottom: 24,
  },
  totalSpaceCard: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
  },
  totalSpaceLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  totalSpaceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 10,
  },
  totalSpaceNumber: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginRight: 6,
  },
  totalSpaceUnit: {
    color: '#94A3B8',
    fontSize: 13,
  },
  mainProgressBarBg: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
    flexDirection: 'row',
  },
  mainProgressBarFill: {
    height: '100%',
  },
  totalSpaceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalSpaceFooterText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  addProviderLink: {
    color: '#FF6B35',
    fontWeight: '700',
    fontSize: 14,
  },
  connectionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  providerCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  providerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  providerIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '700',
    color: '#0F172A',
  },
  providerSubtext: {
    fontSize: 9,
    color: '#94A3B8',
  },
  providerUsageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  providerUsageValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  percentBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  percentBadgeText: {
    fontSize: 9,
    color: '#475569',
    fontWeight: '600',
  },
  providerLimitText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 8,
  },
  providerProgressBarBg: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  providerProgressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  actionsColumn: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 12,
  },
  actionCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionDescription: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 18,
    color: '#CBD5E1',
    marginLeft: 4,
  },
});

export default HomeScreen;