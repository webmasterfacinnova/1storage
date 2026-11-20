import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Colors } from "../theme/colors";

interface FilesPaginationFooterProps {
  hasMore: boolean;
  filteredCount: number;
}

export const FilesPaginationFooter: React.FC<FilesPaginationFooterProps> = ({
  hasMore,
  filteredCount,
}) => {
  if (hasMore) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={Colors.text.navy} />
        <Text style={styles.loadingText}>
          {filteredCount > 0 ? "Cargando más…" : "Buscando…"}
        </Text>
      </View>
    );
  }

  if (filteredCount > 0) {
    return (
      <View style={styles.endRow}>
        <Text style={styles.endText}>· Fin de la lista ·</Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.text.navy,
    fontWeight: "600",
  },
  endRow: {
    alignItems: "center",
    paddingVertical: 20,
  },
  endText: {
    fontSize: 12,
    color: Colors.text.endText,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
});