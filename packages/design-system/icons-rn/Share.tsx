import * as React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconShare RN — miroir natif (Lucide `share-2`).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconShareProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconShare({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconShareProps) {
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
      <Circle cx="18" cy="5" r="3" {...sp} />
      <Circle cx="6" cy="12" r="3" {...sp} />
      <Circle cx="18" cy="19" r="3" {...sp} />
      <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" {...sp} />
      <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" {...sp} />
    </Svg>
  );
}
