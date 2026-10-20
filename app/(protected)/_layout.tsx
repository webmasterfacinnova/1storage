import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

export default function ProtectedLayout() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FAF8F5' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="home" />
        <Stack.Screen name="storage-breakdown" />
        <Stack.Screen name="file-list" />
        <Stack.Screen name="clean-trash" />
        <Stack.Screen name="manager-files" />
        <Stack.Screen name="add-provider" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
});