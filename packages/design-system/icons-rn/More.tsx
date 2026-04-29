import * as React from 'react';
import Svg, { Circle } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconMore RN — miroir natif (Lucide `more-horizontal`, 3 points).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconMoreProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconMore({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconMoreProps) {
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
      <Circle cx="12" cy="12" r="1" {...sp} />
      <Circle cx="19" cy="12" r="1" {...sp} />
      <Circle cx="5" cy="12" r="1" {...sp} />
    </Svg>
  );
}
