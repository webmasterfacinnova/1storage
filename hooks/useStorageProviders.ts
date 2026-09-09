// hooks/useStorageProviders.ts
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addProvider,
  removeProvider,
  selectConnectedProviders,
} from '../store/slices/connectedProvidersSlice';
import { selectCurrentUser } from '../store/slices/authSlice';
import { saveSecureData, clearSecureData, getSecureData } from '../utils/secureStorage';
import OneDriveAuthService from '../services/auth/onedrive-auth.service';
import GoogleAuthService from '../services/auth/google-auth.service';

export interface ProviderItem {
  id: string;
  storeKey: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isConnecting: boolean;
  isConnected: boolean;
  accountEmail?: string;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export const useStorageProviders = () => {
  const dispatch = useDispatch();
  const connectedProviders = useSelector(selectConnectedProviders);
  const currentUser = useSelector(selectCurrentUser);

  const [isOneDriveConnecting, setIsOneDriveConnecting] = useState(false);
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);

  // Verificación de sesión persistida para OneDrive al cargar el hook
  useEffect(() => {
    const verifyOneDriveAccess = async () => {
      try {
        const token = await getSecureData('onedrive_token');
        const email = await getSecureData('onedrive_provider_email');
        const connectedAt = await getSecureData('onedrive_connected_at');

        if (token) {
          dispatch(
            addProvider({
              id: 'onedrive',
              name: 'Microsoft OneDrive',
              token,
              userPrincipalName: email || '',
              connectedAt: connectedAt || new Date().toISOString(),
            })
          );
        }
      } catch (error) {
        console.error('Error al verificar sesión de OneDrive:', error);
      }
    };

    verifyOneDriveAccess();
  }, [dispatch]);

  // --- GOOGLE DRIVE LOGIC ---
  const connectGoogleDrive = async () => {
    setIsGoogleConnecting(true);
    try {
      const authService = new GoogleAuthService();
      await authService.initialize();
      const result = await authService.signIn();

      if (result?.token) {
        dispatch(
          addProvider({
            id: 'google-drive',
            name: 'Google Drive',
            token: result.token,
            userPrincipalName: result.user?.email || currentUser?.email,
            connectedAt: new Date().toISOString(),
          })
        );
      }
    } catch (err) {
      console.error('Error al autorizar Google Drive:', err);
    } finally {
      setIsGoogleConnecting(false);
    }
  };

  const disconnectGoogleDrive = async () => {
    try {
      const authService = new GoogleAuthService();
      await authService.signOut();
      await clearSecureData('google_refresh_token');
    } catch (error) {
      console.error('Error al desconectar Google Drive:', error);
    } finally {
      dispatch(removeProvider('google-drive'));
    }
  };

  // --- ONEDRIVE LOGIC ---
  const connectOneDrive = async () => {
    setIsOneDriveConnecting(true);
    try {
      const authService = new OneDriveAuthService();
      await authService.initialize();
      const result = await authService.signIn();

      dispatch(
        addProvider({
          id: 'onedrive',
          name: 'Microsoft OneDrive',
          token: result.token,
          userPrincipalName: result.user.email,
          connectedAt: new Date().toISOString(),
        })
      );

      await saveSecureData('onedrive_token', result.token);
      await saveSecureData('onedrive_provider_name', 'Microsoft OneDrive');
      await saveSecureData('onedrive_provider_email', result.user.email);
      await saveSecureData('onedrive_connected_at', new Date().toISOString());
    } catch (err: any) {
      console.error('Error al conectar OneDrive:', err);
    } finally {
      setIsOneDriveConnecting(false);
    }
  };

  const disconnectOneDrive = async () => {
    try {
      await clearSecureData('onedrive_token');
      await clearSecureData('onedrive_id_token');
      await clearSecureData('onedrive_refresh_token');
      await clearSecureData('onedrive_provider_name');
      await clearSecureData('onedrive_provider_email');
      await clearSecureData('onedrive_connected_at');
    } catch (error) {
      console.error('Error al desconectar OneDrive:', error);
    } finally {
      dispatch(removeProvider('onedrive'));
    }
  };

  // Mapeo unificado de la lista de proveedores con su estado
  const providers: ProviderItem[] = [
    {
      id: 'google',
      storeKey: 'google-drive',
      name: 'Google Drive',
      description: 'Access your Google Drive files and storage',
      icon: '🔵',
      color: '#4285F4',
      isConnecting: isGoogleConnecting,
      isConnected: !!connectedProviders['google-drive'],
      accountEmail: connectedProviders['google-drive']?.userPrincipalName,
      onConnect: connectGoogleDrive,
      onDisconnect: disconnectGoogleDrive,
    },
    {
      id: 'onedrive',
      storeKey: 'onedrive',
      name: 'Microsoft OneDrive',
      description: 'Access your OneDrive files and storage',
      icon: '☁️',
      color: '#0078D4',
      isConnecting: isOneDriveConnecting,
      isConnected: !!connectedProviders['onedrive'],
      accountEmail: connectedProviders['onedrive']?.userPrincipalName,
      onConnect: connectOneDrive,
      onDisconnect: disconnectOneDrive,
    },
  ];

  return {
    providers,
    connectedProviders,
  };
};