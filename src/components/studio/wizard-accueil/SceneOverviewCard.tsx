'use client';

import { sceneStatusPill } from '@/lib/studio/wizard-helpers';
import type { StudioScene } from '@/types/studio';

interface SceneOverviewCardProps {
  /** 1-based index displayed as a numbered marker. */
  index: number;
  scene: StudioScene;
  /** True if this scene's audio is currently playing. */
  isPlaying: boolean;
  /** Toggle play / pause for this scene. */
  onPlayToggle: (scene: StudioScene) => void;
  /** Whether the scene has any playable audio (controls play button enabled state). */
  audioAvailable: boolean;
}

/**
 * <SceneOverviewCard> — card scène de la vue d'ensemble (étape Accueil).
 * Numéro éditorial italique + titre display + status pill + extrait italic + bouton play.
 * Port de docs/design/ds/wizard-1-accueil.jsx:48-76.
 */
export function SceneOverviewCard({
  index,
  scene,
  isPlaying,
  onPlayToggle,
  audioAvailable,
}: SceneOverviewCardProps) {
  const pill = sceneStatusPill(scene.status);
  const excerpt = scene.transcriptText?.trim();
  const hasExcerpt = excerpt && excerpt.length > 0;

  return (
    <article
      className="bg-card border border-line rounded-md px-5 py-3.5 grid items-start gap-3.5"
      style={{ gridTemplateColumns: '36px 1fr 36px' }}
      data-testid="scene-overview-card"
      data-scene-id={scene.id}
    >
      <div
        className="w-7 h-7 rounded-full bg-paper-deep text-ink-60 font-editorial italic font-bold text-caption flex items-center justify-center mt-0.5"
        aria-hidden="true"
      >
        {index}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-display text-h6 text-ink leading-tight">
            {scene.title || `Scène ${index}`}
          </span>
          <span
            className={`tg-eyebrow px-2 py-0.5 rounded-pill ${pill.bgClass} ${pill.textClass}`}
            data-testid="scene-status-pill"
          >
            {pill.label}
          </span>
        </div>
        {hasExcerpt ? (
          <>
            <div className="tg-eyebrow text-grenadine mt-1.5">Texte transcrit</div>
            <p className="font-editorial italic text-caption text-ink-80 mt-1 leading-relaxed">
              {excerpt}
            </p>
          </>
        ) : (
          <p className="text-meta text-ink-40 italic mt-1">
            Aucune transcription pour le moment.
          </p>
        )}
      </div>

      <div className="flex items-center justify-center" style={{ height: 28 }}>
        <button
          type="button"
          onClick={() => onPlayToggle(scene)}
          disabled={!audioAvailable}
          aria-label={isPlaying ? 'Pause' : "Lire l'audio"}
          aria-pressed={isPlaying}
          data-testid="scene-play-toggle"
          className="w-7 h-7 rounded-full bg-ink text-paper border-none cursor-pointer text-meta flex items-center justify-center hover:opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
      </div>
    </article>
  );
}
