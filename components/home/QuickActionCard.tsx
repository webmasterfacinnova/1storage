import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors } from "../theme/colors";

interface QuickActionCardProps {
  emoji: string;
  iconBgColor: string;
  title: string;
  description: string;
  onPress: () => void;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  emoji,
  iconBgColor,
  title,
  description,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionIconContainer, { backgroundColor: iconBgColor }]}>
        <Text style={styles.emojiText}>{emoji}</Text>
      </View>

      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription} numberOfLines={1}>
          {description}
        </Text>
      </View>

      <Text style={styles.actionArrow}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  actionCard: {
    width: "100%",
    backgroundColor: Colors.background.card,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  emojiText: {
    fontSize: 18,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  actionDescription: {
    fontSize: 11,
    color: Colors.text.subtle,
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 18,
    color: Colors.border.arrow,
    marginLeft: 4,
  },
});