// screens/HomeScreen.tsx
import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, RefreshControl, useWindowDimensions } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectCurrentUser, logout } from '../store/slices/authSlice';
import { authService } from '../services/auth.service';
import { driveService } from '../services/drive.service';
import { setQuotaLoading, setQuota, setQuotaError, selectDriveQuota, selectDriveLoading, selectDriveError } from '../store/slices/driveSlice';
import { oneDriveService } from '../services/onedrive.service';
import {
  setQuotaLoading as setODQuotaLoading,
  setQuota as setODQuota,
  setQuotaError as setODQuotaError,
  selectOnedriveQuota,
  selectOnedriveLoading,
  selectOnedriveError,
} from '../store/slices/onedriveSlice';
import { selectConnectedProviders, clearAllProviders } from '../store/slices/connectedProvidersSlice';

const HomeScreen = () => {
  const user = useSelector(selectCurrentUser);
  const quota = useSelector(selectDriveQuota);
  const quotaLoading = useSelector(selectDriveLoading);
  const quotaError = useSelector(selectDriveError);
  const odQuota = useSelector(selectOnedriveQuota);
  const odQuotaLoading = useSelector(selectOnedriveLoading);
  const odQuotaError = useSelector(selectOnedriveError);

  const connectedProviders = useSelector(selectConnectedProviders);
  const isGoogleDriveConnected = !!connectedProviders['google-drive'];
  const isOneDriveConnected = !!connectedProviders['onedrive'];

  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { height: windowHeight } = useWindowDimensions();
  const [headerH, setHeaderH] = useState(74);
  const [footerH, setFooterH] = useState(53);

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
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const usagePercent = quota ? driveService.usagePercentage(quota) : 0;
  const barColor = usagePercent > 90 ? '#e53935' : usagePercent > 70 ? '#fb8c00' : '#4285f4';

  const odUsagePercent = odQuota ? oneDriveService.usagePercentage(odQuota) : 0;
  const odBarColor = odUsagePercent > 90 ? '#e53935' : odUsagePercent > 70 ? '#fb8c00' : '#0078d4';

  const getConnectedSubtext = () => {
    if (isGoogleDriveConnected && isOneDriveConnected) return 'Google Drive + OneDrive conectados';
    if (isGoogleDriveConnected) return 'Google Drive conectado';
    if (isOneDriveConnected) return 'OneDrive conectado';
    return 'Sin proveedores de almacenamiento conectados';
  };

  return (
    <View style={[styles.container, { height: windowHeight }]}>
      <View style={styles.header} onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        <Image
          source={require('../assets/LogoSlogan.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        style={[styles.content, { height: Math.max(windowHeight - headerH - footerH, 0) }]}
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
        <View style={styles.welcomeCard}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.userAvatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || user?.email?.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.welcomeInfo}>
            <Text style={styles.welcomeText}>Bienvenido, {user?.name || user?.email}</Text>
            <Text style={[styles.welcomeSubtext, !isGoogleDriveConnected && !isOneDriveConnected && { color: '#888888' }]}>
              {getConnectedSubtext()}
            </Text>
          </View>
        </View>

        {/* Tarjeta de Google Drive visible siempre */}
        <View style={styles.storageCard}>
          <Text style={styles.storageTitle}>Almacenamiento de Google Drive</Text>

          {!isGoogleDriveConnected ? (
            <Text style={styles.loadingText}>No conectado — Toca en Agregar proveedor abajo para vincular</Text>
          ) : quotaLoading ? (
            <Text style={styles.loadingText}>Cargando información de almacenamiento...</Text>
          ) : quotaError ? (
            <Text style={styles.errorText}>No se pudo cargar la información de almacenamiento</Text>
          ) : quota ? (
            <>
              <View style={styles.quotaRow}>
                <View style={styles.quotaItem}>
                  <Text style={styles.quotaValue}>{driveService.formatBytes(quota.usage)}</Text>
                  <Text style={styles.quotaLabel}>Usado</Text>
                </View>
                <View style={styles.quotaItem}>
                  <Text style={styles.quotaValue}>
                    {quota.limit ? driveService.formatBytes(quota.limit) : 'Ilimitado'}
                  </Text>
                  <Text style={styles.quotaLabel}>Total</Text>
                </View>
                <View style={styles.quotaItem}>
                  <Text style={styles.quotaValue}>{driveService.formatBytes(quota.usageInDriveTrash)}</Text>
                  <Text style={styles.quotaLabel}>Papelera</Text>
                </View>
              </View>

              {quota.limit && (
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(usagePercent, 100)}%`, backgroundColor: barColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {usagePercent.toFixed(1)}% usado
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.loadingText}>Toca para cargar información de almacenamiento</Text>
          )}
        </View>

        {/* Tarjeta de OneDrive visible siempre */}
        <View style={[styles.storageCard, { borderLeftWidth: 3, borderLeftColor: '#0078d4' }]}>
          <Text style={styles.storageTitle}>Almacenamiento de OneDrive</Text>

          {!isOneDriveConnected ? (
            <Text style={styles.loadingText}>No conectado — Toca en Agregar proveedor abajo para vincular</Text>
          ) : odQuotaLoading ? (
            <Text style={styles.loadingText}>Cargando información de almacenamiento...</Text>
          ) : odQuotaError ? (
            <Text style={styles.errorText}>No se pudo cargar la información de almacenamiento</Text>
          ) : odQuota ? (
            <>
              <View style={styles.quotaRow}>
                <View style={styles.quotaItem}>
                  <Text style={styles.quotaValue}>{oneDriveService.formatBytes(odQuota.usage)}</Text>
                  <Text style={styles.quotaLabel}>Usado</Text>
                </View>
                <View style={styles.quotaItem}>
                  <Text style={styles.quotaValue}>
                    {odQuota.limit ? oneDriveService.formatBytes(odQuota.limit) : 'Ilimitado'}
                  </Text>
                  <Text style={styles.quotaLabel}>Total</Text>
                </View>
                <View style={styles.quotaItem}>
                  <Text style={styles.quotaValue}>{oneDriveService.formatBytes(odQuota.usageInDriveTrash)}</Text>
                  <Text style={styles.quotaLabel}>Papelera</Text>
                </View>
              </View>

              {odQuota.limit && (
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(odUsagePercent, 100)}%`, backgroundColor: odBarColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {odUsagePercent.toFixed(1)}% usado
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.loadingText}>Toca para cargar información de almacenamiento</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Configuración</Text>

        <TouchableOpacity style={styles.configCard} onPress={() => navigation.navigate('ManagerFiles' as never)}>
          <View style={styles.configIcon}>
            <Text style={styles.configIconText}>📁</Text>
          </View>
          <View style={styles.configInfo}>
            <Text style={styles.configTitle}>Gestionar archivos</Text>
            <Text style={styles.configDesc}>Explora tus archivos en todos los almacenamientos conectados</Text>
          </View>
          <Text style={styles.configArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.configCard} onPress={() => navigation.navigate('CleanTrash' as never)}>
          <View style={styles.configIcon}>
            <Text style={styles.configIconText}>🗑️</Text>
          </View>
          <View style={styles.configInfo}>
            <Text style={styles.configTitle}>Limpiar papelera</Text>
            <Text style={styles.configDesc}>
              {quota ? `${driveService.formatBytes(quota.usageInDriveTrash)} en la papelera — espacio recuperable` : 'Libera espacio de la papelera'}
            </Text>
          </View>
          <Text style={styles.configArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.configCard} onPress={() => navigation.navigate('AddProvider' as never)}>
          <View style={styles.configIcon}>
            <Text style={styles.configIconText}>🔗</Text>
          </View>
          <View style={styles.configInfo}>
            <Text style={styles.configTitle}>Agregar proveedor</Text>
            <Text style={styles.configDesc}>Conecta OneDrive, Dropbox u otro almacenamiento en la nube</Text>
          </View>
          <Text style={styles.configArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.configCard} onPress={() => {}}>
          <View style={styles.configIcon}>
            <Text style={styles.configIconText}>⚙️</Text>
          </View>
          <View style={styles.configInfo}>
            <Text style={styles.configTitle}>Ajustes</Text>
            <Text style={styles.configDesc}>Sincronización automática, notificaciones, carpeta de subida predeterminada</Text>
          </View>
          <Text style={styles.configArrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} onLayout={e => setFooterH(e.nativeEvent.layout.height)}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f7fe',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#d7eefb',
    borderBottomWidth: 1,
    borderBottomColor: '#e0ecf5',
  },
  logo: {
    width: 180,
    height: 50,
  },
  content: {
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a73e8',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  welcomeInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    color: '#333',
  },
  welcomeSubtext: {
    fontSize: 13,
    color: '#34a853',
    marginTop: 2,
  },
  storageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  storageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a237e',
    marginBottom: 16,
  },
  quotaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quotaItem: {
    alignItems: 'center',
  },
  quotaValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  quotaLabel: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 2,
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e0ecf5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 4,
    textAlign: 'right',
  },
  loadingText: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  errorText: {
    color: '#e53935',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a237e',
    marginBottom: 12,
    marginTop: 8,
  },
  configCard: {
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
  configIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#e0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  configIconText: {
    fontSize: 20,
  },
  configInfo: {
    flex: 1,
  },
  configTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  configDesc: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 2,
  },
  configArrow: {
    fontSize: 22,
    color: '#ccc',
    marginLeft: 8,
  },
  logoutButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0ecf5',
  },
  logoutText: {
    color: '#e53935',
    fontSize: 16,
  },
});

export default HomeScreen;