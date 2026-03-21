'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllAdminTours, adminSetTourStatus, adminSyncTourToQueue } from '@/lib/api/moderation';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft:              { label: 'Brouillon',         className: 'bg-gray-100 text-gray-600' },
  synced:             { label: 'Transféré',         className: 'bg-indigo-100 text-indigo-700' },
  editing:            { label: 'En édition',        className: 'bg-blue-100 text-blue-700' },
  review:             { label: 'En revue',          className: 'bg-yellow-100 text-yellow-700' },
  pending_moderation: { label: 'En modération',     className: 'bg-orange-100 text-orange-700' },
  published:          { label: 'Publié',            className: 'bg-green-100 text-green-700' },
  revision_requested: { label: 'Révision demandée', className: 'bg-amber-100 text-amber-700' },
  rejected:           { label: 'Refusé',            className: 'bg-red-100 text-red-700' },
  archived:           { label: 'Archivé/Suspendu',  className: 'bg-gray-200 text-gray-500' },
};

type AdminTour = { id: string; title: string; city: string; status: string; guideId: string; poiCount: number; duration: number; distance: number; sessionId: string | null; guideName: string };

export default function AdminToursPage() {
  const [tours, setTours] = useState<AdminTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity]   = useState('');
  const [actioning, setActioning]     = useState<string | null>(null);
  const [confirmTour, setConfirmTour] = useState<AdminTour | null>(null);
  const [pendingStatus, setPendingStatus] = useState<'published' | 'archived' | null>(null);

  useEffect(() => {
    getAllAdminTours()
      .then(setTours)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cities   = [...new Set(tours.map((t) => t.city))].sort();
  const filtered = tours.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterCity  && t.city   !== filterCity)   return false;
    return true;
  });

  const askAction = (tour: AdminTour, status: 'published' | 'archived') => {
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
    }
    setActioning(null);
    setPendingStatus(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tous les parcours</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_BADGES).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
        >
          <option value="">Toutes les villes</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {(filterStatus || filterCity) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterCity(''); }}
            className="text-sm text-red-600 hover:underline px-2"
          >
            Effacer
          </button>
        )}
        <span className="ml-auto text-sm text-gray-400 self-center">{filtered.length} parcours</span>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">Aucun parcours trouvé.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Parcours</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Ville</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Guide</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">POIs</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Durée</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Statut</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((tour) => {
                const badge = STATUS_BADGES[tour.status] ?? STATUS_BADGES.draft;
                const isActioning = actioning === tour.id;
                return (
                  <tr key={tour.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{tour.title}</p>
                      <p className="text-xs text-gray-400 hidden sm:hidden">{tour.guideName} &middot; {tour.poiCount} POIs &middot; {tour.duration} min</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{tour.city}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm hidden md:table-cell">{tour.guideName}</td>
                    <td className="px-4 py-3 text-right text-gray-700 hidden lg:table-cell">{tour.poiCount}</td>
                    <td className="px-4 py-3 text-right text-gray-700 hidden lg:table-cell">{tour.duration} min</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/tours/${tour.id}`}
                          className="text-xs text-teal-600 font-medium hover:underline"
                        >
                          Voir
                        </Link>
                        {tour.status === 'review' && (
                          <Link
                            href="/admin/moderation"
                            className="text-xs text-yellow-700 font-medium hover:underline"
                          >
                            File modération
                          </Link>
                        )}
                        {tour.status === 'pending_moderation' && (
                          <>
                            <Link
                              href="/admin/moderation"
                              className="text-xs text-yellow-700 font-medium hover:underline"
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
                              className="text-xs text-blue-600 font-medium hover:underline disabled:opacity-50"
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
                            className="text-xs text-orange-600 font-medium hover:underline disabled:opacity-50"
                          >
                            Suspendre
                          </button>
                        )}
                        {tour.status === 'archived' && (
                          <button
                            onClick={() => askAction(tour, 'published')}
                            disabled={isActioning}
                            className="text-xs text-green-600 font-medium hover:underline disabled:opacity-50"
                          >
                            Réactiver
                          </button>
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              {pendingStatus === 'archived' ? 'Suspendre ce parcours ?' : 'Réactiver ce parcours ?'}
            </h2>
            <p className="text-sm text-gray-600 mb-2 font-medium">{confirmTour.title}</p>
            <p className="text-sm text-gray-500 mb-6">
              {pendingStatus === 'archived'
                ? 'Le parcours sera retiré de la plateforme et invisible aux utilisateurs.'
                : 'Le parcours sera à nouveau visible et accessible aux utilisateurs.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmTour(null); setPendingStatus(null); }}
                className="flex-1 bg-gray-100 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={confirmAction}
                className={`flex-1 text-white font-bold py-2 rounded-lg ${
                  pendingStatus === 'archived'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
