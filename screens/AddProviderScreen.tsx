// screens/AddProviderScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStorageProviders } from '../hooks/useStorageProviders';
import { ProviderActionButton } from '../components/common/ProviderActionButton';

const AddProviderScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { providers } = useStorageProviders();

  const getStatusBadge = (isConnecting: boolean, isConnected: boolean) => {
    if (isConnecting) {
      return <ActivityIndicator size="small" color="#0078D4" />;
    }
    if (isConnected) {
      return <Text style={styles.statusConnected}>Connected</Text>;
    }
    return <Text style={styles.statusAvailable}>Available</Text>;
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
              {provider.isConnected && provider.accountEmail && (
                <Text style={styles.providerAccount}>{provider.accountEmail}</Text>
              )}
              {getStatusBadge(provider.isConnecting, provider.isConnected)}
            </View>
          </View>

          <ProviderActionButton
            isConnected={provider.isConnected}
            isConnecting={provider.isConnecting}
            color={provider.color}
            onConnect={provider.onConnect}
            onDisconnect={provider.onDisconnect}
          />
        </View>
      ))}

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