// components/storage/HeaderBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface HeaderBarProps {
  title: string;
  onBack: () => void;
  onLayout?: (e: any) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ title, onBack, onLayout }) => (
  <View style={s.hdr} onLayout={onLayout}>
    <TouchableOpacity onPress={onBack} style={s.back}>
      <Text style={s.backTxt}>‹</Text>
    </TouchableOpacity>
    <Text style={s.title}>{title}</Text>
  </View>
);

const s = StyleSheet.create({
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  back: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  backTxt: { fontSize: 28, color: '#1a237e', fontWeight: '300', lineHeight: 30 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1a237e' },
});

export default HeaderBar;