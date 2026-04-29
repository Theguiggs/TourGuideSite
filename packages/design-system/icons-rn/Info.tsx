import * as React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconInfo RN — miroir natif (Lucide `info`).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconInfoProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconInfo({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconInfoProps) {
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
      <Circle cx="12" cy="12" r="10" {...sp} />
      <Line x1="12" y1="16" x2="12" y2="12" {...sp} />
      <Line x1="12" y1="8" x2="12.01" y2="8" {...sp} />
    </Svg>
  );
}
