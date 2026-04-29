import * as React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconProfile RN — miroir natif (Lucide `user`).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconProfileProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconProfile({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconProfileProps) {
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
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...sp} />
      <Circle cx="12" cy="7" r="4" {...sp} />
    </Svg>
  );
}
