// components/storage/FileTypeTabs.tsx
// Horizontal tabs for filtering files by type category

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

export interface FileTypeTab {
  key: string;
  label: string;
  icon: string;
}

export const FILE_TYPE_TABS: FileTypeTab[] = [
  { key: 'all', label: 'All', icon: '📁' },
  { key: 'images', label: 'Images', icon: '🖼️' },
  { key: 'videos', label: 'Videos', icon: '🎬' },
  { key: 'audio', label: 'Audio', icon: '🎵' },
  { key: 'docs', label: 'Docs', icon: '📝' },
  { key: 'pdfs', label: 'PDFs', icon: '📄' },
  { key: 'archives', label: 'Archives', icon: '🗜️' },
  { key: 'folders', label: 'Folders', icon: '📁' },
  { key: 'other', label: 'Other', icon: '📦' },
];

interface FileTypeTabsProps {
  activeTab: string;
  onTabChange: (key: string) => void;
}

const FileTypeTabs: React.FC<FileTypeTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILE_TYPE_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onTabChange(tab.key)}
              accessibilityLabel={`Filter by ${tab.label}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#d7eefb',
    borderBottomWidth: 1,
    borderBottomColor: '#e0ecf5',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#1a73e8',
  },
  tabIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5f6368',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
});

export default FileTypeTabs;
