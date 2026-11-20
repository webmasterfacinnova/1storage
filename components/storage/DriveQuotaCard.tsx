import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../theme/colors";

interface DriveQuotaCardProps {
  formattedUsage?: string;
  formattedLimit?: string;
  hasLimit: boolean;
  usagePercent: number;
  barColor: string;
  isLoaded: boolean;
}

export const DriveQuotaCard: React.FC<DriveQuotaCardProps> = ({
  formattedUsage,
  formattedLimit,
  hasLimit,
  usagePercent,
  barColor,
  isLoaded,
}) => {
  return (
    <View style={styles.storageCard}>
      <Text style={styles.storageTitle}>Almacenamiento de Google Drive</Text>

      {isLoaded ? (
        <>
          <View style={styles.quotaRow}>
            <View style={styles.quotaItem}>
              <Text style={styles.quotaValue}>{formattedUsage}</Text>
              <Text style={styles.quotaLabel}>Usado</Text>
            </View>
            <View style={styles.quotaItem}>
              <Text style={styles.quotaValue}>
                {hasLimit ? formattedLimit : "Ilimitado"}
              </Text>
              <Text style={styles.quotaLabel}>Total</Text>
            </View>
          </View>

          {hasLimit && (
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(usagePercent, 100)}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {usagePercent.toFixed(1)}% usado
              </Text>
            </View>
          )}
        </>
      ) : (
        <Text style={styles.loadingText}>
          Cargando información de almacenamiento...
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  storageCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  storageTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text.navy,
    marginBottom: 16,
  },
  quotaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  quotaItem: {
    alignItems: "center",
  },
  quotaValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text.navy,
  },
  quotaLabel: {
    fontSize: 14,
    color: Colors.text.body,
    marginTop: 2,
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.border.headerSoft,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.text.body,
    marginTop: 4,
    textAlign: "right",
  },
  loadingText: {
    color: Colors.text.caption,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
});