'use client';

import Link from 'next/link';
import type { StudioSession } from '@/types/studio';

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
  const pct = scenesTotal > 0 ? Math.min(100, Math.round((scenesDone / scenesTotal) * 100)) : 0;
  const continueHref = `/guide/studio/${session.id}/scenes`;
  const previewHref = `/guide/studio/${session.id}/preview`;

  // Subtitle adaptatif selon scenes
  const subtitle =
    scenesTotal === 0
      ? 'Aucune scène pour le moment'
      : scenesDone === scenesTotal
        ? `${scenesTotal} scènes prêtes — pensez à publier`
        : `Brouillon · ${scenesTotal} scène${scenesTotal > 1 ? 's' : ''} · ${scenesDone}/${scenesTotal} finalisées`;

  return (
    <div
      className="relative overflow-hidden rounded-xl p-8 bg-grenadine"
      data-testid="resume-hero"
    >
      <div className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="tg-eyebrow text-paper/70">
            {guideName ? `Bonjour ${guideName} · ` : ''}Reprendre où vous étiez
          </div>
          <h2 className="font-display text-h4 text-paper mt-3 leading-tight">
            {session.title || 'Session sans titre'}
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
              <span aria-hidden="true">▶</span>
              Continuer
            </Link>
            <Link
              href={previewHref}
              className="bg-paper/15 text-paper border border-paper/30 no-underline px-5 py-3 rounded-pill text-caption font-semibold hover:bg-paper/25 transition"
            >
              Aperçu du tour
            </Link>
          </div>
        </div>

        <div className="hidden md:block w-48 p-3.5 bg-paper/10 rounded-md text-paper shrink-0">
          <div className="tg-eyebrow opacity-70">Progression</div>
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
            {scenesDone} / {scenesTotal} scènes finalisées
          </div>
        </div>
      </div>
    </div>
  );
}
