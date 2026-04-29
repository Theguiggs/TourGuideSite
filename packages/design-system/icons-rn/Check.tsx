import * as React from 'react';
import Svg, { Polyline } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconCheck RN — miroir natif (Lucide `check`).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconCheckProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconCheck({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconCheckProps) {
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
        points="20 6 9 17 4 12"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
