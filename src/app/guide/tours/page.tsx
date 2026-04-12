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
  draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700' },
  synced: { label: 'Transfere', className: 'bg-indigo-100 text-indigo-700' },
  editing: { label: 'Edition', className: 'bg-blue-100 text-blue-700' },
  recording: { label: 'Enregistrement', className: 'bg-blue-100 text-blue-700' },
  ready: { label: 'Pret', className: 'bg-green-100 text-green-700' },
  submitted: { label: 'Soumis', className: 'bg-yellow-100 text-yellow-700' },
  review: { label: 'En revue', className: 'bg-yellow-100 text-yellow-700' },
  pending_moderation: { label: 'En moderation', className: 'bg-yellow-100 text-yellow-700' },
  published: { label: 'Publie', className: 'bg-green-200 text-green-800' },
  paused: { label: 'En pause', className: 'bg-amber-100 text-amber-700' },
  revision_requested: { label: 'Revision demandee', className: 'bg-orange-100 text-orange-700' },
  rejected: { label: 'Rejete', className: 'bg-red-100 text-red-700' },
  archived: { label: 'Archive', className: 'bg-gray-200 text-gray-500' },
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
          <h1 className="text-2xl font-bold text-gray-900">Mes Parcours</h1>
          <Link href="/guide/studio" className="text-sm text-teal-600 hover:text-teal-700 mt-1 inline-block" data-testid="studio-link-from-tours">
            Ouvrir Mon Studio &rarr;
          </Link>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          data-testid="create-tour-btn"
          className="bg-teal-700 text-white font-bold px-4 py-2 rounded-xl hover:bg-teal-800 text-sm"
        >
          + Nouveau parcours
        </button>
      </div>

      {/* New tour modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Nouveau parcours</h2>
            {createError && (
              <p className="text-red-600 text-sm mb-4 bg-red-50 p-2 rounded">{createError}</p>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre du parcours</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex : L'Ame des Parfumeurs"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="Ex : Grasse"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowNewForm(false); setNewTitle(''); setNewCity(''); setCreateError(null); }}
                className="flex-1 bg-gray-100 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateTour}
                disabled={creating || !newTitle.trim() || !newCity.trim()}
                className="flex-1 bg-teal-700 text-white font-bold py-2 rounded-lg hover:bg-teal-800 disabled:opacity-50"
              >
                {creating ? 'Creation...' : 'Creer et editer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="bg-gray-100 rounded-lg h-16 animate-pulse" />)}
        </div>
      ) : tours.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">Aucun parcours pour l&apos;instant</p>
          <p className="text-sm mb-6">Creez votre premier parcours audio guide.</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="bg-teal-700 text-white font-bold px-6 py-3 rounded-xl hover:bg-teal-800"
          >
            Creer mon premier parcours
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
              <div key={tour.id} data-testid={`tour-card-${tour.id}`} className="bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-teal-300 transition-colors">
                <div className="flex items-center gap-3">
                  {/* Title */}
                  <h2 className="font-semibold text-gray-900 truncate">{tour.title}</h2>
                  <span className="text-sm text-gray-400">{tour.city}</span>

                  {/* Version badges */}
                  {publishedVersion !== null && (
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold bg-green-100 text-green-700 shrink-0">
                      V{publishedVersion} publiee
                    </span>
                  )}
                  {draftVersion !== null && draftVersion > (publishedVersion ?? 0) && draftBadge && (
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold shrink-0 ${draftBadge.className}`}>
                      V{draftVersion} {draftBadge.label.toLowerCase()}
                    </span>
                  )}

                  {/* Status (if no version info shown) */}
                  {publishedVersion === null && draftVersion === null && (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}

                  <span className="flex-1" />

                  {/* Published stats */}
                  {isPublished && (
                    <span className="hidden sm:flex items-center gap-2 text-xs text-gray-500 shrink-0">
                      <span>{tour.listens} ecoutes</span>
                      <span>{tour.rating} &#x2605;</span>
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    {draftSessionId && (
                      <Link
                        href={`/guide/studio/${draftSessionId}`}
                        className="text-sm text-teal-600 font-medium px-3 py-1 rounded-lg hover:bg-teal-50 transition-colors"
                      >
                        Editer V{draftVersion} &rarr;
                      </Link>
                    )}
                    {!draftSessionId && canEdit && (
                      <Link
                        href={`/guide/studio/${tour.sessionId}`}
                        className="text-sm text-teal-600 font-medium px-3 py-1 rounded-lg hover:bg-teal-50 transition-colors"
                      >
                        Editer &rarr;
                      </Link>
                    )}
                    {!draftSessionId && isPublished && tour.sessionId && (
                      <Link
                        href={`/guide/studio/${tour.sessionId}`}
                        className="text-sm text-gray-500 font-medium px-3 py-1 hover:text-teal-600 transition-colors"
                      >
                        Studio &rarr;
                      </Link>
                    )}
                    {canView && (
                      <Link
                        href={`/guide/studio/${tour.sessionId}/preview`}
                        className="text-sm text-yellow-700 font-medium px-3 py-1 hover:underline"
                      >
                        Voir &rarr;
                      </Link>
                    )}
                    <Link
                      href={`/guide/tours/${tour.id}/reviews`}
                      className="text-sm text-amber-600 font-medium px-3 py-1 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      Avis &#9733;
                    </Link>
                  </div>
                </div>

                {/* Rejection feedback */}
                {tour.rejectionFeedback && (
                  <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded">
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
