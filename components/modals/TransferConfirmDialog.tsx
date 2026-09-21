import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';

interface TransferConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  fileName?: string;
  onKeep: () => void;      // Acción: Permitir / Conservar original
  onDestroy: () => void;   // Acción: Destruir / Eliminar original
  onClose?: () => void;    // Acción opcional para cerrar/cancelar
}

export const TransferConfirmDialog: React.FC<TransferConfirmDialogProps> = ({
  visible,
  title,
  message,
  fileName,
  onKeep,
  onDestroy,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose || onKeep}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dialogContainer}>
              <Text style={styles.title}>{title}</Text>
              
              {fileName ? (
                <Text style={styles.fileNameText} numberOfLines={2}>
                  📄 {fileName}
                </Text>
              ) : null}

              <Text style={styles.message}>{message}</Text>

              <View style={styles.buttonContainer}>
                {/* Botón Acción: Conservar / Permitir */}
                <TouchableOpacity
                  style={[styles.button, styles.keepButton]}
                  onPress={onKeep}
                  activeOpacity={0.8}
                >
                  <Text style={styles.keepButtonText}>Permitir (Conservar)</Text>
                </TouchableOpacity>

                {/* Botón Acción: Destruir / Eliminar */}
                <TouchableOpacity
                  style={[styles.button, styles.destroyButton]}
                  onPress={onDestroy}
                  activeOpacity={0.8}
                >
                  <Text style={styles.destroyButtonText}>Destruir (Eliminar)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 8,
  },
  fileNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    backgroundColor: '#F1F3F5',
    padding: 8,
    borderRadius: 6,
    marginVertical: 6,
  },
  message: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
    marginVertical: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  keepButton: {
    backgroundColor: '#E8EAF6',
  },
  keepButtonText: {
    color: '#1A237E',
    fontWeight: '600',
    fontSize: 13,
  },
  destroyButton: {
    backgroundColor: '#D32F2F',
  },
  destroyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});