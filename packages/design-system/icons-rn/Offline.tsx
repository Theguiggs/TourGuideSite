import * as React from 'react';
import Svg, { Path, Line } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconOffline RN — miroir natif (Lucide `wifi-off`).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconOfflineProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconOffline({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconOfflineProps) {
  const stroke: ColorValue = color === 'currentColor' ? tgColors.ink : color;
  const sp = {
    stroke,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      accessibilityLabel={accessibilityLabel}
    >
      <Line x1="2" y1="2" x2="22" y2="22" {...sp} />
      <Path d="M8.5 16.5a5 5 0 0 1 7 0" {...sp} />
      <Path d="M2 8.82a15 15 0 0 1 4.17-2.65" {...sp} />
      <Path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" {...sp} />
      <Path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" {...sp} />
      <Path d="M5 13a10 10 0 0 1 5.17-2.69" {...sp} />
      <Line x1="12" y1="20" x2="12.01" y2="20" {...sp} />
    </Svg>
  );
}
