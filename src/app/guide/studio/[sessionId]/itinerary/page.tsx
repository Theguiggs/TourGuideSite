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
  const [routeInfo, setRouteInfo] = useState<{ distanceMeters: number; durationSeconds: number } | null>(null);
  const [addressSearch, setAddressSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [clickToPlaceId, setClickToPlaceId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);

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
        const [sess, scns] = await Promise.all([getStudioSession(sessionId), listStudioScenes(sessionId)]);
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
    } catch { /* ignore */ }
    return () => { cancelled = true; clearSession(); };
  }, [sessionId, setActiveSession, clearSession]);

  // Escape key exits map mode
  useEffect(() => {
    if (!mapMode) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMapMode(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mapMode]);

  // --- Handlers ---

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
      setEditForm((prev) => prev ? { ...prev, latitude: result.lat.toFixed(6), longitude: result.lng.toFixed(6) } : prev);
      setSearchResult(result.display);
    } else {
      setSearchResult('Adresse non trouvee');
    }
    setIsSearching(false);
  }, [addressSearch, editForm]);

  const handleMapClickForPoi = useCallback((sceneId: string, lat: number, lng: number) => {
    if (clickToPlaceId === sceneId) {
      setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, latitude: lat, longitude: lng } : s));
      if (editForm && editForm.id === sceneId) {
        setEditForm((prev) => prev ? { ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) } : prev);
      }
      persistSceneUpdate(sceneId, { latitude: lat, longitude: lng });
      setClickToPlaceId(null);
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
  }, [editForm, persistSceneUpdate]);

  const cancelEdit = useCallback(() => { setEditingId(null); setEditForm(null); }, []);

  const toggleValidation = useCallback((sceneId: string) => {
    setValidatedPois((prev) => { const next = new Set(prev); if (next.has(sceneId)) next.delete(sceneId); else next.add(sceneId); return next; });
  }, []);

  const archivePoi = useCallback((sceneId: string) => {
    setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, archived: true } : s));
    setValidatedPois((prev) => { const next = new Set(prev); next.delete(sceneId); return next; });
    persistSceneUpdate(sceneId, { archived: true });
  }, [persistSceneUpdate]);

  const restorePoi = useCallback((sceneId: string) => {
    setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, archived: false } : s));
    persistSceneUpdate(sceneId, { archived: false });
  }, [persistSceneUpdate]);

  const handlePoiDrag = useCallback((sceneId: string, lat: number, lng: number) => {
    setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, latitude: lat, longitude: lng } : s));
    persistSceneUpdate(sceneId, { latitude: lat, longitude: lng });
  }, [persistSceneUpdate]);

  const persistWaypoints = useCallback((wps: Waypoint[]) => {
    try { localStorage.setItem(`waypoints-${sessionId}`, JSON.stringify(wps)); } catch { /* ignore */ }
  }, [sessionId]);

  const handleWaypointAdd = useCallback((afterPoiIndex: number, lat: number, lng: number) => {
    const wp: Waypoint = { id: `wp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, lat, lng, afterPoiIndex };
    setWaypoints((prev) => { const next = [...prev, wp]; persistWaypoints(next); return next; });
  }, [persistWaypoints]);

  const handleWaypointDrag = useCallback((id: string, lat: number, lng: number) => {
    setWaypoints((prev) => { const next = prev.map((w) => w.id === id ? { ...w, lat, lng } : w); persistWaypoints(next); return next; });
  }, [persistWaypoints]);

  const handleWaypointDelete = useCallback((id: string) => {
    setWaypoints((prev) => { const next = prev.filter((w) => w.id !== id); persistWaypoints(next); return next; });
  }, [persistWaypoints]);

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

  const [isAddingPoi, setIsAddingPoi] = useState(false);
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

  // --- Loading / Error ---

  if (isLoading) return <div className="p-6" aria-busy="true"><div className="bg-gray-100 rounded-lg h-80 animate-pulse" /></div>;
  if (error || !session) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">{error || 'Introuvable.'}</div>
      </div>
    );
  }

  const isLocked = ['submitted', 'published', 'revision_requested'].includes(session?.status ?? '');
  const activeScenes = scenes.filter((s) => !s.archived);
  const archivedScenes = scenes.filter((s) => s.archived);
  const geoScenes = activeScenes.filter((s) => s.latitude && s.longitude);
  const allValidated = activeScenes.length > 0 && activeScenes.every((s) => validatedPois.has(s.id));

  // --- Shared map component ---
  const renderMap = (height: string) => (
    <EditableMap
      scenes={scenes}
      waypoints={waypoints}
      height={height}
      onPoiDrag={isLocked ? () => {} : handlePoiDrag}
      onWaypointDrag={isLocked ? () => {} : handleWaypointDrag}
      onWaypointAdd={isLocked ? () => {} : handleWaypointAdd}
      onWaypointDelete={isLocked ? () => {} : handleWaypointDelete}
      onMapClick={!isLocked && clickToPlaceId ? (lat, lng) => handleMapClickForPoi(clickToPlaceId, lat, lng) : undefined}
      onRouteInfo={(d, t) => setRouteInfo({ distanceMeters: d, durationSeconds: t })}
    />
  );

  // --- POI list (shared between normal and map mode) ---
  const poiList = (
    <div className="space-y-1.5">
      {activeScenes.map((scene, index) => {
        const isEditing = editingId === scene.id;
        const isValidated = validatedPois.has(scene.id);
        const hasGps = !!(scene.latitude && scene.longitude);

        return (
          <div key={scene.id} className={`rounded-lg border transition-colors ${isEditing ? 'border-teal-400 bg-teal-50/30' : isValidated ? 'border-green-300 bg-green-50/30' : 'border-gray-200 bg-white'}`}>

            {!isLocked && isEditing && editForm ? (
              <div className="p-3 space-y-2">
                <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Titre du POI" className="w-full border border-gray-300 rounded px-2 py-1 text-sm" autoFocus />
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Description" rows={2} className="w-full border border-gray-300 rounded px-2 py-1 text-sm resize-none" />

                {/* Address search */}
                <div className="flex gap-1">
                  <input type="text" value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddressSearch(); } }}
                    placeholder="Chercher une adresse..."
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs" />
                  <button onClick={handleAddressSearch} disabled={isSearching}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-xs px-2 py-1 rounded">
                    {isSearching ? '...' : 'Ok'}
                  </button>
                </div>
                {searchResult && <p className="text-xs text-green-600 truncate">{searchResult}</p>}

                {/* GPS */}
                <div className="grid grid-cols-2 gap-1">
                  <input type="text" value={editForm.latitude} onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value })}
                    placeholder="Lat" className="border border-gray-300 rounded px-2 py-1 text-xs" />
                  <input type="text" value={editForm.longitude} onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value })}
                    placeholder="Lng" className="border border-gray-300 rounded px-2 py-1 text-xs" />
                </div>

                {/* Place on map */}
                <button
                  onClick={() => setClickToPlaceId(clickToPlaceId === scene.id ? null : scene.id)}
                  className={`w-full text-xs px-2 py-1.5 rounded transition-colors ${
                    clickToPlaceId === scene.id ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}>
                  {clickToPlaceId === scene.id ? 'Cliquez sur la carte...' : 'Placer sur la carte'}
                </button>

                <div className="flex gap-2">
                  <button onClick={saveEdit} className="flex-1 bg-teal-600 text-white text-xs py-1.5 rounded hover:bg-teal-700">Sauver</button>
                  <button onClick={cancelEdit} className="flex-1 text-gray-500 text-xs py-1.5 rounded hover:bg-gray-100 border border-gray-200">Annuler</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2">
                {/* Number + reorder */}
                <div className="flex flex-col items-center shrink-0 w-6">
                  {!isLocked && index > 0 && (
                    <button onClick={() => moveScene(scene.id, 'up')} className="text-gray-300 hover:text-gray-600 text-[10px] leading-none">&#x25B2;</button>
                  )}
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold">{index + 1}</span>
                  {!isLocked && index < activeScenes.length - 1 && (
                    <button onClick={() => moveScene(scene.id, 'down')} className="text-gray-300 hover:text-gray-600 text-[10px] leading-none">&#x25BC;</button>
                  )}
                </div>

                {/* Title + status */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{scene.title || `Scene ${index + 1}`}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {hasGps ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="GPS OK" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Pas de GPS" />
                    )}
                    {isValidated && <span className="text-green-600 text-[10px]">&#x2713;</span>}
                  </div>
                </div>

                {/* Actions */}
                {!isLocked && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => startEdit(scene)} className="text-gray-400 hover:text-teal-600 p-1 rounded hover:bg-teal-50" title="Editer">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => toggleValidation(scene.id)} className={`p-1 rounded ${isValidated ? 'text-green-600' : 'text-gray-300 hover:text-green-500'}`} title="Valider">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <button onClick={() => archivePoi(scene.id)} className="text-gray-300 hover:text-red-500 p-1 rounded" title="Supprimer">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add POI */}
      {!isLocked && (
        <button onClick={handleAddPoi} disabled={isAddingPoi}
          className="w-full border border-dashed border-gray-300 hover:border-teal-400 text-gray-400 hover:text-teal-600 rounded-lg py-2 text-xs font-medium transition-colors disabled:opacity-50">
          {isAddingPoi ? 'Ajout...' : '+ Ajouter un POI'}
        </button>
      )}
    </div>
  );

  // --- Route info bar ---
  const routeBar = routeInfo && routeInfo.distanceMeters > 0 && (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-teal-50 border-b border-teal-200 text-xs">
      <span className="text-teal-700 font-semibold">
        {routeInfo.distanceMeters >= 1000 ? `${(routeInfo.distanceMeters / 1000).toFixed(1)} km` : `${Math.round(routeInfo.distanceMeters)} m`}
      </span>
      <span className="text-teal-600">~{Math.max(1, Math.round(routeInfo.durationSeconds / 60))} min</span>
      <span className="text-teal-500">{activeScenes.length} POIs</span>
      {waypoints.length > 0 && <span className="text-teal-400">{waypoints.length} pts passage</span>}
    </div>
  );

  // ========================================
  // MAP MODE — fullscreen with side panel
  // ========================================
  if (mapMode) {
    return (
      <div className="fixed inset-0 z-50 flex bg-white">
        {/* Side panel */}
        <div className={`${panelOpen ? 'w-80' : 'w-0'} transition-all duration-200 overflow-hidden flex flex-col border-r border-gray-200 bg-white shrink-0`}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
            <h2 className="text-sm font-bold text-gray-900">Points d&apos;interet</h2>
            <span className="text-xs text-gray-400">{activeScenes.length} POIs</span>
          </div>
          {routeBar}
          <div className="flex-1 overflow-y-auto p-2">
            {poiList}
          </div>
          {/* Archived */}
          {archivedScenes.length > 0 && (
            <div className="border-t border-gray-100 p-2 max-h-32 overflow-y-auto">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Archives ({archivedScenes.length})</p>
              {archivedScenes.map((s) => (
                <div key={s.id} className="flex items-center gap-2 py-1 text-xs text-gray-400">
                  <span className="truncate flex-1">{s.title || 'Sans titre'}</span>
                  {!isLocked && (
                    <button onClick={() => restorePoi(s.id)} className="text-teal-500 hover:text-teal-700 shrink-0">Restaurer</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Map toolbar */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 bg-white shrink-0">
            <button onClick={() => setPanelOpen(!panelOpen)}
              className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100" title={panelOpen ? 'Masquer le panneau' : 'Afficher le panneau'}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            {clickToPlaceId && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded animate-pulse">
                Cliquez sur la carte pour placer le POI
                <button onClick={() => setClickToPlaceId(null)} className="ml-2 underline">Annuler</button>
              </span>
            )}

            <span className="flex-1" />

            <p className="text-[10px] text-gray-400">Double-clic = point de passage &middot; Esc = quitter</p>

            <button onClick={() => setMapMode(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-3 py-1 rounded transition-colors">
              Quitter la carte
            </button>
          </div>

          {/* Map */}
          <div className="flex-1 relative">
            {renderMap('100%')}
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // NORMAL MODE
  // ========================================
  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-gray-900">Itineraire</h1>
        <div className="flex items-center gap-2">
          {allValidated && (
            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">&#x2713; Valide</span>
          )}
          {(geoScenes.length > 0 || clickToPlaceId) && (
            <button onClick={() => setMapMode(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              Ouvrir en mode carte
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        {activeScenes.length} POIs &middot; {geoScenes.length} geolocalises &middot; {validatedPois.size} valides
        {archivedScenes.length > 0 && ` \u00b7 ${archivedScenes.length} archives`}
      </p>

      {isLocked && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800" role="status">
          Contenu soumis &mdash; lecture seule.
        </div>
      )}

      {/* Inline map */}
      {(geoScenes.length > 0 || clickToPlaceId) && (
        <>
          {clickToPlaceId && (
            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center gap-2" role="status">
              <span className="animate-pulse">&#x1F4CD;</span>
              Cliquez sur la carte pour positionner le POI.
              <button onClick={() => setClickToPlaceId(null)} className="underline ml-1">Annuler</button>
            </div>
          )}
          <div className="rounded-lg overflow-hidden border border-gray-200 mb-1" data-testid="itinerary-map">
            {renderMap('350px')}
          </div>
          {routeBar}
          <p className="text-[10px] text-gray-400 mb-4 mt-1">
            Double-clic = ajouter un point de passage &middot; Glissez pour repositionner
          </p>
        </>
      )}

      {/* POI list */}
      <h2 className="text-sm font-semibold text-gray-900 mb-2">Points d&apos;interet</h2>
      {poiList}

      {activeScenes.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500 mt-4 text-sm">
          Aucun POI actif. Ajoutez un POI ci-dessus.
        </div>
      )}

      {/* Archived */}
      {archivedScenes.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Archives ({archivedScenes.length})</h2>
          <div className="space-y-1">
            {archivedScenes.map((scene) => (
              <div key={scene.id} className="flex items-center gap-2 p-2 border border-dashed border-gray-200 rounded-lg text-sm text-gray-500">
                <span className="truncate flex-1">{scene.title || 'Sans titre'}</span>
                {!isLocked && (
                  <button onClick={() => restorePoi(scene.id)} className="text-xs text-teal-600 hover:text-teal-700 shrink-0">Restaurer</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
        <Link href={`/guide/studio/${sessionId}/general`} className="text-sm text-gray-500 hover:text-teal-600">&larr; General</Link>
        <Link href={`/guide/studio/${sessionId}/scenes`} className="text-sm text-teal-600 hover:text-teal-700 font-medium">Scenes &rarr;</Link>
      </div>
    </div>
  );
}
