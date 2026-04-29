import * as React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { tgColors, tgFonts, tgRadius } from '../tokens';
import type { ChipColor } from '../components/Chip';

/**
 * <Chip> (React Native miroir)
 *
 * API identique au Chip Web (`components/Chip.tsx`) sauf le handler :
 * Web → click via parent (span), RN → `onPress` (convention RN).
 *
 * Variantes de couleur : default | grenadine | ocre | mer | olive
 * État : active (fond `*Soft` + texte `color`) ou default (fond transparent +
 * bordure `ink20` + texte `ink`).
 *
 * Story 2.2 — RN miroir :
 *  - Pressable + Text + StyleSheet (PAS TouchableOpacity, PAS span).
 *  - Tokens uniquement (couleurs, radius, fonts) — zéro hard-code couleur.
 *  - hitSlop pour atteindre 44×44 hit target (chip mesure ~28pt de haut).
 *  - accessibilityRole="button" + accessibilityState.selected = !!active.
 *  - accessibilityLabel : prop explicite, fallback children string.
 *  - Le type `ChipColor` est ré-exporté depuis le composant Web (single source).
 */

export type { ChipColor } from '../components/Chip';

export interface ChipProps {
  color?: ChipColor;
  active?: boolean;
  iconLeft?: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const palette: Record<ChipColor, { color: string; soft: string }> = {
  default:   { color: tgColors.ink,        soft: tgColors.paperDeep },
  grenadine: { color: tgColors.grenadine,  soft: tgColors.grenadineSoft },
  ocre:      { color: tgColors.ocre,       soft: tgColors.ocreSoft },
  mer:       { color: tgColors.mer,        soft: tgColors.merSoft },
  olive:     { color: tgColors.olive,      soft: tgColors.oliveSoft },
};

export function Chip({
  color = 'default',
  active = false,
  iconLeft,
  children,
  disabled = false,
  onPress,
  accessibilityLabel,
  testID,
  style,
}: ChipProps) {
  const c = palette[color];
  const a11yLabel =
    accessibilityLabel ?? (typeof children === 'string' ? children : undefined);

  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    {
      backgroundColor: active ? c.soft : 'transparent',
      borderColor: active ? 'transparent' : tgColors.ink20,
    },
    disabled ? styles.disabled : null,
    style,
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active, disabled }}
      accessibilityLabel={a11yLabel}
      testID={testID}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      onPress={onPress}
      style={containerStyle}
    >
      {iconLeft}
      <Text
        style={[
          styles.label,
          { color: active ? c.color : tgColors.ink },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tgRadius.pill,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontFamily: tgFonts.sans,
    fontSize: 12,
    fontWeight: '600',
  },
});
