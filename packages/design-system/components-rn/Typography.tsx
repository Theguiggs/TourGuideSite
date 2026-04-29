import * as React from 'react';
import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { tgColors, tgFontsRn, tgFontSize } from '../tokens';

/**
 * <Eyebrow> (React Native miroir)
 *
 * Story 2.5 — composants typographiques signature du DS, miroir RN.
 *
 * Notes RN :
 *  - `letterSpacing` en RN = points absolus (PAS em). Conversion 0.18em à
 *    fontSize 11 → 11 × 0.18 = 1.98pt.
 *  - `fontFamily` doit être un PostScript name exact (pas de fallback chain).
 *    Story 2.0 a bundlé Manrope-Bold → utilise `tgFontsRn.sansBold` puisque
 *    Eyebrow est à fontWeight 700 (RN ne combine pas family+weight comme CSS).
 *  - `<Text>` + `StyleSheet.create` (pas de `<div>`/`<span>`).
 */
export interface EyebrowProps extends TextProps {
  color?: string;
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export function Eyebrow({ color = tgColors.ink60, style, children, ...rest }: EyebrowProps) {
  return (
    <Text style={[eyebrowStyles.root, { color }, style]} {...rest}>
      {children}
    </Text>
  );
}

const eyebrowStyles = StyleSheet.create({
  root: {
    fontFamily: tgFontsRn.sansBold,
    fontSize: 11,
    // 0.18em à 11pt = 1.98pt absolu (RN n'accepte pas em).
    letterSpacing: 1.98,
    textTransform: 'uppercase',
  },
});

/**
 * <PullQuote> (React Native miroir)
 *
 * Story 2.5 — sizes : sm=18 / md=22 / lg=30 (mapping h6/h5/h4).
 * fontFamily : DMSerifText-Italic (Story 2.0 bundle).
 */
export interface PullQuoteProps extends TextProps {
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

const PULLQUOTE_SIZE_MAP = {
  sm: tgFontSize.h6,
  md: tgFontSize.h5,
  lg: tgFontSize.h4,
} as const;

export function PullQuote({ size = 'md', style, children, ...rest }: PullQuoteProps) {
  const fontSize = PULLQUOTE_SIZE_MAP[size];
  return (
    <Text
      style={[
        pullQuoteStyles.root,
        { fontSize, lineHeight: fontSize * 1.4 },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const pullQuoteStyles = StyleSheet.create({
  root: {
    fontFamily: tgFontsRn.editorial,
    fontStyle: 'italic',
    color: tgColors.ink80,
  },
});

/**
 * <NumberMark> (React Native miroir)
 *
 * Story 2.5 — défaut size=40 (= h3), n zero-padded sur 2 chiffres.
 * fontFamily : DMSerifDisplay-Regular (Story 2.0 bundle).
 *
 * Note : `letterSpacing` RN absolu — conversion `-0.025em` à fontSize size
 * → `-size * 0.025`.
 */
export interface NumberMarkProps {
  n: number | string;
  color?: string;
  size?: number;
  style?: StyleProp<TextStyle>;
}

export function NumberMark({
  n,
  color = tgColors.grenadine,
  size = tgFontSize.h3,
  style,
}: NumberMarkProps) {
  return (
    <Text
      style={[
        numberMarkStyles.root,
        {
          fontSize: size,
          lineHeight: size,
          letterSpacing: -size * 0.025,
          color,
        },
        style,
      ]}
    >
      {String(n).padStart(2, '0')}
    </Text>
  );
}

const numberMarkStyles = StyleSheet.create({
  root: {
    fontFamily: tgFontsRn.display,
  },
});
