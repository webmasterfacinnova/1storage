// components/auth/OneDriveSignInButton.tsx
// Microsoft OneDrive / Microsoft Account sign-in button component

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';

interface OneDriveSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const MicrosoftLogo: React.FC = () => (
  <View style={styles.microsoftLogo}>
    <View style={styles.logoGrid}>
      <View style={[styles.logoCell, { backgroundColor: '#F25022' }]} />
      <View style={[styles.logoCell, { backgroundColor: '#7FBA00' }]} />
      <View style={[styles.logoCell, { backgroundColor: '#00A4EF' }]} />
      <View style={[styles.logoCell, { backgroundColor: '#FFB900' }]} />
    </View>
  </View>
);

const OneDriveSignInButton: React.FC<OneDriveSignInButtonProps> = ({
  onPress,
  loading = false,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#5e5e5e" />
      ) : (
        <>
          <MicrosoftLogo />
          <Text style={styles.text}>Continue with Microsoft</Text>
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
    borderColor: '#8c8c8c',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    minWidth: 200,
  },
  disabledButton: {
    opacity: 0.6,
  },
  microsoftLogo: {
    width: 18,
    height: 18,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoGrid: {
    width: 18,
    height: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  logoCell: {
    width: 8,
    height: 8,
    margin: 0.5,
  },
  text: {
    color: '#5e5e5e',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default OneDriveSignInButton;
