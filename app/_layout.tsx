import React, { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { store } from '../store/store';
import { selectCurrentUser, setCredentials } from '../store/slices/authSlice';
import { authService } from '../services/auth.service';
import { addProvider } from '../store/slices/connectedProvidersSlice';
import { Colors } from '../components/theme/colors';

const InitialLayout = () => {
  const user = useSelector(selectCurrentUser);
  const segments = useSegments();
  const router = useRouter();
  const dispatch = useDispatch();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        await authService.initialize();
        const currentUser = await authService.getCurrentUser();
        
        if (currentUser) {
          const token = await authService.getAuthToken();
          if (token) {
            dispatch(setCredentials({ user: currentUser, token, provider: 'google' }));
            dispatch(
              addProvider({
                id: 'google-drive',
                name: 'Google Drive',
                token,
                userPrincipalName: currentUser.email,
                connectedAt: new Date().toISOString(),
              })
            );
          }
        }
      } catch (error) {
        console.error('Error restaurando sesión:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    restoreSession();
  }, [dispatch]);

  useEffect(() => {
    if (isInitializing) return;

    const inAuthGroup = segments[0] === '(protected)';

    if (!user && inAuthGroup) {
      router.replace('/login');
    } else if (user && !inAuthGroup) {
      router.replace('/(protected)/home');
    }
  }, [user, segments, isInitializing]);

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </View>
    );
  }

  return <Slot />;
};

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <InitialLayout />
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
});