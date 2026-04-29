import * as React from 'react';
import Svg, { Line } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconPlus RN — miroir natif (Lucide `plus`).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconPlusProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconPlus({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconPlusProps) {
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
      <Line x1="12" y1="5" x2="12" y2="19" {...sp} />
      <Line x1="5" y1="12" x2="19" y2="12" {...sp} />
    </Svg>
  );
}
