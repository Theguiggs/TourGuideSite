'use client';

import Link from 'next/link';
import { MoreVertical } from 'lucide-react';
import { Pin } from '@murmure/design-system/web';
import { tgColors } from '@murmure/design-system';
import { cityFamily, FAMILY_META } from '@/components/studio/shell';
import { S3Image } from '@/components/studio/s3-image';
import {
  tourStatusLabel,
  type TourStatusLabel,
} from '@/lib/studio/tours-list-helpers';
import type { StudioSession } from '@/types/studio';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

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
  const { locale } = useStudioLocale();
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
  const copy = locale === 'en' ? {
    resume: 'Resume', edit: 'Edit', continue: 'Continue', current: 'In progress', untitled: 'Untitled tour',
    open: 'Open', photo: 'Tour photo', updated: 'Updated', language: 'language', languages: 'languages',
    plays: 'Plays', rating: 'Rating', delete: 'Delete', sceneShort: 'SC.',
  } : {
    resume: 'Reprendre', edit: 'Modifier', continue: 'Continuer', current: 'En cours', untitled: 'Visite sans titre',
    open: 'Ouvrir', photo: 'Photo de la visite', updated: 'Mis à jour le', language: 'langue', languages: 'langues',
    plays: 'Écoutes', rating: 'Note', delete: 'Supprimer', sceneShort: 'SC.',
  };
  const englishStatus: Record<string, string> = {
    published: 'Live', draft: 'Draft', recording: 'Recording', editing: 'Editing',
    pending_moderation: 'In review', revision_requested: 'Changes requested', rejected: 'Rejected', archived: 'Archived',
  };
  const statusLabel = locale === 'en' ? englishStatus[session.status] ?? status.label : status.label;

  // Action label + style depending on bucket.
  const actionConfig: { label: string; classes: string } = current
    ? {
        label: copy.resume,
        classes: 'bg-grenadine text-paper hover:opacity-90',
      }
    : status.bucket === 'live'
      ? {
          label: copy.edit,
          classes:
            'bg-transparent text-ink border border-line hover:bg-paper-soft',
        }
      : {
          label: copy.continue,
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
        'bg-card rounded-lg overflow-hidden grid grid-cols-[6px_80px_minmax(0,1fr)] items-stretch transition xl:grid-cols-[6px_100px_minmax(0,1fr)_180px_150px_132px]',
        current ? 'border-2 border-grenadine shadow-md' : 'border border-line shadow-sm',
      ].join(' ')}
    >
      {/* Bande couleur ville */}
      <span className={`${famMeta.bg} row-span-4 xl:row-span-1`} aria-hidden="true" />

      {/* Photo de couverture (cover photo) — fallback Pin si absente */}
      <Link
        href={editHref}
        className={`${famMeta.bgSoft} flex items-center justify-center relative no-underline overflow-hidden`}
        aria-label={`${copy.open} ${session.title ?? copy.untitled}`}
      >
        {session.coverPhotoKey ? (
          <S3Image
            s3Key={session.coverPhotoKey}
            alt={session.title ?? copy.photo}
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <Pin size={26} color={pinHex} />
        )}
        <span
          className={
            session.coverPhotoKey
              ? 'absolute bottom-1.5 right-1.5 text-[9px] font-bold tracking-widest text-paper bg-ink/60 px-1 py-0.5 rounded'
              : `absolute bottom-1.5 right-1.5 text-[9px] font-bold tracking-widest ${famMeta.text}`
          }
        >
          {scenesTotal} {copy.sceneShort}
        </span>
      </Link>

      {/* Title block */}
      <div className="p-4 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`tg-eyebrow ${famMeta.text}`}>{city}</span>
          {current && (
            <span className="tg-eyebrow bg-grenadine text-paper px-2 py-0.5 rounded-pill">
              {copy.current}
            </span>
          )}
        </div>
        <Link
          href={editHref}
          className="block font-display text-h6 mt-1 leading-tight text-ink no-underline hover:underline"
        >
          {session.title || copy.untitled}
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
            {copy.updated}{' '}
            {new Date(session.updatedAt).toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', {
              day: 'numeric',
              month: 'short',
            })}
            {sessionLangs.length > 0 && ` · ${sessionLangs.length} ${sessionLangs.length > 1 ? copy.languages : copy.language}`}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="col-start-2 col-span-2 flex items-center gap-5 border-t border-line p-3 xl:col-auto xl:col-span-1 xl:border-l xl:border-t-0 xl:p-4">
        <div>
          <div className="tg-eyebrow text-ink-40">{copy.plays}</div>
          <div className="font-display text-h6 mt-0.5 text-ink leading-none">
            {plays ?? '—'}
          </div>
        </div>
        {rating !== null && (
          <div>
            <div className="tg-eyebrow text-ink-40">{copy.rating}</div>
            <div className="font-display text-h6 mt-0.5 text-ocre leading-none">
              ★{rating.toFixed(1).replace('.', ',')}
            </div>
          </div>
        )}
      </div>

      {/* Status + langs */}
      <div className="col-start-2 col-span-2 flex flex-row flex-wrap items-center gap-2 border-t border-line p-3 xl:col-auto xl:col-span-1 xl:flex-col xl:items-start xl:justify-center xl:border-l xl:border-t-0 xl:p-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-meta font-bold self-start ${statusCfg.soft} ${statusCfg.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-pill ${statusCfg.dot}`} aria-hidden="true" />
          {statusLabel}
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
      <div className="col-start-2 col-span-2 flex items-center justify-end gap-1.5 border-t border-line p-3 xl:col-auto xl:col-span-1 xl:justify-center xl:border-l xl:border-t-0">
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
            aria-label={`${copy.delete} ${session.title ?? copy.untitled}`}
            title={`${copy.delete} ${session.title ?? copy.untitled}`}
            className="inline-flex h-9 w-9 items-center justify-center text-ink-40 hover:text-danger transition rounded-md"
          >
            <MoreVertical size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
