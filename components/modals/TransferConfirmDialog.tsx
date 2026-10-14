// components/modals/TransferConfirmDialog.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableWithoutFeedback, TextInput } from 'react-native';
import { ArrowUpDown } from 'lucide-react-native';
import Button from '../common/Button';

export type DialogStep = 'SELECT_PROVIDER' | 'CONFLICT_RESOLUTION' | 'DELETE_SOURCE' | 'NEED_MORE_PROVIDERS';

interface Props {
  visible: boolean;
  step: DialogStep;
  title?: string;
  message?: string;
  fileName?: string;
  sourceProvider?: string;
  connectedProviders?: Record<string, any>;
  targetProvider?: string;
  isLoading?: boolean;
  onSelectDestination: (provider: any) => void;
  onResolveConflict: (strategy: 'replace' | 'rename' | 'cancel', newName?: string) => void;
  onKeepSource?: () => void;
  onDestroySource?: () => void;
  onKeep?: () => void;
  onDestroy?: () => void;
  onGoToProviders?: () => void;
  onClose: () => void;
}

const getProviderDisplayName = (key?: string) => {
  if (!key) return '';
  if (key.toLowerCase().includes('onedrive')) return 'Microsoft OneDrive';
  if (key.toLowerCase().includes('drive')) return 'Google Drive';
  return key;
};

export const TransferConfirmDialog: React.FC<Props> = ({
  visible,
  step,
  title,
  message,
  fileName,
  sourceProvider,
  connectedProviders = {},
  targetProvider,
  isLoading = false,
  onSelectDestination,
  onResolveConflict,
  onKeepSource,
  onDestroySource,
  onKeep,
  onDestroy,
  onGoToProviders,
  onClose,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(fileName || '');

  useEffect(() => {
    if (visible) {
      setIsRenaming(false);
      setNewName(fileName || '');
    }
  }, [visible, fileName]);

  if (!visible) return null;

  const handleKeep = onKeepSource || onKeep || onClose;
  const handleDestroy = onDestroySource || onDestroy || onClose;

  const formattedSource = getProviderDisplayName(sourceProvider);
  const formattedTarget = getProviderDisplayName(targetProvider);

  const handleConfirmRename = () => {
    if (newName.trim()) {
      // Usamos 'replace' junto con el nuevo nombre para indicarle a la API que guarde exactamente el valor ingresado
      onResolveConflict('replace', newName.trim());
    }
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={isLoading ? undefined : onClose}>
      <TouchableWithoutFeedback onPress={isLoading ? undefined : onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <View style={s.card}>

              {/* PASO 1: Seleccionar Destino */}
              {step === 'SELECT_PROVIDER' && (
                <>
                  <View style={s.titleHeader}>
                    <ArrowUpDown size={22} color="#0078d4" style={s.titleIcon} />
                    <Text style={s.title}>{title || 'Confirmar Transferencia'}</Text>
                  </View>

                  {fileName && (
                    <View style={s.fileBadgeContainer}>
                      <Text style={s.fileBadgeText} numberOfLines={1}>
                        {fileName}
                      </Text>
                    </View>
                  )}

                  <View style={s.flowContainer}>
                    <View style={s.flowStep}>
                      <Text style={s.flowTag}>proveedor origen</Text>
                      <View style={s.providerBox}>
                        <Text style={s.providerBoxText}>{formattedSource || 'Origen'}</Text>
                      </View>
                    </View>

                    <View style={s.arrowContainer}>
                      <ArrowUpDown size={20} color="#888888" />
                    </View>

                    <View style={s.flowStep}>
                      <Text style={s.flowTag}>proveedor destino</Text>
                      <View style={s.btnList}>
                        {Object.keys(connectedProviders)
                          .filter((p) => p !== sourceProvider)
                          .map((p) => {
                            const name = connectedProviders[p]?.name || getProviderDisplayName(p);
                            const isOneDrive = p.toLowerCase().includes('onedrive');
                            return (
                              <Button
                                key={p}
                                title={name}
                                loading={isLoading}
                                disabled={isLoading}
                                onPress={() => onSelectDestination(p)}
                                color={isOneDrive ? '#0078d4' : '#0f9d58'}
                                style={s.actionBtn}
                              />
                            );
                          })}
                      </View>
                    </View>
                  </View>

                  <Button
                    title="Cancelar"
                    variant="ghost"
                    color="#666666"
                    disabled={isLoading}
                    onPress={onClose}
                    style={s.cancelBtn}
                  />
                </>
              )}

              {/* PASO 2: Resolver Conflicto de Duplicados / Formulario de Renombrado */}
              {step === 'CONFLICT_RESOLUTION' && (
                <>
                  <Text style={s.title}>
                    {isRenaming ? 'Renombrar Archivo' : 'Archivo Ya Existente'}
                  </Text>
                  
                  <Text style={s.subtitle}>
                    {isRenaming ? (
                      `Ingresa el nuevo nombre para guardar en ${formattedTarget || 'el destino'}:`
                    ) : (
                      <>
                        Ya existe un archivo llamado <Text style={s.bold}>{fileName}</Text> en{' '}
                        <Text style={s.bold}>{formattedTarget || 'el destino'}</Text>.
                      </>
                    )}
                  </Text>

                  {isRenaming ? (
                    <View style={s.inputContainer}>
                      <TextInput
                        style={s.textInput}
                        value={newName}
                        onChangeText={setNewName}
                        autoFocus
                        selectTextOnFocus
                        placeholder="Nombre del archivo"
                        placeholderTextColor="#999999"
                        editable={!isLoading}
                      />
                      <View style={s.btnList}>
                        <Button
                          title="Guardar y transferir"
                          loading={isLoading}
                          disabled={isLoading}
                          onPress={handleConfirmRename}
                          color="#0078d4"
                          style={s.actionBtn}
                        />
                        <Button
                          title="Volver"
                          variant="outline"
                          color="#333333"
                          disabled={isLoading}
                          onPress={() => setIsRenaming(false)}
                          style={s.actionBtn}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={s.btnList}>
                      <Button
                        title="Reemplazar archivo"
                        loading={isLoading}
                        disabled={isLoading}
                        onPress={() => onResolveConflict('replace')}
                        color="#0078d4"
                        style={s.actionBtn}
                      />
                      <Button
                        title="Guardar ambos (Renombrar)"
                        disabled={isLoading}
                        variant="outline"
                        color="#333333"
                        onPress={() => setIsRenaming(true)}
                        style={s.actionBtn}
                      />
                      <Button
                        title="Cancelar"
                        variant="ghost"
                        color="#666666"
                        disabled={isLoading}
                        onPress={() => onResolveConflict('cancel')}
                        style={s.cancelBtn}
                      />
                    </View>
                  )}
                </>
              )}

              {/* PASO 3: Eliminar Fuente Original */}
              {step === 'DELETE_SOURCE' && (
                <>
                  <View style={s.titleHeader}>
                    <ArrowUpDown size={22} color="#34a853" style={s.titleIcon} />
                    <Text style={s.title}>{title || 'Transferencia realizada con éxito'}</Text>
                  </View>

                  {fileName && (
                    <View style={s.fileBadgeContainer}>
                      <Text style={s.fileBadgeText} numberOfLines={1}>
                        {fileName}
                      </Text>
                    </View>
                  )}

                  <Text style={s.subtitle}>
                    {message || (
                      <>
                        El archivo fue enviado exitosamente a{' '}
                        <Text style={s.bold}>{formattedTarget}</Text>. ¿Qué deseas hacer con el archivo original fuente?
                      </>
                    )}
                  </Text>

                  <View style={s.btnList}>
                    <Button
                      title="Conservar archivo original"
                      loading={isLoading}
                      disabled={isLoading}
                      onPress={handleKeep}
                      color="#0078d4"
                      style={s.actionBtn}
                    />
                    <Button
                      title="Eliminar archivo original"
                      loading={isLoading}
                      disabled={isLoading}
                      variant="outline"
                      color="#d32f2f"
                      onPress={handleDestroy}
                      style={s.actionBtn}
                    />
                  </View>
                </>
              )}

              {/* PASO 4: Requiere más cuentas */}
              {step === 'NEED_MORE_PROVIDERS' && (
                <>
                  <Text style={s.title}>Se requiere otra cuenta</Text>
                  <Text style={s.subtitle}>
                    Necesitas al menos dos cuentas de almacenamiento conectadas para poder realizar transferencias.
                  </Text>

                  <View style={s.btnList}>
                    <Button
                      title="Conectar proveedor"
                      onPress={() => {
                        onClose();
                        if (onGoToProviders) {
                          onGoToProviders();
                        }
                      }}
                      color="#0078d4"
                      style={s.actionBtn}
                    />
                    <Button
                      title="Cerrar"
                      variant="ghost"
                      color="#666666"
                      onPress={onClose}
                      style={s.cancelBtn}
                    />
                  </View>
                </>
              )}

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  titleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: '#111111',
  },
  fileBadgeContainer: {
    backgroundColor: '#f1f3f5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    maxWidth: '100%',
  },
  fileBadgeText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '500',
  },
  flowContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  flowStep: {
    width: '100%',
    alignItems: 'flex-start',
  },
  flowTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'lowercase',
    marginBottom: 4,
    marginLeft: 2,
  },
  providerBox: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  providerBoxText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  arrowContainer: {
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnList: {
    width: '100%',
    gap: 10,
  },
  actionBtn: {
    width: '100%',
    paddingVertical: 12,
  },
  cancelBtn: {
    width: '100%',
    marginTop: 6,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 10,
  },
  textInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333333',
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
});