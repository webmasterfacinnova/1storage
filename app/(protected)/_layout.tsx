import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, StyleSheet, View } from "react-native";
import { Colors } from "../../components/theme/colors";

export default function ProtectedLayout() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          // headerShown: false,
          contentStyle: { backgroundColor: Colors.background.primary },
          headerStyle: { backgroundColor: Colors.brand.primary },
          headerTintColor: Colors.text.inverse,
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen
          name="home"
          options={{
            title: "OneStorage",
            headerLeft: () => {
              return (
                <Image
                  source={require("@/assets/images/storage_iso_logo_512.png")}
                  style={{
                    width: 40,
                    height: 40,
                    marginLeft: 10,
                    backgroundColor: Colors.background.card,
                    borderRadius: 10,
                    padding: 5,
                    marginRight: 10,
                  }}
                />
              );
            },
          }}
        />
        <Stack.Screen
          name="storage-breakdown"
          options={{ title: "Storage Breakdown" }}
        />
        <Stack.Screen name="file-list" options={{ title: "Archivos" }} />
        <Stack.Screen name="clean-trash" options={{ title: "Papelera" }} />
        <Stack.Screen
          name="manager-files"
          options={{ title: "Gestor de Archivos" }}
        />
        <Stack.Screen
          name="add-provider"
          options={{ title: "Agregar Proveedor" }}
        />

        {/* Redirect screen for handling OAuth redirects */}
        <Stack.Screen name="redirect" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
});
