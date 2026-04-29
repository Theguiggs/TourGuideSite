import * as React from 'react';
import Svg, { Rect, Path } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconLock RN — miroir natif (Lucide `lock`).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconLockProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconLock({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconLockProps) {
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
      <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" {...sp} />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" {...sp} />
    </Svg>
  );
}
