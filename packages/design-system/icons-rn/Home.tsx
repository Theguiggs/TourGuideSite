import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconHome RN — miroir natif de la version Web (Lucide `home`).
 *
 * RN `react-native-svg` ne supporte pas `currentColor` nativement :
 * si `color === 'currentColor'`, fallback statique sur `tgColors.ink`.
 * Le consumer passe `color={tg.colors.grenadine}` etc. selon contexte.
 *
 * Min usage 16px, optimal 20-24px, viewBox 24×24, stroke 1.5.
 * Wrap in `<TouchableOpacity>`/`<Pressable>` with `minHeight: 44` for tap targets.
 */
export interface IconHomeProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconHome({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconHomeProps) {
  const stroke: ColorValue = color === 'currentColor' ? tgColors.ink : color;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      accessibilityLabel={accessibilityLabel}
    >
      <Path
        d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
