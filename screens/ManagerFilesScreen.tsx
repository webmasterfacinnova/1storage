// screens/ManagerFilesScreen.tsx
// Manager Files — unified view across providers.
// Lightweight previews first, full details on tap.

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
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FileCard, { UnifiedFile, mimeTypeToCategory } from '../components/storage/FileCard';
import FileTypeTabs, { FILE_TYPE_TABS } from '../components/storage/FileTypeTabs';
import { PROVIDERS } from '../components/storage/ProviderBadge';
import { driveFilesService, DriveFilePreview } from '../services/drive-files.service';

function previewToUnified(p: DriveFilePreview): UnifiedFile {
  return {
    id: p.id,
    name: p.name,
    mimeType: p.mimeType,
    size: p.details?.size ?? null,
    modifiedTime: p.details?.modifiedTime ?? '',
    provider: 'google-drive',
    providerName: 'Google Drive',
    iconLink: p.iconLink,
    parents: p.parents,
    trashed: p.trashed,
    webViewLink: p.details?.webViewLink,
  };
}

interface SummaryItem { label: string; count: number; icon: string; }

const ManagerFilesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [previews, setPreviews] = useState<DriveFilePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const detailCache = useRef(new Set<string>());

  const load = useCallback(async (append = false) => {
    const token = append ? nextPage : undefined;
    if (append) setLoadingMore(true); else setLoading(true);
    const r = await driveFilesService.getPreviews(20, token);
    if (r) {
      setPreviews(prev => append ? [...prev, ...r.files] : r.files);
      setNextPage(r.nextPageToken);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [nextPage]);

  useEffect(() => { load(false); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPreviews([]);
    setNextPage(null);
    detailCache.current.clear();
    const r = await driveFilesService.getPreviews(20);
    if (r) { setPreviews(r.files); setNextPage(r.nextPageToken); }
    setRefreshing(false);
  }, []);

  const onEnd = useCallback(() => {
    if (nextPage && !loadingMore && !loading) load(true);
  }, [nextPage, loadingMore, loading, load]);

  const fetchDetail = useCallback(async (id: string) => {
    if (detailCache.current.has(id)) return;
    detailCache.current.add(id);
    const d = await driveFilesService.getDetail(id);
    if (d) setPreviews(prev => prev.map(p => p.id === id ? { ...p, details: d } : p));
  }, []);

  const handlePress = useCallback((f: UnifiedFile) => { fetchDetail(f.id); }, [fetchDetail]);

  const unified = useMemo(() => previews.map(previewToUnified), [previews]);

  const filtered = useMemo(() => {
    let items = unified;
    if (activeTab !== 'all') items = items.filter(f => mimeTypeToCategory(f.mimeType) === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(f => f.name.toLowerCase().includes(q));
    }
    return [...items].sort((a, b) =>
      sortBy === 'name'
        ? a.name.localeCompare(b.name)
        : new Date(b.modifiedTime || 0).getTime() - new Date(a.modifiedTime || 0).getTime()
    );
  }, [unified, activeTab, search, sortBy]);

  const summary = useMemo(() => {
    const map = new Map<string, SummaryItem>();
    for (const f of unified) {
      const cat = mimeTypeToCategory(f.mimeType);
      const tab = FILE_TYPE_TABS.find(t => t.key === cat);
      const e = map.get(cat) || { label: tab?.label || cat, count: 0, icon: tab?.icon || '📦' };
      e.count += 1;
      map.set(cat, e);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [unified]);

  const renderItem = useCallback(({ item }: { item: UnifiedFile }) => (
    <FileCard file={item} onPress={handlePress} />
  ), [handlePress]);

  const renderEmpty = () => {
    if (loading) return <ActivityIndicator size="large" color="#1a237e" style={{ margin: 60 }} />;
    return (
      <View style={s.empty}>
        <Text style={s.emptyIcon}>📂</Text>
        <Text style={s.emptyTitle}>No files</Text>
        <Text style={s.emptyDesc}>{search ? 'Try a different search' : 'Connect a provider to see files'}</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 60 }} />;
    return (
      <View style={s.footer}>
        <ActivityIndicator size="small" color="#1a237e" />
        <Text style={s.footerText}>Loading more…</Text>
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* Fixed header — OUTSIDE FlatList */}
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><Text style={s.backText}>‹</Text></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Manager Files</Text>
          <Text style={s.sub}>{loading ? 'Loading…' : `${previews.length} file previews`}</Text>
        </View>
        {loading && previews.length === 0 && <ActivityIndicator size="small" color="#1a237e" />}
      </View>

      {/* Summary bar — outside FlatList to avoid ScrollView nesting */}
      <View style={s.bar}>
        <View style={s.cell}><Text style={s.val}>{previews.length}</Text><Text style={s.lbl}>Files</Text></View>
        <View style={s.cell}><Text style={s.val}>{PROVIDERS['google-drive']?.label}</Text><Text style={s.lbl}>Provider</Text></View>
        <View style={s.cell}><Text style={s.val}>{unified.filter(f => f.size != null).length}</Text><Text style={s.lbl}>Details</Text></View>
      </View>

      {/* Type mini-cards — outside FlatList, horizontal ScrollView is fine here */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.typeScroll}>
        {summary.slice(0, 7).map(item => (
          <TouchableOpacity key={item.label} style={s.typeCard} onPress={() => {
            const tab = FILE_TYPE_TABS.find(t => t.label === item.label || t.key === item.label.toLowerCase());
            setActiveTab(tab?.key || 'other');
          }}>
            <Text style={s.typeIcon}>{item.icon}</Text>
            <Text style={s.typeLabel}>{item.label}</Text>
            <Text style={s.typeCount}>{item.count}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tabs + search row — also outside FlatList so they're sticky */}
      <FileTypeTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <View style={s.actions}>
        <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={s.iconBtn}>
          <Text>{showSearch ? '✕' : '🔍'}</Text>
        </TouchableOpacity>
        {showSearch && (
          <TextInput style={s.searchInput} placeholder="Search files…" placeholderTextColor="#999"
            value={search} onChangeText={setSearch} autoFocus />
        )}
        <TouchableOpacity style={s.sortBtn} onPress={() => setSortBy(s => s === 'name' ? 'date' : 'name')}>
          <Text style={s.sortText}>Sort: {sortBy === 'name' ? 'Name' : 'Date'}</Text>
        </TouchableOpacity>
      </View>

      {/* Section header */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          {activeTab === 'all' ? 'All Files' : FILE_TYPE_TABS.find(t => t.key === activeTab)?.label || 'Files'}
        </Text>
        <Text style={s.sectionCount}>{filtered.length} file{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* FlatList — only the file items, no nested ScrollView inside */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a237e" />}
        onEndReached={onEnd}
        onEndReachedThreshold={0.3}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  headerBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 12, paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e9ecef',
  },
  back: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  backText: { fontSize: 28, color: '#1a237e', fontWeight: '300', lineHeight: 30 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1a237e' },
  sub: { fontSize: 12, color: '#888', marginTop: 1 },

  bar: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  cell: { flex: 1, alignItems: 'center' },
  val: { fontSize: 18, fontWeight: 'bold', color: '#1a237e' },
  lbl: { fontSize: 12, color: '#888', marginTop: 2 },

  typeScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef', paddingHorizontal: 16, paddingVertical: 12, maxHeight: 80 },
  typeCard: { width: 80, alignItems: 'center', paddingVertical: 8, backgroundColor: '#f8f9fa', borderRadius: 8, marginRight: 10 },
  typeIcon: { fontSize: 20, marginBottom: 4 },
  typeLabel: { fontSize: 11, fontWeight: '600', color: '#555' },
  typeCount: { fontSize: 10, color: '#999', marginTop: 2 },

  actions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  iconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  searchInput: { flex: 1, height: 36, backgroundColor: '#f0f4ff', borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: '#333', marginRight: 8 },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f0f4ff', borderRadius: 6 },
  sortText: { fontSize: 12, color: '#1a237e', fontWeight: '600' },

  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  sectionCount: { fontSize: 13, color: '#999' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#555', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#999', textAlign: 'center', paddingHorizontal: 40 },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20, gap: 8 },
  footerText: { fontSize: 13, color: '#999' },
});

export default ManagerFilesScreen;
