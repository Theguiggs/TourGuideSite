'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { listStudioSessions, listStudioScenes } from '@/lib/api/studio';
import { deleteSession } from '@/lib/api/studio-submission';
import { studioPersistenceService } from '@/lib/studio/studio-persistence-service';
import {
  filterTours,
  sortTours,
  bucketCounts,
  type TourSortBy,
  type TourStatusFilter,
} from '@/lib/studio/tours-list-helpers';
import { TourCard, TourFilters } from '@/components/studio/tours-list';
import { DeleteSessionDialog } from '@/components/studio/session-list/delete-session-dialog';
import type { StudioSession } from '@/types/studio';

const SERVICE_NAME = 'StudioToursPage';

export default function StudioToursPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<StudioSession[]>([]);
  const [scenesPerSession, setScenesPerSession] = useState<
    Record<string, { total: number; done: number }>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TourStatusFilter>('all');
  const [sortBy, setSortBy] = useState<TourSortBy>('recently_modified');

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<StudioSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const lastSessionId = useMemo(
    () => studioPersistenceService.getLastSessionId(),
    [],
  );

  const loadTours = useCallback(async (guideId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const all = await listStudioSessions(guideId);
      setSessions(all);

      const sceneLists = await Promise.all(all.map((s) => listStudioScenes(s.id)));
      const map: Record<string, { total: number; done: number }> = {};
      all.forEach((s, i) => {
        const list = sceneLists[i];
        map[s.id] = {
          total: list.length,
          done: list.filter((sc) => sc.status === 'finalized').length,
        };
      });
      setScenesPerSession(map);
      logger.info(SERVICE_NAME, 'Tours loaded', { count: all.length });
    } catch (e) {
      setError('Impossible de charger vos tours.');
      logger.error(SERVICE_NAME, 'Failed to load tours', { error: String(e) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const guideId = shouldUseStubs() ? 'guide-1' : user?.guideId ?? null;
    if (!guideId) {
      setIsLoading(false);
      return;
    }
    loadTours(guideId);
  }, [user, loadTours]);

  const counts = useMemo(() => bucketCounts(sessions), [sessions]);
  const filtered = useMemo(
    () => sortTours(filterTours(sessions, query, statusFilter), sortBy),
    [sessions, query, statusFilter, sortBy],
  );

  const handleDeleteRequest = (session: StudioSession) => {
    setDeleteTarget(session);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteSession(deleteTarget.id);
    setIsDeleting(false);
    if (result.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      setDeleteError(result.error ?? 'Erreur lors de la suppression.');
    }
  };

  const resetFilters = () => {
    setQuery('');
    setStatusFilter('all');
  };

  // ─── Loading state ───
  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto" aria-busy="true">
        <div className="h-12 w-48 bg-paper-deep rounded-md animate-pulse mb-3" />
        <div className="h-20 w-96 bg-paper-deep rounded-md animate-pulse mb-6" />
        <div className="space-y-3 mt-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-card border border-line rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // ─── No guide profile (real mode) ───
  if (!user?.guideId && !shouldUseStubs()) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-ocre-soft border border-ocre rounded-lg p-4 text-ocre" role="alert">
          Le Studio est réservé aux guides. Créez un profil guide pour commencer.
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-grenadine-soft border border-grenadine rounded-lg p-4" role="alert">
          <p className="text-danger">{error}</p>
          <button
            type="button"
            onClick={() => loadTours(user?.guideId || 'guide-1')}
            className="mt-2 text-caption font-medium text-danger underline hover:opacity-80"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // ─── Empty global ───
  if (sessions.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div
          className="bg-card border border-line rounded-xl p-12 text-center"
          data-testid="tours-empty-global"
        >
          <div className="font-display text-h5 text-ink mb-2">
            Vous n&apos;avez pas encore créé de tour
          </div>
          <p className="text-caption text-ink-60 max-w-md mx-auto mb-6">
            Enregistrez un parcours sur le terrain avec l&apos;app mobile, puis revenez ici pour le transformer en tour audio.
          </p>
          <Link
            href="/guide/studio/nouveau"
            className="inline-flex items-center gap-2 bg-grenadine text-paper px-6 py-3 rounded-pill text-caption font-bold no-underline hover:opacity-90 transition"
          >
            ＋ Créer un nouveau tour
          </Link>
        </div>
      </div>
    );
  }

  const liveCount = counts.live;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ───── Page header ───── */}
      <div className="flex items-start justify-between gap-6 flex-wrap mb-7">
        <div>
          <div className="tg-eyebrow text-grenadine">
            Mes tours · {sessions.length} au total · {liveCount} en ligne
          </div>
          <h1 className="font-display text-h3 text-ink mt-1 leading-none">
            Votre <em className="font-editorial italic">catalogue</em>.
          </h1>
          <p className="font-editorial italic text-body text-ink-60 max-w-xl mt-2">
            Tout ce que vous avez écrit, en cours ou publié. Cliquez pour reprendre, modifier ou voir les retours.
          </p>
        </div>
        <Link
          href="/guide/studio/nouveau"
          data-testid="new-tour-cta"
          className="bg-grenadine text-paper border-none px-5 py-3.5 rounded-pill text-caption font-bold no-underline hover:opacity-90 transition shadow-md whitespace-nowrap"
        >
          ＋ Nouveau tour
        </Link>
      </div>

      {/* ───── Filtres ───── */}
      <TourFilters
        query={query}
        onQueryChange={setQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        counts={counts}
      />

      {/* ───── Liste ───── */}
      <div className="mt-6 flex flex-col gap-2.5" data-testid="tours-list">
        {filtered.length === 0 ? (
          <div
            className="bg-card border border-line rounded-lg p-8 text-center"
            data-testid="tours-empty-filtered"
          >
            <p className="text-caption text-ink-60 mb-2">
              Aucun tour ne correspond à ces filtres.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-caption font-semibold text-grenadine underline hover:opacity-80"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          filtered.map((s) => (
            <TourCard
              key={s.id}
              session={s}
              scenesTotal={scenesPerSession[s.id]?.total ?? 0}
              scenesDone={scenesPerSession[s.id]?.done ?? 0}
              current={s.id === lastSessionId}
              onDelete={handleDeleteRequest}
            />
          ))
        )}
      </div>

      {/* ───── Pull-quote éditorial ───── */}
      <div className="mt-10 px-6 py-6 bg-paper-deep rounded-lg text-center">
        <p className="font-editorial italic text-body text-ink-60">
          « Un bon tour commence par un endroit qu&apos;on aime trop pour le garder pour soi. »
        </p>
      </div>

      {/* ───── Delete modal ───── */}
      {deleteTarget && (
        <DeleteSessionDialog
          session={deleteTarget}
          isDeleting={isDeleting}
          errorMessage={deleteError}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
