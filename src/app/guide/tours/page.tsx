'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { getGuideTours } from '@/lib/api/guide';
import { createTourWithSession } from '@/lib/api/studio';
import { logger } from '@/lib/logger';
import type { GuideTourSummary } from '@/types/guide';

const SERVICE_NAME = 'GuideToursPage';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  published: { label: 'Publié', className: 'bg-green-100 text-green-700' },
  draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-600' },
  synced: { label: 'Transféré', className: 'bg-indigo-100 text-indigo-700' },
  editing: { label: 'En édition', className: 'bg-blue-100 text-blue-700' },
  review: { label: 'En revue', className: 'bg-yellow-100 text-yellow-700' },
  revision_requested: { label: 'Corrections demandées', className: 'bg-orange-100 text-orange-700' },
  pending_moderation: { label: 'En modération', className: 'bg-yellow-100 text-yellow-700' },
  rejected: { label: 'Refusé', className: 'bg-red-100 text-red-700' },
  archived: { label: 'Archivé', className: 'bg-gray-100 text-gray-500' },
};

const EDITABLE_STATUSES = ['draft', 'synced', 'editing', 'revision_requested', 'rejected'];

export default function GuideToursPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tours, setTours] = useState<GuideTourSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCity, setNewCity] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.guideId) return;
    getGuideTours(user.guideId)
      .then(setTours)
      .catch((e) => logger.error(SERVICE_NAME, 'Failed to load tours', { error: String(e) }))
      .finally(() => setLoading(false));
  }, [user?.guideId]);

  const handleCreateTour = useCallback(async () => {
    if (!user?.guideId || !newTitle.trim() || !newCity.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const result = await createTourWithSession(user.guideId, newTitle.trim(), newCity.trim());
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
  }, [user?.guideId, newTitle, newCity, router]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes Parcours</h1>
          <Link href="/guide/studio" className="text-sm text-teal-600 hover:text-teal-700 mt-1 inline-block" data-testid="studio-link-from-tours">
            🎙️ Ouvrir Mon Studio →
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
                  placeholder="Ex : L'Âme des Parfumeurs"
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
                {creating ? 'Création...' : 'Créer et éditer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm">Chargement...</div>
      ) : tours.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">Aucun parcours pour l&apos;instant</p>
          <p className="text-sm mb-6">Créez votre premier parcours audio guidé.</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="bg-teal-700 text-white font-bold px-6 py-3 rounded-xl hover:bg-teal-800"
          >
            Créer mon premier parcours
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tours.map((tour) => {
            const badge = STATUS_BADGES[tour.status] ?? STATUS_BADGES.draft;
            const canEdit = tour.sessionId && EDITABLE_STATUSES.includes(tour.status);
            const canView = tour.sessionId && (tour.status === 'review' || tour.status === 'pending_moderation');
            const isPublishedWithSession = tour.sessionId && tour.status === 'published';
            return (
              <div key={tour.id} data-testid={`tour-card-${tour.id}`} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-gray-900">{tour.title}</h2>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{tour.city}</p>
                    {tour.status === 'published' && (
                      <p className="text-sm text-gray-500 mt-1">
                        {tour.listens} écoutes &middot; {tour.completionRate}% complétion &middot; {tour.rating} ★
                      </p>
                    )}
                    {tour.rejectionFeedback && (
                      <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded">
                        Feedback : {tour.rejectionFeedback}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {canEdit && (
                      <Link
                        href={`/guide/studio/${tour.sessionId}`}
                        className="bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-teal-800"
                      >
                        Éditer
                      </Link>
                    )}
                    {isPublishedWithSession && (
                      <Link
                        href={`/guide/studio/${tour.sessionId}`}
                        className="text-sm text-teal-600 font-medium px-4 py-2 hover:underline"
                      >
                        Voir dans Studio →
                      </Link>
                    )}
                    {tour.status === 'published' && !tour.sessionId && (
                      <span className="text-sm text-gray-400 px-4 py-2">Voir stats →</span>
                    )}
                    {canView && (
                      <Link
                        href={`/guide/studio/${tour.sessionId}/preview`}
                        className="text-sm text-yellow-700 font-medium px-4 py-2 hover:underline"
                      >
                        Voir →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
