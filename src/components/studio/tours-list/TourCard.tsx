'use client';

import Link from 'next/link';
import { Pin } from '@tourguide/design-system/web';
import { tgColors } from '@tourguide/design-system';
import { cityFamily, FAMILY_META } from '@/components/studio/shell';
import {
  tourStatusLabel,
  type TourStatusLabel,
} from '@/lib/studio/tours-list-helpers';
import type { StudioSession } from '@/types/studio';

interface TourCardProps {
  /** Session to display. */
  session: StudioSession;
  /** Total number of scenes for the progress bar. */
  scenesTotal?: number;
  /** Number of finalized scenes (drives progress bar). */
  scenesDone?: number;
  /** Real plays count (or null when analytics unavailable). */
  plays?: number | null;
  /** Average rating (or null when not enough data). */
  rating?: number | null;
  /** True if this is the session the guide is currently working on (last visited). */
  current?: boolean;
  /** Available languages — codes ISO uppercase ("FR", "EN", "DE", "ES", "IT", "JA"). */
  langs?: string[];
  /** Delete callback for the danger menu. */
  onDelete?: (session: StudioSession) => void;
}

const STATUS_CFG: Record<
  TourStatusLabel['color'],
  { soft: string; text: string; dot: string }
> = {
  success: { soft: 'bg-olive-soft', text: 'text-success', dot: 'bg-success' },
  ocre: { soft: 'bg-ocre-soft', text: 'text-ocre', dot: 'bg-ocre' },
  mer: { soft: 'bg-mer-soft', text: 'text-mer', dot: 'bg-mer' },
  danger: { soft: 'bg-grenadine-soft', text: 'text-danger', dot: 'bg-danger' },
};

const PROGRESS_BAR_COLOR: Record<TourStatusLabel['color'], string> = {
  success: 'bg-success',
  ocre: 'bg-ocre',
  mer: 'bg-mer',
  danger: 'bg-danger',
};

/**
 * Compute a city label from the session title (everything before the first
 * em-dash / hyphen / comma) — falls back to "Tour" when absent.
 */
function cityFromTitle(title: string | null | undefined): string {
  if (!title) return 'Tour';
  return title.split(/[—\-,]/)[0]?.trim() || 'Tour';
}

/**
 * <TourCard> — card horizontale du catalogue Studio.
 * Bande couleur ville + photo placeholder Pin + titre + stats + status/langs + action.
 * Port de docs/design/ds/studio-tours.jsx:80-162.
 */
export function TourCard({
  session,
  scenesTotal = 0,
  scenesDone = 0,
  plays = null,
  rating = null,
  current = false,
  langs,
  onDelete,
}: TourCardProps) {
  const city = cityFromTitle(session.title);
  const fam = cityFamily(city);
  const famMeta = FAMILY_META[fam];
  const status = tourStatusLabel(session.status);
  const statusCfg = STATUS_CFG[status.color];
  const progressBarCfg = PROGRESS_BAR_COLOR[status.color];

  const sessionLangs = langs ?? [
    session.language.toUpperCase(),
    ...(session.availableLanguages ?? [])
      .filter((l) => l !== session.language)
      .map((l) => l.toUpperCase()),
  ];

  const showProgress = status.bucket === 'draft' && scenesTotal > 0;
  const pct = showProgress ? Math.round((scenesDone / scenesTotal) * 100) : 0;

  // Action label + style depending on bucket.
  const actionConfig: { label: string; classes: string } = current
    ? {
        label: 'Reprendre',
        classes: 'bg-grenadine text-paper hover:opacity-90',
      }
    : status.bucket === 'live'
      ? {
          label: 'Modifier',
          classes:
            'bg-transparent text-ink border border-line hover:bg-paper-soft',
        }
      : {
          label: 'Continuer',
          classes: 'bg-ink text-paper hover:opacity-90',
        };

  // For the Pin (DS component), color must be a hex from tokens.
  const pinHex = tgColors[fam];

  const editHref = `/guide/studio/${session.id}/scenes`;

  return (
    <div
      data-testid="tour-card"
      data-session-id={session.id}
      className={[
        'bg-card rounded-lg overflow-hidden grid items-stretch transition',
        current ? 'border-2 border-grenadine shadow-md' : 'border border-line shadow-sm',
      ].join(' ')}
      style={{ gridTemplateColumns: '6px 100px 1fr 200px 160px 140px' }}
    >
      {/* Bande couleur ville */}
      <span className={famMeta.bg} aria-hidden="true" />

      {/* Photo placeholder */}
      <Link
        href={editHref}
        className={`${famMeta.bgSoft} flex items-center justify-center relative no-underline`}
        aria-label={`Ouvrir ${session.title ?? 'la session'}`}
      >
        <Pin size={26} color={pinHex} />
        <span
          className={`absolute bottom-1.5 right-1.5 text-[9px] font-bold tracking-widest ${famMeta.text}`}
        >
          {scenesTotal} SC.
        </span>
      </Link>

      {/* Title block */}
      <div className="p-4 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`tg-eyebrow ${famMeta.text}`}>{city}</span>
          {current && (
            <span className="tg-eyebrow bg-grenadine text-paper px-2 py-0.5 rounded-pill">
              En cours
            </span>
          )}
        </div>
        <Link
          href={editHref}
          className="block font-display text-h6 mt-1 leading-tight text-ink no-underline hover:underline"
        >
          {session.title || 'Tour sans titre'}
        </Link>
        {showProgress ? (
          <div className="mt-2.5 flex items-center gap-2 max-w-xs">
            <div className="flex-1 h-1 bg-paper-deep rounded-sm overflow-hidden">
              <div
                className={`h-full ${progressBarCfg} transition-all`}
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
            </div>
            <div className="text-meta text-ink-60 font-semibold">{pct}%</div>
          </div>
        ) : (
          <div className="text-meta text-ink-60 mt-1.5 font-editorial italic">
            Mis à jour le{' '}
            {new Date(session.updatedAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
            })}
            {sessionLangs.length > 0 && ` · ${sessionLangs.length} langue${sessionLangs.length > 1 ? 's' : ''}`}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="p-4 border-l border-line flex items-center gap-5">
        <div>
          <div className="tg-eyebrow text-ink-40">Écoutes</div>
          <div className="font-display text-h6 mt-0.5 text-ink leading-none">
            {plays ?? '—'}
          </div>
        </div>
        {rating !== null && (
          <div>
            <div className="tg-eyebrow text-ink-40">Note</div>
            <div className="font-display text-h6 mt-0.5 text-ocre leading-none">
              ★{rating.toFixed(1).replace('.', ',')}
            </div>
          </div>
        )}
      </div>

      {/* Status + langs */}
      <div className="p-4 border-l border-line flex flex-col justify-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-meta font-bold self-start ${statusCfg.soft} ${statusCfg.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-pill ${statusCfg.dot}`} aria-hidden="true" />
          {status.label}
        </span>
        <div className="flex gap-1 flex-wrap">
          {sessionLangs.map((l) => (
            <span
              key={l}
              className="text-[10px] px-1.5 py-0.5 bg-paper-deep text-ink-60 rounded-sm font-bold tracking-wider"
            >
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* Action */}
      <div className="p-3 border-l border-line flex items-center justify-center gap-1.5">
        <Link
          href={editHref}
          data-testid="tour-card-cta"
          className={`flex-1 text-center px-3.5 py-2.5 rounded-md text-meta font-bold cursor-pointer transition no-underline ${actionConfig.classes}`}
        >
          {actionConfig.label}
        </Link>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(session)}
            data-testid="tour-card-delete"
            aria-label={`Supprimer ${session.title ?? 'la session'}`}
            className="px-2 py-2 text-ink-40 hover:text-danger transition rounded-md"
          >
            <span aria-hidden="true">⋯</span>
          </button>
        )}
      </div>
    </div>
  );
}
