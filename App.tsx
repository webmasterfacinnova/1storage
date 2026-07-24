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
import { getSecureData, saveSecureData } from './utils/secureStorage';
import OneDriveAuthService from './services/auth/onedrive-auth.service';

const App = () => {
  useEffect(() => {
    const init = async () => {
      try {
        // 1️⃣ Initialize auth service (configures Google Sign-In)
        await authService.initialize();

        // 2️⃣ Check for existing Google Drive session
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

        // 3️⃣ Restore OneDrive session from saved token
        const odToken = await getSecureData('onedrive_token');
        if (odToken) {
          // Restore saved provider metadata if available
          const odName = await getSecureData('onedrive_provider_name');
          let odEmail = await getSecureData('onedrive_provider_email');
          const odConnectedAt = await getSecureData('onedrive_connected_at');

          // Older sessions may not have persisted the email — recover it from Graph.
          if (!odEmail) {
            try {
              const odAuth = new OneDriveAuthService();
              await odAuth.initialize();
              const odUser = await odAuth.getCurrentUser();
              if (odUser?.email) {
                odEmail = odUser.email;
                await saveSecureData('onedrive_provider_email', odEmail);
              }
            } catch (e) {
              console.warn('Could not recover OneDrive email:', e);
            }
          }

          store.dispatch(addProvider({
            id: 'onedrive',
            name: odName || 'Microsoft OneDrive',
            token: odToken,
            userPrincipalName: odEmail || '',
            connectedAt: odConnectedAt || new Date().toISOString(),
          }));
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