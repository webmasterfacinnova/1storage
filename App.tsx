// App.tsx
// Main application entry point

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './store/store';
import AppNavigator from './navigation/AppNavigator';
import { authService } from './services/auth.service';
import { setCredentials, setLoading } from './store/slices/authSlice';
import { addProvider } from './store/slices/connectedProvidersSlice';

const App = () => {
  useEffect(() => {
    const init = async () => {
      try {
        // 1️⃣ Initialize auth service (configures Google Sign-In)
        await authService.initialize();

        // 2️⃣ Check for existing session
        store.dispatch(setLoading(true));
        const user = await authService.getCurrentUser();
        if (user) {
          const token = await authService.getAuthToken();
          if (token) {
            store.dispatch(setCredentials({ user, token, provider: 'google' }));
            store.dispatch(addProvider({
              id: 'google-drive',
              name: 'Google Drive',
              token,
              userPrincipalName: user.email,
              connectedAt: new Date().toISOString(),
            }));
          }
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        store.dispatch(setLoading(false));
      }
    };
    
    init();
  }, []);
  
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;