import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StorageSummaryBarProps {
  fileCount: number;
  providersCount: number | string;
  providerLabel: string;
}

export const StorageSummaryBar: React.FC<StorageSummaryBarProps> = ({
  fileCount,
  providersCount,
  providerLabel,
}) => {
  return (
    <View style={styles.bar}>
      <View style={styles.cell}>
        <Text style={styles.val}>{fileCount}</Text>
        <Text style={styles.lbl}>Files</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.val}>{providersCount}</Text>
        <Text style={styles.lbl}>{providerLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  val: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  lbl: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
});

export default StorageSummaryBar;