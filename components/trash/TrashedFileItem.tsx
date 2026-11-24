import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { FileText, Folder, CheckCircle2, Circle } from "lucide-react-native";
import { Colors } from "../theme/colors";

interface TrashedFileItemProps {
  id: string;
  name: string;
  mimeType?: string;
  formattedSize: string;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

export const TrashedFileItem: React.FC<TrashedFileItemProps> = ({
  id,
  name,
  mimeType,
  formattedSize,
  isSelected,
  onToggleSelect,
}) => {
  const isFolder = mimeType?.includes("folder");

  return (
    <TouchableOpacity
      style={[styles.fileCard, isSelected && styles.fileCardSelected]}
      onPress={() => onToggleSelect(id)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.fileIconContainer,
          isFolder ? styles.folderIconBg : styles.fileIconBg,
        ]}
      >
        {isFolder ? (
          <Folder size={22} color={Colors.brand.folderOrange} />
        ) : (
          <FileText size={22} color={Colors.brand.primary} />
        )}
      </View>

      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.fileSize}>{formattedSize}</Text>
      </View>

      <View style={styles.checkboxContainer}>
        {isSelected ? (
          <CheckCircle2 size={22} color={Colors.brand.primary} />
        ) : (
          <Circle size={22} color={Colors.text.checkboxIdle} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fileCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border.itemSoft,
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  fileCardSelected: {
    backgroundColor: Colors.background.selected,
    borderColor: Colors.border.selected,
  },
  fileIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  folderIconBg: {
    backgroundColor: Colors.actions.folderWarmBg,
  },
  fileIconBg: {
    backgroundColor: Colors.actions.folderBg,
  },
  fileInfo: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.heading,
  },
  fileSize: {
    fontSize: 12,
    color: Colors.text.iconMuted,
    marginTop: 2,
  },
  checkboxContainer: {
    paddingLeft: 4,
  },
});