// screens/HomeScreen.tsx
// Home screen after successful authentication - shows storage info for all connected providers

import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, RefreshControl } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectCurrentUser } from '../store/slices/authSlice';
import { logout } from '../store/slices/authSlice';
import { authService } from '../services/auth.service';
import { driveService, DriveStorageQuota } from '../services/drive.service';
import { setQuotaLoading, setQuota, setQuotaError, selectDriveQuota, selectDriveLoading, selectDriveError } from '../store/slices/driveSlice';
import { oneDriveService, OneDriveStorageQuota } from '../services/onedrive.service';
import {
  setQuotaLoading as setODQuotaLoading,
  setQuota as setODQuota,
  setQuotaError as setODQuotaError,
  selectOnedriveQuota,
  selectOnedriveLoading,
  selectOnedriveError,
} from '../store/slices/onedriveSlice';
import { selectConnectedProviders } from '../store/slices/connectedProvidersSlice';

const HomeScreen = () => {
  const user = useSelector(selectCurrentUser);
  const quota = useSelector(selectDriveQuota);
  const quotaLoading = useSelector(selectDriveLoading);
  const quotaError = useSelector(selectDriveError);
  const odQuota = useSelector(selectOnedriveQuota);
  const odQuotaLoading = useSelector(selectOnedriveLoading);
  const odQuotaError = useSelector(selectOnedriveError);
  const connectedProviders = useSelector(selectConnectedProviders);
  const isOneDriveConnected = !!connectedProviders['onedrive'];
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const fetchStorageQuota = useCallback(async () => {
    dispatch(setQuotaLoading(true));
    const result = await driveService.getStorageQuota();
    if (result) {
      dispatch(setQuota(result));
    } else {
      dispatch(setQuotaError('Could not fetch storage info'));
    }
  }, [dispatch]);

  const fetchOneDriveQuota = useCallback(async () => {
    dispatch(setODQuotaLoading(true));
    const result = await oneDriveService.getStorageQuota();
    if (result) {
      dispatch(setODQuota(result));
    } else {
      dispatch(setODQuotaError('Could not fetch OneDrive storage info'));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchStorageQuota();
  }, [fetchStorageQuota]);

  useEffect(() => {
    if (isOneDriveConnected) {
      fetchOneDriveQuota();
    }
  }, [isOneDriveConnected, fetchOneDriveQuota]);

  const handleLogout = async () => {
    try {
      await authService.signOut();
      dispatch(logout());
      navigation.navigate('Login' as never);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const usagePercent = quota ? driveService.usagePercentage(quota) : 0;
  const barColor = usagePercent > 90 ? '#e53935' : usagePercent > 70 ? '#fb8c00' : '#4285f4';

  const odUsagePercent = odQuota ? oneDriveService.usagePercentage(odQuota) : 0;
  const odBarColor = odUsagePercent > 90 ? '#e53935' : odUsagePercent > 70 ? '#fb8c00' : '#0078d4';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/LogoSlogan.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView style={styles.content} refreshControl={
        <RefreshControl
          refreshing={quotaLoading || odQuotaLoading}
          onRefresh={() => { fetchStorageQuota(); if (isOneDriveConnected) fetchOneDriveQuota(); }}
        />
      }>
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.userAvatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || user?.email?.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.welcomeInfo}>
            <Text style={styles.welcomeText}>Welcome, {user?.name || user?.email}</Text>
            <Text style={styles.welcomeSubtext}>
              {isOneDriveConnected ? 'Google Drive + OneDrive connected' : 'Google Drive connected'}
            </Text>
          </View>
        </View>

        {/* Google Drive Storage Quota Card */}
        <View style={styles.storageCard}>
          <Text style={styles.storageTitle}>Google Drive Storage</Text>

          {quotaLoading ? (
            <Text style={styles.loadingText}>Loading storage info...</Text>
          ) : quotaError ? (
            <Text style={styles.errorText}>Could not load storage info</Text>
          ) : quota ? (
            <>
              <View style={styles.quotaRow}>
                <View style={styles.quotaItem}>
                  <Text style={styles.quotaValue}>{driveService.formatBytes(quota.usage)}</Text>
                  <Text style={styles.quotaLabel}>Used</Text>
                </View>
                <View style={styles.quotaItem}>
                  <Text style={styles.quotaValue}>
                    {quota.limit ? driveService.formatBytes(quota.limit) : 'Unlimited'}
                  </Text>
                  <Text style={styles.quotaLabel}>Total</Text>
                </View>
                <View style={styles.quotaItem}>
                  <Text style={styles.quotaValue}>{driveService.formatBytes(quota.usageInDriveTrash)}</Text>
                  <Text style={styles.quotaLabel}>Trash</Text>
                </View>
              </View>

              {/* Progress bar */}
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
                    {usagePercent.toFixed(1)}% used
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.loadingText}>Tap to load storage info</Text>
          )}
        </View>

        {/* OneDrive Storage Quota Card (only when connected) */}
        {isOneDriveConnected && (
          <View style={[styles.storageCard, { borderLeftWidth: 3, borderLeftColor: '#0078d4' }]}>
            <Text style={styles.storageTitle}>OneDrive Storage</Text>

            {odQuotaLoading ? (
              <Text style={styles.loadingText}>Loading storage info...</Text>
            ) : odQuotaError ? (
              <Text style={styles.errorText}>Could not load storage info</Text>
            ) : odQuota ? (
              <>
                <View style={styles.quotaRow}>
                  <View style={styles.quotaItem}>
                    <Text style={styles.quotaValue}>{oneDriveService.formatBytes(odQuota.usage)}</Text>
                    <Text style={styles.quotaLabel}>Used</Text>
                  </View>
                  <View style={styles.quotaItem}>
                    <Text style={styles.quotaValue}>
                      {odQuota.limit ? oneDriveService.formatBytes(odQuota.limit) : 'Unlimited'}
                    </Text>
                    <Text style={styles.quotaLabel}>Total</Text>
                  </View>
                  <View style={styles.quotaItem}>
                    <Text style={styles.quotaValue}>{oneDriveService.formatBytes(odQuota.usageInDriveTrash)}</Text>
                    <Text style={styles.quotaLabel}>Trash</Text>
                  </View>
                </View>

                {/* Progress bar */}
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
                      {odUsagePercent.toFixed(1)}% used
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.loadingText}>Tap to load storage info</Text>
            )}
          </View>
        )}

        {/* Configuration Options */}
        <Text style={styles.sectionTitle}>Configuration</Text>

        <TouchableOpacity style={styles.configCard} onPress={() => navigation.navigate('ManagerFiles')}>
          <View style={styles.configIcon}>
            <Text style={styles.configIconText}>📁</Text>
          </View>
          <View style={styles.configInfo}>
            <Text style={styles.configTitle}>Manage Files</Text>
            <Text style={styles.configDesc}>Browse your files across all connected storage</Text>
          </View>
          <Text style={styles.configArrow}>›</Text>
        </TouchableOpacity>

        {/* Browse OneDrive Files (only when connected) */}
        {isOneDriveConnected && (
          <TouchableOpacity
            style={styles.configCard}
            onPress={() => navigation.navigate('FileList', {
              folderId: 'root',
              folderName: 'OneDrive',
              provider: 'onedrive',
            })}
          >
            <View style={[styles.configIcon, { backgroundColor: '#e6f2fb' }]}>
              <Text style={styles.configIconText}>☁️</Text>
            </View>
            <View style={styles.configInfo}>
              <Text style={styles.configTitle}>Browse OneDrive</Text>
              <Text style={styles.configDesc}>Explore your OneDrive files and folders</Text>
            </View>
            <Text style={styles.configArrow}>›</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.configCard} onPress={() => navigation.navigate('CleanTrash')}>
          <View style={styles.configIcon}>
            <Text style={styles.configIconText}>🗑️</Text>
          </View>
          <View style={styles.configInfo}>
            <Text style={styles.configTitle}>Clean Trash</Text>
            <Text style={styles.configDesc}>
              {quota ? `${driveService.formatBytes(quota.usageInDriveTrash)} in trash — recoverable space` : 'Free up space from trash'}
            </Text>
          </View>
          <Text style={styles.configArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.configCard} onPress={() => navigation.navigate('AddProvider')}>
          <View style={styles.configIcon}>
            <Text style={styles.configIconText}>🔗</Text>
          </View>
          <View style={styles.configInfo}>
            <Text style={styles.configTitle}>Add Provider</Text>
            <Text style={styles.configDesc}>Connect OneDrive, Dropbox, or other cloud storage</Text>
          </View>
          <Text style={styles.configArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.configCard} onPress={() => {}}>
          <View style={styles.configIcon}>
            <Text style={styles.configIconText}>⚙️</Text>
          </View>
          <View style={styles.configInfo}>
            <Text style={styles.configTitle}>Settings</Text>
            <Text style={styles.configDesc}>Auto-sync, notifications, default upload folder</Text>
          </View>
          <Text style={styles.configArrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
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
    flex: 1,
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
