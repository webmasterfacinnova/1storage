import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { ProviderType } from '../../services/transfer.service';

export type DialogStep = 
  | 'SELECT_PROVIDER' 
  | 'CONFLICT_RESOLUTION' 
  | 'DELETE_SOURCE' 
  | 'NEED_MORE_PROVIDERS';

export interface TransferConfirmDialogProps {
  visible: boolean;
  step?: DialogStep;
  title?: string;
  message?: string;
  fileName?: string;
  targetProvider?: string;
  onSelectDestination?: (provider: ProviderType) => void;
  onResolveConflict?: (strategy: 'replace' | 'rename' | 'cancel') => void;
  onKeepSource?: () => void;
  onDestroySource?: () => void;
  onKeep?: () => void;      // <--- Agregado para compatibilidad
  onDestroy?: () => void;   // <--- Agregado para compatibilidad
  onGoToProviders?: () => void;
  onClose: () => void;
}

export const TransferConfirmDialog: React.FC<TransferConfirmDialogProps> = ({
  visible,
  step = 'DELETE_SOURCE',
  title,
  message,
  fileName,
  targetProvider,
  onSelectDestination,
  onResolveConflict,
  onKeepSource,
  onDestroySource,
  onKeep,
  onDestroy,
  onGoToProviders,
  onClose,
}) => {
  const handleKeep = onKeepSource || onKeep || onClose;
  const handleDestroy = onDestroySource || onDestroy;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          
          {/* VISTA AVISO: Requiere al menos 2 proveedores */}
          {step === 'NEED_MORE_PROVIDERS' && (
            <>
              <Text style={styles.title}>Conecta otro proveedor de nube</Text>
              <Text style={styles.subtitle}>
                Para poder realizar transferencias entre nubes necesitas tener al menos 2 proveedores de almacenamiento vinculados.
              </Text>

              <Pressable
                style={({ pressed }) => [styles.button, styles.actionButton, pressed && styles.buttonPressed]}
                onPress={() => {
                  onClose();
                  onGoToProviders?.();
                }}
              >
                <Text style={styles.actionText}>Conectar otros servicios</Text>
              </Pressable>

             
               
            </>
          )}

          {/* VISTA 1: Seleccionar Proveedor Destino */}
          {step === 'SELECT_PROVIDER' && (
            <>
              <Text style={styles.title}>Seleccionar Destino</Text>
              {fileName && (
                <View style={styles.fileBadge}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    📄 {fileName}
                  </Text>
                </View>
              )}
              <Text style={styles.subtitle}>
                ¿A qué proveedor deseas transferir este archivo?
              </Text>

              <Pressable
                style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.buttonPressed]}
                onPress={() => onSelectDestination?.('google-drive')}
              >
                <Text style={styles.primaryText}>Google Drive</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.buttonPressed]}
                onPress={() => onSelectDestination?.('onedrive')}
              >
                <Text style={styles.primaryText}>OneDrive</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.buttonPressed]}
                onPress={onClose}
              >
                <Text style={styles.secondaryText}>Cancelar</Text>
              </Pressable>
            </>
          )}

          {/* VISTA 2: Resolución de Conflicto */}
          {step === 'CONFLICT_RESOLUTION' && (
            <>
              <Text style={styles.title}>Archivo existente</Text>
              <Text style={styles.subtitle}>
                Ya existe un archivo con el nombre &quot;{fileName}&quot; en {targetProvider}. ¿Qué deseas hacer?
              </Text>

              <Pressable
                style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.buttonPressed]}
                onPress={() => onResolveConflict?.('replace')}
              >
                <Text style={styles.primaryText}>Reemplazar existente</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.buttonPressed]}
                onPress={() => onResolveConflict?.('rename')}
              >
                <Text style={styles.primaryText}>Mantener ambos (Renombrar)</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.buttonPressed]}
                onPress={() => onResolveConflict?.('cancel')}
              >
                <Text style={styles.secondaryText}>Cancelar</Text>
              </Pressable>
            </>
          )}

          {/* VISTA 3: Eliminar Fuente / Confirmación Post-Transferencia */}
          {step === 'DELETE_SOURCE' && (
            <>
              <Text style={styles.title}>{title || 'Transferencia realizada con éxito'}</Text>
              {fileName && (
                <View style={styles.fileBadge}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    📄 {fileName}
                  </Text>
                </View>
              )}
              <Text style={styles.subtitle}>
                {message || 'El archivo fue transferido exitosamente. ¿Qué deseas hacer con el archivo original?'}
              </Text>

              <Pressable
                style={({ pressed }) => [styles.button, styles.dangerButton, pressed && styles.buttonPressed]}
                onPress={handleDestroy}
              >
                <Text style={styles.dangerText}>Eliminar original</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.buttonPressed]}
                onPress={handleKeep}
              >
                <Text style={styles.secondaryText}>Conservar original</Text>
              </Pressable>
            </>
          )}

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
  container: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  fileBadge: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  fileName: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  actionButton: {
    backgroundColor: '#0066FF',
    borderColor: '#0052CC',
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#EBF3FF',
    borderColor: '#D0E2FF',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  dangerButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  primaryText: {
    color: '#0066FF',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryText: {
    color: '#475569',
    fontWeight: '500',
    fontSize: 14,
  },
  dangerText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 14,
  },
});