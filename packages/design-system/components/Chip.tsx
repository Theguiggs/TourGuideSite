import * as React from 'react';
import { tgColors, tgFonts, tgRadius } from '../tokens';

/**
 * <Chip> — étiquette compacte, sélectionnable.
 * Variantes de couleur : default | grenadine | ocre | mer | olive
 * État : active (fond `*Soft` + texte `color`) ou default (fond transparent +
 * bordure `ink20` + texte `ink`). La couleur n'est portée que par l'état actif.
 *
 * Story 2.2 — corrige la logique inversée du POC Story 1.0/1.1 :
 *   - active → bg = c.soft, color = c.color, border = transparent
 *   - default → bg = transparent, color = ink, border = ink20
 *   - fontFamily explicite (tgFonts.sans), n'hérite plus du parent.
 */
export type ChipColor = 'default' | 'grenadine' | 'ocre' | 'mer' | 'olive';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: ChipColor;
  active?: boolean;
  iconLeft?: React.ReactNode;
}

const palette: Record<ChipColor, { color: string; soft: string }> = {
  default:   { color: tgColors.ink,        soft: tgColors.paperDeep },
  grenadine: { color: tgColors.grenadine,  soft: tgColors.grenadineSoft },
  ocre:      { color: tgColors.ocre,       soft: tgColors.ocreSoft },
  mer:       { color: tgColors.mer,        soft: tgColors.merSoft },
  olive:     { color: tgColors.olive,      soft: tgColors.oliveSoft },
};

export function Chip({ color = 'default', active, iconLeft, style, children, ...rest }: ChipProps) {
  const c = palette[color];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: tgRadius.pill,
        fontFamily: tgFonts.sans,
        fontSize: 12,
        fontWeight: 600,
        background: active ? c.soft : 'transparent',
        color: active ? c.color : tgColors.ink,
        border: active ? '1px solid transparent' : `1px solid ${tgColors.ink20}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {iconLeft}
      {children}
    </span>
  );
}
