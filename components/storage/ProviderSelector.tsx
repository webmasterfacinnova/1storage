import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ProviderMeta } from '../../types/storage';

interface ProviderSelectorProps {
  activeProvider: string;
  providerKeys: string[];
  providerMetaMap: Record<string, ProviderMeta>;
  connectedProviders: Record<string, { name?: string }>;
  onSelectProvider: (providerId: string) => void;
  providerAllId?: string;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  activeProvider,
  providerKeys,
  providerMetaMap,
  connectedProviders,
  onSelectProvider,
  providerAllId = 'all',
}) => {
  const options = [providerAllId, ...providerKeys];

  return (
    <View style={styles.providerRow}>
      {options.map(pid => {
        const isActive = pid === activeProvider;
        const meta =
          pid === providerAllId
            ? { name: 'All', color: '#1a237e' }
            : providerMetaMap[pid] || {
                name: connectedProviders?.[pid]?.name || pid,
                color: '#1a237e',
              };
        const isSingleProvider = providerKeys.length <= 1;

        return (
          <TouchableOpacity
            key={pid}
            style={[
              styles.providerBtn,
              isActive && { backgroundColor: meta.color, borderColor: meta.color },
              isSingleProvider && !isActive && styles.providerBtnHidden,
            ]}
            onPress={() => !isSingleProvider && onSelectProvider(pid)}
            activeOpacity={isSingleProvider ? 1 : 0.7}
          >
            <Text
              style={[
                styles.providerBtnTxt,
                isActive && { color: '#fff' },
                isSingleProvider && !isActive && { color: '#bbb' },
              ]}
            >
              {meta.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  providerRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 8,
  },
  providerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  providerBtnHidden: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  providerBtnTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
});

export default ProviderSelector;