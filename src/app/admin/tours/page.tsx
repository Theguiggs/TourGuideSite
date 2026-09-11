'use client';

import { useState, useEffect } from 'react';
import { LoadError } from '@/components/admin/LoadError';
import Link from 'next/link';
import { getAllAdminTours, adminSetTourStatus, adminSyncTourToQueue, adminDeleteTour } from '@/lib/api/moderation';
import { listLanguagePurchases } from '@/lib/api/language-purchase';
import type { TourLanguagePurchase } from '@/types/studio';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { PageTitle } from '@murmure/design-system/web';
import { LANGUAGE_MODERATION_BADGES, TOUR_STATUS_BADGES, badgeFor } from '@/lib/admin/status-badges';
import { LANG_FLAGS } from '@/lib/i18n/languages';
import { StatusBadge } from '@/components/admin/StatusBadge';

type AdminTour = { id: string; title: string; city: string; status: string; guideId: string; poiCount: number; duration: number; distance: number; sessionId: string | null; guideName: string };

export default function AdminToursPage() {
  const [tours, setTours] = useState<AdminTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity]   = useState('');
  const [actioning, setActioning]     = useState<string | null>(null);
  const [confirmTour, setConfirmTour] = useState<AdminTour | null>(null);
  const [pendingStatus, setPendingStatus] = useState<'published' | 'archived' | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminTour | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [purchasesByTour, setPurchasesByTour] = useState<Record<string, TourLanguagePurchase[]>>({});
  // Les refus d action sont porteurs : `adminSetTourStatus` renvoie par exemple
  // « [2900] Publication refusée : aucune mention de source audio… ». Sans surface
  // d erreur, le bouton paraissait simplement inerte.
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    getAllAdminTours()
      .then(async (t) => {
        setTours(t);
        // Load language purchases per tour
        const pMap: Record<string, TourLanguagePurchase[]> = {};
        await Promise.all(t.filter((tour) => tour.sessionId).map(async (tour) => {
          try {
            const result = await listLanguagePurchases(tour.sessionId!);
            if (result.ok) pMap[tour.id] = result.value.filter((p) => p.status === 'active');
          } catch { /* non-blocking */ }
        }));
        setPurchasesByTour(pMap);
      })
      .catch(() => setLoadError('Impossible de charger les visites.'))
      .finally(() => setLoading(false));
  }, [attempt]);
  const load = () => { setLoading(true); setLoadError(null); setAttempt((n) => n + 1); };

  const cities   = [...new Set(tours.map((t) => t.city))].sort();
  const filtered = tours.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterCity  && t.city   !== filterCity)   return false;
    return true;
  });

  const askAction = (tour: AdminTour, status: 'published' | 'archived') => {
    setActionError(null);
    setConfirmTour(tour);
    setPendingStatus(status);
  };

  const confirmAction = async () => {
    if (!confirmTour || !pendingStatus) return;
    setActioning(confirmTour.id);
    setConfirmTour(null);
    const result = await adminSetTourStatus(confirmTour.id, pendingStatus);
    if (result.ok) {
      setTours((prev) => prev.map((t) => t.id === confirmTour.id ? { ...t, status: pendingStatus } : t));
    } else {
      setActionError(result.error ?? 'Action refusée par le serveur.');
    }
    setActioning(null);
    setPendingStatus(null);
  };

  return (
    <div>
      <PageTitle size="h4" className="mb-6">Toutes les visites</PageTitle>

      {actionError && (
        <div
          role="alert"
          data-testid="admin-tour-action-error"
          className="mb-6 rounded-lg border border-grenadine bg-grenadine-soft px-4 py-3"
        >
          <p className="text-body font-medium text-danger">{actionError}</p>
          <button
            onClick={() => setActionError(null)}
            className="mt-2 text-meta text-danger underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-body text-ink-80"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(TOUR_STATUS_BADGES).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-body text-ink-80"
        >
          <option value="">Toutes les villes</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {(filterStatus || filterCity) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterCity(''); }}
            className="text-body text-danger hover:underline px-2"
          >
            Effacer
          </button>
        )}
        <span className="ml-auto text-body text-ink-40 self-center">{filtered.length} visites</span>
      </div>

      {loading ? (
        <p className="text-ink-60 text-body" role="status" aria-busy="true">Chargement…</p>
      ) : loadError ? (
        <LoadError message={loadError} onRetry={load} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-md border border-line">
          <p className="text-ink-60">Aucune visite trouvée.</p>
        </div>
      ) : (
        <div className="bg-card rounded-md border border-line overflow-x-auto">
          <table className="w-full text-body">
            <thead className="bg-paper-soft border-b border-line">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-ink-60">Parcours</th>
                <th className="text-left px-4 py-3 font-medium text-ink-60 hidden sm:table-cell">Ville</th>
                <th className="text-left px-4 py-3 font-medium text-ink-60 hidden md:table-cell">Guide</th>
                <th className="text-right px-4 py-3 font-medium text-ink-60 hidden lg:table-cell">POIs</th>
                <th className="text-right px-4 py-3 font-medium text-ink-60 hidden lg:table-cell">Durée</th>
                <th className="text-left px-4 py-3 font-medium text-ink-60">Langues</th>
                <th className="text-left px-4 py-3 font-medium text-ink-60">Statut</th>
                <th className="text-right px-4 py-3 font-medium text-ink-60">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((tour) => {
                const badge = badgeFor(TOUR_STATUS_BADGES, tour.status, 'draft');
                const isActioning = actioning === tour.id;
                return (
                  <tr key={tour.id} className="hover:bg-paper-soft">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{tour.title}</p>
                      {tour.status === 'published' && (
                        <Link href={`/catalogue/${tour.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`} className="text-eyebrow text-grenadine hover:underline">
                          Voir dans le catalogue →
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-60 hidden sm:table-cell">{tour.city}</td>
                    <td className="px-4 py-3 text-ink-60 text-body hidden md:table-cell">{tour.guideName}</td>
                    <td className="px-4 py-3 text-right text-ink-80 hidden lg:table-cell">{tour.poiCount}</td>
                    <td className="px-4 py-3 text-right text-ink-80 hidden lg:table-cell">{tour.duration} min</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span className="text-eyebrow px-1.5 py-0.5 rounded-pill bg-mer-soft text-mer font-medium" title="Langue source">🇫🇷 FR</span>
                        {(purchasesByTour[tour.id] ?? []).map((p) => (
                          <span
                            key={p.id}
                            className={`text-eyebrow px-1.5 py-0.5 rounded-pill font-medium ${badgeFor(LANGUAGE_MODERATION_BADGES, p.moderationStatus, 'draft').className}`}
                            title={`${p.language.toUpperCase()} — ${badgeFor(LANGUAGE_MODERATION_BADGES, p.moderationStatus, 'draft').label}`}
                          >
                            {LANG_FLAGS[p.language] ?? ''} {p.language.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge badge={badge} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/tours/${tour.id}`}
                          className="text-meta text-grenadine font-medium hover:underline"
                        >
                          Voir
                        </Link>
                        {tour.status === 'review' && (
                          <Link
                            href="/admin/moderation"
                            className="text-meta text-ocre-ink font-medium hover:underline"
                          >
                            File modération
                          </Link>
                        )}
                        {tour.status === 'pending_moderation' && (
                          <>
                            <Link
                              href="/admin/moderation"
                              className="text-meta text-ocre-ink font-medium hover:underline"
                            >
                              File modération
                            </Link>
                            <button
                              onClick={async () => {
                                setActioning(tour.id);
                                await adminSyncTourToQueue(tour.id);
                                setActioning(null);
                              }}
                              disabled={isActioning}
                              className="text-meta text-mer font-medium hover:underline disabled:opacity-50"
                              title="Crée un ModerationItem si manquant"
                            >
                              Sync file
                            </button>
                          </>
                        )}
                        {tour.status === 'published' && (
                          <button
                            onClick={() => askAction(tour, 'archived')}
                            disabled={isActioning}
                            className="text-meta text-ocre-ink font-medium hover:underline disabled:opacity-50"
                          >
                            Suspendre
                          </button>
                        )}
                        {tour.status === 'archived' && (
                          <>
                            <button
                              onClick={() => askAction(tour, 'published')}
                              disabled={isActioning}
                              className="text-meta text-olive font-medium hover:underline disabled:opacity-50"
                            >
                              Réactiver
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(tour)}
                              disabled={isActioning || isDeleting}
                              className="text-meta text-danger font-medium hover:underline disabled:opacity-50"
                              data-testid={`delete-tour-${tour.id}`}
                            >
                              Supprimer
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmTour && pendingStatus && (
        <ConfirmDialog
          open
          title={pendingStatus === 'archived' ? 'Suspendre cette visite ?' : 'Réactiver cette visite ?'}
          subject={confirmTour.title}
          description={
            pendingStatus === 'archived'
              ? 'La visite sera retirée de la plateforme et invisible aux utilisateurs.'
              : 'La visite sera à nouveau visible et accessible aux utilisateurs.'
          }
          confirmLabel="Confirmer"
          cancelLabel="Annuler"
          danger={pendingStatus === 'archived'}
          onConfirm={confirmAction}
          onCancel={() => { setConfirmTour(null); setPendingStatus(null); }}
        />
      )}
      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          open
          danger
          title="Supprimer définitivement ?"
          subject={deleteConfirm.title}
          description="Cette action est irréversible. La visite, ses scènes, segments traduits, achats de langue et éléments de modération seront supprimés."
          confirmLabel={isDeleting ? 'Suppression...' : 'Supprimer'}
          cancelLabel="Annuler"
          busy={isDeleting}
          confirmTestId="confirm-delete-tour"
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={async () => {
            setIsDeleting(true);
            const result = await adminDeleteTour(deleteConfirm.id);
            if (result.ok) {
              setTours((prev) => prev.filter((t) => t.id !== deleteConfirm.id));
            } else {
              setActionError(result.error ?? 'Suppression refusée par le serveur.');
            }
            setDeleteConfirm(null);
            setIsDeleting(false);
          }}
        />
      )}
    </div>
  );
}
