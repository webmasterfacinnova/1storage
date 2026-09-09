import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Button } from '../common/Button'; // Importas tu botón genérico

export type SortOption = 'name' | 'date' | 'size';

interface SortBarProps {
  sortBy: SortOption;
  onSelectSort: (option: SortOption) => void;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  showSearch: boolean;
  onToggleSearch: () => void;
  sortOptions?: SortOption[];
}

export const SortBar: React.FC<SortBarProps> = ({
  sortBy,
  onSelectSort,
  searchQuery,
  onSearchChange,
  showSearch,
  onToggleSearch,
  sortOptions = ['name', 'date', 'size'],
}) => {
  return (
    <View style={styles.actions}>
      <TouchableOpacity onPress={onToggleSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.searchIcon}>{showSearch ? '✕' : '🔍'}</Text>
      </TouchableOpacity>

      {showSearch ? (
        <TextInput
          style={styles.si}
          placeholder="Search files…"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={onSearchChange}
          autoFocus
        />
      ) : (
        <View style={styles.sortGroup}>
          <Text style={styles.sortLbl}>Sort:</Text>
          {sortOptions.map(option => {
            const isActive = sortBy === option;
            const label = option[0].toUpperCase() + option.slice(1);
            return (
              <Button
                key={option}
                title={label}
                onPress={() => onSelectSort(option)}
                variant={isActive ? 'solid' : 'ghost'}
                color={isActive ? '#1a237e' : 'transparent'}
                textColor={isActive ? '#ffffff' : '#1a237e'}
                style={styles.customBtnStyle}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  si: {
    flex: 1,
    height: 36,
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#333',
  },
  sortGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sortLbl: { fontSize: 12, color: '#888', marginRight: 2 },
  customBtnStyle: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
});

export default SortBar;