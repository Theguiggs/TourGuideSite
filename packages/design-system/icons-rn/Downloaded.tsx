import * as React from 'react';
import Svg, { Circle, Polyline } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconDownloaded RN — @custom : variante "pleine" du download.
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconDownloadedProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconDownloaded({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconDownloadedProps) {
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
      <Circle cx="12" cy="12" r="9" {...sp} />
      <Polyline points="8 12.5 11 15.5 16.5 9.5" {...sp} />
    </Svg>
  );
}
