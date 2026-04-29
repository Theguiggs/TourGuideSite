import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * IconCatalog RN — miroir natif (Lucide `library`).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconCatalogProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconCatalog({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconCatalogProps) {
  const stroke: ColorValue = color === 'currentColor' ? tgColors.ink : color;
  const strokeProps = {
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
      <Path d="M16 6l4 14" {...strokeProps} />
      <Path d="M12 6v14" {...strokeProps} />
      <Path d="M8 8v12" {...strokeProps} />
      <Path d="M4 4v16" {...strokeProps} />
    </Svg>
  );
}
