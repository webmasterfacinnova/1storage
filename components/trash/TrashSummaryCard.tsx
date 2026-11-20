import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Trash2 } from "lucide-react-native";
import { Colors } from "../theme/colors";

interface TrashSummaryCardProps {
  fileCount: number;
  formattedTotalSize: string;
  isDeleting: boolean;
  onEmptyTrash: () => void;
}

export const TrashSummaryCard: React.FC<TrashSummaryCardProps> = ({
  fileCount,
  formattedTotalSize,
  isDeleting,
  onEmptyTrash,
}) => {
  const isDisabled = isDeleting || fileCount === 0;

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <View style={styles.iconCircle}>
          <Trash2 size={20} color={Colors.brand.primary} />
        </View>
        <View style={styles.summaryTitleContainer}>
          <Text style={styles.summaryTitle}>Espacio ocupado</Text>
          <Text style={styles.summarySubtitle}>
            Los elementos aquí se eliminarán definitivamente al vaciarse
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{fileCount}</Text>
          <Text style={styles.statLabel}>Archivos</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{formattedTotalSize}</Text>
          <Text style={styles.statLabel}>Tamaño total</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.emptyButton, isDisabled && styles.disabledButton]}
        onPress={onEmptyTrash}
        disabled={isDisabled}
        activeOpacity={0.7}
      >
        <Trash2
          size={16}
          color={Colors.text.inverse}
          style={styles.emptyButtonIcon}
        />
        <Text style={styles.emptyButtonText}>Vaciar papelera</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border.cardSoft,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.actions.folderBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  summaryTitleContainer: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  summarySubtitle: {
    fontSize: 12,
    color: Colors.text.iconMuted,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    backgroundColor: Colors.background.statsBox,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  divider: {
    width: 1,
    height: "60%",
    backgroundColor: Colors.border.divider,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.statLabel,
    marginTop: 2,
  },
  emptyButton: {
    backgroundColor: Colors.actions.danger,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: Colors.background.disabled,
  },
  emptyButtonIcon: {
    marginRight: 6,
  },
  emptyButtonText: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: "600",
  },
});