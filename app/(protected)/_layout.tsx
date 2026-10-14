// app/(protected)/_layout.tsx
import { Stack } from 'expo-router';

export default function ProtectedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="storage-breakdown" />
      <Stack.Screen name="file-list" />
      <Stack.Screen name="clean-trash" />
      <Stack.Screen name="manager-files" />
      <Stack.Screen name="add-provider" />
    </Stack>
  );
}