'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';
import type { StudioSession } from '@/types/studio';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

interface ResumeHeroProps {
  session: StudioSession;
  /** Total scenes for this session (for progression bar). */
  scenesTotal: number;
  /** Number of scenes already finalized (for progression bar). */
  scenesDone: number;
  /** Greeting name (defaults to no name). */
  guideName?: string;
}

/**
 * <ResumeHero> — bannière "Reprendre où vous étiez" en dégradé grenadine.
 * Affichée sur le Dashboard quand au moins une session est encore reprenable.
 * Port de docs/design/ds/studio-dashboard.jsx:11-39.
 */
export function ResumeHero({
  session,
  scenesTotal,
  scenesDone,
  guideName,
}: ResumeHeroProps) {
  const { locale } = useStudioLocale();
  const copy = locale === 'en' ? {
    noScene: 'No scenes yet', ready: (count: number) => `${count} scenes ready - consider publishing`,
    draft: 'Draft', scene: 'scene', scenes: 'scenes', finalised: 'finalised', hello: 'Hello', resume: 'Resume where you left off',
    untitled: 'Untitled session', continue: 'Continue', preview: 'Tour preview', progress: 'Progress',
  } : {
    noScene: 'Aucune scène pour le moment', ready: (count: number) => `${count} scènes prêtes - pensez à publier`,
    draft: 'Brouillon', scene: 'scène', scenes: 'scènes', finalised: 'finalisées', hello: 'Bonjour', resume: 'Reprendre où vous étiez',
    untitled: 'Session sans titre', continue: 'Continuer', preview: 'Aperçu de la visite', progress: 'Progression',
  };
  const pct = scenesTotal > 0 ? Math.min(100, Math.round((scenesDone / scenesTotal) * 100)) : 0;
  const continueHref = `/guide/studio/${session.id}/scenes`;
  const previewHref = `/guide/studio/${session.id}/preview`;

  // Subtitle adaptatif selon scenes
  const subtitle =
    scenesTotal === 0
      ? copy.noScene
      : scenesDone === scenesTotal
        ? copy.ready(scenesTotal)
        : `${copy.draft} · ${scenesTotal} ${scenesTotal > 1 ? copy.scenes : copy.scene} · ${scenesDone}/${scenesTotal} ${copy.finalised}`;

  return (
    <div
      className="relative overflow-hidden rounded-xl p-8 bg-grenadine"
      data-testid="resume-hero"
    >
      <div className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="tg-eyebrow text-paper/70">
            {guideName ? `${copy.hello} ${guideName} · ` : ''}{copy.resume}
          </div>
          <h2 className="font-display text-h4 text-paper mt-3 leading-tight">
            {session.title || copy.untitled}
          </h2>
          <p className="font-editorial italic text-body text-paper/85 mt-2">
            {subtitle}
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Link
              href={continueHref}
              data-testid="resume-continue"
              className="bg-paper text-grenadine no-underline px-5 py-3 rounded-pill text-caption font-bold inline-flex items-center gap-2 hover:opacity-90 transition"
            >
              <Play size={15} fill="currentColor" aria-hidden="true" />
              {copy.continue}
            </Link>
            <Link
              href={previewHref}
              className="bg-paper/15 text-paper border border-paper/30 no-underline px-5 py-3 rounded-pill text-caption font-semibold hover:bg-paper/25 transition"
            >
              {copy.preview}
            </Link>
          </div>
        </div>

        <div className="hidden md:block w-48 p-3.5 bg-paper/10 rounded-md text-paper shrink-0">
          <div className="tg-eyebrow opacity-70">{copy.progress}</div>
          <div className="font-display text-h5 mt-1" data-testid="resume-pct">
            {pct}%
          </div>
          <div className="h-1 bg-paper/20 rounded-sm mt-2 overflow-hidden">
            <div
              className="h-full bg-paper transition-all"
              style={{ width: `${pct}%` }}
              aria-hidden="true"
            />
          </div>
          <div className="text-meta opacity-85 mt-2">
            {scenesDone} / {scenesTotal} {copy.finalised}
          </div>
        </div>
      </div>
    </div>
  );
}
