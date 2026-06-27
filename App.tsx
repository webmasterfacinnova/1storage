// App.tsx
// Main application entry point

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './store/store';
import AppNavigator from './navigation/AppNavigator';
import { authService } from './services/auth.service';
import { setCredentials, setLoading } from './store/slices/authSlice';

const App = () => {
  useEffect(() => {
    // Check for existing authentication on app start
    const checkAuth = async () => {
      try {
        store.dispatch(setLoading(true));
        const user = await authService.getCurrentUser();
        if (user) {
          const token = await authService.getAuthToken();
          if (token) {
            store.dispatch(setCredentials({ user, token, provider: 'google' }));
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        store.dispatch(setLoading(false));
      }
    };
    
    checkAuth();
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