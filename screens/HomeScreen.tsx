// screens/HomeScreen.tsx
// Home screen after successful authentication — shows real Google Drive storage

import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, RefreshControl } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectCurrentUser } from '../store/slices/authSlice';
import { logout } from '../store/slices/authSlice';
import { authService } from '../services/auth.service';
import { driveService, DriveStorageQuota } from '../services/drive.service';
import { setQuotaLoading, setQuota, setQuotaError, selectDriveQuota, selectDriveLoading, selectDriveError } from '../store/slices/driveSlice';

const HomeScreen = () => {
  const user = useSelector(selectCurrentUser);
  const quota = useSelector(selectDriveQuota);
  const quotaLoading = useSelector(selectDriveLoading);
  const quotaError = useSelector(selectDriveError);
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

  useEffect(() => {
    fetchStorageQuota();
  }, [fetchStorageQuota]);

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>1storage</Text>
      </View>
      
      <ScrollView style={styles.content} refreshControl={
        <RefreshControl refreshing={quotaLoading} onRefresh={fetchStorageQuota} />
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
            <Text style={styles.welcomeSubtext}>Google Drive connected</Text>
          </View>
        </View>
        
        {/* Storage Quota Card */}
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
        
        {/* Configuration Options */}
        <Text style={styles.sectionTitle}>Configuration</Text>
        
        <TouchableOpacity style={styles.configCard} onPress={() => {}}>
          <View style={styles.configIcon}>
            <Text style={styles.configIconText}>📁</Text>
          </View>
          <View style={styles.configInfo}>
            <Text style={styles.configTitle}>Manage Files</Text>
            <Text style={styles.configDesc}>Browse and manage your Google Drive files</Text>
          </View>
          <Text style={styles.configArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.configCard} onPress={() => {}}>
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
        
        <TouchableOpacity style={styles.configCard} onPress={() => {}}>
          <View style={styles.configIcon}>
            <Text style={styles.configIconText}>🔗</Text>
          </View>
          <View style={styles.configInfo}>
            <Text style={styles.configTitle}>Add Provider</Text>
            <Text style={styles.configDesc}>Connect Dropbox, OneDrive, or other cloud storage</Text>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    backgroundColor: '#4285f4',
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
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  storageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
    color: '#666',
    marginTop: 2,
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  loadingText: {
    color: '#999',
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
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  configCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  configIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f0f4ff',
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
    color: '#666',
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
    borderTopColor: '#e9ecef',
  },
  logoutText: {
    color: '#e53935',
    fontSize: 16,
  },
});

export default HomeScreen;