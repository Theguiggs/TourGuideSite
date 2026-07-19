'use client';

import { useStudioLocale } from '@/lib/i18n/studio-locale';

interface NextPaymentCardProps {
  /** Pre-formatted payment date label (e.g. "5 mai 2026"). */
  dateLabel: string;
  /** Days until that date. */
  daysUntil: number;
  /** Last 4 digits of the IBAN (e.g. "4287"). */
  ibanLast4?: string;
  /** Bank label (e.g. "BNP Paribas Antibes"). */
  bankLabel?: string;
}

/**
 * <NextPaymentCard> — card "Prochain versement" mer-soft.
 * Port de docs/design/ds/studio-revenus.jsx:202-215.
 */
export function NextPaymentCard({
  dateLabel,
  daysUntil,
  ibanLast4,
  bankLabel,
}: NextPaymentCardProps) {
  const { locale } = useStudioLocale();
  const ibanStr = ibanLast4 ? `IBAN •••• ${ibanLast4}` : locale === 'en' ? 'IBAN required' : 'IBAN à renseigner';

  return (
    <div className="bg-mer-soft rounded-lg p-5" data-testid="next-payment">
      <div className="tg-eyebrow text-mer">{locale === 'en' ? 'Next payment' : 'Prochain versement'}</div>
      <div className="font-display text-h6 mt-2 leading-snug text-ink">
        {dateLabel}
        <br />
        <em className="font-editorial italic text-body text-mer">
          {daysUntil === 0
            ? (locale === 'en' ? 'today' : "aujourd'hui")
            : daysUntil === 1
              ? (locale === 'en' ? 'tomorrow' : 'demain')
              : locale === 'en' ? `in ${daysUntil} days` : `dans ${daysUntil} jours`}
        </em>
      </div>
      <div className="text-meta text-ink-60 mt-2 italic">
        {locale === 'en' ? 'Automatic transfer' : 'Virement automatique'}{ibanLast4 || bankLabel ? (locale === 'en' ? ' to ' : ' sur ') : ''}
        {ibanStr}
        {bankLabel && ` · ${bankLabel}`}
      </div>
      <div className="h-px bg-line my-3.5" aria-hidden="true" />
      <div className="text-meta text-ink-60">
        {locale === 'en' ? 'Tax receipt available the next day · VAT not applicable, article 293 B of the French tax code.' : 'Reçu fiscal disponible le lendemain · TVA non applicable, art. 293 B du CGI.'}
      </div>
    </div>
  );
}
