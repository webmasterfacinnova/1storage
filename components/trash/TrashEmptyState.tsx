import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Trash2 } from "lucide-react-native";
import { Colors } from "../theme/colors";

export const TrashEmptyState: React.FC = () => {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <Trash2 size={40} color={Colors.text.neutral} />
      </View>
      <Text style={styles.emptyTitle}>La papelera está vacía</Text>
      <Text style={styles.emptySubtitle}>
        Los archivos que elimines aparecerán aquí antes de borrarse
        permanentemente.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.background.emptyIcon,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text.emptyTitle,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.text.neutral,
    textAlign: "center",
    lineHeight: 18,
  },
});