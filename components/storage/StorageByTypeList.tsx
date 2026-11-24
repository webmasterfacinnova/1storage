import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Colors } from "../theme/colors";
import { driveService } from "../../services/drive.service";

export interface StorageTypeItem {
  type: string;
  label: string;
  size: number;
  percentage: number;
  icon: React.ReactNode;
}

interface StorageByTypeListProps {
  items: StorageTypeItem[];
  loading: boolean;
  barColor: string;
  onSelectType: (type: string) => void;
}

export const StorageByTypeList: React.FC<StorageByTypeListProps> = ({
  items,
  loading,
  barColor,
  onSelectType,
}) => {
  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color={Colors.status.quotaNormal}
        style={styles.loader}
      />
    );
  }

  if (items.length === 0) {
    return (
      <Text style={styles.emptyText}>
        No hay desglose de almacenamiento disponible
      </Text>
    );
  }

  return (
    <View style={styles.typeList}>
      {items.map((item, index) => (
        <TouchableOpacity
          key={`${item.type}-${index}`}
          style={styles.typeCard}
          onPress={() => onSelectType(item.type)}
        >
          <View style={styles.typeIcon}>{item.icon}</View>
          <View style={styles.typeInfo}>
            <Text style={styles.typeLabel}>{item.label}</Text>
            <Text style={styles.typeSize}>
              {driveService.formatBytes(item.size)}
            </Text>
          </View>
          <View style={styles.typeBarContainer}>
            <View style={styles.typeBarBg}>
              <View
                style={[
                  styles.typeBarFill,
                  {
                    width: `${Math.min(item.percentage, 100)}%`,
                    backgroundColor: barColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.typePercent}>
              {item.percentage.toFixed(1)}%
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  loader: {
    marginVertical: 16,
  },
  typeList: {
    marginBottom: 20,
  },
  typeCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  typeIcon: {
    marginRight: 12,
    fontSize: 24,
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text.navy,
  },
  typeSize: {
    fontSize: 14,
    color: Colors.text.body,
    marginTop: 2,
  },
  typeBarContainer: {
    alignItems: "flex-end",
  },
  typeBarBg: {
    height: 6,
    width: 100,
    backgroundColor: Colors.border.headerSoft,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  typeBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  typePercent: {
    fontSize: 12,
    color: Colors.text.body,
  },
  emptyText: {
    color: Colors.text.caption,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
});