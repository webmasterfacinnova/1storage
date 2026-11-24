import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors } from "../theme/colors";

interface FileListHeaderProps {
  title: string;
  providerLabel: string;
  providerColor: string;
  onBack: () => void;
}

export const FileListHeader: React.FC<FileListHeaderProps> = ({
  title,
  providerLabel,
  providerColor,
  onBack,
}) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backButton}>←</Text>
      </TouchableOpacity>

      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.providerLabel, { color: providerColor }]}>
          {providerLabel}
        </Text>
      </View>

      <View style={styles.spacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: Colors.background.headerSoft,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.headerSoft,
  },
  backButton: {
    fontSize: 24,
    color: Colors.providers.googleDriveAlt,
  },
  titleRow: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text.navy,
  },
  providerLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  spacer: {
    width: 40,
  },
});