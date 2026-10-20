import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStorageProviders } from '../../hooks/useStorageProviders';
import { ProviderActionButton } from '../../components/common/ProviderActionButton';
import { ScreenContainer } from '../../components/common/ScreenContainer';

const AddProviderScreen: React.FC = () => {
  const router = useRouter();
  const { providers } = useStorageProviders();

  const getStatusBadge = (isConnecting: boolean, isConnected: boolean) => {
    if (isConnecting) {
      return <ActivityIndicator size="small" color="#0078D4" />;
    }
    if (isConnected) {
      return <Text style={styles.statusConnected}>Conectado</Text>;
    }
    return <Text style={styles.statusAvailable}>Disponible</Text>;
  };

  // Función auxiliar para determinar el icono local según el proveedor
  const getProviderIconSource = (providerId: string) => {
    if (providerId.includes('google')) {
      return require('../../assets/googledrive.png');
    }
    // Por defecto asume OneDrive o el icono alternativo
    return require('../../assets/onedrive.png');
  };

  return (
    <ScreenContainer>
      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Conectar proveedores</Text>
        <Text style={styles.subtitle}>
          Vincular proveedores de almacenamiento adicionales para gestionar todos tus archivos en un solo lugar.
        </Text>
      </View>

      {/* Lista de proveedores */}
      <View style={styles.providersContainer}>
        {providers.map(provider => (
          <View key={provider.id} style={styles.providerCard}>
            <View style={styles.providerInfo}>
              <View style={styles.iconContainer}>
                <Image
                  source={getProviderIconSource(provider.id)}
                  style={styles.providerIconImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.providerText}>
                <Text style={styles.providerName}>{provider.name}</Text>
                <Text style={styles.providerDescription} numberOfLines={2}>
                  {provider.description}
                </Text>
                {provider.isConnected && provider.accountEmail && (
                  <Text style={styles.providerAccount} numberOfLines={1}>
                    {provider.accountEmail}
                  </Text>
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
      </View>

      {/* Pie de página */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tus datos se almacenan de forma segura. Solo accedemos a los archivos a los que nos otorgas permiso explícitamente.
        </Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 15,
    color: '#FF6B35',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
  },
  providersContainer: {
    gap: 12,
  },
  providerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  providerIconImage: {
    width: 24,
    height: 24,
  },
  providerText: {
    flex: 1,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  providerDescription: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  providerAccount: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 4,
  },
  statusConnected: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 4,
  },
  statusAvailable: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  footer: {
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default AddProviderScreen;