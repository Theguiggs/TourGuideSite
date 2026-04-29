import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconBack RN — miroir natif (Lucide `arrow-left`).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconBackProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconBack({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconBackProps) {
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
      <Path d="M19 12H5" {...sp} />
      <Path d="M12 19l-7-7 7-7" {...sp} />
    </Svg>
  );
}
