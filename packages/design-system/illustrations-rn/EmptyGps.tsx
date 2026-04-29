import * as React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { tgColors } from '../tokens';

/**
 * EmptyGps RN — miroir natif de la version Web (Story 5.10.5).
 *
 * RN `react-native-svg` ne supporte pas `currentColor` nativement :
 * si `color === 'currentColor'`, fallback statique sur `tgColors.ink`.
 *
 * Min usage 120px, optimal 160-240px, max 320px. ViewBox 200×200, stroke 1.5.
 * Accent grenadine fixe (signature DS — Brief §6).
 */
export interface EmptyGpsProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function EmptyGps({
  size = 200,
  color = 'currentColor',
  style,
  accessibilityLabel,
}: EmptyGpsProps) {
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
      {/* Pin de carte centré : goutte renversée + œillet */}
      <Path
        d="M100 50 C78 50 60 68 60 90 C60 120 100 160 100 160 C100 160 140 120 140 90 C140 68 122 50 100 50 Z"
        {...sp}
      />
      <Circle cx="100" cy="90" r="12" {...sp} />
      {/* Cercle de précision (rompu) */}
      <Circle
        cx="100"
        cy="170"
        r="22"
        {...sp}
        strokeDasharray="3 5"
        opacity={0.7}
      />
      {/* Accent grenadine : slash "désactivé" */}
      <Line
        x1="55"
        y1="55"
        x2="145"
        y2="155"
        stroke={tgColors.grenadine}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
