import React from 'react';
import { View, TouchableOpacity, Text, Image, StyleSheet } from 'react-native';
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
            ? { name: 'All', color: '#1a237e', icon: undefined }
            : providerMetaMap[pid] || {
                name: connectedProviders?.[pid]?.name || pid,
                color: '#1a237e',
                icon: undefined,
              };
        const isSingleProvider = providerKeys.length <= 1;

        if (isSingleProvider && !isActive) return null;

        return (
          <TouchableOpacity
            key={pid}
            style={[
              styles.providerBtn,
              isActive && { backgroundColor: meta.color, borderColor: meta.color },
            ]}
            onPress={() => !isSingleProvider && onSelectProvider(pid)}
            activeOpacity={isSingleProvider ? 1 : 0.7}
          >
            {meta.icon && (
              <Image
                source={meta.icon}
                style={styles.providerIcon}
                resizeMode="contain"
              />
            )}
            <Text
              style={[
                styles.providerBtnTxt,
                isActive && { color: '#ffffff' },
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 6,
  },
  providerIcon: {
    width: 18,
    height: 18,
  },
  providerBtnTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
});

export default ProviderSelector;