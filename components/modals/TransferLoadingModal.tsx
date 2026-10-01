import React from 'react';
import { Modal, View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface TransferLoadingModalProps {
  visible: boolean;
  fileName?: string;
}

export const TransferLoadingModal: React.FC<TransferLoadingModalProps> = ({
  visible,
  fileName,
}) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#1A73E8" style={styles.spinner} />
          
          <Text style={styles.title}>Conectando tus nubes...</Text>

          {fileName ? (
            <View style={styles.fileBadge}>
              <Text numberOfLines={1} style={styles.fileName}>
                {fileName}
              </Text>
            </View>
          ) : null}

          <Text style={styles.subtitle}>
            Asegurando que todo se transfiera sin errores. Por favor, no cierres la aplicación.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  spinner: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  fileBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginVertical: 10,
    maxWidth: '100%',
  },
  fileName: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});