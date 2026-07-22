// screens/AddProviderScreen.tsx
// Screen to connect additional storage providers (OneDrive, etc.)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { addProvider } from '../store/slices/connectedProvidersSlice';
import { selectConnectedProviders } from '../store/slices/connectedProvidersSlice';
import { saveSecureData } from '../utils/secureStorage';
import OneDriveAuthService from '../services/auth/onedrive-auth.service';

type ProviderStatus = 'disconnected' | 'connecting' | 'connected';

interface ProviderItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: ProviderStatus;
  onConnect: () => Promise<void>;
}

const AddProviderScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const connectedProviders = useSelector(selectConnectedProviders);

  const [providerStatuses, setProviderStatuses] = useState<Record<string, ProviderStatus>>({
    google: connectedProviders['google-drive'] ? 'connected' : 'disconnected',
    onedrive: connectedProviders['onedrive'] ? 'connected' : 'disconnected',
  });

  // Sync with Redux store on mount
  useEffect(() => {
    setProviderStatuses({
      google: connectedProviders['google-drive'] ? 'connected' : 'disconnected',
      onedrive: connectedProviders['onedrive'] ? 'connected' : 'disconnected',
    });
  }, [connectedProviders]);

  const connectOneDrive = async () => {
    try {
      setProviderStatuses(prev => ({ ...prev, onedrive: 'connecting' }));
      const authService = new OneDriveAuthService();
      await authService.initialize();
      const result = await authService.signIn();

      // Save to connected providers store
      dispatch(addProvider({
        id: 'onedrive',
        name: 'Microsoft OneDrive',
        token: result.token,
        userPrincipalName: result.user.email,
        connectedAt: new Date().toISOString(),
      }));

      // Persist provider metadata so it survives page refresh
      await saveSecureData('onedrive_provider_name', 'Microsoft OneDrive');
      await saveSecureData('onedrive_provider_email', result.user.email);
      await saveSecureData('onedrive_connected_at', new Date().toISOString());

      setProviderStatuses(prev => ({ ...prev, onedrive: 'connected' }));
      Alert.alert('Connected!', 'Your Microsoft OneDrive has been connected successfully.');
    } catch (err: any) {
      let message = 'Could not connect to OneDrive';
      if (err.message) {
        if (err.message.toLowerCase().includes('cancelled')) {
          message = 'Connection cancelled';
        } else {
          message = err.message;
        }
      }
      setProviderStatuses(prev => ({ ...prev, onedrive: 'disconnected' }));
      Alert.alert('Connection failed', message);
    }
  };

  const providers: ProviderItem[] = [
    {
      id: 'google',
      name: 'Google Drive',
      description: 'Access your Google Drive files and storage',
      icon: '🔵',
      color: '#4285F4',
      status: providerStatuses.google,
      onConnect: async () => {
        Alert.alert('Already Connected', 'Google Drive is your primary provider.');
      },
    },
    {
      id: 'onedrive',
      name: 'Microsoft OneDrive',
      description: 'Access your OneDrive files and storage',
      icon: '☁️',
      color: '#0078D4',
      status: providerStatuses.onedrive,
      onConnect: connectOneDrive,
    },
  ];

  const getStatusBadge = (status: ProviderStatus) => {
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

      {providers.map(provider => (
        <View key={provider.id} style={styles.providerCard}>
          <View style={styles.providerInfo}>
            <View style={[styles.iconContainer, { backgroundColor: provider.color + '20' }]}>
              <Text style={styles.providerIcon}>{provider.icon}</Text>
            </View>
            <View style={styles.providerText}>
              <Text style={styles.providerName}>{provider.name}</Text>
              <Text style={styles.providerDescription}>{provider.description}</Text>
              {getStatusBadge(provider.status)}
            </View>
          </View>

          {provider.status === 'connected' ? (
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedBadgeText}>✓ Connected</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.connectButton,
                { backgroundColor: provider.color },
                provider.status === 'connecting' && styles.connectingButton,
              ]}
              onPress={provider.onConnect}
              disabled={provider.status === 'connecting'}
            >
              <Text style={styles.connectButtonText}>
                {provider.status === 'connecting' ? 'Connecting...' : 'Connect'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {providerStatuses.onedrive === 'connected' && (
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('FileList', {
            folderId: 'root',
            folderName: 'OneDrive',
            provider: 'onedrive',
          })}
        >
          <Text style={styles.browseButtonText}>Browse OneDrive Files →</Text>
        </TouchableOpacity>
      )}

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
  browseButton: {
    backgroundColor: '#0078D4',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 16,
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
