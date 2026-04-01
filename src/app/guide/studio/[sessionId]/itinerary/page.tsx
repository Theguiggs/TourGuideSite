'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { logger } from '@/lib/logger';
import { getStudioSession, listStudioScenes, getSceneStatusConfig, createScene } from '@/lib/api/studio';
import { useStudioSessionStore, selectSetActiveSession, selectClearSession } from '@/lib/stores/studio-session-store';
import { shouldUseStubs } from '@/config/api-mode';
import type { StudioSession, StudioScene } from '@/types/studio';
import type { Waypoint } from '@/components/studio/editable-map';

const SERVICE_NAME = 'ItineraryPage';

const EditableMap = dynamic(
  () => import('@/components/studio/editable-map').then((m) => ({ default: m.EditableMap })),
  { ssr: false, loading: () => <div className="bg-gray-100 rounded-lg h-80 animate-pulse" /> },
);

interface EditingPOI {
  id: string;
  title: string;
  description: string;
  latitude: string;
  longitude: string;
}

async function geocodeAddress(query: string): Promise<{ lat: number; lng: number; display: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
    if (!res.ok) return null;
    const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
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
  const [addressSearch, setAddressSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [clickToPlaceId, setClickToPlaceId] = useState<string | null>(null); // POI id waiting for map click

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);

  /** Persist scene field updates to AppSync (fire-and-forget in real mode) */
  const persistSceneUpdate = useCallback((sceneId: string, updates: Record<string, unknown>) => {
    if (shouldUseStubs()) return;
    import('@/lib/api/appsync-client').then(({ updateStudioSceneMutation }) => {
      updateStudioSceneMutation(sceneId, updates).catch((err) => {
        logger.error(SERVICE_NAME, 'Failed to persist scene update', { sceneId, error: String(err) });
      });
    });
  }, []);

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
        logger.info(SERVICE_NAME, 'Itinerary page loaded', { sessionId });
      } catch (e) {
        if (!cancelled) setError('Impossible de charger.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; clearSession(); };
  }, [sessionId, setActiveSession, clearSession]);

  // Edit POI
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
  }, []);

  // Geocode address search
  const handleAddressSearch = useCallback(async () => {
    if (!addressSearch.trim() || !editForm) return;
    setIsSearching(true);
    setSearchResult(null);
    const result = await geocodeAddress(addressSearch);
    if (result) {
      setEditForm((prev) => prev ? { ...prev, latitude: result.lat.toFixed(6), longitude: result.lng.toFixed(6) } : prev);
      setSearchResult(`📍 ${result.display}`);
      logger.info(SERVICE_NAME, 'Address geocoded', { address: addressSearch, lat: result.lat, lng: result.lng });
    } else {
      setSearchResult('Adresse non trouvée');
    }
    setIsSearching(false);
  }, [addressSearch, editForm]);

  // Click on map to place POI
  const handleMapClickForPoi = useCallback((sceneId: string, lat: number, lng: number) => {
    if (clickToPlaceId === sceneId) {
      setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, latitude: lat, longitude: lng } : s));
      if (editForm && editForm.id === sceneId) {
        setEditForm((prev) => prev ? { ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) } : prev);
      }
      persistSceneUpdate(sceneId, { latitude: lat, longitude: lng });
      setClickToPlaceId(null);
      logger.info(SERVICE_NAME, 'POI placed via map click', { sceneId, lat: lat.toFixed(4), lng: lng.toFixed(4) });
    }
  }, [clickToPlaceId, editForm, persistSceneUpdate]);

  const saveEdit = useCallback(() => {
    if (!editForm) return;
    const updates: Record<string, unknown> = {};
    if (editForm.title) updates.title = editForm.title;
    if (editForm.description) updates.poiDescription = editForm.description;
    if (editForm.latitude) updates.latitude = parseFloat(editForm.latitude);
    if (editForm.longitude) updates.longitude = parseFloat(editForm.longitude);

    setScenes((prev) => prev.map((s) => {
      if (s.id !== editForm.id) return s;
      return {
        ...s,
        title: editForm.title || s.title,
        poiDescription: editForm.description || s.poiDescription,
        latitude: editForm.latitude ? parseFloat(editForm.latitude) : s.latitude,
        longitude: editForm.longitude ? parseFloat(editForm.longitude) : s.longitude,
      };
    }));
    persistSceneUpdate(editForm.id, updates);
    setEditingId(null);
    setEditForm(null);
    logger.info(SERVICE_NAME, 'POI updated', { id: editForm.id });
  }, [editForm, persistSceneUpdate]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm(null);
  }, []);

  // Validate POI
  const toggleValidation = useCallback((sceneId: string) => {
    setValidatedPois((prev) => {
      const next = new Set(prev);
      if (next.has(sceneId)) next.delete(sceneId);
      else next.add(sceneId);
      return next;
    });
  }, []);

  // Archive POI (set archived flag — data preserved, hidden from scenes & preview)
  const archivePoi = useCallback((sceneId: string) => {
    setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, archived: true } : s));
    setValidatedPois((prev) => { const next = new Set(prev); next.delete(sceneId); return next; });
    persistSceneUpdate(sceneId, { archived: true });
    logger.info(SERVICE_NAME, 'POI archived', { sceneId });
  }, [persistSceneUpdate]);

  // Restore archived POI
  const restorePoi = useCallback((sceneId: string) => {
    setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, archived: false } : s));
    persistSceneUpdate(sceneId, { archived: false });
    logger.info(SERVICE_NAME, 'POI restored', { sceneId });
  }, [persistSceneUpdate]);

  // Map: drag POI
  const handlePoiDrag = useCallback((sceneId: string, lat: number, lng: number) => {
    setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, latitude: lat, longitude: lng } : s));
    persistSceneUpdate(sceneId, { latitude: lat, longitude: lng });
    logger.info(SERVICE_NAME, 'POI moved on map', { sceneId, lat: lat.toFixed(4), lng: lng.toFixed(4) });
  }, [persistSceneUpdate]);

  // Map: waypoints
  const handleWaypointAdd = useCallback((afterPoiIndex: number, lat: number, lng: number) => {
    const wp: Waypoint = { id: `wp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, lat, lng, afterPoiIndex };
    setWaypoints((prev) => [...prev, wp]);
    logger.info(SERVICE_NAME, 'Waypoint added', { afterPoiIndex });
  }, []);

  const handleWaypointDrag = useCallback((id: string, lat: number, lng: number) => {
    setWaypoints((prev) => prev.map((w) => w.id === id ? { ...w, lat, lng } : w));
  }, []);

  const handleWaypointDelete = useCallback((id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
    logger.info(SERVICE_NAME, 'Waypoint deleted', { id });
  }, []);

  // Reorder (operates on active scenes only)
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

  // Add new POI
  const [isAddingPoi, setIsAddingPoi] = useState(false);
  const handleAddPoi = useCallback(async () => {
    if (!sessionId) return;
    setIsAddingPoi(true);
    const title = `POI ${scenes.filter((s) => !s.archived).length + 1}`;
    const result = await createScene(sessionId, title);
    if (result.ok) {
      setScenes((prev) => [...prev, result.scene]);
      logger.info(SERVICE_NAME, 'POI added', { sceneId: result.scene.id });
      // Auto-open edit mode for the new POI
      startEdit(result.scene);
    }
    setIsAddingPoi(false);
  }, [sessionId, scenes, startEdit]);

  if (isLoading) {
    return <div className="p-6" aria-busy="true"><div className="bg-gray-100 rounded-lg h-80 animate-pulse" /></div>;
  }

  if (error || !session) {
    return (
      <div className="p-6">
        <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 text-sm mb-4 inline-block">&larr; Retour</Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">{error || 'Introuvable.'}</div>
      </div>
    );
  }

  const isLocked = ['submitted', 'published', 'revision_requested'].includes(session?.status ?? '');
  const activeScenes = scenes.filter((s) => !s.archived);
  const archivedScenes = scenes.filter((s) => s.archived);
  const geoScenes = activeScenes.filter((s) => s.latitude && s.longitude);
  const allValidated = activeScenes.length > 0 && activeScenes.every((s) => validatedPois.has(s.id));

  return (
    <div className="p-6 max-w-4xl">
      <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 text-sm mb-4 inline-block">
        &larr; Retour au tour
      </Link>

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Itinéraire</h1>
        {allValidated && (
          <span className="text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">
            ✓ Itinéraire validé
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {activeScenes.length} POI{activeScenes.length > 1 ? 's' : ''} actif{activeScenes.length > 1 ? 's' : ''} · {geoScenes.length} géolocalisé{geoScenes.length > 1 ? 's' : ''} · {validatedPois.size} validé{validatedPois.size > 1 ? 's' : ''}
        {archivedScenes.length > 0 && ` · ${archivedScenes.length} archivé${archivedScenes.length > 1 ? 's' : ''}`}
      </p>

      {isLocked && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status" data-testid="readonly-banner">
          Contenu soumis &mdash; l&apos;itin&eacute;raire est en lecture seule.
        </div>
      )}

      {/* Placement mode banner */}
      {!isLocked && clickToPlaceId && (
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2" role="status">
          <span className="animate-pulse">📍</span>
          Cliquez sur la carte pour positionner le POI. <button onClick={() => setClickToPlaceId(null)} className="underline ml-1">Annuler</button>
        </div>
      )}

      {/* Editable Map — always show (needed for placing POIs without GPS) */}
      {(geoScenes.length > 0 || clickToPlaceId) && (
        <div className="rounded-lg overflow-hidden border border-gray-200 mb-2" data-testid="itinerary-map">
          <EditableMap
            scenes={scenes}
            waypoints={waypoints}
            onPoiDrag={isLocked ? () => {} : handlePoiDrag}
            onWaypointDrag={isLocked ? () => {} : handleWaypointDrag}
            onWaypointAdd={isLocked ? () => {} : handleWaypointAdd}
            onWaypointDelete={isLocked ? () => {} : handleWaypointDelete}
            onMapClick={!isLocked && clickToPlaceId ? (lat, lng) => handleMapClickForPoi(clickToPlaceId, lat, lng) : undefined}
          />
        </div>
      )}
      <p className="text-xs text-gray-400 mb-6">
        Glissez les marqueurs pour repositionner les POIs. Double-cliquez sur la carte pour ajouter un point de passage au parcours.
        {waypoints.length > 0 && ` ${waypoints.length} point${waypoints.length > 1 ? 's' : ''} de passage.`}
      </p>

      {/* Active POIs */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Points d&apos;intérêt</h2>
      <div className="space-y-2 mb-6">
        {activeScenes.map((scene, index) => {
          const statusConfig = getSceneStatusConfig(scene.status);
          const isEditing = editingId === scene.id;
          const isValidated = validatedPois.has(scene.id);
          const hasContent = !!(scene.transcriptText || scene.originalAudioKey || scene.photosRefs.length > 0);

          return (
            <div key={scene.id} className={`p-3 border rounded-lg transition-colors ${isValidated ? 'border-green-300 bg-green-50/50' : 'border-gray-200'}`}
              data-testid={`poi-${scene.id}`}>

              {!isLocked && isEditing && editForm ? (
                /* Edit mode */
                <div className="space-y-2">
                  <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    placeholder="Titre du POI" className="w-full border border-gray-300 rounded px-2 py-1 text-sm" data-testid={`edit-title-${scene.id}`} />
                  <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Description (aide au touriste)" rows={2} className="w-full border border-gray-300 rounded px-2 py-1 text-sm resize-none" />

                  {/* Address search */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Rechercher par adresse</label>
                    <div className="flex gap-1">
                      <input type="text" value={addressSearch}
                        onChange={(e) => setAddressSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddressSearch(); } }}
                        placeholder="Ex: Place aux Aires, Grasse"
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                        data-testid={`address-search-${scene.id}`} />
                      <button onClick={handleAddressSearch} disabled={isSearching}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-xs px-3 py-1 rounded">
                        {isSearching ? '...' : '🔍'}
                      </button>
                    </div>
                    {searchResult && (
                      <p className={`text-xs mt-1 ${searchResult.startsWith('📍') ? 'text-green-600' : 'text-red-500'}`}>
                        {searchResult}
                      </p>
                    )}
                  </div>

                  {/* GPS coordinates */}
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={editForm.latitude} onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value })}
                      placeholder="Latitude" className="border border-gray-300 rounded px-2 py-1 text-sm" />
                    <input type="text" value={editForm.longitude} onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value })}
                      placeholder="Longitude" className="border border-gray-300 rounded px-2 py-1 text-sm" />
                  </div>

                  {/* Click on map to place */}
                  {(!editForm.latitude || !editForm.longitude) && (
                    <button
                      onClick={() => setClickToPlaceId(clickToPlaceId === scene.id ? null : scene.id)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        clickToPlaceId === scene.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                      data-testid={`click-to-place-${scene.id}`}>
                      {clickToPlaceId === scene.id ? '📍 Cliquez sur la carte...' : '📍 Placer sur la carte'}
                    </button>
                  )}
                  {editForm.latitude && editForm.longitude && !clickToPlaceId && (
                    <button
                      onClick={() => setClickToPlaceId(scene.id)}
                      className="text-xs text-gray-500 hover:text-blue-600 underline">
                      📍 Repositionner sur la carte
                    </button>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button onClick={saveEdit} className="bg-teal-600 text-white text-xs px-3 py-1 rounded hover:bg-teal-700">Sauver</button>
                    <button onClick={cancelEdit} className="text-gray-500 text-xs px-3 py-1 rounded hover:bg-gray-100">Annuler</button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-start gap-3">
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    {!isLocked && (
                      <button onClick={() => moveScene(scene.id, 'up')} disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs" aria-label="Monter">▲</button>
                    )}
                    <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    {!isLocked && (
                      <button onClick={() => moveScene(scene.id, 'down')} disabled={index === activeScenes.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs" aria-label="Descendre">▼</button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{scene.title || `Scène ${index + 1}`}</p>
                      {isValidated && <span className="text-green-600 text-xs">✓ Validé</span>}
                    </div>
                    {scene.poiDescription && <p className="text-sm text-gray-500">{scene.poiDescription}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`px-1.5 py-0 rounded text-[10px] font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
                      {scene.latitude && scene.longitude && (
                        <span className="text-[10px] text-gray-400">📍 {scene.latitude.toFixed(4)}, {scene.longitude.toFixed(4)}</span>
                      )}
                      {!scene.latitude && <span className="text-[10px] text-amber-500">⚠ Pas de GPS</span>}
                      {scene.photosRefs.length > 0 && <span className="text-[10px] text-gray-400">{scene.photosRefs.length} 📷</span>}
                      {scene.transcriptText && <span className="text-[10px] text-purple-500">📝 Texte</span>}
                      {scene.originalAudioKey && <span className="text-[10px] text-blue-500">🎵 Audio</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  {!isLocked && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(scene)} className="text-xs text-teal-600 hover:text-teal-700 px-2 py-0.5 rounded hover:bg-teal-50"
                        data-testid={`edit-poi-${scene.id}`}>✏️ Éditer</button>
                      <button onClick={() => toggleValidation(scene.id)}
                        className={`text-xs px-2 py-0.5 rounded ${isValidated ? 'text-green-600 hover:bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}
                        data-testid={`validate-poi-${scene.id}`}>
                        {isValidated ? '✓ Validé' : '○ Valider'}
                      </button>
                      <button onClick={() => archivePoi(scene.id)}
                        className="text-xs text-amber-600 hover:text-amber-700 px-2 py-0.5 rounded hover:bg-amber-50"
                        title={hasContent ? 'Archiver — le contenu (audio, photos, texte) sera conservé' : 'Archiver'}
                        data-testid={`archive-poi-${scene.id}`}>
                        📦 Archiver
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add POI button */}
      {!isLocked && (
        <button
          onClick={handleAddPoi}
          disabled={isAddingPoi}
          className="w-full border-2 border-dashed border-gray-300 hover:border-teal-400 text-gray-500 hover:text-teal-600 rounded-lg py-3 text-sm font-medium transition-colors disabled:opacity-50 mb-6"
          data-testid="add-poi-btn"
        >
          {isAddingPoi ? 'Ajout...' : '+ Ajouter un POI'}
        </button>
      )}

      {activeScenes.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500 mb-6">
          <p>Aucun POI actif. Ajoutez un POI ci-dessus ou restaurez un POI archivé.</p>
        </div>
      )}

      {/* Archived POIs */}
      {archivedScenes.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            📦 Archivés ({archivedScenes.length})
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            Ces POIs sont conservés avec leur contenu (audio, photos, texte). Vous pouvez les restaurer dans ce tour ou les réutiliser dans un autre.
          </p>
          <div className="space-y-1">
            {archivedScenes.map((scene) => (
              <div key={scene.id} className="flex items-center gap-3 p-2 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
                <span className="text-gray-400 text-sm">📦</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600">{scene.title || 'Sans titre'}</p>
                  <div className="flex gap-2 text-[10px] text-gray-400">
                    {scene.photosRefs.length > 0 && <span>{scene.photosRefs.length} 📷</span>}
                    {scene.transcriptText && <span>📝 Texte</span>}
                    {scene.originalAudioKey && <span>🎵 Audio</span>}
                  </div>
                </div>
                {!isLocked && (
                  <button onClick={() => restorePoi(scene.id)}
                    className="text-xs text-teal-600 hover:text-teal-700 px-2 py-1 rounded hover:bg-teal-50"
                    data-testid={`restore-poi-${scene.id}`}>
                    ↩ Restaurer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
        <Link href={`/guide/studio/${sessionId}/general`} className="text-sm text-gray-500 hover:text-teal-600">
          ← Général
        </Link>
        <Link href={`/guide/studio/${sessionId}/scenes`} className="text-sm text-teal-600 hover:text-teal-700 font-medium">
          Scènes →
        </Link>
      </div>
    </div>
  );
}
