import * as React from 'react';
import Svg, { Line, Path } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * EmptyOffline RN — miroir natif de la version Web (Story 5.10.5).
 *
 * RN `react-native-svg` ne supporte pas `currentColor` nativement :
 * si `color === 'currentColor'`, fallback statique sur `tgColors.ink`.
 * Le consumer passe `color={tgColors.inkLight}` etc. selon contexte.
 *
 * Min usage 120px, optimal 160-240px, max 320px. ViewBox 200×200, stroke 1.5.
 * Accent grenadine fixe (signature DS — Brief §6).
 */
export interface EmptyOfflineProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function EmptyOffline({
  size = 200,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: EmptyOfflineProps) {
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
      viewBox="0 0 200 200"
      fill="none"
      style={style}
      accessibilityLabel={accessibilityLabel}
    >
      {/* Antenne : poteau vertical + base trapézoïdale */}
      <Line x1="100" y1="70" x2="100" y2="150" {...sp} />
      <Path d="M85 150 L100 135 L115 150 Z" {...sp} />
      <Line x1="80" y1="160" x2="120" y2="160" {...sp} />
      {/* Ondes signal */}
      <Path d="M75 95 A28 28 0 0 1 125 95" {...sp} />
      <Path
        d="M62 88 A45 45 0 0 1 138 88"
        {...sp}
        strokeDasharray="4 4"
        opacity={0.7}
      />
      <Path d="M48 82 A62 62 0 0 1 90 60" {...sp} />
      <Path d="M110 60 A62 62 0 0 1 152 82" {...sp} />
      {/* Accent grenadine : croix "no signal" */}
      <Line
        x1="80"
        y1="100"
        x2="120"
        y2="140"
        stroke={tgColors.grenadine}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Line
        x1="120"
        y1="100"
        x2="80"
        y2="140"
        stroke={tgColors.grenadine}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
