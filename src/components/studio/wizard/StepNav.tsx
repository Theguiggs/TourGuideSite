'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

interface StepNavProps {
  prevHref?: string;
  prevLabel?: string;
  nextHref?: string;
  nextLabel?: string;
  /** Disable the next button (e.g. validation incomplete). */
  nextDisabled?: boolean;
  /** Optional click handler — if provided, renders <button> instead of <Link>. */
  onNextClick?: () => void;
}

/**
 * <StepNav> — barre de navigation prev/next en bas d'une étape du wizard.
 * Bouton prev en lien transparent + bouton next en pill grenadine.
 * Port de docs/design/ds/wizard-shared.jsx:68-87.
 */
export function StepNav({
  prevHref,
  prevLabel,
  nextHref,
  nextLabel,
  nextDisabled = false,
  onNextClick,
}: StepNavProps) {
  const { locale } = useStudioLocale();
  const resolvedPrevLabel = prevLabel ?? (locale === 'en' ? 'Previous' : 'Précédent');
  const resolvedNextLabel = nextLabel ?? (locale === 'en' ? 'Next' : 'Suivant');
  return (
    <div
      className="mt-8 pt-5 border-t border-line flex justify-between items-center gap-3 flex-wrap"
      data-testid="step-nav"
    >
      {prevHref ? (
        <Link
          href={prevHref}
          data-testid="step-nav-prev"
          className="text-ink-60 hover:text-ink text-caption font-semibold py-2 no-underline transition"
        >
          <span className="inline-flex items-center gap-2"><ArrowLeft size={16} aria-hidden="true" />{resolvedPrevLabel}</span>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
      {nextHref || onNextClick ? (
        onNextClick ? (
          <button
            type="button"
            onClick={onNextClick}
            disabled={nextDisabled}
            data-testid="step-nav-next"
            className="bg-grenadine text-paper border-none px-5 py-3 rounded-pill text-caption font-bold cursor-pointer hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {resolvedNextLabel} <ArrowRight size={16} aria-hidden="true" />
          </button>
        ) : (
          <Link
            href={nextHref!}
            data-testid="step-nav-next"
            aria-disabled={nextDisabled || undefined}
            className={`bg-grenadine text-paper border-none px-5 py-3 rounded-pill text-caption font-bold cursor-pointer hover:opacity-90 transition no-underline inline-flex items-center gap-2 ${
              nextDisabled ? 'opacity-40 pointer-events-none' : ''
            }`}
          >
            {resolvedNextLabel} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )
      ) : null}
    </div>
  );
}
