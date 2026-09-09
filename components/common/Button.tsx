// components/common/Button.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'solid' | 'outline' | 'ghost';
  color?: string;
  textColor?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'solid',
  color = '#1a237e',
  textColor,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  const backgroundColor = isOutline || isGhost ? 'transparent' : color;
  const finalTextColor =
    textColor || (isOutline || isGhost ? color : '#ffffff');

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor, borderColor: color },
        isOutline && styles.outlineBtn,
        disabled && styles.disabledBtn,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={finalTextColor} />
      ) : (
        <Text style={[styles.txt, { color: finalTextColor }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtn: {
    borderWidth: 1,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  txt: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default Button;