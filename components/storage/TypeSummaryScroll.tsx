import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

export interface TypeSummaryItem {
  label: string;
  count: number;
  icon: string;
}

interface TypeSummaryScrollProps {
  summaryItems: TypeSummaryItem[];
  onSelectType: (label: string) => void;
  maxItems?: number;
}

export const TypeSummaryScroll: React.FC<TypeSummaryScrollProps> = ({
  summaryItems,
  onSelectType,
  maxItems = 7,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.typeScroll}
      nestedScrollEnabled
    >
      {summaryItems.slice(0, maxItems).map(item => (
        <TouchableOpacity
          key={item.label}
          style={styles.typeCard}
          onPress={() => onSelectType(item.label)}
        >
          <Text style={styles.typeIcon}>{item.icon}</Text>
          <Text style={styles.typeLabel}>{item.label}</Text>
          <Text style={styles.typeCount}>{item.count}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  typeScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  typeCard: {
    width: 80,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginRight: 10,
  },
  typeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
  },
  typeCount: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
});

export default TypeSummaryScroll;