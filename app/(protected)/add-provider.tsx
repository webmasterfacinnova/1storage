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
import { Colors } from '../../components/theme/colors';

const AddProviderScreen: React.FC = () => {
  const router = useRouter();
  const { providers } = useStorageProviders();

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(protected)/home');
    }
  };

  const getStatusBadge = (isConnecting: boolean, isConnected: boolean) => {
    if (isConnecting) {
      return <ActivityIndicator size="small" color={Colors.providers.oneDrive} />;
    }
    if (isConnected) {
      return <Text style={styles.statusConnected}>Conectado</Text>;
    }
    return <Text style={styles.statusAvailable}>Disponible</Text>;
  };

  const getProviderIconSource = (providerId: string) => {
    if (providerId.includes('google')) {
      return require('../../assets/images/google_drive.png');
    }
    return require('../../assets/images/one_drive.png');
  };

  return (
    <ScreenContainer>
      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
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
    color: Colors.brand.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.text.muted,
    lineHeight: 20,
  },
  providersContainer: {
    gap: 12,
  },
  providerCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border.light,
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
    backgroundColor: Colors.background.subtle,
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
    color: Colors.text.primary,
  },
  providerDescription: {
    fontSize: 11,
    color: Colors.text.subtle,
    marginTop: 2,
  },
  providerAccount: {
    fontSize: 11,
    color: Colors.text.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  statusConnected: {
    fontSize: 11,
    color: Colors.status.connected,
    fontWeight: '600',
    marginTop: 4,
  },
  statusAvailable: {
    fontSize: 11,
    color: Colors.text.subtle,
    marginTop: 4,
  },
  footer: {
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  footerText: {
    fontSize: 11,
    color: Colors.text.subtle,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default AddProviderScreen;
