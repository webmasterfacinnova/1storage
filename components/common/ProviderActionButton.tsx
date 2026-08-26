// components/common/ProviderActionButton.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

interface ProviderActionButtonProps {
  isConnected: boolean;
  isConnecting: boolean;
  color?: string;
  onConnect: () => void;
  onDisconnect?: () => void;
}

export const ProviderActionButton: React.FC<ProviderActionButtonProps> = ({
  isConnected,
  isConnecting,
  color = '#0078D4',
  onConnect,
  onDisconnect,
}) => {
  if (isConnecting) {
    return (
      <View style={[styles.button, styles.disabledButton]}>
        <ActivityIndicator size="small" color="#FFFFFF" />
      </View>
    );
  }

  if (isConnected) {
    return (
      <TouchableOpacity
        style={styles.disconnectButton}
        onPress={onDisconnect}
      >
        <Text style={styles.disconnectButtonText}>Disconnect</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: color }]}
      onPress={onConnect}
    >
      <Text style={styles.connectButtonText}>Connect</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  disconnectButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E53935',
    minWidth: 100,
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: '#E53935',
    fontSize: 13,
    fontWeight: '600',
  },
});