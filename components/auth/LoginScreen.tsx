import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Image, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../services/auth.service';
import { setLoading, setCredentials, setError } from '../../store/slices/authSlice';
import { selectAuthLoading, selectAuthError } from '../../store/slices/authSlice';
import GoogleSignInButton from './GoogleSignInButton';

const LoginScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const handleGoogleSignIn = useCallback(async () => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const result = await authService.signIn();
      dispatch(setCredentials({ user: result.user, token: result.token, provider: result.provider }));
      dispatch(setLoading(false));
      navigation.replace('Home');
    } catch (err: any) {
      let message = 'Authentication failed';
      if (err.message) {
        const msg = err.message.toLowerCase();
        if (msg.includes('network')) {
          message = 'Network error – please check your connection';
        } else if (msg.includes('cancelled')) {
          message = 'Sign in cancelled';
        } else {
          message = err.message;
        }
      }
      dispatch(setError(message));
      dispatch(setLoading(false));
      Alert.alert('Login failed', message);
    }
  }, [dispatch, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/LogoSlogan.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.welcome}>All your storage in one place</Text>

      <GoogleSignInButton onPress={handleGoogleSignIn} loading={loading} />

      {error && (
        <Text style={styles.error}>{error}</Text>
      )}

      <Text style={styles.footer}>
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </View>
  );
};

export default LoginScreen;

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
    width: 240,
    height: 80,
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
