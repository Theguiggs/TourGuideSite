import * as React from 'react';
import Svg, { Path, Polyline, Line } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconDownload RN — miroir natif (Lucide `download`).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconDownloadProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconDownload({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconDownloadProps) {
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
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" {...sp} />
      <Polyline points="7 10 12 15 17 10" {...sp} />
      <Line x1="12" y1="15" x2="12" y2="3" {...sp} />
    </Svg>
  );
}
