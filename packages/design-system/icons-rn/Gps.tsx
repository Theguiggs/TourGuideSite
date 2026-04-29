import * as React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconGps RN — @custom : réticule + point central (signature TourGuide).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconGpsProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconGps({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconGpsProps) {
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
      <Circle cx="12" cy="12" r="8" {...sp} />
      <Line x1="12" y1="2" x2="12" y2="5" {...sp} />
      <Line x1="12" y1="19" x2="12" y2="22" {...sp} />
      <Line x1="2" y1="12" x2="5" y2="12" {...sp} />
      <Line x1="19" y1="12" x2="22" y2="12" {...sp} />
      <Circle cx="12" cy="12" r="2" fill={stroke} />
    </Svg>
  );
}
