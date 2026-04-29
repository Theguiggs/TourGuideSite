import * as React from 'react';
import Svg, { Path, Line } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconAlert RN — miroir natif (Lucide `alert-triangle`).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconAlertProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconAlert({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconAlertProps) {
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
      <Path
        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        {...sp}
      />
      <Line x1="12" y1="9" x2="12" y2="13" {...sp} />
      <Line x1="12" y1="17" x2="12.01" y2="17" {...sp} />
    </Svg>
  );
}
