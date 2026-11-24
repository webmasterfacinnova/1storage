import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { CheckCircle2, Circle } from "lucide-react-native";
import { Colors } from "../theme/colors";

interface TrashSelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  isDeleting: boolean;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
}

export const TrashSelectionToolbar: React.FC<TrashSelectionToolbarProps> = ({
  selectedCount,
  totalCount,
  isDeleting,
  onSelectAll,
  onDeleteSelected,
}) => {
  if (totalCount === 0) return null;

  const allSelected = selectedCount === totalCount;

  return (
    <View style={styles.actionToolbar}>
      <TouchableOpacity style={styles.selectAllBtn} onPress={onSelectAll}>
        {allSelected ? (
          <CheckCircle2 size={18} color={Colors.brand.primary} />
        ) : (
          <Circle size={18} color={Colors.text.iconMuted} />
        )}
        <Text style={styles.selectAllText}>
          {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
        </Text>
      </TouchableOpacity>

      {selectedCount > 0 && (
        <TouchableOpacity
          style={styles.deleteSelectedBtn}
          onPress={onDeleteSelected}
          disabled={isDeleting}
        >
          <Text style={styles.deleteSelectedText}>
            Eliminar ({selectedCount})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  actionToolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  selectAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text.heading,
    marginLeft: 8,
  },
  deleteSelectedBtn: {
    backgroundColor: Colors.background.dangerSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteSelectedText: {
    color: Colors.text.dangerDark,
    fontSize: 13,
    fontWeight: "600",
  },
});