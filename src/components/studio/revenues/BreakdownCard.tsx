'use client';

import { formatEuros } from '@/lib/studio/revenues-helpers';

interface BreakdownCardProps {
  /** Nombre d'écoutes payantes du mois. */
  listens: number;
  /** Revenu brut moyen par écoute (€). */
  grossPerListen: number;
  /** Revenu brut total (€). */
  grossTotal: number;
  /** Part guide (%). */
  sharePct: number;
  /** Net reçu par le guide (€). */
  netAmount: number;
}

/**
 * <BreakdownCard> — card "Comment c'est calculé".
 * 5 lignes : écoutes / × revenu brut / = brut total / × part / = net.
 * Port de docs/design/ds/studio-revenus.jsx:175-199.
 */
export function BreakdownCard({
  listens,
  grossPerListen,
  grossTotal,
  sharePct,
  netAmount,
}: BreakdownCardProps) {
  return (
    <div className="bg-card border border-line rounded-lg p-5" data-testid="breakdown-card">
      <div className="tg-eyebrow text-ocre">Comment c&apos;est calculé</div>
      <div className="mt-3.5 flex flex-col gap-2.5 text-meta">
        <Row label="Écoutes payantes" value={listens.toLocaleString('fr-FR')} mono />
        <Row label="× revenu brut moyen" value={formatEuros(grossPerListen)} mono />
        <Row
          label="= revenu brut total"
          value={formatEuros(grossTotal)}
          mono
          divider="top"
        />
        <Row
          label="× votre part"
          value={`${sharePct} %`}
          mono
          accent
        />
        <Row
          label="Vous recevrez"
          value={formatEuros(netAmount)}
          divider="bold"
          large
        />
      </div>
    </div>
  );
}

interface RowProps {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
  large?: boolean;
  divider?: 'top' | 'bold' | null;
}

function Row({ label, value, mono = false, accent = false, large = false, divider }: RowProps) {
  return (
    <div
      className={`flex justify-between items-center ${
        divider === 'top'
          ? 'pt-2 border-t border-line'
          : divider === 'bold'
            ? 'pt-2.5 border-t-2 border-ink mt-1'
            : ''
      }`}
    >
      <span className={large ? 'font-bold text-ink' : 'text-ink-60'}>{label}</span>
      <span
        className={[
          mono ? 'font-mono' : '',
          large ? 'font-display text-h6 text-olive font-semibold' : 'font-bold',
          accent && !large ? 'text-olive' : '',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}
