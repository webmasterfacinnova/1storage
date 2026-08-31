// screens/ManagerFilesScreen.tsx
import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FileCard, { mimeTypeToCategory } from '../components/storage/FileCard';
import FileTypeTabs, { FILE_TYPE_TABS } from '../components/storage/FileTypeTabs';
import StorageSummaryBar from '../components/storage/StorageSummaryBar';
import ProviderSelector from '../components/storage/ProviderSelector';
import { fetchProviderFilesPage } from '../services/storage-registry.service';
import { UnifiedFile, ProviderMeta } from '../types/storage';
import { useSelector } from 'react-redux';
import { selectConnectedProviders } from '../store/slices/connectedProvidersSlice';

const PROVIDER_ALL = 'all';

const PROVIDER_META: Record<string, ProviderMeta> = {
  'google-drive': { id: 'google-drive', short: 'GD', name: 'Google Drive', color: '#34a853' },
  'onedrive': { id: 'onedrive', short: 'OD', name: 'OneDrive', color: '#0078d4' },
};

const fileKey = (f: UnifiedFile) => `${f.provider}:${f.id}`;

const ManagerFilesScreen: React.FC = () => {
  const nav = useNavigation();
  const { height: windowHeight } = useWindowDimensions();
  const [headerH, setHeaderH] = useState(56);
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [previews, setPreviews] = useState<UnifiedFile[]>([]);
  const [tokens, setTokens] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [activeProvider, setActiveProvider] = useState<string>(PROVIDER_ALL);

  const connectedProviders = useSelector(selectConnectedProviders);
  const providerKeys = useMemo(() => Object.keys(connectedProviders || {}), [connectedProviders]);

  useEffect(() => {
    if (providerKeys.length === 1 && activeProvider === PROVIDER_ALL) {
      setActiveProvider(providerKeys[0]);
    } else if (providerKeys.length > 1 && !providerKeys.includes(activeProvider)) {
      setActiveProvider(PROVIDER_ALL);
    }
  }, [providerKeys, activeProvider]);

  const scope = useMemo(
    () => (activeProvider === PROVIDER_ALL ? providerKeys : [activeProvider]),
    [activeProvider, providerKeys],
  );

  const loadInitial = useCallback(async (isRefresh = false) => {
    if (scope.length === 0) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(scope.map(pid => fetchProviderFilesPage(pid)));
      const merged: UnifiedFile[] = [];
      const seen = new Set<string>();
      const nt: Record<string, string | null> = {};

      scope.forEach((pid, i) => {
        const r = results[i];
        if (r) {
          r.files.forEach(f => {
            if (!seen.has(fileKey(f))) {
              seen.add(fileKey(f));
              merged.push(f);
            }
          });
          nt[pid] = r.nextPageToken ?? null;
        } else {
          nt[pid] = null;
        }
      });
      setPreviews(merged);
      setTokens(nt);
    } catch (err: any) {
      console.error('ManagerFiles loadInitial error:', err);
      setError(err?.message || 'Could not load files');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scope]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const hasMore = useMemo(
    () => scope.some(pid => tokens[pid] === undefined || !!tokens[pid]),
    [scope, tokens],
  );

  const onLoadMore = useCallback(async () => {
    if (loadingMore || loading) return;
    const toLoad = scope.filter(pid => !!tokens[pid]);
    if (toLoad.length === 0) return;
    setLoadingMore(true);

    const results = await Promise.all(
      toLoad.map(pid => fetchProviderFilesPage(pid, 20, tokens[pid] as string))
    );

    setPreviews(prev => {
      const seen = new Set(prev.map(fileKey));
      const add: UnifiedFile[] = [];
      results.forEach(r => {
        if (r) r.files.forEach(f => { if (!seen.has(fileKey(f))) { seen.add(fileKey(f)); add.push(f); } });
      });
      return [...prev, ...add];
    });

    setTokens(prev => {
      const nt = { ...prev };
      toLoad.forEach((pid, i) => { nt[pid] = results[i] ? (results[i]!.nextPageToken ?? null) : null; });
      return nt;
    });
    setLoadingMore(false);
  }, [scope, tokens, loading, loadingMore]);

  const onRefresh = useCallback(() => { loadInitial(true); }, [loadInitial]);

  const handleFilePress = useCallback((file: UnifiedFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      (nav as any).navigate('FileList', {
        folderId: file.id,
        folderName: file.name,
        provider: file.provider,
      });
    } else if (file.webViewLink) {
      Linking.openURL(file.webViewLink).catch(() => {});
    }
  }, [nav]);

  const onScroll = useCallback((e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    if (distanceFromBottom < 300) onLoadMore();
  }, [onLoadMore]);

  const filtered = useMemo(() => {
    let r = previews;
    if (tab !== 'all') r = r.filter(f => mimeTypeToCategory(f.mimeType) === tab);
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(f => f.name.toLowerCase().includes(q)); }
    return [...r].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return (b.size ?? 0) - (a.size ?? 0);
      return new Date(b.modifiedTime || 0).getTime() - new Date(a.modifiedTime || 0).getTime();
    });
  }, [previews, tab, search, sortBy]);

  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;
    const notScrollableYet = viewportH > 0 ? contentH <= viewportH + 40 : filtered.length < 15;
    if (notScrollableYet) onLoadMore();
  }, [hasMore, loadingMore, loading, viewportH, contentH, filtered.length, onLoadMore]);

  const summary = useMemo(() => {
    const map = new Map<string, { label: string; count: number; icon: string }>();
    for (const f of previews) {
      const k = mimeTypeToCategory(f.mimeType);
      const t = FILE_TYPE_TABS.find(x => x.key === k);
      const e = map.get(k) || { label: t?.label || k, count: 0, icon: t?.icon || '📦' };
      e.count += 1; map.set(k, e);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [previews]);

  if (loading && previews.length === 0) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1a237e" />
      </View>
    );
  }

  return (
    <View style={[s.container, { height: windowHeight }]}>
      {/* Header */}
      <View style={s.hdr} onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.back}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Manager Files</Text>
      </View>

      <ScrollView
        style={{ height: Math.max(windowHeight - headerH, 0) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a237e" />}
        contentContainerStyle={{ paddingBottom: 60 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator
        onLayout={e => setViewportH(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setContentH(h)}
      >
        {/* Summary Bar Reutilizable (Sin "Details") */}
        <StorageSummaryBar
          fileCount={previews.length}
          providersCount={
            activeProvider === PROVIDER_ALL
              ? String(scope.length)
              : PROVIDER_META[activeProvider]?.short || 'P'
          }
          providerLabel={
            activeProvider === PROVIDER_ALL
              ? 'Providers'
              : PROVIDER_META[activeProvider]?.name || 'Provider'
          }
        />

        {/* Provider Selector Reutilizable */}
        <ProviderSelector
          activeProvider={activeProvider}
          providerKeys={providerKeys}
          providerMetaMap={PROVIDER_META}
          connectedProviders={connectedProviders}
          onSelectProvider={setActiveProvider}
        />

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
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
            <Text>{showSearch ? '✕' : '🔍'}</Text>
          </TouchableOpacity>
          {showSearch ? (
            <TextInput
              style={s.si}
              placeholder="Search files…"
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          ) : (
            <View style={s.sortGroup}>
              <Text style={s.sortLbl}>Sort:</Text>
              {(['name', 'date', 'size'] as const).map(k => (
                <TouchableOpacity
                  key={k}
                  style={[s.sb, sortBy === k && s.sbActive]}
                  onPress={() => setSortBy(k)}
                >
                  <Text style={[s.sbt, sortBy === k && s.sbtActive]}>
                    {k[0].toUpperCase() + k.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Section Header */}
        <View style={s.sec}>
          <Text style={s.secTitle}>
            {tab === 'all' ? 'All Files' : FILE_TYPE_TABS.find(t => t.key === tab)?.label || 'Files'}
          </Text>
          <Text style={s.secCount}>{filtered.length} file{filtered.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Files List */}
        {filtered.length === 0 && !loading && !loadingMore && !hasMore && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📂</Text>
            <Text style={s.emptyTitle}>No files</Text>
            <Text style={s.emptyDesc}>{search ? 'Try a different search' : 'Connect a provider'}</Text>
          </View>
        )}
        {filtered.map(f => <FileCard key={fileKey(f)} file={f} onPress={handleFilePress} />)}

        {/* Auto-load indicator */}
        {hasMore && (
          <View style={s.lmBtn}>
            <ActivityIndicator size="small" color="#1a237e" />
            <Text style={s.lmText}>{filtered.length > 0 ? 'Loading more…' : 'Searching…'}</Text>
          </View>
        )}

        {/* End of list */}
        {!hasMore && filtered.length > 0 && (
          <View style={s.endRow}>
            <Text style={s.endText}>· End of list ·</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: '#f8f9fa' },
  hdr: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef',
  },
  back: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  backTxt: { fontSize: 28, color: '#1a237e', fontWeight: '300', lineHeight: 30 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1a237e' },

  typeScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef', paddingHorizontal: 16, paddingVertical: 12 },
  typeCard: { width: 80, alignItems: 'center', paddingVertical: 8, backgroundColor: '#f8f9fa', borderRadius: 8, marginRight: 10 },
  typeIcon: { fontSize: 20, marginBottom: 4 },
  typeLabel: { fontSize: 11, fontWeight: '600', color: '#555' },
  typeCount: { fontSize: 10, color: '#999', marginTop: 2 },

  actions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef', gap: 8 },
  si: { flex: 1, height: 36, backgroundColor: '#f0f4ff', borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: '#333' },
  sortGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  sortLbl: { fontSize: 12, color: '#888', marginRight: 2 },
  sb: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f0f4ff', borderRadius: 6 },
  sbActive: { backgroundColor: '#1a237e' },
  sbt: { fontSize: 12, color: '#1a237e', fontWeight: '600' },
  sbtActive: { color: '#fff' },

  sec: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  secTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  secCount: { fontSize: 13, color: '#999' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#555', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#999' },

  lmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  lmText: { fontSize: 14, color: '#1a237e', fontWeight: '600' },

  endRow: { alignItems: 'center', paddingVertical: 20 },
  endText: { fontSize: 12, color: '#bbb', fontWeight: '500', letterSpacing: 0.5 },
});

export default ManagerFilesScreen;