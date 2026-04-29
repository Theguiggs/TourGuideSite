import * as React from 'react';
import { tgColors, tgRadius, tgSpace } from '../tokens';
import {
  CARD_SHADOW_MAP,
  CARD_DEFAULT_VARIANT,
  type CardVariant,
} from './Card.constants';

// Re-export pour compat ascendante (consumers et sous-export `/web`).
export { CARD_SHADOW_MAP, CARD_DEFAULT_VARIANT };
export type { CardVariant };

/**
 * <Card> — surface élevée, fond `card` (#FFFFFF), bord 1px line.
 *
 * Story 2.3 — stabilisation :
 *   - prop `variant` (anciennement `elevation`) : `flat | sm | md | lg`
 *   - sous-composants `Card.Header` / `Card.Body` / `Card.Footer` (compound)
 *   - paddings 4pt grid : Header 16/20, Body 20/20, Footer 16/20
 *   - séparateurs 1px line portés par Header (bottom) et Footer (top)
 *   - `bleed` supprimé : padding racine = 0 (les sous-composants gèrent le leur)
 *
 * Composition :
 *   <Card variant="md">
 *     <Card.Header>...</Card.Header>
 *     <Card.Body>...</Card.Body>
 *     <Card.Footer>...</Card.Footer>
 *   </Card>
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({ variant = CARD_DEFAULT_VARIANT, style, children, ...rest }: CardProps) {
  return (
    <div
      style={{
        background: tgColors.card,
        border: `1px solid ${tgColors.line}`,
        borderRadius: tgRadius.lg,
        boxShadow: CARD_SHADOW_MAP[variant],
        padding: 0,
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ style, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        padding: `${tgSpace[4]}px ${tgSpace[5]}px`,
        borderBottom: `1px solid ${tgColors.line}`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

Card.Body = function CardBody({ style, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        padding: `${tgSpace[5]}px ${tgSpace[5]}px`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ style, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        padding: `${tgSpace[4]}px ${tgSpace[5]}px`,
        borderTop: `1px solid ${tgColors.line}`,
        background: tgColors.paperSoft,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};
