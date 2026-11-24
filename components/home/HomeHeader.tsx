import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { LogOut } from "lucide-react-native";
import { Colors } from "../theme/colors";

interface HomeHeaderProps {
  name?: string | null;
  email?: string | null;
  photoURL?: string | null;
  onLogout: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  name,
  email,
  photoURL,
  onLogout,
}) => {
  const displayName = name || "Mario Alejandro";
  const initials = (name || email || "MA").substring(0, 2).toUpperCase();

  return (
    <View style={styles.headerRow}>
      <View style={styles.headerInfo}>
        <Text style={styles.greetingText} numberOfLines={1}>
          Hola, {displayName}
        </Text>
      </View>

      <View style={styles.userControlsWrapper}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{initials}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.headerLogoutBtn}
          onPress={onLogout}
          accessibilityLabel="Cerrar sesión"
        >
          <LogOut size={18} color={Colors.text.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerInfo: {
    flex: 1,
    paddingRight: 10,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text.primary,
  },
  userControlsWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarImage: {
    width: 40,
    height: 40,
    backgroundColor: Colors.background.card,
    borderRadius: 20,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brand.accentLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: Colors.brand.accentDark,
    fontWeight: "700",
    fontSize: 13,
  },
  headerLogoutBtn: {
    backgroundColor: Colors.background.card,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
});