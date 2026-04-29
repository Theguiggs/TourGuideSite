import * as React from 'react';
import { tgColors, tgFonts, tgFontSize, tgTracking, tgEyebrow } from '../tokens';

/**
 * <Eyebrow> — surtitre éditorial.
 * Petit, en majuscules, letter-spacing large. Posé au-dessus de chaque titre
 * (signature visuelle du DS — voir brief §2.2).
 *
 * Story 2.5 — défaut couleur passé à `ink60` (était `ink`) pour rester
 * discret au-dessus d'un titre dense. Réutilise le helper `tgEyebrow`
 * (Story 1.2 AC 4) — DRY entre tokens et composant.
 */
export interface EyebrowProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: string;
}

export function Eyebrow({ color = tgColors.ink60, style, children, ...rest }: EyebrowProps) {
  return (
    <div
      style={{
        ...tgEyebrow,
        fontFamily: tgFonts.sans,
        color,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * <PullQuote> — citation éditoriale italique.
 *
 * Story 2.5 — sizes alignées sur l'échelle 11 niveaux de Story 1.2 :
 *   sm = 18 (h6), md = 22 (h5), lg = 30 (h4)
 * (auparavant 14/18/24 — breaking change assumé, 0 consumer existant).
 */
export interface PullQuoteProps extends React.HTMLAttributes<HTMLQuoteElement> {
  size?: 'sm' | 'md' | 'lg';
}

const PULLQUOTE_SIZE_MAP = {
  sm: tgFontSize.h6,
  md: tgFontSize.h5,
  lg: tgFontSize.h4,
} as const;

export function PullQuote({ size = 'md', style, children, ...rest }: PullQuoteProps) {
  const fontSize = PULLQUOTE_SIZE_MAP[size];
  return (
    <blockquote
      style={{
        fontFamily: tgFonts.editorial,
        fontStyle: 'italic',
        fontSize,
        lineHeight: 1.4,
        color: tgColors.ink80,
        margin: 0,
        ...style,
      }}
      {...rest}
    >
      {children}
    </blockquote>
  );
}

/**
 * <NumberMark> — gros numéro éditorial (01, 02, 03 — sections, étapes).
 * En DM Serif Display, couleur d'accent par défaut grenadine.
 *
 * Story 2.5 — defaults :
 *   - size = 40 (= tg.fontSize.h3, était 56 — sobriété cards paywall/pricing)
 *   - n zero-padded sur 2 chiffres : `String(n).padStart(2, '0')`
 *   - letterSpacing = tgTracking.display
 */
export interface NumberMarkProps {
  n: number | string;
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}

export function NumberMark({
  n,
  color = tgColors.grenadine,
  size = tgFontSize.h3,
  style,
}: NumberMarkProps) {
  return (
    <span
      style={{
        fontFamily: tgFonts.display,
        fontSize: size,
        lineHeight: 1,
        color,
        letterSpacing: tgTracking.display,
        ...style,
      }}
    >
      {String(n).padStart(2, '0')}
    </span>
  );
}
