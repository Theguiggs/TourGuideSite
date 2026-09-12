'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllAdminGuides } from '@/lib/api/moderation';
import { adminUpdateGuideProfileStatus, recordGuideStatusDecision } from '@/lib/api/appsync-client';
import { useAuth } from '@/lib/auth/auth-context';
import { GuideStatusDialog, type GuideStatusTarget } from '@/components/admin/GuideStatusDialog';
import { LoadError } from '@/components/admin/LoadError';
import { PageTitle } from '@murmure/design-system/web';
import { GUIDE_PROFILE_STATUS_BADGES, badgeFor } from '@/lib/admin/status-badges';
import { StatusBadge } from '@/components/admin/StatusBadge';

type AdminGuide = { id: string; userId: string; displayName: string; city: string; profileStatus: string; tourCount: number; rating: number | null };

export default function AdminGuidesPage() {
  const [guides, setGuides] = useState<AdminGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCity, setFilterCity]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]             = useState('');
  const [actioning, setActioning]       = useState<string | null>(null);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const [attempt, setAttempt]           = useState(0);
  const [pending, setPending]           = useState<{ guide: AdminGuide; target: GuideStatusTarget } | null>(null);
  const [actionError, setActionError]   = useState<string | null>(null);
  const [notice, setNotice]             = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    getAllAdminGuides()
      .then(setGuides)
      .catch(() => setLoadError('Impossible de charger les guides.'))
      .finally(() => setLoading(false));
  }, [attempt]);
  const load = () => { setLoading(true); setLoadError(null); setAttempt((n) => n + 1); };

  const cities   = [...new Set(guides.map((g) => g.city))].sort();
  const filtered = guides.filter((g) => {
    if (filterCity   && g.city          !== filterCity)   return false;
    if (filterStatus && g.profileStatus !== filterStatus) return false;
    if (search && !g.displayName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const askStatus = (guide: AdminGuide, target: GuideStatusTarget) => {
    setActionError(null);
    setNotice(null);
    setPending({ guide, target });
  };

  const confirmStatus = async (reason: string) => {
    if (!pending) return;
    const { guide, target } = pending;
    setActioning(guide.id);
    const result = await adminUpdateGuideProfileStatus(guide.id, target);
    if (!result.ok) {
      setActionError(result.error ?? 'Action refusée par le serveur.');
      setActioning(null);
      return;
    }
    setGuides((prev) => prev.map((g) => g.id === guide.id ? { ...g, profileStatus: target } : g));
    setPending(null);
    if (reason) {
      const trace = await recordGuideStatusDecision({ guideProfileId: guide.id, userId: guide.userId, status: target, reason, decidedBy: user?.id ?? null });
      if (!trace.ok) setNotice(trace.error);
    }
    setActioning(null);
  };

  return (
    <div>
      <PageTitle size="h4" className="mb-6">Tous les guides</PageTitle>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un guide..."
          className="border border-line rounded-lg px-3 py-2 text-body text-ink-80 w-48"
        />
        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-body text-ink-80"
        >
          <option value="">Toutes les villes</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-body text-ink-80"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="pending_moderation">En attente</option>
          <option value="suspended">Suspendu</option>
        </select>
        {(filterCity || filterStatus || search) && (
          <button
            onClick={() => { setFilterCity(''); setFilterStatus(''); setSearch(''); }}
            className="text-body text-danger hover:underline px-2"
          >
            Effacer
          </button>
        )}
        <span className="ml-auto text-body text-ink-40 self-center">{filtered.length} guides</span>
      </div>

      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-ocre-soft px-4 py-3 text-body text-ocre-ink">{notice}</p>
      )}

      {loading ? (
        <p className="text-ink-60 text-body" role="status" aria-busy="true">Chargement…</p>
      ) : loadError ? (
        <LoadError message={loadError} onRetry={load} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-md border border-line">
          <p className="text-ink-60">Aucun guide trouvé.</p>
        </div>
      ) : (
        <div className="bg-card rounded-md border border-line overflow-x-auto">
          <table className="w-full text-body">
            <thead className="bg-paper-soft border-b border-line">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-ink-60">Guide</th>
                <th className="text-left px-4 py-3 font-medium text-ink-60 hidden sm:table-cell">Ville</th>
                <th className="text-right px-4 py-3 font-medium text-ink-60 hidden md:table-cell">Parcours</th>
                <th className="text-right px-4 py-3 font-medium text-ink-60 hidden md:table-cell">Note</th>
                <th className="text-left px-4 py-3 font-medium text-ink-60">Statut</th>
                <th className="text-right px-4 py-3 font-medium text-ink-60">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((guide) => {
                const badge = badgeFor(GUIDE_PROFILE_STATUS_BADGES, guide.profileStatus, 'pending_moderation');
                const isActioning = actioning === guide.id;
                return (
                  <tr key={guide.id} className="hover:bg-paper-soft">
                    <td className="px-4 py-3">
                      <Link href={`/admin/guides/${guide.id}`} className="flex items-center gap-3 hover:opacity-80">
                        <div className="w-8 h-8 bg-grenadine-soft rounded-pill flex items-center justify-center text-grenadine font-bold text-body flex-shrink-0">
                          {guide.displayName.charAt(0)}
                        </div>
                        <span className="font-medium text-ink hover:text-grenadine hover:underline">{guide.displayName}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-60 hidden sm:table-cell">{guide.city}</td>
                    <td className="px-4 py-3 text-right text-ink-80 hidden md:table-cell">{guide.tourCount}</td>
                    <td className="px-4 py-3 text-right text-ocre-ink hidden md:table-cell">
                      {guide.rating != null ? `${guide.rating.toFixed(1)} ★` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge badge={badge} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {guide.profileStatus !== 'active' && (
                          <button
                            onClick={() => askStatus(guide, 'active')}
                            disabled={isActioning}
                            className="text-meta text-olive font-medium hover:underline disabled:opacity-50"
                          >
                            Activer
                          </button>
                        )}
                        {guide.profileStatus === 'active' && (
                          <button
                            onClick={() => askStatus(guide, 'suspended')}
                            disabled={isActioning}
                            className="text-meta text-ocre-ink font-medium hover:underline disabled:opacity-50"
                          >
                            Suspendre
                          </button>
                        )}
                        {guide.profileStatus === 'suspended' && (
                          <button
                            onClick={() => askStatus(guide, 'rejected')}
                            disabled={isActioning}
                            className="text-meta text-danger font-medium hover:underline disabled:opacity-50"
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
      {pending && (
        <GuideStatusDialog
          target={pending.target}
          guideName={pending.guide.displayName}
          busy={actioning === pending.guide.id}
          error={actionError}
          onConfirm={confirmStatus}
          onCancel={() => { setPending(null); setActionError(null); }}
        />
      )}
    </div>
  );
}
