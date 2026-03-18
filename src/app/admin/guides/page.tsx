'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllAdminGuides } from '@/lib/api/moderation';
import { adminUpdateGuideProfileStatus } from '@/lib/api/appsync-client';

const PROFILE_STATUS_BADGES: Record<string, { label: string; className: string }> = {
  active:             { label: 'Actif',          className: 'bg-green-100 text-green-700' },
  pending_moderation: { label: 'En attente',      className: 'bg-yellow-100 text-yellow-700' },
  suspended:          { label: 'Suspendu',        className: 'bg-red-100 text-red-600' },
  inactive:           { label: 'Inactif',         className: 'bg-gray-100 text-gray-500' },
};

type AdminGuide = { id: string; displayName: string; city: string; profileStatus: string; tourCount: number; rating: number | null };

export default function AdminGuidesPage() {
  const [guides, setGuides] = useState<AdminGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCity, setFilterCity]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]             = useState('');
  const [actioning, setActioning]       = useState<string | null>(null);

  useEffect(() => {
    getAllAdminGuides()
      .then(setGuides)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cities   = [...new Set(guides.map((g) => g.city))].sort();
  const filtered = guides.filter((g) => {
    if (filterCity   && g.city          !== filterCity)   return false;
    if (filterStatus && g.profileStatus !== filterStatus) return false;
    if (search && !g.displayName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const setGuideStatus = async (guideId: string, status: 'active' | 'suspended' | 'rejected') => {
    setActioning(guideId);
    const result = await adminUpdateGuideProfileStatus(guideId, status);
    if (result.ok) {
      setGuides((prev) => prev.map((g) => g.id === guideId ? { ...g, profileStatus: status } : g));
    }
    setActioning(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tous les guides</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un guide..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 w-48"
        />
        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
        >
          <option value="">Toutes les villes</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="pending_moderation">En attente</option>
          <option value="suspended">Suspendu</option>
        </select>
        {(filterCity || filterStatus || search) && (
          <button
            onClick={() => { setFilterCity(''); setFilterStatus(''); setSearch(''); }}
            className="text-sm text-red-600 hover:underline px-2"
          >
            Effacer
          </button>
        )}
        <span className="ml-auto text-sm text-gray-400 self-center">{filtered.length} guides</span>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">Aucun guide trouvé.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Guide</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Ville</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Parcours</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Note</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Statut</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((guide) => {
                const badge = PROFILE_STATUS_BADGES[guide.profileStatus] ?? PROFILE_STATUS_BADGES.pending_moderation;
                const isActioning = actioning === guide.id;
                return (
                  <tr key={guide.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/guides/${guide.id}`} className="flex items-center gap-3 hover:opacity-80">
                        <div className="w-8 h-8 bg-teal-200 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                          {guide.displayName.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900 hover:text-teal-700 hover:underline">{guide.displayName}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{guide.city}</td>
                    <td className="px-4 py-3 text-right text-gray-700 hidden md:table-cell">{guide.tourCount}</td>
                    <td className="px-4 py-3 text-right text-amber-600 hidden md:table-cell">
                      {guide.rating != null ? `${guide.rating.toFixed(1)} ★` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {guide.profileStatus !== 'active' && (
                          <button
                            onClick={() => setGuideStatus(guide.id, 'active')}
                            disabled={isActioning}
                            className="text-xs text-green-600 font-medium hover:underline disabled:opacity-50"
                          >
                            Activer
                          </button>
                        )}
                        {guide.profileStatus === 'active' && (
                          <button
                            onClick={() => setGuideStatus(guide.id, 'suspended')}
                            disabled={isActioning}
                            className="text-xs text-orange-600 font-medium hover:underline disabled:opacity-50"
                          >
                            Suspendre
                          </button>
                        )}
                        {guide.profileStatus === 'suspended' && (
                          <button
                            onClick={() => setGuideStatus(guide.id, 'rejected')}
                            disabled={isActioning}
                            className="text-xs text-red-600 font-medium hover:underline disabled:opacity-50"
                          >
                            Rejeter
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
    </div>
  );
}
