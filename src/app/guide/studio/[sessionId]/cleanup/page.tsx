'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { StudioAnalyticsEvents, trackEvent } from '@/lib/analytics';
import {
  getStudioSession,
  listStudioScenes,
  listWalkSegments,
  reorderScenes,
  updateSceneData,
  updateStudioSession,
  updateWalkSegment,
} from '@/lib/api/studio';
import { getPlayableUrl } from '@/lib/studio/studio-upload-service';
import { shouldUseStubs } from '@/config/api-mode';
import type { StudioScene, StudioSession, WalkSegment } from '@/types/studio';
import { TOUR_LANGUAGES, TOUR_THEMES } from '@/types/studio';
import { POICleanupPanel } from './components/POICleanupPanel';
import { WalkCleanupPanel } from './components/WalkCleanupPanel';
import { GlobalMetadataPanel } from './components/GlobalMetadataPanel';
import { ValidateCTA } from './components/ValidateCTA';
import { SortableTimeline, type TimelineItem } from './components/SortableTimeline';
import { isReadyToValidate, type TourMetadataDraft } from './lib/validation';

const SERVICE_NAME = 'CleanupPage';
const AUTO_SAVE_DEBOUNCE_MS = 2000;

type DetailTab = 'item' | 'global';

function buildTimeline(scenes: StudioScene[], walks: WalkSegment[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const s of scenes) {
    items.push({ kind: 'scene', id: s.id, order: s.sceneIndex, scene: s });
  }
  for (const w of walks) {
    items.push({ kind: 'walk', id: w.id, order: w.order, walk: w });
  }
  // Primary: chronological `order`. Tiebreaker: scenes before walks so sceneIndex=N
  // appears above a walk with order=N (matches the phased-capture mental model where
  // a walk bridges scene N and scene N+1). Secondary tiebreaker on id for determinism.
  items.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    if (a.kind !== b.kind) return a.kind === 'scene' ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
  return items;
}

function deriveMetadataFromSession(session: StudioSession | null): TourMetadataDraft {
  return {
    title: session?.title ?? '',
    description: session?.description ?? '',
    themes: session?.themes ?? [],
    language: session?.language ?? 'fr',
    durationMinutes: session?.durationMinutes ?? null,
  };
}

export default function CleanupPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<StudioSession | null>(null);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [walks, setWalks] = useState<WalkSegment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('item');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string | null>>({});
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
  const [metadata, setMetadata] = useState<TourMetadataDraft>(deriveMetadataFromSession(null));
  const [validating, setValidating] = useState(false);
  const cleanupStartedAtRef = useRef<number>(Date.now());
  // Synchronous guards — set BEFORE React commits state to prevent double-fire
  // on rapid double-clicks or rapid drag-ends.
  const validatingRef = useRef(false);
  const reorderInFlightRef = useRef(false);

  // Debounce buffer: pending changes per scene/walk/session, flushed after 2s.
  const pendingScenePatches = useRef<Map<string, Partial<StudioScene>>>(new Map());
  const pendingWalkPatches = useRef<Map<string, Partial<WalkSegment>>>(new Map());
  const pendingMetadataPatch = useRef<Partial<TourMetadataDraft>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guard against setState after unmount when an in-flight save resolves late.
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function load() {
      try {
        const [sess, scns, wlk] = await Promise.all([
          getStudioSession(sessionId),
          listStudioScenes(sessionId),
          listWalkSegments(sessionId),
        ]);
        if (cancelled) return;
        setSession(sess);
        setScenes(scns);
        setWalks(wlk);
        setMetadata(deriveMetadataFromSession(sess));
        const first = buildTimeline(scns, wlk)[0];
        if (first) setSelectedId(first.id);
        logger.info(SERVICE_NAME, 'Cleanup loaded', {
          sessionId, scenes: scns.length, walks: wlk.length,
        });
      } catch (e) {
        if (!cancelled) {
          setError('Impossible de charger la session.');
          logger.error(SERVICE_NAME, 'Load failed', { error: String(e) });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [sessionId]);

  // Resolve playable URLs for audio keys. We derive a stable key-list signature so
  // the resolver does NOT re-run every time the user edits a scene title / trim value.
  // Stringified list of `${id}|${key}` changes only when scenes are added/removed or
  // an audio key changes.
  const audioKeyList = useMemo(
    () =>
      scenes
        .map((s) => `${s.id}|${s.studioAudioKey ?? s.originalAudioKey ?? ''}`)
        .join(','),
    [scenes],
  );
  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      const next: Record<string, string | null> = {};
      // Snapshot the list so async awaits don't read mutated scene data later.
      const items = audioKeyList
        .split(',')
        .filter(Boolean)
        .map((pair) => {
          const idx = pair.indexOf('|');
          return { id: pair.slice(0, idx), key: pair.slice(idx + 1) };
        });
      for (const { id, key } of items) {
        if (!key) {
          next[id] = null;
          continue;
        }
        if (key.startsWith('data:') || key.startsWith('blob:') || key.startsWith('http') || key.startsWith('/')) {
          next[id] = key;
          continue;
        }
        if (shouldUseStubs()) {
          next[id] = key;
          continue;
        }
        try {
          next[id] = await getPlayableUrl(key);
        } catch {
          next[id] = null;
        }
        if (cancelled) return;
      }
      if (!cancelled) setAudioUrls(next);
    }
    if (audioKeyList.length > 0) resolve();
    return () => { cancelled = true; };
  }, [audioKeyList]);

  const timeline = useMemo(() => buildTimeline(scenes, walks), [scenes, walks]);
  const selected = timeline.find((i) => i.id === selectedId) ?? null;

  const flushPendingSaves = useCallback(async () => {
    const scenePatches = Array.from(pendingScenePatches.current.entries());
    const walkPatches = Array.from(pendingWalkPatches.current.entries());
    const metaPatch = { ...pendingMetadataPatch.current };
    pendingScenePatches.current.clear();
    pendingWalkPatches.current.clear();
    pendingMetadataPatch.current = {};
    const metaHasChanges = Object.keys(metaPatch).length > 0;
    if (scenePatches.length === 0 && walkPatches.length === 0 && !metaHasChanges) {
      if (mountedRef.current) setSaveState('idle');
      return;
    }

    if (mountedRef.current) setSaveState('saving');
    try {
      for (const [id, patch] of scenePatches) {
        await updateSceneData(id, patch as Record<string, unknown>);
      }
      for (const [id, patch] of walkPatches) {
        await updateWalkSegment(id, patch as { deleted?: boolean });
      }
      if (metaHasChanges) {
        // Only persist fields the backend schema knows about
        const persistable: Parameters<typeof updateStudioSession>[1] = {};
        if (metaPatch.title !== undefined) persistable.title = metaPatch.title;
        if (metaPatch.description !== undefined) persistable.description = metaPatch.description;
        if (metaPatch.themes !== undefined) persistable.themes = metaPatch.themes;
        if (metaPatch.language !== undefined) persistable.language = metaPatch.language;
        if (metaPatch.durationMinutes !== undefined) persistable.durationMinutes = metaPatch.durationMinutes;
        await updateStudioSession(sessionId, persistable);
      }
      if (mountedRef.current) setSaveState('saved');
      logger.info(SERVICE_NAME, 'Auto-save complete', {
        scenes: scenePatches.length, walks: walkPatches.length, metadata: metaHasChanges,
      });
    } catch (e) {
      if (mountedRef.current) setSaveState('error');
      logger.error(SERVICE_NAME, 'Auto-save failed', { error: String(e) });
    }
  }, [sessionId]);

  const scheduleSave = useCallback(() => {
    setSaveState('pending');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void flushPendingSaves(); }, AUTO_SAVE_DEBOUNCE_MS);
  }, [flushPendingSaves]);

  // On unmount: flush pending patches synchronously (fire-and-forget) so edits
  // made within the last 2s aren't silently dropped, then mark unmounted so
  // the late save promise doesn't call setState on a dead tree.
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      // Fire pending saves without awaiting — we are unmounting.
      const scenePatches = Array.from(pendingScenePatches.current.entries());
      const walkPatches = Array.from(pendingWalkPatches.current.entries());
      const metaPatch = { ...pendingMetadataPatch.current };
      pendingScenePatches.current.clear();
      pendingWalkPatches.current.clear();
      pendingMetadataPatch.current = {};
      for (const [id, patch] of scenePatches) {
        void updateSceneData(id, patch as Record<string, unknown>);
      }
      for (const [id, patch] of walkPatches) {
        void updateWalkSegment(id, patch as { deleted?: boolean });
      }
      if (Object.keys(metaPatch).length > 0) {
        void updateStudioSession(sessionId, metaPatch as Parameters<typeof updateStudioSession>[1]);
      }
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSceneChange = useCallback((sceneId: string, updates: Partial<StudioScene>) => {
    setScenes((prev) => prev.map((s) => (s.id === sceneId ? { ...s, ...updates } : s)));
    const existing = pendingScenePatches.current.get(sceneId) ?? {};
    pendingScenePatches.current.set(sceneId, { ...existing, ...updates });
    scheduleSave();
  }, [scheduleSave]);

  const handleWalkToggle = useCallback((walkId: string, deleted: boolean) => {
    setWalks((prev) => prev.map((w) => (w.id === walkId ? { ...w, deleted } : w)));
    const existing = pendingWalkPatches.current.get(walkId) ?? {};
    pendingWalkPatches.current.set(walkId, { ...existing, deleted });
    scheduleSave();
  }, [scheduleSave]);

  const handleMetadataChange = useCallback((patch: Partial<TourMetadataDraft>) => {
    setMetadata((prev) => ({ ...prev, ...patch }));
    pendingMetadataPatch.current = { ...pendingMetadataPatch.current, ...patch };
    scheduleSave();
  }, [scheduleSave]);

  const handleScenesReorder = useCallback(
    (orderedSceneIds: string[]) => {
      // Concurrency guard: ignore a second drag while the first reorder call is
      // still in-flight to prevent interleaved writes corrupting sceneIndex.
      if (reorderInFlightRef.current) {
        logger.warn(SERVICE_NAME, 'Reorder ignored — another reorder is in-flight');
        return;
      }
      reorderInFlightRef.current = true;
      // Snapshot prior state so we can revert optimistic UI on backend failure.
      const priorScenes = scenes;
      // Optimistic local update
      setScenes((prev) => {
        const byId = new Map(prev.map((s) => [s.id, s]));
        const reordered = orderedSceneIds
          .map((id, i) => {
            const s = byId.get(id);
            return s ? { ...s, sceneIndex: i } : null;
          })
          .filter((s): s is StudioScene => s != null);
        // Include any scenes not in the ordered list (defensive) — they keep prior indices
        const remaining = prev.filter((s) => !orderedSceneIds.includes(s.id));
        return [...reordered, ...remaining];
      });
      setSaveState('saving');
      void reorderScenes(sessionId, orderedSceneIds).then((result) => {
        reorderInFlightRef.current = false;
        if (!mountedRef.current) return;
        if (result.ok) {
          setSaveState('saved');
          logger.info(SERVICE_NAME, 'Scenes reordered', { count: orderedSceneIds.length });
        } else {
          // Revert optimistic UI so screen matches (best-effort rolled-back) backend.
          setScenes(priorScenes);
          setSaveState('error');
          logger.error(SERVICE_NAME, 'Reorder failed — UI reverted', { error: result.error });
        }
      });
    },
    [sessionId, scenes],
  );

  const validation = useMemo(
    () => isReadyToValidate(scenes, metadata),
    [scenes, metadata],
  );

  const handleValidate = useCallback(async () => {
    // Synchronous guard — blocks double-click that could fire both handlers
    // before React commits setValidating(true).
    if (!validation.ready || validatingRef.current) return;
    validatingRef.current = true;
    setValidating(true);
    try {
      // Flush any pending debounced changes first
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      await flushPendingSaves();

      // Whitelist language and themes before persisting — defends against an
      // attacker / DOM-tamper supplying an arbitrary enum value.
      const safeLanguage = (TOUR_LANGUAGES as readonly string[]).includes(metadata.language)
        ? metadata.language
        : 'fr';
      const safeThemes = metadata.themes.filter((t) =>
        (TOUR_THEMES as readonly string[]).includes(t),
      );

      const cleanedAt = new Date().toISOString();
      const result = await updateStudioSession(sessionId, {
        title: metadata.title.trim(),
        description: metadata.description.trim(),
        themes: safeThemes,
        language: safeLanguage,
        durationMinutes: metadata.durationMinutes ?? undefined,
        status: 'editing',
        cleanedAt,
      });
      if (!result.ok) {
        validatingRef.current = false;
        if (mountedRef.current) {
          setError(result.error);
          setValidating(false);
        }
        return;
      }

      trackEvent(StudioAnalyticsEvents.CLEANUP_COMPLETED, {
        sessionId,
        phaseCount: scenes.filter((s) => !s.archived).length + walks.filter((w) => !w.deleted).length,
        cleanupDurationMs: Date.now() - cleanupStartedAtRef.current,
      });
      logger.info(SERVICE_NAME, 'Cleanup validated', { sessionId });
      router.push(`/guide/studio/${sessionId}`);
    } catch (e) {
      validatingRef.current = false;
      if (mountedRef.current) {
        setError('Validation échouée.');
        setValidating(false);
        logger.error(SERVICE_NAME, 'Validate failed', { error: String(e) });
      }
    }
  }, [
    validation.ready,
    flushPendingSaves,
    sessionId,
    metadata,
    scenes,
    walks,
    router,
  ]);

  if (isLoading) {
    return (
      <div className="p-6" aria-busy="true" data-testid="cleanup-loading">
        <div className="bg-paper-soft rounded-lg h-64 animate-pulse" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-6">
        <Link href={`/guide/studio/${sessionId}`} className="text-grenadine hover:opacity-80 text-sm mb-4 inline-block">
          &larr; Retour
        </Link>
        <div className="bg-grenadine-soft border border-grenadine-soft rounded-lg p-4 text-danger" role="alert" data-testid="cleanup-error">
          {error || 'Session introuvable.'}
        </div>
      </div>
    );
  }

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setDetailTab('item');
  };

  return (
    <div className="flex flex-col min-h-[80vh]" data-testid="cleanup-page">
      <div className="grid grid-cols-1 md:grid-cols-[30%_70%] flex-1">
        {/* Left: timeline */}
        <aside className="border-r border-line bg-paper-soft p-3 overflow-y-auto" aria-label="Timeline">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Nettoyage</h2>
            <span className="text-[11px] text-ink-60" data-testid="save-state">
              {saveState === 'pending' && 'Modification...'}
              {saveState === 'saving' && 'Sauvegarde...'}
              {saveState === 'saved' && 'Sauvegardé'}
              {saveState === 'error' && 'Erreur sauvegarde'}
            </span>
          </div>
          <SortableTimeline
            items={timeline}
            selectedId={detailTab === 'item' ? selectedId : null}
            onSelect={handleSelect}
            onScenesReorder={handleScenesReorder}
          />
          {timeline.length === 0 && (
            <div className="text-sm text-ink-40 text-center p-4" data-testid="timeline-empty">
              Aucun item à nettoyer
            </div>
          )}
        </aside>

        {/* Right: detail panel */}
        <section className="p-4 md:p-6 overflow-y-auto" aria-label="Détail">
          <Link
            href={`/guide/studio/${sessionId}`}
            className="text-grenadine hover:opacity-80 text-sm mb-3 inline-block"
          >
            &larr; Retour à la session
          </Link>
          <h2 className="text-base font-semibold text-ink mb-3">
            {metadata.title || session.title || 'Session sans titre'} — Nettoyage
          </h2>

          <div className="flex gap-2 mb-4" role="tablist" aria-label="Sections">
            <button
              type="button"
              role="tab"
              aria-selected={detailTab === 'item'}
              onClick={() => setDetailTab('item')}
              data-testid="detail-tab-item"
              className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                detailTab === 'item'
                  ? 'bg-grenadine-soft border-grenadine-soft text-grenadine'
                  : 'bg-white border-line text-ink-80 hover:border-grenadine-soft'
              }`}
            >
              Item sélectionné
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={detailTab === 'global'}
              onClick={() => setDetailTab('global')}
              data-testid="detail-tab-global"
              className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                detailTab === 'global'
                  ? 'bg-grenadine-soft border-grenadine-soft text-grenadine'
                  : 'bg-white border-line text-ink-80 hover:border-grenadine-soft'
              }`}
            >
              Métadonnées globales
            </button>
          </div>

          {detailTab === 'global' ? (
            <GlobalMetadataPanel value={metadata} onChange={handleMetadataChange} />
          ) : (
            <>
              {!selected && (
                <div className="bg-paper-soft rounded-lg p-6 text-center text-ink-60" data-testid="no-selection">
                  Sélectionnez un item dans la timeline
                </div>
              )}

              {selected?.kind === 'scene' && (
                // Keyed on scene id so the AudioTrimmer (which keeps `duration` /
                // `isPlaying` in local state tied to the <audio> element) resets cleanly
                // when the user switches POI — prevents a leftover 'playing' state from
                // a previous scene's audio showing on the new panel.
                <POICleanupPanel
                  key={selected.scene.id}
                  scene={selected.scene}
                  audioUrl={audioUrls[selected.scene.id] ?? null}
                  onChange={handleSceneChange}
                />
              )}

              {selected?.kind === 'walk' && (
                // Keyed on walk id so the dynamically-loaded Leaflet MapContainer
                // (which only reads center/zoom on mount) re-mounts with the new
                // walk's bounds instead of showing the previous walk's map area.
                <WalkCleanupPanel
                  key={selected.walk.id}
                  walk={selected.walk}
                  onKeep={(id) => handleWalkToggle(id, false)}
                  onDelete={(id) => handleWalkToggle(id, true)}
                />
              )}
            </>
          )}
        </section>
      </div>

      <ValidateCTA
        validation={validation}
        busy={validating || saveState === 'saving' || saveState === 'pending'}
        onValidate={handleValidate}
      />
    </div>
  );
}
