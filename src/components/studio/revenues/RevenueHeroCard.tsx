'use client';

import { formatEuros } from '@/lib/studio/revenues-helpers';

interface RevenueHeroCardProps {
  /** Net amount the guide will receive. */
  amount: number;
  /** ISO currency code (default EUR). */
  currency?: string;
  /** Number of paid listens contributing to the amount. */
  listens: number;
  /** Guide share percent (e.g. 70). */
  sharePct?: number;
  /** Optional delta vs previous period: e.g. { pct: 24, sign: '+' }. */
  delta?: { pct: number; sign: '+' | '-' | '=' };
  /** Subtitle line, typically "À recevoir le 5 mai" — pré-formaté côté caller. */
  expectedLabel?: string;
}

/**
 * <RevenueHeroCard> — gros bloc olive du mois en cours.
 * Flat `bg-olive` (pas de gradient — règle Murmure « UNE couleur »).
 * Port de docs/design/ds/studio-revenus.jsx:51-64.
 */
export function RevenueHeroCard({
  amount,
  currency = 'EUR',
  listens,
  sharePct = 70,
  delta,
  expectedLabel = 'À recevoir le mois prochain',
}: RevenueHeroCardProps) {
  const fullStr = formatEuros(amount, { withCents: true, currency });
  // Split "342,00 €" into "342" and ",00 €"
  const match = /^(-?[\d\s ]+)([.,]\d+)?\s?(.*)?$/.exec(fullStr);
  const intPart = match?.[1]?.trim() ?? fullStr;
  const decPart = match?.[2] ? `${match[2]}` : '';
  const symbol = match?.[3]?.trim() ?? '€';

  const deltaLabel = delta
    ? `${delta.sign === '=' ? '=' : `${delta.sign}${delta.pct} %`} vs mois précédent`
    : null;

  return (
    <div
      className="relative overflow-hidden rounded-xl p-7 bg-olive text-paper"
      data-testid="revenue-hero"
    >
      <div className="tg-eyebrow text-paper/70">{expectedLabel}</div>
      <div className="flex items-baseline gap-1.5 mt-2" data-testid="revenue-hero-amount">
        <div className="font-display text-h2 leading-none">{intPart}</div>
        <div className="font-display text-h5 opacity-85">
          {decPart} {symbol}
        </div>
      </div>
      <div className="text-caption opacity-85 mt-2">
        {listens.toLocaleString('fr-FR')} écoutes payantes · part de {sharePct}&nbsp;%
      </div>
      {deltaLabel && (
        <div className="text-meta opacity-85 mt-4" data-testid="revenue-hero-delta">
          {deltaLabel}
        </div>
      )}
    </div>
  );
}
