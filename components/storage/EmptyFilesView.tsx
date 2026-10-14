// components/storage/EmptyFilesView.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface EmptyFilesViewProps {
  search: string;
  isConnected: boolean;
  onConnect: () => void;
}

export const EmptyFilesView: React.FC<EmptyFilesViewProps> = ({
  search,
  isConnected,
  onConnect,
}) => {
  return (
    <View style={s.empty}>
      <Text style={s.emptyIcon}>📂</Text>
      <Text style={s.emptyTitle}>Sin archivos</Text>
      <Text style={s.emptyDesc}>
        {search
          ? 'Prueba con una búsqueda diferente'
          : !isConnected
          ? 'Fallo de autenticación o cuenta desconectada'
          : 'Conecta un proveedor'}
      </Text>

      <TouchableOpacity style={s.connectBtn} onPress={onConnect}>
        <Text style={s.connectBtnText}>Conectar Proveedor</Text>
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#555', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#999', textAlign: 'center', paddingHorizontal: 24 },
  connectBtn: {
    marginTop: 16,
    backgroundColor: '#0078d4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  connectBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});

export default EmptyFilesView;