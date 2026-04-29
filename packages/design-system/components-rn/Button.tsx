import * as React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { tgColors, tgRadius, tgFonts } from '../tokens';

/**
 * <Button> (React Native miroir)
 *
 * API identique au Button Web (`components/Button.tsx`) sauf le handler :
 * Web → `onClick`, RN → `onPress` (convention RN).
 *
 * Variantes : primary | accent | ghost
 * Tailles   : sm | md | lg
 *
 * Story 2.1 — RN miroir :
 *  - Pressable + StyleSheet (PAS TouchableOpacity).
 *  - Tokens uniquement (couleurs, radius, fonts) — zéro hard-code couleur.
 *  - Hit target ≥ 44×44 même pour size="sm" (minHeight + minWidth en StyleSheet).
 *  - Shadow accent : elevation (Android) + shadowOffset/Opacity/Radius/Color (iOS).
 *  - Disabled : opacity 0.4 + accessibilityState.disabled + Pressable.disabled.
 *  - accessibilityRole="button" toujours.
 */
export type ButtonVariant = 'primary' | 'accent' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: React.ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  /** Largeur 100 % du parent (utile en colonne). */
  fullWidth?: boolean;
}

export const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      children,
      disabled = false,
      accessibilityLabel,
      testID,
      onPress,
      style,
      fullWidth,
    },
    ref,
  ) {
    const containerStyle: StyleProp<ViewStyle> = [
      styles.base,
      sizeStyles[size],
      variantStyles[variant],
      fullWidth ? styles.fullWidth : null,
      disabled ? styles.disabled : null,
      style,
    ];

    const textStyle = [
      styles.textBase,
      textSizeStyles[size],
      variant === 'ghost' ? styles.textGhost : styles.textOnDark,
    ];

    const handlePress: PressableProps['onPress'] = (e) => {
      if (disabled) return;
      onPress?.(e);
    };

    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        testID={testID}
        disabled={disabled}
        onPress={handlePress}
        style={containerStyle}
      >
        {typeof children === 'string' || typeof children === 'number' ? (
          <Text style={textStyle}>{children}</Text>
        ) : (
          children
        )}
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tgRadius.pill,
    borderWidth: 1.5,
    borderColor: 'transparent',
    // Hit target ≥ 44×44 même pour size="sm".
    minHeight: 44,
    minWidth: 44,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.4,
  },
  textBase: {
    fontFamily: tgFonts.sans,
    fontWeight: '600',
  },
  textOnDark: {
    color: tgColors.paper,
  },
  textGhost: {
    color: tgColors.ink,
  },
});

const sizeStyles = StyleSheet.create({
  sm: { paddingVertical: 8,  paddingHorizontal: 14 },
  md: { paddingVertical: 11, paddingHorizontal: 18 },
  lg: { paddingVertical: 14, paddingHorizontal: 24 },
});

const textSizeStyles = StyleSheet.create({
  sm: { fontSize: 13 },
  md: { fontSize: 14 },
  lg: { fontSize: 15 },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: tgColors.ink,
  },
  accent: {
    backgroundColor: tgColors.grenadine,
    // Shadow accent — iOS
    shadowColor: tgColors.grenadine,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    // Shadow accent — Android
    elevation: 6,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: tgColors.ink,
  },
});
