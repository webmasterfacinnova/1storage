// screens/AddProviderScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  addProvider,
  removeProvider,
  selectConnectedProviders,
} from '../store/slices/connectedProvidersSlice';
import { selectCurrentUser } from '../store/slices/authSlice';
import { saveSecureData, clearSecureData } from '../utils/secureStorage';
import OneDriveAuthService from '../services/auth/onedrive-auth.service';

const AddProviderScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const connectedProviders = useSelector(selectConnectedProviders);
  const currentUser = useSelector(selectCurrentUser);

  // Único estado local: indicador de carga para OneDrive
  const [isOneDriveConnecting, setIsOneDriveConnecting] = useState(false);

  // Auto-vincular Google Drive al entrar
  useEffect(() => {
    if (currentUser?.email && !connectedProviders['google-drive']) {
      dispatch(
        addProvider({
          id: 'google-drive',
          name: 'Google Drive',
          token: '',
          userPrincipalName: currentUser.email,
          connectedAt: new Date().toISOString(),
        })
      );
    }
  }, [currentUser?.email, connectedProviders['google-drive'], dispatch]);

  const connectOneDrive = async () => {
    setIsOneDriveConnecting(true);
    try {
      const authService = new OneDriveAuthService();
      await authService.initialize();
      const result = await authService.signIn();

      dispatch(
        addProvider({
          id: 'onedrive',
          name: 'Microsoft OneDrive',
          token: result.token,
          userPrincipalName: result.user.email,
          connectedAt: new Date().toISOString(),
        })
      );

      await saveSecureData('onedrive_provider_name', 'Microsoft OneDrive');
      await saveSecureData('onedrive_provider_email', result.user.email);
      await saveSecureData('onedrive_connected_at', new Date().toISOString());
    } catch (err: any) {
      console.error('Connection failed:', err);
    } finally {
      setIsOneDriveConnecting(false);
    }
  };

  const disconnectOneDrive = async () => {
    console.log('[AddProviderScreen] Disconnecting OneDrive...');
    try {
      // Limpiar todos los datos de OneDrive del almacenamiento seguro
      await clearSecureData('onedrive_token');
      await clearSecureData('onedrive_id_token');
      await clearSecureData('onedrive_refresh_token');
      await clearSecureData('onedrive_provider_name');
      await clearSecureData('onedrive_provider_email');
      await clearSecureData('onedrive_connected_at');

      // Remover de Redux
      dispatch(removeProvider('onedrive'));

      console.log('[AddProviderScreen] OneDrive disconnected successfully');
    } catch (error) {
      console.error('Error during disconnect:', error);
      // Aunque falle, forzar remoción del provider
      dispatch(removeProvider('onedrive'));
      console.log('[AddProviderScreen] OneDrive removed from Redux despite error');
    }
  };

  // Función que determina el estado visual según Redux + carga
  const getProviderStatus = (storeKey: string, isConnecting: boolean) => {
    if (isConnecting) return 'connecting';
    return connectedProviders[storeKey] ? 'connected' : 'disconnected';
  };

  // Definición de proveedores
  const providers = [
    {
      id: 'google',
      storeKey: 'google-drive',
      name: 'Google Drive',
      description: 'Access your Google Drive files and storage',
      icon: '🔵',
      color: '#4285F4',
      isConnecting: false,
      onConnect: async () => {},
    },
    {
      id: 'onedrive',
      storeKey: 'onedrive',
      name: 'Microsoft OneDrive',
      description: 'Access your OneDrive files and storage',
      icon: '☁️',
      color: '#0078D4',
      isConnecting: isOneDriveConnecting,
      onConnect: connectOneDrive,
      onDisconnect: disconnectOneDrive,
    },
  ];

  const getStatusBadge = (status: 'connected' | 'disconnected' | 'connecting') => {
    switch (status) {
      case 'connected':
        return <Text style={styles.statusConnected}>Connected</Text>;
      case 'connecting':
        return <ActivityIndicator size="small" color="#0078D4" />;
      default:
        return <Text style={styles.statusAvailable}>Available</Text>;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Connect Providers</Text>
        <Text style={styles.subtitle}>
          Link additional storage providers to manage all your files in one place.
        </Text>
      </View>

      {providers.map(provider => {
        const status = getProviderStatus(provider.storeKey, provider.isConnecting);
        const isConnected = status === 'connected';
        const isConnecting = status === 'connecting';

        return (
          <View key={provider.id} style={styles.providerCard}>
            <View style={styles.providerInfo}>
              <View style={[styles.iconContainer, { backgroundColor: provider.color + '20' }]}>
                <Text style={styles.providerIcon}>{provider.icon}</Text>
              </View>
              <View style={styles.providerText}>
                <Text style={styles.providerName}>{provider.name}</Text>
                <Text style={styles.providerDescription}>{provider.description}</Text>
                {isConnected && connectedProviders[provider.storeKey]?.userPrincipalName && (
                  <Text style={styles.providerAccount}>
                    {connectedProviders[provider.storeKey]?.userPrincipalName}
                  </Text>
                )}
                {getStatusBadge(status)}
              </View>
            </View>

            {isConnected ? (
              provider.id === 'google' ? (
                <View style={styles.connectedBadge}>
                  <Text style={styles.connectedBadgeText}>✓ Connected</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={provider.onDisconnect}
                >
                  <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity
                style={[
                  styles.connectButton,
                  { backgroundColor: provider.color },
                  isConnecting && styles.connectingButton,
                ]}
                onPress={provider.onConnect}
                disabled={isConnecting}
              >
                <Text style={styles.connectButtonText}>
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Your data is stored securely. We only access files you explicitly grant permission to.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: '#0078D4',
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
  },
  providerCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  providerIcon: {
    fontSize: 24,
  },
  providerText: {
    flex: 1,
  },
  providerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  providerDescription: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
  },
  providerAccount: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '500',
    marginTop: 4,
  },
  statusConnected: {
    fontSize: 12,
    color: '#34A853',
    fontWeight: '500',
    marginTop: 4,
  },
  statusAvailable: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  connectButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  connectingButton: {
    opacity: 0.7,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  connectedBadge: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  connectedBadgeText: {
    color: '#34A853',
    fontSize: 13,
    fontWeight: '600',
  },
  disconnectButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E53935',
  },
  disconnectButtonText: {
    color: '#E53935',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    marginTop: 16,
  },
  footerText: {
    fontSize: 13,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AddProviderScreen;