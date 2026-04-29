import * as React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconSearch RN — miroir natif (Lucide `search`).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconSearchProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconSearch({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconSearchProps) {
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
      <Circle cx="11" cy="11" r="7" {...sp} />
      <Path d="M21 21l-4.3-4.3" {...sp} />
    </Svg>
  );
}
