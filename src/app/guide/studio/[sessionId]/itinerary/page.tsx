'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { logger } from '@/lib/logger';
import {
  getStudioSession,
  listStudioScenes,
  createScene,
} from '@/lib/api/studio';
import {
  useStudioSessionStore,
  selectSetActiveSession,
  selectClearSession,
} from '@/lib/stores/studio-session-store';
import { shouldUseStubs } from '@/config/api-mode';
import { StepNav, WizField, WizInput, WizTextarea } from '@/components/studio/wizard';
import {
  PoiOverviewCard,
  MapStatsHeader,
} from '@/components/studio/wizard-itinerary';
import type { StudioSession, StudioScene } from '@/types/studio';
import type { Waypoint } from '@/components/studio/editable-map';

const SERVICE_NAME = 'ItineraryPage';

const EditableMap = dynamic(
  () => import('@/components/studio/editable-map').then((m) => ({ default: m.EditableMap })),
  {
    ssr: false,
    loading: () => <div className="bg-paper-soft rounded-lg h-80 animate-pulse" />,
  },
);

interface EditingPOI {
  id: string;
  title: string;
  description: string;
  latitude: string;
  longitude: string;
}

async function geocodeAddress(
  query: string,
): Promise<{ lat: number; lng: number; display: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display: data[0].display_name,
    };
  } catch {
    return null;
  }
}

export default function ItineraryPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<StudioSession | null>(null);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingPOI | null>(null);
  const [validatedPois, setValidatedPois] = useState<Set<string>>(new Set());
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeInfo, setRouteInfo] = useState<{
    distanceMeters: number;
    durationSeconds: number;
  } | null>(null);
  const [addressSearch, setAddressSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [clickToPlaceId, setClickToPlaceId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [isAddingPoi, setIsAddingPoi] = useState(false);

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);

  const persistSceneUpdate = useCallback(
    (sceneId: string, updates: Record<string, unknown>) => {
      if (shouldUseStubs()) return;
      import('@/lib/api/appsync-client').then(({ updateStudioSceneMutation }) => {
        updateStudioSceneMutation(sceneId, updates).catch((err) => {
          logger.error(SERVICE_NAME, 'Failed to persist scene update', {
            sceneId,
            error: String(err),
          });
        });
      });
    },
    [],
  );

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    async function load() {
      try {
        const [sess, scns] = await Promise.all([
          getStudioSession(sessionId),
          listStudioScenes(sessionId),
        ]);
        if (cancelled) return;
        setSession(sess);
        setScenes(scns);
        if (sess) setActiveSession(sess);
      } catch {
        if (!cancelled) setError('Impossible de charger.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    try {
      const saved = localStorage.getItem(`waypoints-${sessionId}`);
      if (saved) setWaypoints(JSON.parse(saved));
    } catch {
      // ignore
    }
    return () => {
      cancelled = true;
      clearSession();
    };
  }, [sessionId, setActiveSession, clearSession]);

  // Escape key exits map mode
  useEffect(() => {
    if (!mapMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMapMode(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mapMode]);

  const startEdit = useCallback((scene: StudioScene) => {
    setEditingId(scene.id);
    setEditForm({
      id: scene.id,
      title: scene.title || '',
      description: scene.poiDescription || '',
      latitude: scene.latitude?.toString() || '',
      longitude: scene.longitude?.toString() || '',
    });
    setAddressSearch('');
    setSearchResult(null);
    setClickToPlaceId(null);
    setPanelOpen(true);
  }, []);

  const handleAddressSearch = useCallback(async () => {
    if (!addressSearch.trim() || !editForm) return;
    setIsSearching(true);
    setSearchResult(null);
    const result = await geocodeAddress(addressSearch);
    if (result) {
      setEditForm((prev) =>
        prev
          ? { ...prev, latitude: result.lat.toFixed(6), longitude: result.lng.toFixed(6) }
          : prev,
      );
      setSearchResult(result.display);
    } else {
      setSearchResult('Adresse non trouvée');
    }
    setIsSearching(false);
  }, [addressSearch, editForm]);

  const handleMapClickForPoi = useCallback(
    (sceneId: string, lat: number, lng: number) => {
      if (clickToPlaceId === sceneId) {
        setScenes((prev) =>
          prev.map((s) => (s.id === sceneId ? { ...s, latitude: lat, longitude: lng } : s)),
        );
        if (editForm && editForm.id === sceneId) {
          setEditForm((prev) =>
            prev
              ? { ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }
              : prev,
          );
        }
        persistSceneUpdate(sceneId, { latitude: lat, longitude: lng });
        setClickToPlaceId(null);
      }
    },
    [clickToPlaceId, editForm, persistSceneUpdate],
  );

  const saveEdit = useCallback(() => {
    if (!editForm) return;
    const updates: Record<string, unknown> = {};
    if (editForm.title) updates.title = editForm.title;
    if (editForm.description) updates.poiDescription = editForm.description;
    if (editForm.latitude) updates.latitude = parseFloat(editForm.latitude);
    if (editForm.longitude) updates.longitude = parseFloat(editForm.longitude);
    setScenes((prev) =>
      prev.map((s) => {
        if (s.id !== editForm.id) return s;
        return {
          ...s,
          title: editForm.title || s.title,
          poiDescription: editForm.description || s.poiDescription,
          latitude: editForm.latitude ? parseFloat(editForm.latitude) : s.latitude,
          longitude: editForm.longitude ? parseFloat(editForm.longitude) : s.longitude,
        };
      }),
    );
    persistSceneUpdate(editForm.id, updates);
    setEditingId(null);
    setEditForm(null);
  }, [editForm, persistSceneUpdate]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm(null);
  }, []);

  const toggleValidation = useCallback((sceneId: string) => {
    setValidatedPois((prev) => {
      const next = new Set(prev);
      if (next.has(sceneId)) next.delete(sceneId);
      else next.add(sceneId);
      return next;
    });
  }, []);

  const archivePoi = useCallback(
    (sceneId: string) => {
      setScenes((prev) =>
        prev.map((s) => (s.id === sceneId ? { ...s, archived: true } : s)),
      );
      setValidatedPois((prev) => {
        const next = new Set(prev);
        next.delete(sceneId);
        return next;
      });
      persistSceneUpdate(sceneId, { archived: true });
    },
    [persistSceneUpdate],
  );

  const restorePoi = useCallback(
    (sceneId: string) => {
      setScenes((prev) =>
        prev.map((s) => (s.id === sceneId ? { ...s, archived: false } : s)),
      );
      persistSceneUpdate(sceneId, { archived: false });
    },
    [persistSceneUpdate],
  );

  const handlePoiDrag = useCallback(
    (sceneId: string, lat: number, lng: number) => {
      setScenes((prev) =>
        prev.map((s) => (s.id === sceneId ? { ...s, latitude: lat, longitude: lng } : s)),
      );
      persistSceneUpdate(sceneId, { latitude: lat, longitude: lng });
    },
    [persistSceneUpdate],
  );

  const persistWaypoints = useCallback(
    (wps: Waypoint[]) => {
      try {
        localStorage.setItem(`waypoints-${sessionId}`, JSON.stringify(wps));
      } catch {
        // ignore
      }
    },
    [sessionId],
  );

  const handleWaypointAdd = useCallback(
    (afterPoiIndex: number, lat: number, lng: number) => {
      const wp: Waypoint = {
        id: `wp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        lat,
        lng,
        afterPoiIndex,
      };
      setWaypoints((prev) => {
        const next = [...prev, wp];
        persistWaypoints(next);
        return next;
      });
    },
    [persistWaypoints],
  );

  const handleWaypointDrag = useCallback(
    (id: string, lat: number, lng: number) => {
      setWaypoints((prev) => {
        const next = prev.map((w) => (w.id === id ? { ...w, lat, lng } : w));
        persistWaypoints(next);
        return next;
      });
    },
    [persistWaypoints],
  );

  const handleWaypointDelete = useCallback(
    (id: string) => {
      setWaypoints((prev) => {
        const next = prev.filter((w) => w.id !== id);
        persistWaypoints(next);
        return next;
      });
    },
    [persistWaypoints],
  );

  const moveScene = useCallback((sceneId: string, direction: 'up' | 'down') => {
    setScenes((prev) => {
      const active = prev.filter((s) => !s.archived);
      const archived = prev.filter((s) => s.archived);
      const idx = active.findIndex((s) => s.id === sceneId);
      if (idx < 0) return prev;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= active.length) return prev;
      [active[idx], active[target]] = [active[target], active[idx]];
      return [...active.map((s, i) => ({ ...s, sceneIndex: i })), ...archived];
    });
  }, []);

  const handleAddPoi = useCallback(async () => {
    if (!sessionId) return;
    setIsAddingPoi(true);
    const title = `POI ${scenes.filter((s) => !s.archived).length + 1}`;
    const result = await createScene(sessionId, title);
    if (result.ok) {
      setScenes((prev) => [...prev, result.scene]);
      startEdit(result.scene);
    }
    setIsAddingPoi(false);
  }, [sessionId, scenes, startEdit]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto" aria-busy="true">
        <div className="h-8 w-48 bg-paper-deep rounded animate-pulse mb-3" />
        <div className="h-80 bg-paper-deep rounded-lg animate-pulse" />
      </div>
    );
  }
  if (error || !session) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div
          className="bg-grenadine-soft border border-grenadine rounded-md p-4 text-danger"
          role="alert"
        >
          {error || 'Introuvable.'}
        </div>
      </div>
    );
  }

  const isLocked = ['submitted', 'published', 'revision_requested'].includes(
    session.status ?? '',
  );
  const activeScenes = scenes.filter((s) => !s.archived);
  const archivedScenes = scenes.filter((s) => s.archived);
  const geoScenes = activeScenes.filter((s) => s.latitude && s.longitude);

  const renderMap = (height: string) => (
    <EditableMap
      scenes={scenes}
      waypoints={waypoints}
      height={height}
      onPoiDrag={isLocked ? () => {} : handlePoiDrag}
      onWaypointDrag={isLocked ? () => {} : handleWaypointDrag}
      onWaypointAdd={isLocked ? () => {} : handleWaypointAdd}
      onWaypointDelete={isLocked ? () => {} : handleWaypointDelete}
      onMapClick={
        !isLocked && clickToPlaceId
          ? (lat, lng) => handleMapClickForPoi(clickToPlaceId, lat, lng)
          : undefined
      }
      onRouteInfo={(d, t) => setRouteInfo({ distanceMeters: d, durationSeconds: t })}
    />
  );

  const routeBar = routeInfo && routeInfo.distanceMeters > 0 && (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-grenadine-soft border-t border-grenadine text-meta">
      <span className="text-grenadine font-bold">
        {routeInfo.distanceMeters >= 1000
          ? `${(routeInfo.distanceMeters / 1000).toFixed(1)} km`
          : `${Math.round(routeInfo.distanceMeters)} m`}
      </span>
      <span className="text-grenadine">
        ~{Math.max(1, Math.round(routeInfo.durationSeconds / 60))} min
      </span>
      <span className="text-grenadine">{activeScenes.length} POIs</span>
      {waypoints.length > 0 && (
        <span className="text-grenadine">{waypoints.length} pts passage</span>
      )}
    </div>
  );

  const poiList = (
    <div className="flex flex-col gap-2" data-testid="poi-list">
      {activeScenes.map((scene, index) => {
        const isEditing = editingId === scene.id;
        const isValidated = validatedPois.has(scene.id);
        const hasGps = !!(scene.latitude && scene.longitude);

        if (!isLocked && isEditing && editForm) {
          return (
            <div
              key={scene.id}
              className="bg-grenadine-soft/30 border border-grenadine rounded-md p-4 space-y-3"
              data-testid="poi-edit-form"
            >
              <WizField label="Titre du POI" htmlFor={`edit-title-${scene.id}`}>
                <WizInput
                  id={`edit-title-${scene.id}`}
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  autoFocus
                />
              </WizField>
              <WizField label="Description" htmlFor={`edit-desc-${scene.id}`}>
                <WizTextarea
                  id={`edit-desc-${scene.id}`}
                  rows={2}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                />
              </WizField>
              <div>
                <label className="text-meta font-semibold text-ink-80 mb-1.5 block">
                  Chercher une adresse
                </label>
                <div className="flex gap-2">
                  <WizInput
                    type="text"
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddressSearch();
                      }
                    }}
                    placeholder="ex : 1 place du Peyra, Vence"
                  />
                  <button
                    type="button"
                    onClick={handleAddressSearch}
                    disabled={isSearching}
                    className="bg-mer text-paper border-none px-4 py-2 rounded-md text-meta font-bold cursor-pointer hover:opacity-90 transition disabled:opacity-50 shrink-0"
                  >
                    {isSearching ? '…' : 'OK'}
                  </button>
                </div>
                {searchResult && (
                  <p className="text-meta text-success mt-1 truncate">{searchResult}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <WizField label="Latitude">
                  <WizInput
                    type="text"
                    value={editForm.latitude}
                    onChange={(e) =>
                      setEditForm({ ...editForm, latitude: e.target.value })
                    }
                    placeholder="ex : 43.7220"
                  />
                </WizField>
                <WizField label="Longitude">
                  <WizInput
                    type="text"
                    value={editForm.longitude}
                    onChange={(e) =>
                      setEditForm({ ...editForm, longitude: e.target.value })
                    }
                    placeholder="ex : 7.1116"
                  />
                </WizField>
              </div>
              <button
                type="button"
                onClick={() =>
                  setClickToPlaceId(clickToPlaceId === scene.id ? null : scene.id)
                }
                className={`w-full text-meta px-3 py-2 rounded-md transition ${
                  clickToPlaceId === scene.id
                    ? 'bg-mer text-paper'
                    : 'bg-mer-soft text-mer hover:opacity-90'
                }`}
              >
                {clickToPlaceId === scene.id
                  ? 'Cliquez sur la carte…'
                  : 'Placer sur la carte'}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveEdit}
                  className="flex-1 bg-grenadine text-paper border-none py-2 rounded-md text-meta font-bold cursor-pointer hover:opacity-90 transition"
                >
                  Sauver
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 bg-paper text-ink-60 border border-line py-2 rounded-md text-meta font-medium cursor-pointer hover:bg-paper-soft transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          );
        }

        return (
          <PoiOverviewCard
            key={scene.id}
            index={index + 1}
            title={scene.title || `POI ${index + 1}`}
            hasGps={hasGps}
            validated={isValidated}
            locked={isLocked}
            canMoveUp={index > 0}
            canMoveDown={index < activeScenes.length - 1}
            onMoveUp={() => moveScene(scene.id, 'up')}
            onMoveDown={() => moveScene(scene.id, 'down')}
            onEdit={() => startEdit(scene)}
            onToggleValidate={() => toggleValidation(scene.id)}
            onDelete={() => archivePoi(scene.id)}
          />
        );
      })}

      {!isLocked && (
        <button
          type="button"
          onClick={handleAddPoi}
          disabled={isAddingPoi}
          data-testid="add-poi-btn"
          className="w-full border border-dashed border-line text-ink-40 hover:border-grenadine hover:text-grenadine rounded-md py-2.5 text-meta font-semibold transition cursor-pointer disabled:opacity-50"
        >
          {isAddingPoi ? 'Ajout…' : '+ Ajouter un POI'}
        </button>
      )}
    </div>
  );

  // ─── Map mode (fullscreen) ───
  if (mapMode) {
    return (
      <div className="fixed inset-0 z-50 flex bg-paper">
        <div
          className={`${panelOpen ? 'w-80' : 'w-0'} transition-all duration-200 overflow-hidden flex flex-col border-r border-line bg-paper shrink-0`}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-paper-soft shrink-0">
            <h2 className="text-caption font-bold text-ink">Points d&apos;intérêt</h2>
            <span className="text-meta text-ink-40">{activeScenes.length} POIs</span>
          </div>
          {routeBar}
          <div className="flex-1 overflow-y-auto p-3">{poiList}</div>
          {archivedScenes.length > 0 && (
            <div className="border-t border-line p-3 max-h-32 overflow-y-auto">
              <p className="tg-eyebrow text-ink-40 mb-1">
                Archives ({archivedScenes.length})
              </p>
              {archivedScenes.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 py-1 text-meta text-ink-40"
                >
                  <span className="truncate flex-1">{s.title || 'Sans titre'}</span>
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => restorePoi(s.id)}
                      className="text-grenadine hover:opacity-80 shrink-0 underline underline-offset-2"
                    >
                      Restaurer
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 px-4 py-2 border-b border-line bg-paper shrink-0">
            <button
              type="button"
              onClick={() => setPanelOpen(!panelOpen)}
              aria-label={panelOpen ? 'Masquer le panneau' : 'Afficher le panneau'}
              className="text-ink-60 hover:text-ink p-1 rounded-sm hover:bg-paper-soft transition cursor-pointer"
            >
              ☰
            </button>
            {clickToPlaceId && (
              <span className="text-meta text-mer bg-mer-soft px-2 py-0.5 rounded-pill">
                Cliquez sur la carte…
                <button
                  type="button"
                  onClick={() => setClickToPlaceId(null)}
                  className="ml-2 underline underline-offset-2"
                >
                  Annuler
                </button>
              </span>
            )}
            <span className="flex-1" />
            <p className="text-meta text-ink-40">
              Double-clic = point de passage · Esc = quitter
            </p>
            <button
              type="button"
              onClick={() => setMapMode(false)}
              className="bg-paper-soft text-ink-80 border-none px-3 py-1.5 rounded-md text-meta font-semibold cursor-pointer hover:bg-paper-deep transition"
            >
              Quitter la carte
            </button>
          </div>
          <div className="flex-1 relative">{renderMap('100%')}</div>
        </div>
      </div>
    );
  }

  // ─── Normal mode ───
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h1 className="font-display text-h5 text-ink leading-none">Itinéraire</h1>
        <button
          type="button"
          onClick={() => setMapMode(true)}
          data-testid="open-map-mode"
          className="bg-grenadine text-paper border-none px-4 py-2.5 rounded-pill text-meta font-bold cursor-pointer hover:opacity-90 transition inline-flex items-center gap-2"
        >
          <span aria-hidden="true">◉</span> Ouvrir en mode carte
        </button>
      </div>
      <div className="mb-5">
        <MapStatsHeader
          totalPois={activeScenes.length}
          geolocated={geoScenes.length}
          validated={validatedPois.size}
        />
      </div>

      {isLocked && (
        <div
          className="mb-4 rounded-md border border-ocre bg-ocre-soft px-4 py-2.5 text-caption text-ocre"
          role="status"
        >
          Contenu soumis — lecture seule.
        </div>
      )}

      {clickToPlaceId && (
        <div
          className="mb-3 p-2.5 bg-mer-soft border border-mer rounded-md text-meta text-mer flex items-center gap-2"
          role="status"
        >
          <span aria-hidden="true">📍</span>
          Cliquez sur la carte pour positionner le POI.
          <button
            type="button"
            onClick={() => setClickToPlaceId(null)}
            className="underline underline-offset-2 ml-1"
          >
            Annuler
          </button>
        </div>
      )}

      <div className="rounded-lg overflow-hidden border border-line" data-testid="itinerary-map">
        {renderMap('350px')}
        {routeBar}
      </div>
      <p className="text-meta text-ink-40 mt-1.5 mb-5 italic">
        {geoScenes.length === 0
          ? 'Aucun POI géolocalisé — cliquez « Placer sur la carte » sur un POI pour commencer.'
          : 'Double-clic = ajouter un point de passage · Glissez pour repositionner'}
      </p>

      <h2 className="font-display text-h6 text-ink mb-3">Points d&apos;intérêt</h2>
      {poiList}

      {activeScenes.length === 0 && (
        <div className="bg-paper-soft rounded-md p-6 text-center text-caption text-ink-60 mt-4">
          Aucun POI actif. Ajoutez-en un ci-dessus.
        </div>
      )}

      {archivedScenes.length > 0 && (
        <div className="mt-7">
          <h2 className="tg-eyebrow text-ink-40 mb-2">
            Archives ({archivedScenes.length})
          </h2>
          <div className="space-y-1">
            {archivedScenes.map((scene) => (
              <div
                key={scene.id}
                className="flex items-center gap-2 p-2 border border-dashed border-line rounded-md text-caption text-ink-60"
              >
                <span className="truncate flex-1">{scene.title || 'Sans titre'}</span>
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => restorePoi(scene.id)}
                    className="text-meta text-grenadine hover:opacity-80 shrink-0 underline underline-offset-2"
                  >
                    Restaurer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <StepNav
        prevHref={`/guide/studio/${sessionId}/general`}
        prevLabel="Général"
        nextHref={`/guide/studio/${sessionId}/scenes`}
        nextLabel="Scènes"
      />
    </div>
  );
}
