// screens/ManagerFilesScreen.tsx
// Manager Files — ScrollView layout with explicit height + measured auto-fill/infinite scroll.

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
import FileCard, { UnifiedFile, mimeTypeToCategory } from '../components/storage/FileCard';
import FileTypeTabs, { FILE_TYPE_TABS } from '../components/storage/FileTypeTabs';
import { useSelector } from 'react-redux';
import { selectConnectedProviders } from '../store/slices/connectedProvidersSlice';
import { oneDriveFilesService, OneDriveFilePreview } from '../services/onedrive-files.service';
import { driveFilesService, DriveFilePreview } from '../services/drive-files.service';

const PROVIDER_ALL = 'all';

const PROVIDER_META: Record<string, { short: string; name: string; color: string }> = {
  'google-drive': { short: 'GD', name: 'Google Drive', color: '#34a853' },
  'onedrive': { short: 'OD', name: 'OneDrive', color: '#0078d4' },
};

function gdToUnified(p: DriveFilePreview): UnifiedFile {
  return {
    id: p.id, name: p.name, mimeType: p.mimeType,
    size: p.details?.size ?? null,
    modifiedTime: p.details?.modifiedTime ?? '',
    provider: 'google-drive', providerName: 'Google Drive',
    iconLink: p.iconLink, thumbnailLink: p.details?.thumbnailLink,
    webViewLink: p.details?.webViewLink,
  };
}

function odToUnified(p: OneDriveFilePreview): UnifiedFile {
  return {
    id: p.id, name: p.name, mimeType: p.mimeType,
    size: p.size ?? null,
    modifiedTime: p.modifiedTime ?? '',
    provider: 'onedrive', providerName: 'OneDrive',
    webViewLink: p.webViewLink,
  };
}

const fileKey = (f: UnifiedFile) => `${f.provider}:${f.id}`;

const ManagerFilesScreen: React.FC = () => {
  const nav = useNavigation();
  const { height: windowHeight } = useWindowDimensions();
  const [headerH, setHeaderH] = useState(56);      // measured header height
  const [viewportH, setViewportH] = useState(0);   // measured ScrollView height
  const [contentH, setContentH] = useState(0);     // measured ScrollView content height
  const [previews, setPreviews] = useState<UnifiedFile[]>([]);
  const [tokens, setTokens] = useState<Record<string, string | null>>({}); // next-page token per provider (null = exhausted)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [activeProvider, setActiveProvider] = useState<string>(PROVIDER_ALL);
  const connectedProviders = useSelector(selectConnectedProviders);
  const providerKeys = useMemo(() => Object.keys(connectedProviders || {}), [connectedProviders]);

  // Collapse to single provider or restore "all" if extra providers load after re-opening app.
  useEffect(() => {
    if (providerKeys.length === 1 && activeProvider === PROVIDER_ALL) {
      setActiveProvider(providerKeys[0]);
    } else if (providerKeys.length > 1 && !providerKeys.includes(activeProvider)) {
      setActiveProvider(PROVIDER_ALL);
    }
  }, [providerKeys, activeProvider]);

  // Which providers are currently in view: all of them, or just the selected one.
  const scope = useMemo(
    () => (activeProvider === PROVIDER_ALL ? providerKeys : [activeProvider]),
    [activeProvider, providerKeys],
  );

  // Fetch one page from a single provider, mapped to UnifiedFile (tagged with its provider).
  const fetchProviderPage = useCallback(async (pid: string, pageToken?: string) => {
    try {
      if (pid === 'onedrive') {
        const r = await oneDriveFilesService.getPreviews(20, pageToken);
        if (!r) return null;
        return { files: r.files.map(odToUnified), next: r.nextPageToken };
      }
      const r = await driveFilesService.getPreviews(20, pageToken);
      if (!r) return null;
      return { files: r.files.map(gdToUnified), next: r.nextPageToken };
    } catch (err) {
      console.error(`Error fetching page for ${pid}:`, err);
      return null;
    }
  }, []);

  // Load the first page of every provider in scope and merge the results.
  const loadInitial = useCallback(async (isRefresh = false) => {
    if (scope.length === 0) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(scope.map(pid => fetchProviderPage(pid)));
      const merged: UnifiedFile[] = [];
      const seen = new Set<string>();
      const nt: Record<string, string | null> = {};
      scope.forEach((pid, i) => {
        const r = results[i];
        if (r) {
          r.files.forEach(f => { if (!seen.has(fileKey(f))) { seen.add(fileKey(f)); merged.push(f); } });
          nt[pid] = r.next;
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
  }, [scope, fetchProviderPage]);

  // Reload whenever the selected provider(s) or providerKeys change.
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
    const results = await Promise.all(toLoad.map(pid => fetchProviderPage(pid, tokens[pid] as string)));
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
      toLoad.forEach((pid, i) => { nt[pid] = results[i] ? results[i]!.next : null; });
      return nt;
    });
    setLoadingMore(false);
  }, [scope, tokens, loading, loadingMore, fetchProviderPage]);

  const onRefresh = useCallback(() => { loadInitial(true); }, [loadInitial]);

  const handleFilePress = useCallback((file: UnifiedFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      (nav as any).navigate('FileList', {
        folderId: file.id,
        folderName: file.name,
        provider: file.provider,
      });
    } else if (file.webViewLink) {
      Linking.openURL(file.webViewLink).catch(() => {
        // Ignore errors (e.g., no handler installed).
      });
    }
  }, [nav]);

  // Infinite scroll — auto-load the next page when the user nears the bottom.
  const onScroll = useCallback((e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    if (distanceFromBottom < 300) onLoadMore();
  }, [onLoadMore]);

  // fixed counts (non-reactive helpers for summary)
  const pLen = previews.length;

  const unified = previews;

  const filtered = useMemo(() => {
    let r = unified;
    if (tab !== 'all') r = r.filter(f => mimeTypeToCategory(f.mimeType) === tab);
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(f => f.name.toLowerCase().includes(q)); }
    return [...r].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return (b.size ?? 0) - (a.size ?? 0);
      return new Date(b.modifiedTime || 0).getTime() - new Date(a.modifiedTime || 0).getTime();
    });
  }, [unified, tab, search, sortBy]);

  // Auto-fill: filtering is client-side but paging is server-side.
  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;
    const notScrollableYet = viewportH > 0 ? contentH <= viewportH + 40 : filtered.length < 15;
    if (notScrollableYet) onLoadMore();
  }, [hasMore, loadingMore, loading, viewportH, contentH, filtered.length, onLoadMore]);

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

  return (
    <View style={[s.container, { height: windowHeight }]}>
      {/* Header */}
      <View style={s.hdr} onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.back}><Text style={s.backTxt}>‹</Text></TouchableOpacity>
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
        {/* Summary */}
        <View style={s.bar}>
          <View style={s.cell}><Text style={s.val}>{pLen}</Text><Text style={s.lbl}>Files</Text></View>
          <View style={s.cell}>
            <Text style={s.val}>{activeProvider === PROVIDER_ALL ? String(scope.length) : (PROVIDER_META[activeProvider]?.short || 'P')}</Text>
            <Text style={s.lbl}>{activeProvider === PROVIDER_ALL ? 'Providers' : (PROVIDER_META[activeProvider]?.name || 'Provider')}</Text>
          </View>
        </View>

      {/* Provider selector */}
      <View style={s.providerRow}>
        {[PROVIDER_ALL, ...providerKeys].map(pid => {
          const isActive = pid === activeProvider;
          const meta = pid === PROVIDER_ALL
            ? { name: 'All', color: '#1a237e' }
            : (PROVIDER_META[pid] || { name: connectedProviders?.[pid]?.name || pid, color: '#1a237e' });
          const isSingleProvider = providerKeys.length <= 1;
          return (
            <TouchableOpacity
              key={pid}
              style={[
                s.providerBtn,
                isActive && { backgroundColor: meta.color, borderColor: meta.color },
                isSingleProvider && !isActive && s.providerBtnHidden,
              ]}
              onPress={() => !isSingleProvider && setActiveProvider(pid)}
              activeOpacity={isSingleProvider ? 1 : 0.7}
            >
              <Text style={[s.providerBtnTxt, isActive && { color: '#fff' }, isSingleProvider && !isActive && { color: '#bbb' }]}>{meta.name}</Text>
            </TouchableOpacity>
          );
        })}
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
        {showSearch ? (
          <TextInput style={s.si} placeholder="Search files…" placeholderTextColor="#999" value={search}
            onChangeText={setSearch} autoFocus />
        ) : (
          <View style={s.sortGroup}>
            <Text style={s.sortLbl}>Sort:</Text>
            {(['name', 'date', 'size'] as const).map(k => (
              <TouchableOpacity key={k} style={[s.sb, sortBy === k && s.sbActive]} onPress={() => setSortBy(k)}>
                <Text style={[s.sbt, sortBy === k && s.sbtActive]}>{k[0].toUpperCase() + k.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

        {/* Section */}
        <View style={s.sec}>
          <Text style={s.secTitle}>
            {tab === 'all' ? 'All Files' : FILE_TYPE_TABS.find(t => t.key === tab)?.label || 'Files'}
          </Text>
          <Text style={s.secCount}>{filtered.length} file{filtered.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Files */}
        {filtered.length === 0 && !loading && !loadingMore && !hasMore && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📂</Text>
            <Text style={s.emptyTitle}>No files</Text>
            <Text style={s.emptyDesc}>{search ? 'Try a different search' : 'Connect a provider'}</Text>
          </View>
        )}
        {filtered.map(f => <FileCard key={fileKey(f)} file={f} onPress={handleFilePress} />)}

        {/* Auto-load indicator (infinite scroll / auto-fill) */}
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
  providerRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef', gap: 8,
  },
  providerBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd',
  },
  providerBtnHidden: {
    backgroundColor: 'transparent', borderColor: 'transparent',
  },
  providerBtnTxt: { fontSize: 13, fontWeight: '600', color: '#555' },
  endRow: { alignItems: 'center', paddingVertical: 20 },
  endText: { fontSize: 12, color: '#bbb', fontWeight: '500', letterSpacing: 0.5 },
});

export default ManagerFilesScreen;