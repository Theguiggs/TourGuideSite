'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { getGuideTours } from '@/lib/api/guide';
import { createTourWithSession, listStudioSessions } from '@/lib/api/studio';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import type { GuideTourSummary } from '@/types/guide';
import type { StudioSession } from '@/types/studio';

const SERVICE_NAME = 'GuideToursPage';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-paper-deep text-ink-60' },
  synced: { label: 'Transféré', className: 'bg-mer-soft text-mer' },
  editing: { label: 'Édition', className: 'bg-mer-soft text-mer' },
  recording: { label: 'Enregistrement', className: 'bg-mer-soft text-mer' },
  ready: { label: 'Prêt', className: 'bg-olive-soft text-olive' },
  submitted: { label: 'Soumis', className: 'bg-ocre-soft text-ocre' },
  review: { label: 'En revue', className: 'bg-ocre-soft text-ocre' },
  pending_moderation: { label: 'En modération', className: 'bg-ocre-soft text-ocre' },
  published: { label: 'Publié', className: 'bg-olive-soft text-olive' },
  paused: { label: 'En pause', className: 'bg-ocre-soft text-ocre' },
  revision_requested: { label: 'Révision demandée', className: 'bg-ocre-soft text-ocre' },
  rejected: { label: 'Rejeté', className: 'bg-grenadine-soft text-danger' },
  archived: { label: 'Archivé', className: 'bg-paper-deep text-ink-40' },
};

const EDITABLE_STATUSES = ['draft', 'synced', 'editing', 'revision_requested', 'rejected'];

/** Enriched tour info combining GuideTour + linked StudioSessions */
interface TourWithVersions {
  tour: GuideTourSummary;
  publishedVersion: number | null;
  publishedSessionId: string | null;
  draftVersion: number | null;
  draftSessionId: string | null;
  draftStatus: string | null;
}

function enrichToursWithSessions(tours: GuideTourSummary[], sessions: StudioSession[]): TourWithVersions[] {
  return tours.map((tour) => {
    const linked = sessions
      .filter((s) => s.tourId === tour.id)
      .sort((a, b) => (b.version ?? 1) - (a.version ?? 1));

    const published = linked.find((s) => s.status === 'published');
    const draft = linked.find((s) => s.status !== 'published' && s.status !== 'archived');

    return {
      tour,
      publishedVersion: published ? (published.version ?? 1) : null,
      publishedSessionId: published ? published.id : null,
      draftVersion: draft ? (draft.version ?? 1) : null,
      draftSessionId: draft ? draft.id : null,
      draftStatus: draft ? draft.status : null,
    };
  });
}

export default function GuideToursPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tours, setTours] = useState<GuideTourSummary[]>([]);
  const [sessions, setSessions] = useState<StudioSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCity, setNewCity] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const guideId = shouldUseStubs() ? 'guide-1' : user?.guideId ?? null;

  useEffect(() => {
    if (!guideId) return;
    Promise.all([
      getGuideTours(guideId),
      listStudioSessions(guideId),
    ])
      .then(([t, s]) => { setTours(t); setSessions(s); })
      .catch((e) => logger.error(SERVICE_NAME, 'Failed to load tours', { error: String(e) }))
      .finally(() => setLoading(false));
  }, [guideId]);

  const enriched = useMemo(() => enrichToursWithSessions(tours, sessions), [tours, sessions]);

  const handleCreateTour = useCallback(async () => {
    if (!guideId || !newTitle.trim() || !newCity.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const result = await createTourWithSession(guideId, newTitle.trim(), newCity.trim());
      if (result.ok) {
        router.push(`/guide/studio/${result.sessionId}`);
      } else {
        setCreateError(result.error);
      }
    } catch (e) {
      setCreateError('Erreur inattendue.');
      logger.error(SERVICE_NAME, 'Create tour failed', { error: String(e) });
    } finally {
      setCreating(false);
    }
  }, [guideId, newTitle, newCity, router]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-h4 text-ink leading-none">Mes Parcours</h1>
          <Link
            href="/guide/studio"
            className="text-caption text-grenadine hover:opacity-80 mt-2 inline-block underline-offset-2 hover:underline"
            data-testid="studio-link-from-tours"
          >
            Ouvrir Mon Studio →
          </Link>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          data-testid="create-tour-btn"
          className="bg-grenadine text-paper font-bold px-4 py-2.5 rounded-pill hover:opacity-90 transition text-caption"
        >
          + Nouveau parcours
        </button>
      </div>

      {/* New tour modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full shadow-lg">
            <h2 className="font-display text-h5 text-ink mb-4 leading-none">Nouveau parcours</h2>
            {createError && (
              <p className="text-danger text-caption mb-4 bg-grenadine-soft p-2.5 rounded-md">{createError}</p>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-meta font-semibold text-ink-80 mb-1.5">Titre du parcours</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex : L'Âme des Parfumeurs"
                  className="w-full bg-paper border border-line rounded-md px-4 py-2 text-caption text-ink focus:outline-none focus:border-grenadine focus:ring-2 focus:ring-grenadine-soft transition"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-meta font-semibold text-ink-80 mb-1.5">Ville</label>
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="Ex : Grasse"
                  className="w-full bg-paper border border-line rounded-md px-4 py-2 text-caption text-ink focus:outline-none focus:border-grenadine focus:ring-2 focus:ring-grenadine-soft transition"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowNewForm(false); setNewTitle(''); setNewCity(''); setCreateError(null); }}
                className="flex-1 bg-paper-soft text-ink-80 font-medium py-2.5 rounded-md hover:bg-paper-deep transition text-caption"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateTour}
                disabled={creating || !newTitle.trim() || !newCity.trim()}
                className="flex-1 bg-grenadine text-paper font-bold py-2.5 rounded-md hover:opacity-90 disabled:opacity-50 transition text-caption"
              >
                {creating ? 'Création…' : 'Créer et éditer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="bg-paper-soft rounded-md h-16 animate-pulse" />)}
        </div>
      ) : tours.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-display text-h5 text-ink-60 mb-2">Aucun parcours pour l&apos;instant</p>
          <p className="text-caption text-ink-40 italic mb-6">Créez votre premier parcours audio guide.</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="bg-grenadine text-paper font-bold px-6 py-3 rounded-pill hover:opacity-90 transition text-caption"
          >
            Créer mon premier parcours
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {enriched.map(({ tour, publishedVersion, draftVersion, draftSessionId, draftStatus }) => {
            const badge = STATUS_BADGES[tour.status] ?? STATUS_BADGES.draft;
            const canEdit = tour.sessionId && EDITABLE_STATUSES.includes(tour.status);
            const canView = tour.sessionId && (tour.status === 'review' || tour.status === 'pending_moderation');
            const isPublished = tour.status === 'published';
            const draftBadge = draftStatus ? STATUS_BADGES[draftStatus] : null;

            return (
              <div
                key={tour.id}
                data-testid={`tour-card-${tour.id}`}
                className="bg-card border border-line rounded-md px-4 py-3 hover:border-grenadine hover:shadow-sm transition"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Title */}
                  <h2 className="font-semibold text-ink truncate">{tour.title}</h2>
                  <span className="text-caption text-ink-40">{tour.city}</span>

                  {/* Version badges */}
                  {publishedVersion !== null && (
                    <span className="inline-flex px-1.5 py-0.5 rounded-pill text-meta font-semibold bg-olive-soft text-olive shrink-0">
                      V{publishedVersion} publiée
                    </span>
                  )}
                  {draftVersion !== null && draftVersion > (publishedVersion ?? 0) && draftBadge && (
                    <span className={`inline-flex px-1.5 py-0.5 rounded-pill text-meta font-semibold shrink-0 ${draftBadge.className}`}>
                      V{draftVersion} {draftBadge.label.toLowerCase()}
                    </span>
                  )}

                  {/* Status (if no version info shown) */}
                  {publishedVersion === null && draftVersion === null && (
                    <span className={`inline-flex px-2 py-0.5 rounded-pill text-meta font-medium shrink-0 ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}

                  <span className="flex-1" />

                  {/* Published stats */}
                  {isPublished && (
                    <span className="hidden sm:flex items-center gap-2 text-meta text-ink-60 shrink-0">
                      <span>{tour.listens} écoutes</span>
                      <span className="text-ocre">{tour.rating} ★</span>
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    {draftSessionId && (
                      <Link
                        href={`/guide/studio/${draftSessionId}`}
                        className="text-meta text-grenadine font-medium px-3 py-1 rounded-md hover:bg-grenadine-soft transition no-underline"
                      >
                        Éditer V{draftVersion} →
                      </Link>
                    )}
                    {!draftSessionId && canEdit && (
                      <Link
                        href={`/guide/studio/${tour.sessionId}`}
                        className="text-meta text-grenadine font-medium px-3 py-1 rounded-md hover:bg-grenadine-soft transition no-underline"
                      >
                        Éditer →
                      </Link>
                    )}
                    {!draftSessionId && isPublished && tour.sessionId && (
                      <Link
                        href={`/guide/studio/${tour.sessionId}`}
                        className="text-meta text-ink-60 font-medium px-3 py-1 hover:text-grenadine transition no-underline"
                      >
                        Studio →
                      </Link>
                    )}
                    {canView && (
                      <Link
                        href={`/guide/studio/${tour.sessionId}/preview`}
                        className="text-meta text-ocre font-medium px-3 py-1 hover:underline underline-offset-2"
                      >
                        Voir →
                      </Link>
                    )}
                    <Link
                      href={`/guide/tours/${tour.id}/reviews`}
                      className="text-meta text-ocre font-medium px-3 py-1 rounded-md hover:bg-ocre-soft transition no-underline"
                    >
                      Avis ★
                    </Link>
                  </div>
                </div>

                {/* Rejection feedback */}
                {tour.rejectionFeedback && (
                  <p className="text-meta text-danger mt-2 bg-grenadine-soft p-2.5 rounded-md">
                    Feedback : {tour.rejectionFeedback}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
