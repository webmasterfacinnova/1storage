// app/login.tsx
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Image, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { authService } from '../services/auth.service';
import { setLoading, setCredentials, setError } from '../store/slices/authSlice';
import { selectAuthLoading, selectAuthError } from '../store/slices/authSlice';
import { addProvider } from '../store/slices/connectedProvidersSlice';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';

export default function LoginRoute() {
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const handleGoogleSignIn = useCallback(async () => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const result = await authService.signIn();
      dispatch(
        setCredentials({
          user: result.user,
          token: result.token,
          provider: result.provider,
        })
      );

      if (result.token) {
        dispatch(
          addProvider({
            id: 'google-drive',
            name: 'Google Drive',
            token: result.token,
            userPrincipalName: result.user?.email,
            connectedAt: new Date().toISOString(),
          })
        );
      }

      dispatch(setLoading(false));
    } catch (err: any) {
      let message = 'Error de autenticación';
      if (err.message) {
        const msg = err.message.toLowerCase();
        if (msg.includes('network')) {
          message = 'Error de red – por favor comprueba tu conexión';
        } else if (msg.includes('cancelled')) {
          message = 'Inicio de sesión cancelado';
        } else {
          message = err.message;
        }
      }
      dispatch(setError(message));
      dispatch(setLoading(false));
      Alert.alert('Error de inicio de sesión', message);
    }
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/1StorageLogoTipoSlogan_512.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.welcome}>Todo tu almacenamiento en un solo lugar</Text>

      <GoogleSignInButton onPress={handleGoogleSignIn} loading={loading} />

      {Boolean(error) && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.footer}>
        Al continuar, aceptas nuestros Términos de servicio y Política de privacidad.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f7fe',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 260,
    height: 90,
  },
  welcome: {
    fontSize: 18,
    color: '#5f6368',
    textAlign: 'center',
    marginBottom: 32,
  },
  error: {
    color: '#d32f2f',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  footer: {
    marginTop: 30,
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
});