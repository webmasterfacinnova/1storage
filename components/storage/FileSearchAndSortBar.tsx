import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { Colors } from "../theme/colors";

export type FileSortOption = "size" | "name" | "date";

interface FileSearchAndSortBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: FileSortOption;
  onSortChange: (sort: FileSortOption) => void;
}

const SORT_OPTIONS: { key: FileSortOption; label: string }[] = [
  { key: "size", label: "Tamaño" },
  { key: "name", label: "Nombre" },
  { key: "date", label: "Fecha" },
];

export const FileSearchAndSortBar: React.FC<FileSearchAndSortBarProps> = ({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}) => {
  return (
    <View style={styles.controls}>
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar archivos..."
        value={searchQuery}
        onChangeText={onSearchChange}
        autoCapitalize="none"
      />

      <View style={styles.sortButtons}>
        {SORT_OPTIONS.map((option) => {
          const isActive = sortBy === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.sortButton, isActive && styles.sortButtonActive]}
              onPress={() => onSortChange(option.key)}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  isActive && styles.sortButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  controls: {
    padding: 12,
    backgroundColor: Colors.background.headerSoft,
  },
  searchInput: {
    backgroundColor: Colors.background.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  sortButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.headerSoft,
  },
  sortButtonActive: {
    backgroundColor: Colors.providers.googleDriveAlt,
    borderColor: Colors.providers.googleDriveAlt,
  },
  sortButtonText: {
    color: Colors.providers.googleDriveAlt,
    fontSize: 14,
  },
  sortButtonTextActive: {
    color: Colors.text.inverse,
  },
});