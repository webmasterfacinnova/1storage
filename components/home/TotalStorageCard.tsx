import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../theme/colors";

interface TotalStorageCardProps {
  totalUsageBytes: number;
  totalLimitBytes: number;
  overallPercent: number;
  drivePercentOfTotal: number;
  odPercentOfTotal: number;
  isGoogleDriveConnected: boolean;
  isOneDriveConnected: boolean;
}

const GB = 1024 * 1024 * 1024;

export const TotalStorageCard: React.FC<TotalStorageCardProps> = ({
  totalUsageBytes,
  totalLimitBytes,
  overallPercent,
  drivePercentOfTotal,
  odPercentOfTotal,
  isGoogleDriveConnected,
  isOneDriveConnected,
}) => {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.totalSpaceCard}>
        <Text style={styles.totalSpaceLabel}>Espacio total utilizado</Text>

        <View style={styles.totalSpaceValueRow}>
          <Text style={styles.totalSpaceNumber}>
            {(totalUsageBytes / GB).toFixed(1)}
          </Text>
          <Text style={styles.totalSpaceUnit}>GB utilizados</Text>
        </View>

        <View style={styles.mainProgressBarBg}>
          {isGoogleDriveConnected && (
            <View
              style={[
                styles.mainProgressBarFill,
                {
                  width: `${Math.min(drivePercentOfTotal, 100)}%`,
                  backgroundColor: Colors.providers.googleDrive,
                },
              ]}
            />
          )}
          {isOneDriveConnected && (
            <View
              style={[
                styles.mainProgressBarFill,
                {
                  width: `${Math.min(odPercentOfTotal, 100)}%`,
                  backgroundColor: Colors.providers.oneDrive,
                },
              ]}
            />
          )}
        </View>

        <View style={styles.totalSpaceFooter}>
          <Text style={styles.totalSpaceFooterText}>
            {overallPercent.toFixed(1)}% usado
          </Text>
          <Text style={styles.totalSpaceFooterText}>
            {totalLimitBytes > 0
              ? `${(totalLimitBytes / GB).toFixed(0)} GB total`
              : "--"}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryRow: {
    marginBottom: 24,
  },
  totalSpaceCard: {
    width: "100%",
    backgroundColor: Colors.background.cardDark,
    borderRadius: 16,
    padding: 18,
  },
  totalSpaceLabel: {
    color: Colors.text.subtle,
    fontSize: 12,
  },
  totalSpaceValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginVertical: 10,
  },
  totalSpaceNumber: {
    color: Colors.text.inverse,
    fontSize: 32,
    fontWeight: "800",
    marginRight: 6,
  },
  totalSpaceUnit: {
    color: Colors.text.subtle,
    fontSize: 13,
  },
  mainProgressBarBg: {
    height: 8,
    backgroundColor: Colors.border.dark,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
    flexDirection: "row",
  },
  mainProgressBarFill: {
    height: "100%",
  },
  totalSpaceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalSpaceFooterText: {
    color: Colors.text.subtle,
    fontSize: 11,
    fontWeight: "500",
  },
});