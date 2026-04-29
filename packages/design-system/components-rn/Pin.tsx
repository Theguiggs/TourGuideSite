import * as React from 'react';
import Svg, { Path, Circle, Rect, Text as SvgText } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';
import { tgColors, tgFonts } from '../tokens';

/**
 * Helper interne — résout une couleur :
 * clé `tgColors` (ex: `"grenadine"`) → hex correspondant ; sinon, string telle quelle.
 */
function resolveColor(c: string): string {
  return (tgColors as Record<string, string>)[c] ?? c;
}

const DEFAULT_ROUNDED_RATIO = 0.225;

/**
 * <Pin> RN — miroir natif de la version Web.
 * Mêmes props publiques. Rendu via `react-native-svg`.
 */
export interface PinProps {
  size?: number;
  color?: string;
  dot?: string;
  label?: string | number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Pin({
  size = 32,
  color = 'grenadine',
  dot = 'paper',
  label,
  style,
  accessibilityLabel,
}: PinProps) {
  const fill = resolveColor(color);
  const dotFill = resolveColor(dot);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      style={style}
      accessibilityLabel={accessibilityLabel}
    >
      <Path
        d="M16 3 c-5 0 -9 4 -9 9 c0 6.5 9 17 9 17 s9 -10.5 9 -17 c0 -5 -4 -9 -9 -9 z"
        fill={fill}
      />
      {label != null ? (
        <>
          <Circle cx="16" cy="13" r="5.5" fill={dotFill} />
          <SvgText
            x="16"
            y="16"
            textAnchor="middle"
            fontFamily={tgFonts.display}
            fontSize="8"
            fill={fill}
          >
            {String(label)}
          </SvgText>
        </>
      ) : (
        <Circle cx="16" cy="13" r="3" fill={dotFill} />
      )}
    </Svg>
  );
}

/**
 * <PinNegatif> RN — miroir natif.
 * `rounded` accepte `boolean | number` (cf. AC5).
 * Pas de wrapper `<View>` : le `borderRadius` est natif au `<Rect>` SVG via `rx`/`ry`.
 */
export interface PinNegatifProps {
  size?: number;
  bg?: string;
  fg?: string;
  rounded?: boolean | number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function PinNegatif({
  size = 80,
  bg = 'grenadine',
  fg = 'paper',
  rounded = DEFAULT_ROUNDED_RATIO,
  style,
  accessibilityLabel,
}: PinNegatifProps) {
  const ratio =
    rounded === true
      ? DEFAULT_ROUNDED_RATIO
      : rounded === false
        ? 0
        : rounded;
  // viewBox interne 0..220 → rayon SVG = ratio * 220
  const rxRy = ratio * 220;
  const bgFill = resolveColor(bg);
  const fgFill = resolveColor(fg);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      style={style}
      accessibilityLabel={accessibilityLabel}
    >
      <Rect width="220" height="220" rx={rxRy} ry={rxRy} fill={bgFill} />
      <Path
        d="M110 38 c-30 0 -54 24 -54 54 c0 38 54 78 54 78 s54 -40 54 -78 c0 -30 -24 -54 -54 -54 z"
        fill={fgFill}
      />
      <Circle cx="110" cy="92" r="18" fill={bgFill} />
    </Svg>
  );
}
