import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Image, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../services/auth.service';
import { setLoading, setCredentials, setError } from '../../store/slices/authSlice';
import { selectAuthLoading, selectAuthError } from '../../store/slices/authSlice';

const LoginScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const handleGoogleSignIn = useCallback(async () => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const result = await authService.signIn(); // returns { user, token, provider }
      dispatch(setCredentials({ user: result.user, token: result.token, provider: result.provider }));
      dispatch(setLoading(false));
      // Navigate to Home (assuming stack navigator)
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
      // Optionally show alert
      Alert.alert('Login failed', message);
    }
  }, [dispatch, navigation]);

  return (
    <View style={styles.container}>
      {/* Logo (optional) */}
      <View style={styles.logoContainer}>
        {/* You can add a logo image here if you have one in assets */}
        {/* <Image source={require('../../assets/logo.png')} style={styles.logo} /> */}
        <Text style={styles.appName}>Unified Storage</Text>
      </View>

      {/* Welcome text */}
      <Text style={styles.welcome}>Welcome to Unified Storage</Text>

      {/* Sign in with Google button */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonLoading]}
        onHover={handleGoogleSignIn}
        onPress={handleGoogleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
        ) : (
          <>
            {/* Google logo (you can use an asset or emoji) */}
            <Text style={styles.buttonText}>🔵</Text>
            <Text style={styles.buttonText}> Sign in with Google</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Error message */}
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}

      {/* Footer note (optional) */}
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
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  welcome: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dadce0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonLoading: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    color: '#5f6368',
    marginLeft: 12,
  },
  spinner: {
    marginLeft: 12,
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
    color: '#777',
    textAlign: 'center',
  },
});