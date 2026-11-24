import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../theme/colors";

interface ManagerSectionHeaderProps {
  title: string;
  count: number;
}

export const ManagerSectionHeader: React.FC<ManagerSectionHeaderProps> = ({
  title,
  count,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.count}>
        {count} archivo{count !== 1 ? "s" : ""}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text.headingShort,
  },
  count: {
    fontSize: 13,
    color: Colors.text.captionShort,
  },
});