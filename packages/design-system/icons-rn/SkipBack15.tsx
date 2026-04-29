import * as React from 'react';
import Svg, { Path, Polyline, G, Text as SvgText } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors, tgFonts } from '../tokens';

/**
 * IconSkipBack15 RN — @custom : recule lecteur de 15s (miroir Web).
 * `currentColor` fallback → `tgColors.ink`.
 */
export interface IconSkipBack15Props {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function IconSkipBack15({
  size = 24,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: IconSkipBack15Props) {
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
      <Path d="M20 12a8 8 0 1 1-2.34-5.66" {...sp} />
      <G translateX={-3}>
        <Polyline points="21 3 21 7 17 7" {...sp} />
      </G>
      <SvgText
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="7"
        fontFamily={tgFonts.sans}
        fontWeight="700"
        fill={stroke}
      >
        15
      </SvgText>
    </Svg>
  );
}
