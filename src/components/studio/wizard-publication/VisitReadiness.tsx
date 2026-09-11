'use client';

import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { useStudioLocale } from '@/lib/i18n/studio-locale';
import type { VisitCompletenessCheckId, VisitCompletenessReport } from '@/lib/studio/visit-completeness';

const CHECK_LABELS: Record<VisitCompletenessCheckId, { fr: string; en: string }> = {
  narration_mode: { fr: 'Mode de narration choisi', en: 'Narration mode chosen' },
  source_text: { fr: 'Chaque scène a un titre et un texte final', en: 'Every scene has a title and a final text' },
  source_audio: { fr: 'Audio de votre voix sur chaque scène', en: 'Your voice recorded on every scene' },
  audio_mode_consistency: { fr: 'Audio cohérent avec le mode choisi', en: 'Audio consistent with the chosen mode' },
  tts_readiness: { fr: 'Textes prêts pour la voix de synthèse', en: 'Texts ready for the synthetic voice' },
};

export interface VisitReadinessProps {
  report: VisitCompletenessReport;
  sessionId: string;
  scenes: ReadonlyArray<{ id: string; title: string | null; order?: number }>;
}

/**
 * La liste de contrôle AVANT le clic (lot 6.1). Avant, `evaluateStudioVisit`
 * ne tournait qu'à l'intérieur de `submitForReview` : le guide cliquait
 * « Publier », attendait, et lisait un refus en une ligne. Ici chaque point
 * est visible d'avance, et chaque scène bloquante est un lien.
 */
export function VisitReadiness({ report, sessionId, scenes }: VisitReadinessProps) {
  const { t, locale } = useStudioLocale();
  const byId = new Map(scenes.map((s, i) => [s.id, { title: s.title, number: (s.order ?? i) + 1 }]));
  const failing = report.checks.filter((c) => !c.passed);

  return (
    <section
      aria-labelledby="visit-readiness-title"
      data-testid="visit-readiness"
      data-ready={report.ready ? 'true' : 'false'}
      className={`rounded-lg border p-3 mb-3 ${report.ready ? 'border-olive-soft bg-olive-soft' : 'border-ocre-soft bg-ocre-soft'}`}
    >
      <h2 id="visit-readiness-title" className="text-body font-semibold text-ink mb-2">
        {report.ready
          ? t('Prête pour la modération', 'Ready for review')
          : t(`${failing.length} point(s) à corriger avant de soumettre`, `${failing.length} item(s) to fix before submitting`)}
      </h2>
      <ul className="space-y-1">
        {report.checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2 text-body" data-testid={`readiness-${check.id}`} data-passed={check.passed ? 'true' : 'false'}>
            {check.passed
              ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-olive" aria-hidden="true" />
              : <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />}
            <div className="min-w-0 flex-1">
              <span className={check.passed ? 'text-ink-80' : 'font-medium text-ink'}>
                {locale === 'en' ? CHECK_LABELS[check.id].en : CHECK_LABELS[check.id].fr}
              </span>
              {!check.passed && <p className="text-meta text-ink-60">{check.evidence}</p>}
              {!check.passed && check.sceneIds.length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {check.sceneIds.map((id) => {
                    const scene = byId.get(id);
                    const label = scene
                      ? t(`Scène ${scene.number}`, `Scene ${scene.number}`) + (scene.title ? ` · ${scene.title}` : '')
                      : t('Scène', 'Scene');
                    return (
                      <li key={id}>
                        <Link
                          href={`/guide/studio/${sessionId}/scenes`}
                          className="inline-block rounded-pill border border-ocre bg-card px-2 py-0.5 text-meta font-medium text-ocre-ink hover:bg-paper"
                        >
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
