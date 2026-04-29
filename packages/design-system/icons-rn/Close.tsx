import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconClose RN — miroir natif (Lucide `x`).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconCloseProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconClose({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconCloseProps) {
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
      <Path d="M18 6L6 18" {...sp} />
      <Path d="M6 6l12 12" {...sp} />
    </Svg>
  );
}
