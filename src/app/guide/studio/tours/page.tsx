'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { listStudioSessions, listStudioScenes } from '@/lib/api/studio';
import { deleteSession } from '@/lib/api/studio-submission';
import { studioPersistenceService } from '@/lib/studio/studio-persistence-service';
import { withPublishedStatus } from '@/lib/studio/published-status';
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
import { useStudioLocale } from '@/lib/i18n/studio-locale';

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
  const { locale } = useStudioLocale();
  const copy = useMemo(() => locale === 'en' ? {
    loadError: 'Unable to load your tours.', deleteError: 'Unable to delete this session.', guideOnly: 'The Studio is for guides. Create a guide profile to get started.',
    retry: 'Try again', emptyTitle: 'You have not created a tour yet', emptyText: 'Record a route in the field with the mobile app, then come back here to turn it into an audio tour.',
    create: 'Create a new tour', eyebrow: 'My tours', total: 'total', live: 'live', titleStart: 'Your', titleEmphasis: 'catalogue',
    intro: 'Everything you have written, in progress or published. Open a tour to resume, edit or read feedback.', newTour: 'New tour',
    noResults: 'No tours match these filters.', reset: 'Reset filters', quote: 'A good tour starts with a place you love too much to keep to yourself.',
  } : {
    loadError: 'Impossible de charger vos visites.', deleteError: 'Erreur lors de la suppression.', guideOnly: 'Le Studio est réservé aux guides. Créez un profil guide pour commencer.',
    retry: 'Réessayer', emptyTitle: "Vous n'avez pas encore créé de visite", emptyText: "Enregistrez un parcours sur le terrain avec l'app mobile, puis revenez ici pour le transformer en visite audio.",
    create: 'Créer une nouvelle visite', eyebrow: 'Mes visites', total: 'au total', live: 'en ligne', titleStart: 'Votre', titleEmphasis: 'catalogue',
    intro: 'Tout ce que vous avez écrit, en cours ou publié. Ouvrez une visite pour la reprendre, la modifier ou lire les retours.', newTour: 'Nouvelle visite',
    noResults: 'Aucune visite ne correspond à ces filtres.', reset: 'Réinitialiser les filtres', quote: "Une bonne visite commence par un endroit qu'on aime trop pour le garder pour soi.",
  }, [locale]);

  const lastSessionId = useMemo(
    () => studioPersistenceService.getLastSessionId(),
    [],
  );

  const loadTours = useCallback(async (guideId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const all = await withPublishedStatus(await listStudioSessions(guideId));
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
      setError(copy.loadError);
      logger.error(SERVICE_NAME, 'Failed to load tours', { error: String(e) });
    } finally {
      setIsLoading(false);
    }
  }, [copy.loadError]);

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
      setDeleteError(result.error ?? copy.deleteError);
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
          {copy.guideOnly}
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
            {copy.retry}
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
            {copy.emptyTitle}
          </div>
          <p className="text-caption text-ink-60 max-w-md mx-auto mb-6">
            {copy.emptyText}
          </p>
          <Link
            href="/guide/studio/nouveau"
            className="inline-flex items-center gap-2 bg-grenadine text-paper px-6 py-3 rounded-pill text-caption font-bold no-underline hover:opacity-90 transition"
          >
            <Plus size={18} aria-hidden="true" /> {copy.create}
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
            {copy.eyebrow} · {sessions.length} {copy.total} · {liveCount} {copy.live}
          </div>
          <h1 className="font-display text-h3 text-ink mt-1 leading-none">
            {copy.titleStart} <em className="font-editorial italic">{copy.titleEmphasis}</em>.
          </h1>
          <p className="font-editorial italic text-body text-ink-60 max-w-xl mt-2">
            {copy.intro}
          </p>
        </div>
        <Link
          href="/guide/studio/nouveau"
          data-testid="new-tour-cta"
          className="bg-grenadine text-paper border-none px-5 py-3.5 rounded-pill text-caption font-bold no-underline hover:opacity-90 transition shadow-md whitespace-nowrap"
        >
          <span className="inline-flex items-center gap-2"><Plus size={17} aria-hidden="true" />{copy.newTour}</span>
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
              {copy.noResults}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-caption font-semibold text-grenadine underline hover:opacity-80"
            >
              {copy.reset}
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
          “{copy.quote}”
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
