import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Button } from '../common/Button';

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
                <Button
                  title="Conservar"
                  onPress={onKeep}
                  color="#E8EAF6"
                  textColor="#1A237E"
                  style={styles.fullWidthButton}
                />

                <Button
                  title="Eliminar"
                  onPress={onDestroy}
                  color="#D32F2F"
                  textColor="#FFFFFF"
                  style={styles.fullWidthButton}
                />
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
    flexDirection: 'column',
    gap: 10,
    marginTop: 20,
  },
  fullWidthButton: {
    width: '100%',
  },
});