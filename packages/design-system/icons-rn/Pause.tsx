import * as React from 'react';
import Svg, { Rect } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconPause RN — miroir natif (Lucide `pause`).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconPauseProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconPause({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconPauseProps) {
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
      <Rect x="6" y="4" width="4" height="16" {...sp} />
      <Rect x="14" y="4" width="4" height="16" {...sp} />
    </Svg>
  );
}
