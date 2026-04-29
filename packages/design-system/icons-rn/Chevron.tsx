import * as React from 'react';
import Svg, { Polyline } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconChevron RN — miroir natif (Lucide `chevron-right`).
 *
 * Le consumer utilise `style={{ transform: [{ rotate: '90deg' }] }}` pour
 * down/left/up. `currentColor` fallback → `tgColors.ink`.
 */
export interface IconChevronProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconChevron({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconChevronProps) {
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
      <Polyline
        points="9 18 15 12 9 6"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
