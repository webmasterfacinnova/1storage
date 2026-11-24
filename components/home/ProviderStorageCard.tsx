import React from "react";
import { View, Text, StyleSheet, Image, ImageSourcePropType } from "react-native";
import { Colors } from "../theme/colors";

interface ProviderStorageCardProps {
  name: string;
  isConnected: boolean;
  iconSource: ImageSourcePropType;
  formattedUsage: string;
  formattedLimit: string;
  usagePercent: number;
  barColor: string;
}

export const ProviderStorageCard: React.FC<ProviderStorageCardProps> = ({
  name,
  isConnected,
  iconSource,
  formattedUsage,
  formattedLimit,
  usagePercent,
  barColor,
}) => {
  return (
    <View style={styles.providerCard}>
      <View style={styles.providerCardHeader}>
        <View style={styles.providerIconWrapper}>
          <Image
            source={iconSource}
            style={styles.providerImageIcon}
            resizeMode="contain"
          />
        </View>
        <View style={styles.providerMeta}>
          <Text style={styles.providerName}>{name}</Text>
          <Text style={styles.providerSubtext}>
            {isConnected ? "Sincronizado" : "No conectado"}
          </Text>
        </View>
      </View>

      <View style={styles.providerUsageRow}>
        <Text style={styles.providerUsageValue}>{formattedUsage}</Text>
        <View style={styles.percentBadge}>
          <Text style={styles.percentBadgeText}>{usagePercent.toFixed(1)}%</Text>
        </View>
      </View>

      <Text style={styles.providerLimitText}>de {formattedLimit}</Text>

      <View style={styles.providerProgressBarBg}>
        <View
          style={[
            styles.providerProgressBarFill,
            {
              width: `${Math.min(usagePercent, 100)}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  providerCard: {
    flex: 1,
    backgroundColor: Colors.background.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  providerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  providerIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.background.subtle,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  providerImageIcon: {
    width: 18,
    height: 18,
  },
  providerMeta: {
    flex: 1,
  },
  providerName: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  providerSubtext: {
    fontSize: 9,
    color: Colors.text.subtle,
  },
  providerUsageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  providerUsageValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text.primary,
  },
  percentBadge: {
    backgroundColor: Colors.background.muted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  percentBadgeText: {
    fontSize: 9,
    color: Colors.text.secondary,
    fontWeight: "600",
  },
  providerLimitText: {
    fontSize: 10,
    color: Colors.text.subtle,
    marginTop: 2,
    marginBottom: 8,
  },
  providerProgressBarBg: {
    height: 4,
    backgroundColor: Colors.background.muted,
    borderRadius: 2,
    overflow: "hidden",
  },
  providerProgressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
});