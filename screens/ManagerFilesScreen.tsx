// screens/ManagerFilesScreen.tsx
// Manager Files — unified view of all user files across connected providers.
// Loads lightweight previews first (just names + icons). Full details (size, date)
// are fetched lazily when the user taps a file.

import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import FileCard, { UnifiedFile as UnifiedFileCard } from '../components/storage/FileCard';
import FileTypeTabs, { FILE_TYPE_TABS } from '../components/storage/FileTypeTabs';
import ProviderBadge, { PROVIDERS } from '../components/storage/ProviderBadge';
import { driveFilesService, DriveFilePreview } from '../services/drive-files.service';

/* ───── Convert DriveFilePreview → UnifiedFile (with lazy details) ───── */
function previewToUnified(preview: DriveFilePreview): UnifiedFileCard {
  return {
    id: preview.id,
    name: preview.name,
    mimeType: preview.mimeType,
    size: preview.details?.size ?? null,
    modifiedTime: preview.details?.modifiedTime ?? '',
    provider: 'google-drive',
    providerName: 'Google Drive',
    iconLink: preview.iconLink,
    parents: preview.parents,
    trashed: preview.trashed,
    webViewLink: preview.details?.webViewLink,
  };
}

/* ───── Helpers shared with FileCard ───── */
import { mimeTypeToCategory, formatFileSize } from '../components/storage/FileCard';

interface StorageSummary {
  label: string;
  size: number;
  count: number;
  icon: string;
}

const ManagerFilesScreen: React.FC = () => {
  const navigation = useNavigation();

  // State: lightweight previews
  const [previews, setPreviews] = useState<DriveFilePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // UI state
  const [activeTypeTab, setActiveTypeTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');

  // Keep a set of file IDs whose details have been fetched
  const detailsFetched = useRef(new Set<string>());

  /* ───── Load previews ───── */
  const loadPreviews = useCallback(async (append: boolean = false) => {
    const pageToken = append ? nextPageToken : undefined;
    if (append) setLoadingMore(true);
    else setLoading(true);

    const result = await driveFilesService.getPreviews(20, pageToken);
    if (result) {
      setPreviews(prev => append ? [...prev, ...result.files] : result.files);
      setNextPageToken(result.nextPageToken);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [nextPageToken]);

  useEffect(() => { loadPreviews(false); }, []);

  // Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPreviews([]);
    setNextPageToken(null);
    detailsFetched.current.clear();
    const result = await driveFilesService.getPreviews(20);
    if (result) {
      setPreviews(result.files);
      setNextPageToken(result.nextPageToken);
    }
    setRefreshing(false);
  }, []);

  // Load more
  const onEndReached = useCallback(() => {
    if (nextPageToken && !loadingMore && !loading) {
      loadPreviews(true);
    }
  }, [nextPageToken, loadingMore, loading, loadPreviews]);

  /* ───── Lazy detail fetch ───── */
  const fetchDetail = useCallback(async (fileId: string) => {
    if (detailsFetched.current.has(fileId)) return;
    detailsFetched.current.add(fileId);
    const detail = await driveFilesService.getDetail(fileId);
    if (detail) {
      setPreviews(prev =>
        prev.map(p => p.id === fileId ? { ...p, details: detail } : p),
      );
    }
  }, []);

  const handleFilePress = useCallback((file: UnifiedFileCard) => {
    fetchDetail(file.id);
    // TODO: navigate to file detail / folder browse
  }, [fetchDetail]);

  /* ───── Derived data ───── */
  const unifiedFiles = useMemo(() => previews.map(previewToUnified), [previews]);

  const filteredFiles = useMemo(() => {
    let result = unifiedFiles;

    if (activeTypeTab !== 'all') {
      result = result.filter(f => mimeTypeToCategory(f.mimeType) === activeTypeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q));
    }

    switch (sortBy) {
      case 'name':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'date':
        result = [...result].sort(
          (a, b) => new Date(b.modifiedTime || 0).getTime() - new Date(a.modifiedTime || 0).getTime(),
        );
        break;
    }

    return result;
  }, [unifiedFiles, activeTypeTab, searchQuery, sortBy]);

  const storageSummary: StorageSummary[] = useMemo(() => {
    const map = new Map<string, StorageSummary>();
    for (const f of unifiedFiles) {
      const cat = mimeTypeToCategory(f.mimeType);
      const tab = FILE_TYPE_TABS.find(t => t.key === cat);
      const entry = map.get(cat) || {
        label: tab?.label || cat,
        size: 0,
        count: 0,
        icon: tab?.icon || '📦',
      };
      entry.count += 1;
      map.set(cat, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [unifiedFiles]);

  /* ───── Render ───── */

  const renderHeader = () => (
    <View>
      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{previews.length}+</Text>
          <Text style={styles.summaryLabel}>Files</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{PROVIDERS['google-drive']?.label}</Text>
          <Text style={styles.summaryLabel}>Providers</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {unifiedFiles.filter(f => f.size !== null).length}
          </Text>
          <Text style={styles.summaryLabel}>With sizes</Text>
        </View>
      </View>

      {/* Type mini-cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.typeSummaryScroll}
        contentContainerStyle={styles.typeSummaryContent}
      >
        {storageSummary.slice(0, 6).map(item => (
          <TouchableOpacity
            key={item.label}
            style={styles.typeSummaryCard}
            onPress={() => {
              const tab = FILE_TYPE_TABS.find(
                t => t.label === item.label || t.key === item.label.toLowerCase(),
              );
              setActiveTypeTab(tab?.key || 'other');
            }}
          >
            <Text style={styles.typeSummaryIcon}>{item.icon}</Text>
            <Text style={styles.typeSummaryLabel}>{item.label}</Text>
            <Text style={styles.typeSummarySize}>{item.count} files</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Type filter tabs */}
      <FileTypeTabs activeTab={activeTypeTab} onTabChange={setActiveTypeTab} />

      {/* Search + Sort */}
      <View style={styles.searchRow}>
        <TouchableOpacity style={styles.searchToggle} onPress={() => setShowSearch(!showSearch)}>
          <Text style={styles.searchToggleText}>{showSearch ? '✕' : '🔍'}</Text>
        </TouchableOpacity>

        {showSearch && (
          <TextInput
            style={styles.searchInput}
            placeholder="Search files..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        )}

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortBy(s => s === 'name' ? 'date' : 'name')}
        >
          <Text style={styles.sortButtonText}>
            Sort: {sortBy === 'name' ? 'Name' : 'Date'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {activeTypeTab === 'all'
            ? 'All Files'
            : FILE_TYPE_TABS.find(t => t.key === activeTypeTab)?.label || 'Files'}
        </Text>
        <Text style={styles.sectionCount}>
          {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      {loading ? (
        <ActivityIndicator size="large" color="#1a237e" />
      ) : (
        <>
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyTitle}>No files found</Text>
          <Text style={styles.emptyDesc}>
            {searchQuery
              ? 'Try a different search term'
              : 'Connect a storage provider to see your files here'}
          </Text>
        </>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#1a237e" />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Manager Files</Text>
          <Text style={styles.headerSub}>
            {loading ? 'Loading...' : `${previews.length} files loaded`}
          </Text>
        </View>
        {loading && previews.length === 0 && <ActivityIndicator size="small" color="#1a237e" />}
      </View>

      {/* List */}
      <FlatList
        data={filteredFiles}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <FileCard file={item} onPress={handleFilePress} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1a237e"
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={filteredFiles.length === 0 ? styles.emptyList : undefined}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backText: { fontSize: 28, color: '#1a237e', fontWeight: '300', lineHeight: 30 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a237e' },
  headerSub: { fontSize: 12, color: '#888', marginTop: 1 },
  summaryBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  summaryCard: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#1a237e' },
  summaryLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  typeSummaryScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  typeSummaryContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  typeSummaryCard: {
    width: 80,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginRight: 8,
  },
  typeSummaryIcon: { fontSize: 20, marginBottom: 4 },
  typeSummaryLabel: { fontSize: 11, fontWeight: '600', color: '#555', textAlign: 'center' },
  typeSummarySize: { fontSize: 10, color: '#999', marginTop: 2 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchToggle: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchToggleText: { fontSize: 18 },
  searchInput: {
    flex: 1,
    height: 36,
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#333',
    marginRight: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f4ff',
    borderRadius: 6,
  },
  sortButtonText: { fontSize: 12, color: '#1a237e', fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  sectionCount: { fontSize: 13, color: '#999' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#555', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#999', textAlign: 'center', paddingHorizontal: 40 },
  emptyList: { flexGrow: 1 },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerText: { fontSize: 13, color: '#999' },
});

export default ManagerFilesScreen;
