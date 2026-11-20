import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors } from "../theme/colors";

interface StorageBottomNavProps {
  onHomePress: () => void;
  onFilesPress: () => void;
  onTrashPress: () => void;
}

export const StorageBottomNav: React.FC<StorageBottomNavProps> = ({
  onHomePress,
  onFilesPress,
  onTrashPress,
}) => {
  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navButton} onPress={onHomePress}>
        <Text style={styles.navButtonText}>Inicio</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navButton} onPress={onFilesPress}>
        <Text style={styles.navButtonText}>Archivos</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navButton} onPress={onTrashPress}>
        <Text style={styles.navButtonText}>Papelera</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 12,
    backgroundColor: Colors.background.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border.headerSoft,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    color: Colors.providers.googleDriveAlt,
    fontSize: 16,
  },
});