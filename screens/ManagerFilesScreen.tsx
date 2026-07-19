// screens/ManagerFilesScreen.tsx
// Manager Files — FlatList-based layout (no nested ScrollView issues).

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FileCard, { UnifiedFile, mimeTypeToCategory } from '../components/storage/FileCard';
import FileTypeTabs, { FILE_TYPE_TABS } from '../components/storage/FileTypeTabs';
import { driveFilesService, DriveFilePreview } from '../services/drive-files.service';

function toUnified(p: DriveFilePreview): UnifiedFile {
  return {
    id: p.id, name: p.name, mimeType: p.mimeType,
    size: p.details?.size ?? null,
    modifiedTime: p.details?.modifiedTime ?? '',
    provider: 'google-drive', providerName: 'Google Drive',
    iconLink: p.iconLink, thumbnailLink: p.details?.thumbnailLink,
    webViewLink: p.details?.webViewLink,
  };
}

const ManagerFilesScreen: React.FC = () => {
  const nav = useNavigation();
  const [previews, setPreviews] = useState<DriveFilePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');

  const load = useCallback(async (append = false) => {
    const pt = append && nextPage ? nextPage : undefined;
    if (append) setLoadingMore(true); else setLoading(true);
    const r = await driveFilesService.getPreviews(20, pt);
    if (r) {
      setPreviews(prev => append ? [...prev, ...r.files] : r.files);
      setNextPage(r.nextPageToken);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [nextPage]);

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPreviews([]); setNextPage(null);
    const r = await driveFilesService.getPreviews(20);
    if (r) { setPreviews(r.files); setNextPage(r.nextPageToken); }
    setRefreshing(false);
  }, []);

  const onLoadMore = useCallback(async () => {
    if (!nextPage || loadingMore || loading) return;
    const r = await driveFilesService.getPreviews(20, nextPage);
    if (r) {
      setPreviews(prev => [...prev, ...r.files]);
      setNextPage(r.nextPageToken);
    }
  }, [nextPage, loadingMore, loading]);

  // Fetch detail for a file when user taps it
  const fetchDetail = useCallback(async (fileId: string) => {
    const detail = await driveFilesService.getDetail(fileId);
    if (detail) {
      setPreviews(prev =>
        prev.map(p =>
          p.id === fileId ? { ...p, details: detail } : p
        )
      );
    }
  }, []);

  // fixed counts (non-reactive helpers for summary)
  const pLen = previews.length;

  const unified = useMemo(() => previews.map(toUnified), [previews]);

  const filtered = useMemo(() => {
    let r = unified;
    if (tab !== 'all') r = r.filter(f => mimeTypeToCategory(f.mimeType) === tab);
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(f => f.name.toLowerCase().includes(q)); }
    return [...r].sort((a, b) =>
      sortBy === 'name'
        ? a.name.localeCompare(b.name)
        : new Date(b.modifiedTime || 0).getTime() - new Date(a.modifiedTime || 0).getTime());
  }, [unified, tab, search, sortBy]);

  const summary = useMemo(() => {
    const map = new Map<string, { label: string; count: number; icon: string }>();
    for (const f of unified) {
      const k = mimeTypeToCategory(f.mimeType);
      const t = FILE_TYPE_TABS.find(x => x.key === k);
      const e = map.get(k) || { label: t?.label || k, count: 0, icon: t?.icon || '📦' };
      e.count += 1; map.set(k, e);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [unified]);

  if (loading && previews.length === 0) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1a237e" />
      </View>
    );
  }

  // Render header section for FlatList's ListHeaderComponent
  const renderHeader = useCallback(() => (
    <>
      {/* Summary */}
      <View style={s.bar}>
        <View style={s.cell}><Text style={s.val}>{pLen}</Text><Text style={s.lbl}>Files</Text></View>
        <View style={s.cell}><Text style={s.val}>GD</Text><Text style={s.lbl}>Provider</Text></View>
        <View style={s.cell}><Text style={s.val}>{unified.filter(f => f.size != null).length}</Text><Text style={s.lbl}>Details</Text></View>
      </View>

      {/* Type mini-cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.typeScroll} nestedScrollEnabled>
        {summary.slice(0, 7).map(i => (
          <TouchableOpacity key={i.label} style={s.typeCard} onPress={() => {
            const t = FILE_TYPE_TABS.find(x => x.label === i.label || x.key === i.label.toLowerCase());
            setTab(t?.key || 'other');
          }}>
            <Text style={s.typeIcon}>{i.icon}</Text>
            <Text style={s.typeLabel}>{i.label}</Text>
            <Text style={s.typeCount}>{i.count}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tabs */}
      <FileTypeTabs activeTab={tab} onTabChange={setTab} />

      {/* Search + Sort */}
      <View style={s.actions}>
        <TouchableOpacity onPress={() => setShowSearch(!showSearch)}><Text>{showSearch ? '✕' : '🔍'}</Text></TouchableOpacity>
        {showSearch && (
          <TextInput style={s.si} placeholder="Search files…" placeholderTextColor="#999" value={search}
            onChangeText={setSearch} autoFocus />
        )}
        <TouchableOpacity style={s.sb} onPress={() => setSortBy(s => s === 'name' ? 'date' : 'name')}>
          <Text style={s.sbt}>Sort: {sortBy === 'name' ? 'Name' : 'Date'}</Text>
        </TouchableOpacity>
      </View>

      {/* Section */}
      <View style={s.sec}>
        <Text style={s.secTitle}>
          {tab === 'all' ? 'All Files' : FILE_TYPE_TABS.find(t => t.key === tab)?.label || 'Files'}
        </Text>
        <Text style={s.secCount}>{filtered.length} file{filtered.length !== 1 ? 's' : ''}</Text>
      </View>
    </>
  ), [pLen, unified, summary, tab, showSearch, search, sortBy, filtered.length]);

  const renderFooter = useCallback(() => {
    if (filtered.length === 0 && !loading) {
      return (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📂</Text>
          <Text style={s.emptyTitle}>No files</Text>
          <Text style={s.emptyDesc}>{search ? 'Try a different search' : 'Connect a provider'}</Text>
        </View>
      );
    }
    return nextPage ? (
      <TouchableOpacity style={s.lmBtn} onPress={onLoadMore} disabled={loadingMore}>
        {loadingMore ? (
          <ActivityIndicator size="small" color="#1a237e" />
        ) : (
          <Text style={s.lmText}>Load more</Text>
        )}
      </TouchableOpacity>
    ) : null;
  }, [filtered.length, loading, search, nextPage, loadingMore, onLoadMore]);

  const renderFile = useCallback(({ item: f }: { item: UnifiedFile }) => (
    <FileCard key={f.id} file={f} onPress={() => fetchDetail(f.id)} />
  ), [fetchDetail]);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.back}><Text style={s.backTxt}>‹</Text></TouchableOpacity>
        <Text style={s.title}>Manager Files</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={f => f.id}
        renderItem={renderFile}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a237e" />
        }
        contentContainerStyle={{ paddingBottom: 60, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  hdr: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef',
  },
  back: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  backTxt: { fontSize: 28, color: '#1a237e', fontWeight: '300', lineHeight: 30 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1a237e' },

  bar: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  cell: { flex: 1, alignItems: 'center' },
  val: { fontSize: 18, fontWeight: 'bold', color: '#1a237e' },
  lbl: { fontSize: 12, color: '#888', marginTop: 2 },

  typeScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef', paddingHorizontal: 16, paddingVertical: 12 },
  typeCard: { width: 80, alignItems: 'center', paddingVertical: 8, backgroundColor: '#f8f9fa', borderRadius: 8, marginRight: 10 },
  typeIcon: { fontSize: 20, marginBottom: 4 },
  typeLabel: { fontSize: 11, fontWeight: '600', color: '#555' },
  typeCount: { fontSize: 10, color: '#999', marginTop: 2 },

  actions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef', gap: 8 },
  si: { flex: 1, height: 36, backgroundColor: '#f0f4ff', borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: '#333' },
  sb: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f0f4ff', borderRadius: 6 },
  sbt: { fontSize: 12, color: '#1a237e', fontWeight: '600' },

  sec: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  secTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  secCount: { fontSize: 13, color: '#999' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#555', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#999' },

  lmBtn: { alignItems: 'center', paddingVertical: 16 },
  lmText: { fontSize: 14, color: '#1a237e', fontWeight: '600' },
});

export default ManagerFilesScreen;
