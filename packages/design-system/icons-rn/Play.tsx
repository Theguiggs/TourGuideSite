import * as React from 'react';
import Svg, { Polygon } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconPlay RN — miroir natif (Lucide `play`, outline).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconPlayProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconPlay({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconPlayProps) {
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
      <Polygon
        points="6 4 20 12 6 20 6 4"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
