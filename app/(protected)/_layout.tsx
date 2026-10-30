import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, StyleSheet, View } from "react-native";

export default function ProtectedLayout() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          // headerShown: false,
          contentStyle: { backgroundColor: "#FAF8F5" },
          headerStyle: { backgroundColor: "#FF6B35" },
          headerTintColor: "#FFFFFF",
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
                  source={require("@/assets/images/1StorageIsoLogo_512.png")}
                  style={{
                    width: 40,
                    height: 40,
                    marginLeft: 10,
                    backgroundColor: "#FFF",
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
          options={{ title: "Gestior de Archivos" }}
        />
        <Stack.Screen
          name="add-provider"
          options={{ title: "Agregar Proveedor" }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F5",
  },
});
