// components/auth/GoogleSignInButton.tsx
// Custom Google Sign-In button component

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';

interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ 
  onPress,
  loading = false,
  disabled = false
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#3c4043" />
      ) : (
        <>
          <Image
            source={require('../../assets/google-logo.png')}
            style={styles.logo}
          />
          <Text style={styles.text}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    minWidth: 200,
  },
  disabledButton: {
    opacity: 0.6,
  },
  logo: {
    width: 18,
    height: 18,
    marginRight: 12,
  },
  text: {
    color: '#3c4043',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default GoogleSignInButton;