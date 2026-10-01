// screens/ManagerFilesScreen.tsx
import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FileCard, { categorizeMimeType } from '../components/storage/FileCard';
import FileTypeTabs, { FILE_TYPE_TABS } from '../components/storage/FileTypeTabs';
import StorageSummaryBar from '../components/storage/StorageSummaryBar';
import ProviderSelector from '../components/storage/ProviderSelector';
import TypeSummaryScroll from '../components/storage/TypeSummaryScroll';
import SortBar, { SortOption } from '../components/storage/SortBar';
import { fetchProviderFilesPage } from '../services/storage-registry.service';
import { transferService, ProviderType } from '../services/transfer.service';
import { UnifiedFile, ProviderMeta } from '../types/storage';

// Modales
import { TransferConfirmDialog, DialogStep } from '../components/modals/TransferConfirmDialog';
import { TransferLoadingModal } from '../components/modals/TransferLoadingModal';

// Redux hooks
import { useAppDispatch, useAppSelector } from '../hooks/store';

import { selectConnectedProviders } from '../store/slices/connectedProvidersSlice';
import { removeDriveFile } from '../store/slices/driveFilesSlice';
import { removeOnedriveFile } from '../store/slices/onedriveFilesSlice';

const googleDriveIcon = require('../assets/googledrive.png');
const oneDriveIcon = require('../assets/onedrive.png');

const PROVIDER_ALL = 'all';

const PROVIDER_META: Record<string, ProviderMeta> = {
  'google-drive': {
    id: 'google-drive',
    short: 'GD',
    name: 'Google Drive',
    color: '#34a853',
    icon: googleDriveIcon,
  },
  'onedrive': {
    id: 'onedrive',
    short: 'OD',
    name: 'OneDrive',
    color: '#0078d4',
    icon: oneDriveIcon,
  },
};

const fileKey = (f: UnifiedFile) => `${f.provider}:${f.id}`;

const getCategoryKey = (mimeType?: string, fileName?: string): string => {
  const { label } = categorizeMimeType(mimeType, fileName);
  switch (label) {
    case 'Image': return 'images';
    case 'Video': return 'videos';
    case 'Audio': return 'audio';
    case 'PDF': return 'pdfs';
    case 'Doc': return 'docs';
    case 'Archive': return 'archives';
    case 'Text': return 'text';
    case 'Folder': return 'folders';
    default: return 'other';
  }
};

const ManagerFilesScreen: React.FC = () => {
  const nav = useNavigation();
  const dispatch = useAppDispatch();
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
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [activeProvider, setActiveProvider] = useState<string>(PROVIDER_ALL);

  // Estado para el modal de carga durante la transferencia
  const [transferringFile, setTransferringFile] = useState<UnifiedFile | null>(null);

  // Estados para el Modal de Transferencia / Confirmación
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogStep, setDialogStep] = useState<DialogStep>('SELECT_PROVIDER');
  const [dialogFile, setDialogFile] = useState<UnifiedFile | null>(null);
  const [targetProviderId, setTargetProviderId] = useState<ProviderType | null>(null);
  const [targetName, setTargetName] = useState('');

  const connectedProviders = useAppSelector(selectConnectedProviders);
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
      if (Platform.OS === 'web') {
        window.open(file.webViewLink, '_blank', 'noopener,noreferrer');
      } else {
        Linking.openURL(file.webViewLink).catch(() => {});
      }
    }
  }, [nav]);

  // Paso 1: Valida cuentas conectadas y abre el selector de destino
  const handleTransferFile = (file: UnifiedFile) => {
    const connectedCount = Object.keys(connectedProviders || {}).length;

    if (connectedCount < 2) {
      setDialogStep('NEED_MORE_PROVIDERS');
      setDialogVisible(true);
      return;
    }

    setDialogFile(file);
    setTargetProviderId(null);
    setTargetName('');
    setDialogStep('SELECT_PROVIDER');
    setDialogVisible(true);
  };

  // Paso 2: Al seleccionar el proveedor destino
  const handleSelectDestination = async (destination: ProviderType) => {
    if (!dialogFile) return;

    const targetMeta = connectedProviders[destination];
    const nameLabel = targetMeta?.name || PROVIDER_META[destination]?.name || destination;
    
    setTargetProviderId(destination);
    setTargetName(nameLabel);

    try {
      const hasConflict = await transferService.checkDestinationConflict(dialogFile.name, destination);

      if (hasConflict) {
        setDialogStep('CONFLICT_RESOLUTION');
      } else {
        await executeTransfer(dialogFile, destination, 'replace');
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo verificar la existencia del archivo en el destino.');
    }
  };

  // Paso 3: Resuelve la estrategia elegida (Reemplazar / Renombrar / Cancelar)
  const handleResolveConflict = async (strategy: 'replace' | 'rename' | 'cancel') => {
    if (strategy === 'cancel' || !dialogFile || !targetProviderId) {
      setDialogVisible(false);
      setDialogFile(null);
      setTargetProviderId(null);
      return;
    }

    if (strategy === 'rename') {
      // Manejo seguro para Web
      if (Platform.OS === 'web') {
        const newName = window.prompt(
          `Ingresa el nuevo nombre para guardar en ${targetName}:`,
          dialogFile.name
        );
        if (newName && newName.trim()) {
          const renamedFile = { ...dialogFile, name: newName.trim() };
          await executeTransfer(renamedFile, targetProviderId, 'rename');
        } else {
          setDialogVisible(false);
          setDialogFile(null);
          setTargetProviderId(null);
        }
        return;
      }

      // Manejo para iOS
      if (Platform.OS === 'ios') {
        Alert.prompt(
          'Renombrar archivo',
          `Ingresa el nuevo nombre para guardar en ${targetName}:`,
          [
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => {
                setDialogVisible(false);
                setDialogFile(null);
                setTargetProviderId(null);
              },
            },
            {
              text: 'Transferir con nuevo nombre',
              onPress: async (newName) => {
                if (!newName || !newName.trim()) return;
                const renamedFile = { ...dialogFile, name: newName.trim() };
                await executeTransfer(renamedFile, targetProviderId, 'rename');
              },
            },
          ],
          'plain-text',
          dialogFile.name
        );
      } else {
        // Fallback para Android
        const newName = window.prompt(
          `Ingresa el nuevo nombre para guardar en ${targetName}:`,
          dialogFile.name
        );
        if (newName && newName.trim()) {
          const renamedFile = { ...dialogFile, name: newName.trim() };
          await executeTransfer(renamedFile, targetProviderId, 'rename');
        } else {
          setDialogVisible(false);
          setDialogFile(null);
          setTargetProviderId(null);
        }
      }
      return;
    }

    await executeTransfer(dialogFile, targetProviderId, strategy);
  };

  // Paso 4: Realiza la transferencia efectiva con el servicio
  const executeTransfer = async (
    file: UnifiedFile,
    toProvider: ProviderType,
    conflictStrategy: 'replace' | 'rename' | 'cancel'
  ) => {
    try {
      setDialogVisible(false);
      setTransferringFile(file);

      const isTransferred = await transferService.transferToDestination({
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType || '',
        fromProvider: file.provider as ProviderType,
        toProvider,
        conflictStrategy,
      });

      setTransferringFile(null);

      if (isTransferred) {
        setDialogStep('DELETE_SOURCE');
        setDialogVisible(true);
      } else {
        Alert.alert('Error', 'No se pudo completar la transferencia.');
      }
    } catch (err: any) {
      setTransferringFile(null);
      Alert.alert('Error', err.message || 'Error al procesar la transferencia.');
    }
  };

  const handleKeepOriginal = () => {
    setDialogVisible(false);
    setDialogFile(null);
    setTargetProviderId(null);
  };

  const handleDestroyOriginal = async () => {
    const file = dialogFile;
    setDialogVisible(false);
    setDialogFile(null);
    setTargetProviderId(null);

    if (!file) return;

    try {
      setLoading(true);
      const deleted = await transferService.deleteFromSource(file.id, file.provider as any);
      if (deleted) {
        setPreviews(prev => prev.filter(f => f.id !== file.id));

        if (file.provider === 'google-drive') {
          dispatch(removeDriveFile(file.id));
        } else {
          dispatch(removeOnedriveFile(file.id));
        }
      } else {
        Alert.alert('Aviso', 'El archivo se transfirió, pero no se pudo eliminar el original.');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Ocurrió un problema al intentar eliminar el archivo original.');
    } finally {
      setLoading(false);
    }
  };

  const onScroll = useCallback((e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    if (distanceFromBottom < 300) onLoadMore();
  }, [onLoadMore]);

  const filtered = useMemo(() => {
    let r = previews;
    if (tab !== 'all') r = r.filter(f => getCategoryKey(f.mimeType, f.name) === tab);
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
      const k = getCategoryKey(f.mimeType, f.name);
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
        {/* Barra de Resumen */}
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

        {/* Selector de Proveedores con Logos */}
        <ProviderSelector
          activeProvider={activeProvider}
          providerKeys={providerKeys}
          providerMetaMap={PROVIDER_META}
          connectedProviders={connectedProviders}
          onSelectProvider={setActiveProvider}
        />

        {/* Carrusel de Conteo por Tipo */}
        <TypeSummaryScroll
          summaryItems={summary}
          onSelectType={label => {
            const t = FILE_TYPE_TABS.find(x => x.label === label || x.key === label.toLowerCase());
            setTab(t?.key || 'other');
          }}
        />

        {/* Tabs de Filtro de Archivo */}
        <FileTypeTabs activeTab={tab} onTabChange={setTab} />

        {/* Barra de Búsqueda y Filtros de Ordenamiento */}
        <SortBar
          sortBy={sortBy}
          onSelectSort={setSortBy}
          searchQuery={search}
          onSearchChange={setSearch}
          showSearch={showSearch}
          onToggleSearch={() => setShowSearch(!showSearch)}
        />

        {/* Header de Sección */}
        <View style={s.sec}>
          <Text style={s.secTitle}>
            {tab === 'all' ? 'All Files' : FILE_TYPE_TABS.find(t => t.key === tab)?.label || 'Files'}
          </Text>
          <Text style={s.secCount}>{filtered.length} file{filtered.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Lista de Archivos / Estado Vacío */}
        {filtered.length === 0 && !loading && !loadingMore && !hasMore && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📂</Text>
            <Text style={s.emptyTitle}>No files</Text>
            <Text style={s.emptyDesc}>
              {search 
                ? 'Try a different search' 
                : !connectedProviders[activeProvider] && activeProvider !== PROVIDER_ALL
                ? 'Authentication failed or account disconnected'
                : 'Connect a provider'}
            </Text>

            <TouchableOpacity 
              style={s.connectBtn} 
              onPress={() => (nav as any).navigate('AddProvider')}
            >
              <Text style={s.connectBtnText}>Connect Provider</Text>
            </TouchableOpacity>
          </View>
        )}
        {filtered.map(f => (
          <FileCard 
            key={fileKey(f)} 
            file={f} 
            onPress={handleFilePress}
            onTransfer={handleTransferFile}
          />
        ))}

        {/* Indicador de Carga */}
        {hasMore && (
          <View style={s.lmBtn}>
            <ActivityIndicator size="small" color="#1a237e" />
            <Text style={s.lmText}>{filtered.length > 0 ? 'Loading more…' : 'Searching…'}</Text>
          </View>
        )}

        {/* Fin de Lista */}
        {!hasMore && filtered.length > 0 && (
          <View style={s.endRow}>
            <Text style={s.endText}>· End of list ·</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal Carga de Transferencia */}
      <TransferLoadingModal
        visible={!!transferringFile}
        fileName={transferringFile?.name}
      />

      {/* Modal Dialog Unificado */}
      <TransferConfirmDialog
        visible={dialogVisible}
        step={dialogStep}
        title="Transferencia realizada con éxito"
        fileName={dialogFile?.name}
        sourceProvider={dialogFile?.provider}
        connectedProviders={connectedProviders}
        targetProvider={targetName}
        message={`El archivo fue enviado exitosamente a ${targetName}. ¿Qué deseas hacer con el archivo original fuente?`}
        onSelectDestination={handleSelectDestination}
        onResolveConflict={handleResolveConflict}
        onKeep={handleKeepOriginal}
        onDestroy={handleDestroyOriginal}
        onKeepSource={handleKeepOriginal}
        onDestroySource={handleDestroyOriginal}
        onGoToProviders={() => (nav as any).navigate('AddProvider')}
        onClose={() => {
          setDialogVisible(false);
          setDialogFile(null);
          setTargetProviderId(null);
        }}
      />
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

  sec: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  secTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  secCount: { fontSize: 13, color: '#999' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#555', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#999', textAlign: 'center', paddingHorizontal: 24 },

  connectBtn: {
    marginTop: 16,
    backgroundColor: '#0078d4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  connectBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  lmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  lmText: { fontSize: 14, color: '#1a237e', fontWeight: '600' },

  endRow: { alignItems: 'center', paddingVertical: 20 },
  endText: { fontSize: 12, color: '#bbb', fontWeight: '500', letterSpacing: 0.5 },
});

export default ManagerFilesScreen;