// screens/StorageBreakdownScreen.tsx
// Main screen: what's taking up space in Google Drive?
// Shows storage by file type, largest files, and navigation to file browser/trash.

import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { driveFilesService } from '../services/drive-files.service';
import { driveService } from '../services/drive.service';
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
} from '../store/slices/driveFilesSlice';
import { selectDriveQuota } from '../store/slices/driveSlice';

const StorageBreakdownScreen = () => {
  const navigation = useNavigation();
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
      dispatch(setStorageByTypeError('Could not fetch storage breakdown'));
    }
  }, [dispatch]);

  const fetchLargestFiles = useCallback(async () => {
    dispatch(setLargestFilesLoading(true));
    const result = await driveFilesService.getLargestFiles(20);
    if (result) {
      dispatch(setLargestFiles({ files: result.files, nextPageToken: result.nextPageToken }));
    } else {
      dispatch(setLargestFilesError('Could not fetch largest files'));
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
  const barColor = usagePercent > 90 ? '#e53935' : usagePercent > 70 ? '#fb8c00' : '#4285f4';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Storage Breakdown</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={storageByTypeLoading || largestFilesLoading} onRefresh={onRefresh} />}
      >
        {/* Storage Quota Card */}
        <View style={styles.storageCard}>
          <Text style={styles.storageTitle}>Google Drive Storage</Text>

          {quota ? (
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
              </View>

              {/* Progress bar */}
              {quota.limit && (
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[styles.progressBarFill, { width: `${Math.min(usagePercent, 100)}%`, backgroundColor: barColor }]}
                    />
                  </View>
                  <Text style={styles.progressText}>{usagePercent.toFixed(1)}% used</Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.loadingText}>Loading storage info...</Text>
          )}
        </View>

        {/* Storage by Type */}
        <Text style={styles.sectionTitle}>Storage by File Type</Text>

        {storageByTypeLoading ? (
          <ActivityIndicator size="large" color="#4285f4" />
        ) : storageByType.length > 0 ? (
          <View style={styles.typeList}>
            {storageByType.map((type, index) => (
              <TouchableOpacity
                key={index}
                style={styles.typeCard}
                onPress={() => navigation.navigate('FileList', { typeFilter: type.type })}
              >
                <View style={styles.typeIcon}>{type.icon}</View>
                <View style={styles.typeInfo}>
                  <Text style={styles.typeLabel}>{type.label}</Text>
                  <Text style={styles.typeSize}>{driveService.formatBytes(type.size)}</Text>
                </View>
                <View style={styles.typeBarContainer}>
                  <View style={styles.typeBarBg}>
                    <View
                      style={[styles.typeBarFill, { width: `${type.percentage}%`, backgroundColor: barColor }]}
                    />
                  </View>
                  <Text style={styles.typePercent}>{type.percentage.toFixed(1)}%</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.loadingText}>No storage breakdown available</Text>
        )}

        {/* Largest Files */}
        <Text style={styles.sectionTitle}>Largest Files</Text>

        {largestFilesLoading ? (
          <ActivityIndicator size="small" color="#4285f4" />
        ) : largestFiles.length > 0 ? (
          <View style={styles.fileList}>
            {largestFiles.map((file, index) => (
              <TouchableOpacity
                key={file.id}
                style={styles.fileCard}
                onPress={() => navigation.navigate('FileList', { fileId: file.id })}
              >
                <View style={styles.fileIcon}>{file.mimeType.includes('folder') ? '📁' : '📄'}</View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                  <Text style={styles.fileSize}>{file.size ? driveService.formatBytes(file.size) : '—'}</Text>
                </View>
                <Text style={styles.fileArrow}>›</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.moreButton} onPress={() => navigation.navigate('FileList', { sort: 'size' })}>
              <Text style={styles.moreText}>View All Largest Files</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.loadingText}>No large files found</Text>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.navButtonText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('FileList')}>
          <Text style={styles.navButtonText}>Files</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('CleanTrash')}>
          <Text style={styles.navButtonText}>Trash</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  typeList: {
    marginBottom: 20,
  },
  typeCard: {
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
  typeIcon: {
    marginRight: 12,
    fontSize: 24,
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  typeSize: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  typeBarContainer: {
    alignItems: 'flex-end',
  },
  typeBarBg: {
    height: 6,
    width: 100,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  typeBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  typePercent: {
    fontSize: 12,
    color: '#666',
  },
  fileList: {
    marginBottom: 20,
  },
  fileCard: {
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
  fileIcon: {
    marginRight: 12,
    fontSize: 20,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  fileSize: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  fileArrow: {
    fontSize: 20,
    color: '#ccc',
  },
  moreButton: {
    padding: 12,
    alignItems: 'center',
  },
  moreText: {
    color: '#4285f4',
    fontSize: 14,
  },
  loadingText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    color: '#4285f4',
    fontSize: 16,
  },
});

export default StorageBreakdownScreen;