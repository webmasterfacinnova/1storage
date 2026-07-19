// components/storage/ProviderBadge.tsx
// Badge indicating which provider stores a file

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface ProviderInfo {
  id: string;
  name: string;
  color: string;
  label: string;
}

export const PROVIDERS: Record<string, ProviderInfo> = {
  'google-drive': {
    id: 'google-drive',
    name: 'Google Drive',
    color: '#34a853',
    label: 'GD',
  },
  dropbox: {
    id: 'dropbox',
    name: 'Dropbox',
    color: '#0061ff',
    label: 'DB',
  },
  onedrive: {
    id: 'onedrive',
    name: 'OneDrive',
    color: '#0078d4',
    label: 'OD',
  },
  backblaze: {
    id: 'backblaze',
    name: 'Backblaze B2',
    color: '#e60000',
    label: 'B2',
  },
};

interface ProviderBadgeProps {
  providerId: string;
}

const ProviderBadge: React.FC<ProviderBadgeProps> = ({ providerId }) => {
  const provider = PROVIDERS[providerId];
  if (!provider) return null;

  return (
    <View style={[styles.badge, { backgroundColor: provider.color + '20', borderColor: provider.color + '40' }]}>
      <View style={[styles.dot, { backgroundColor: provider.color }]} />
      <Text style={[styles.label, { color: provider.color }]}>{provider.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default ProviderBadge;
