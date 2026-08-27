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
import { saveSecureData, clearSecureData, getSecureData } from '../utils/secureStorage';
import { getValidGoogleToken } from '../services/google-token';
import OneDriveAuthService from '../services/auth/onedrive-auth.service';
import GoogleAuthService from '../services/auth/google-auth.service';
import { ProviderActionButton } from '../components/common/ProviderActionButton';

const AddProviderScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const connectedProviders = useSelector(selectConnectedProviders);
  const currentUser = useSelector(selectCurrentUser);

  const [isOneDriveConnecting, setIsOneDriveConnecting] = useState(false);
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);

  // Sincronizar el estado real de Google Drive leyendo el token válido/refrescado
  useEffect(() => {
    const verifyGoogleDriveAccess = async () => {
      const googleToken = await getValidGoogleToken();

      if (googleToken && currentUser?.email) {
        dispatch(
          addProvider({
            id: 'google-drive',
            name: 'Google Drive',
            token: googleToken,
            userPrincipalName: currentUser.email,
            connectedAt: new Date().toISOString(),
          })
        );
      } else {
        dispatch(removeProvider('google-drive'));
      }
    };

    verifyGoogleDriveAccess();
  }, [currentUser?.email, dispatch]);

  // Sincronizar el estado de OneDrive leyendo datos persistidos en SecureStore
  useEffect(() => {
    const verifyOneDriveAccess = async () => {
      try {
        const token = await getSecureData('onedrive_token');
        const email = await getSecureData('onedrive_provider_email');
        const connectedAt = await getSecureData('onedrive_connected_at');

        if (token) {
          dispatch(
            addProvider({
              id: 'onedrive',
              name: 'Microsoft OneDrive',
              token,
              userPrincipalName: email || '',
              connectedAt: connectedAt || new Date().toISOString(),
            })
          );
        }
      } catch (error) {
        console.error('Error al verificar sesión de OneDrive:', error);
      }
    };

    verifyOneDriveAccess();
  }, [dispatch]);

  // --- GOOGLE DRIVE LOGIC ---
  const connectGoogleDrive = async () => {
    setIsGoogleConnecting(true);
    try {
      const authService = new GoogleAuthService();
      await authService.initialize();
      const result = await authService.signIn();

      if (result?.token) {
        dispatch(
          addProvider({
            id: 'google-drive',
            name: 'Google Drive',
            token: result.token,
            userPrincipalName: result.user?.email || currentUser?.email,
            connectedAt: new Date().toISOString(),
          })
        );
      }
    } catch (err) {
      console.error('Error al autorizar Google Drive:', err);
    } finally {
      setIsGoogleConnecting(false);
    }
  };

  const disconnectGoogleDrive = async () => {
    try {
      const authService = new GoogleAuthService();
      await authService.signOut();
      dispatch(removeProvider('google-drive'));
    } catch (error) {
      console.error('Error al desconectar Google Drive:', error);
      dispatch(removeProvider('google-drive'));
    }
  };

  // --- ONEDRIVE LOGIC ---
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

      await saveSecureData('onedrive_token', result.token);
      await saveSecureData('onedrive_provider_name', 'Microsoft OneDrive');
      await saveSecureData('onedrive_provider_email', result.user.email);
      await saveSecureData('onedrive_connected_at', new Date().toISOString());
    } catch (err: any) {
      console.error('Error al conectar OneDrive:', err);
    } finally {
      setIsOneDriveConnecting(false);
    }
  };

  const disconnectOneDrive = async () => {
    try {
      await clearSecureData('onedrive_token');
      await clearSecureData('onedrive_id_token');
      await clearSecureData('onedrive_refresh_token');
      await clearSecureData('onedrive_provider_name');
      await clearSecureData('onedrive_provider_email');
      await clearSecureData('onedrive_connected_at');

      dispatch(removeProvider('onedrive'));
    } catch (error) {
      console.error('Error al desconectar OneDrive:', error);
      dispatch(removeProvider('onedrive'));
    }
  };

  const getProviderStatus = (storeKey: string, isConnecting: boolean) => {
    if (isConnecting) return 'connecting';
    return connectedProviders[storeKey] ? 'connected' : 'disconnected';
  };

  const providers = [
    {
      id: 'google',
      storeKey: 'google-drive',
      name: 'Google Drive',
      description: 'Access your Google Drive files and storage',
      icon: '🔵',
      color: '#4285F4',
      isConnecting: isGoogleConnecting,
      onConnect: connectGoogleDrive,
      onDisconnect: disconnectGoogleDrive,
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

            <ProviderActionButton
              isConnected={isConnected}
              isConnecting={isConnecting}
              color={provider.color}
              onConnect={provider.onConnect}
              onDisconnect={provider.onDisconnect}
            />
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