// components/storage/HeaderBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

interface HeaderBarProps {
  title: string;
  onBack: () => void;
  onLayout?: (e: any) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ title, onBack, onLayout }) => (
  <View style={s.headerContainer} onLayout={onLayout}>
    <TouchableOpacity onPress={onBack} style={s.backButton} activeOpacity={0.7}>
      <ArrowLeft size={24} color="#ffffff" />
    </TouchableOpacity>
    <Text style={s.headerTitle}>{title}</Text>
    <View style={{ width: 24 }} />
  </View>
);

const s = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ff6600', // Color naranja de tu cabecera
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export default HeaderBar;