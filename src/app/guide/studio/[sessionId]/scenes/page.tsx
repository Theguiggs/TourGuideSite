'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { logger } from '@/lib/logger';
import { getStudioSession, listStudioScenes, updateSceneText, updateSceneAudio, getSceneStatusConfig } from '@/lib/api/studio';
import { triggerTranscription, getTranscriptionQuota } from '@/lib/api/transcription';
import { SceneSidebar } from '@/components/studio/scene-sidebar';
import { ScenePhotos } from '@/components/studio/scene-photos';
import { QuotaDisplay } from '@/components/studio/quota-display';
import { TranscriptionControls } from '@/components/studio/transcription-controls';
import { AudioRecorder } from '@/components/studio/audio-recorder';
import { TakesList } from '@/components/studio/takes-list';
import { FileImport } from '@/components/studio/file-import';
import { QualityFeedback } from '@/components/studio/quality-feedback';
import { useAutoSave } from '@/hooks/use-auto-save';
import { studioPersistenceService } from '@/lib/studio/studio-persistence-service';
import { useStudioSessionStore, selectSetActiveSession, selectClearSession } from '@/lib/stores/studio-session-store';
import { useTranscriptionStore, selectQuota } from '@/lib/stores/transcription-store';
import { useRecordingStore } from '@/lib/stores/recording-store';
import { shouldUseStubs } from '@/config/api-mode';
import * as studioUploadService from '@/lib/studio/studio-upload-service';
import { audioPlayerService } from '@/lib/studio/audio-player-service';
import { TranslationSelector } from '@/components/studio/translation-selector';
import { TranslationEditor } from '@/components/studio/translation-editor';
import { TTSControls } from '@/components/studio/tts-controls';
import { AudioPlayerBar } from '@/components/studio/audio-player';
import { useTranslationStore, selectSegmentTranslation } from '@/lib/stores/translation-store';
import { useTTSStore, selectSegmentTTS } from '@/lib/stores/tts-store';
import { checkMicroserviceHealth } from '@/lib/api/translation';
import type { StudioSession, StudioScene, SceneSegment } from '@/types/studio';
import { getSceneSegments } from '@/types/studio';

const SERVICE_NAME = 'ScenesPage';
const LANG_FLAGS: Record<string, string> = { fr: '🇫🇷', en: '🇬🇧', it: '🇮🇹', de: '🇩🇪', es: '🇪🇸' };

const Teleprompter = dynamic(
  () => import('@/components/studio/teleprompter').then((m) => ({ default: m.Teleprompter })),
  { ssr: false, loading: () => <div className="bg-gray-900 rounded-lg h-48 animate-pulse" /> },
);

function AudioSourceCard({ icon, label, sublabel, isSelected, isPlaying, onPlay, onSelect }: {
  icon: string;
  label: string;
  sublabel: string;
  isSelected: boolean;
  isPlaying?: boolean;
  onPlay: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-teal-500 bg-teal-50 shadow-sm'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
      role="radio"
      aria-checked={isSelected}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
        isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100'
      }`}>
        {isSelected ? '\u2713' : icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isSelected ? 'text-teal-800' : 'text-gray-800'}`}>
          {label}
          {isSelected && <span className="ml-2 text-xs bg-teal-600 text-white px-1.5 py-0.5 rounded">Selectionne</span>}
        </p>
        <p className="text-xs text-gray-500">{sublabel}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onPlay(); }}
        className={`text-xs font-medium py-1.5 px-4 rounded-lg transition-colors flex-shrink-0 ${
          isPlaying
            ? 'bg-teal-700 text-white animate-pulse'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        {isPlaying ? '... Lecture' : 'Ecouter'}
      </button>
    </div>
  );
}

export default function ScenesPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<StudioSession | null>(null);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorText, setEditorText] = useState('');
  const [activeTab, setActiveTab] = useState<'poi' | 'photos' | 'text' | 'audio' | 'translation'>('poi');
  const [gpuAvailable, setGpuAvailable] = useState(true);
  const [showTTSGenerator, setShowTTSGenerator] = useState(false);
  const [audioSaveToast, setAudioSaveToast] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  // POI editing state
  const [poiTitle, setPoiTitle] = useState('');
  const [poiDescription, setPoiDescription] = useState('');
  const [poiLat, setPoiLat] = useState('');
  const [poiLng, setPoiLng] = useState('');
  const [addressSearch, setAddressSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [poiSaved, setPoiSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const failedBlobRef = useRef<{ blob: Blob; sceneId: string; sceneIndex: number } | null>(null);
  const [pendingReplace, setPendingReplace] = useState<{ sceneId: string; sceneIndex: number; blob: Blob } | null>(null);

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);
  const quota = useTranscriptionStore(selectQuota);
  const setQuota = useTranscriptionStore((s) => s.setQuota);
  const setSceneStatus = useTranscriptionStore((s) => s.setSceneStatus);
  const startPolling = useTranscriptionStore((s) => s.startPolling);
  const stopAllPolling = useTranscriptionStore((s) => s.stopAllPolling);

  const visibleScenes = scenes.filter((s) => !s.archived);
  const archivedCount = scenes.filter((s) => s.archived).length;
  const activeScene = visibleScenes.find((s) => s.id === activeSceneId) ?? null;
  const editorTextRef = useRef(editorText);
  editorTextRef.current = editorText;
  const activeSceneIdRef = useRef(activeSceneId);
  activeSceneIdRef.current = activeSceneId;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const guideId = shouldUseStubs() ? 'guide-1' : null;

  // Load session + scenes
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
        const visible = scns.filter((s) => !s.archived);
        if (visible.length > 0) {
          setActiveSceneId(visible[0].id);
          const draft = studioPersistenceService.loadDraft(sessionId);
          setEditorText(draft?.scenes[visible[0].id]?.transcriptText ?? visible[0].transcriptText ?? '');
        }
        if (guideId) {
          const q = await getTranscriptionQuota(guideId);
          setQuota(q);
        }
        // Check microservice health for TTS/translation
        checkMicroserviceHealth().then((h) => setGpuAvailable(h.tts)).catch(() => setGpuAvailable(false));
        logger.info(SERVICE_NAME, 'Scenes page loaded', { sessionId });
      } catch (e) {
        if (!cancelled) { setError('Impossible de charger.'); }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (activeSceneIdRef.current && sessionId) {
        studioPersistenceService.saveDraft(sessionId, activeSceneIdRef.current, editorTextRef.current);
        updateSceneText(activeSceneIdRef.current, editorTextRef.current);
      }
      stopAllPolling();
      // Cleanup translation/TTS polling timers
      useTranslationStore.getState().stopAllPolling();
      useTTSStore.getState().stopAllPolling();
      clearSession();
    };
  }, [sessionId, setActiveSession, clearSession, guideId, setQuota, stopAllPolling]);

  // Scene switch
  const handleSceneSelect = useCallback((sceneId: string) => {
    if (activeSceneId && sessionId) {
      studioPersistenceService.saveDraft(sessionId, activeSceneId, editorTextRef.current);
      updateSceneText(activeSceneId, editorTextRef.current);
    }
    setActiveSceneId(sceneId);
    const scene = scenes.find((s) => s.id === sceneId);
    const draft = studioPersistenceService.loadDraft(sessionId);
    setEditorText(draft?.scenes[sceneId]?.transcriptText ?? scene?.transcriptText ?? '');
    setSyncError(null);
  }, [activeSceneId, sessionId, scenes]);

  // Auto-save text
  const handleSave = useCallback(async (text: string) => {
    if (!activeSceneId || !sessionId) return;
    studioPersistenceService.saveDraft(sessionId, activeSceneId, text);
    const result = await updateSceneText(activeSceneId, text);
    setSyncError(result.ok ? null : 'Sauvegarde locale uniquement — reconnectez-vous');
  }, [activeSceneId, sessionId]);

  const { isSaving, isDirty, resetBaseline } = useAutoSave({
    data: editorText, onSave: handleSave, debounceMs: 30_000,
    inputRef: textareaRef, saveOnBlur: true, enabled: !!activeSceneId && activeTab === 'text',
  });

  useEffect(() => { resetBaseline(); }, [activeSceneId, resetBaseline]);

  // Upload audio blob to S3 and persist to AppSync
  const doUploadAudio = useCallback(async (blob: Blob, sceneId: string, sceneIndex: number) => {
    if (shouldUseStubs()) {
      await updateSceneAudio(sceneId, `studio-audio/${sessionId}/${sceneId}.webm`);
    } else {
      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(null);
      const uploadId = `${sessionId}-scene-${sceneIndex}-audio`;
      const unsub = studioUploadService.onProgress(uploadId, (p) => setUploadProgress(p));
      try {
        const result = await studioUploadService.uploadAudio(blob, sessionId, sceneIndex);
        unsub();
        if (result.ok) {
          await updateSceneAudio(sceneId, result.s3Key);
          failedBlobRef.current = null;
        } else {
          setUploadError(result.error);
          failedBlobRef.current = { blob, sceneId, sceneIndex };
        }
      } catch (e) {
        unsub();
        logger.error(SERVICE_NAME, 'Audio upload exception', { error: String(e) });
        setUploadError('Upload échoué.');
        failedBlobRef.current = { blob, sceneId, sceneIndex };
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    }
    const refreshed = await listStudioScenes(sessionId);
    setScenes(refreshed);
  }, [sessionId]);

  // Warn before leaving if upload in progress
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isUploading) { e.preventDefault(); }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isUploading]);

  // Sync POI form when active scene changes
  useEffect(() => {
    if (!activeScene) return;
    setPoiTitle(activeScene.title ?? '');
    setPoiDescription(activeScene.poiDescription ?? '');
    setPoiLat(activeScene.latitude?.toString() ?? '');
    setPoiLng(activeScene.longitude?.toString() ?? '');
    setPoiSaved(false);
    setSearchResult(null);
    setAddressSearch('');
  }, [activeSceneId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Geocode address
  const handleAddressSearch = useCallback(async () => {
    if (!addressSearch.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressSearch)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
      if (res.ok) {
        const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;
        if (data.length > 0) {
          setPoiLat(parseFloat(data[0].lat).toFixed(6));
          setPoiLng(parseFloat(data[0].lon).toFixed(6));
          setSearchResult(`📍 ${data[0].display_name}`);
        } else {
          setSearchResult('Adresse non trouvée');
        }
      }
    } catch {
      setSearchResult('Erreur de recherche');
    } finally {
      setIsSearching(false);
    }
  }, [addressSearch]);

  // Save POI data
  const handleSavePoi = useCallback(async () => {
    if (!activeScene) return;
    const updates: Record<string, unknown> = {};
    if (poiTitle) updates.title = poiTitle;
    if (poiDescription) updates.poiDescription = poiDescription;
    if (poiLat) updates.latitude = parseFloat(poiLat);
    if (poiLng) updates.longitude = parseFloat(poiLng);

    // Update local state
    setScenes((prev) => prev.map((s) => {
      if (s.id !== activeScene.id) return s;
      return {
        ...s,
        title: poiTitle || s.title,
        poiDescription: poiDescription || s.poiDescription,
        latitude: poiLat ? parseFloat(poiLat) : s.latitude,
        longitude: poiLng ? parseFloat(poiLng) : s.longitude,
      };
    }));

    // Persist to AppSync
    if (!shouldUseStubs()) {
      try {
        const { updateStudioSceneMutation } = await import('@/lib/api/appsync-client');
        await updateStudioSceneMutation(activeScene.id, updates);
      } catch (e) {
        logger.error(SERVICE_NAME, 'Failed to save POI', { sceneId: activeScene.id, error: String(e) });
      }
    }
    setPoiSaved(true);
    setTimeout(() => setPoiSaved(false), 3000);
    logger.info(SERVICE_NAME, 'POI saved', { sceneId: activeScene.id });
  }, [activeScene, poiTitle, poiDescription, poiLat, poiLng]);

  // Photos change
  const handlePhotosChange = useCallback((sceneId: string, photos: string[]) => {
    setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, photosRefs: photos } : s));
    // Persist photo refs to DynamoDB in real mode (fire-and-forget)
    if (!shouldUseStubs()) {
      import('@/lib/api/appsync-client').then(({ updateStudioSceneMutation }) => {
        updateStudioSceneMutation(sceneId, { photosRefs: photos }).catch((err) => {
          logger.error(SERVICE_NAME, 'Failed to persist photosRefs', { sceneId, error: String(err) });
        });
      });
    }
  }, []);

  // Transcription
  const handleTriggerTranscription = useCallback(async (sceneId: string) => {
    if (quota?.isExceeded) return;
    setSceneStatus(sceneId, { status: 'processing', error: null });
    try {
      const result = await triggerTranscription(sceneId, 3);
      if (result.ok) {
        setSceneStatus(sceneId, { status: 'processing', jobId: result.jobId });
        startPolling(sceneId, result.jobId);
        if (guideId) { const q = await getTranscriptionQuota(guideId); setQuota(q); }
      } else {
        setSceneStatus(sceneId, { status: 'failed', error: result.error });
      }
    } catch {
      setSceneStatus(sceneId, { status: 'failed', error: 'Erreur inattendue.' });
    }
  }, [quota, guideId, setSceneStatus, startPolling, setQuota]);

  // Helper: select an audio source for the POI with visual feedback
  const selectAudioSource = useCallback((sceneId: string, audioKey: string, sourceLabel: string) => {
    setScenes((prev) => prev.map((s) =>
      s.id === sceneId ? { ...s, studioAudioKey: audioKey, status: 'recorded' as const, updatedAt: new Date().toISOString() } : s
    ));
    updateSceneAudio(sceneId, audioKey);
    setAudioSaveToast(sourceLabel);
    setTimeout(() => setAudioSaveToast(null), 3000);
    logger.info(SERVICE_NAME, 'Audio source selected', { sceneId, source: sourceLabel });
  }, []);

  // Build implicit segments for active scene (legacy compat)
  const activeSegments: SceneSegment[] = activeScene ? getSceneSegments(activeScene, []) : [];
  const activeSegment = activeSegments[0] ?? null;

  // Hooks must be called unconditionally (Rules of Hooks)
  const translationState = useTranslationStore(selectSegmentTranslation(activeSegment?.id ?? ''));
  const ttsState = useTTSStore(selectSegmentTTS(activeSegment?.id ?? ''));

  if (isLoading) {
    return <div className="p-6" aria-busy="true"><div className="bg-gray-100 rounded-lg h-96 animate-pulse" /></div>;
  }

  if (error || !session) {
    return (
      <div className="p-6">
        <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 text-sm mb-4 inline-block">&larr; Retour</Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">{error || 'Introuvable.'}</div>
      </div>
    );
  }

  const tabs = [
    { key: 'poi' as const, label: '📍 POI' },
    { key: 'photos' as const, label: '📷 Photos', count: activeScene?.photosRefs.length },
    { key: 'text' as const, label: '📝 Texte' },
    { key: 'translation' as const, label: '🌍 Traduction' },
    { key: 'audio' as const, label: '🎙️ Audio' },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-[60vh]">
      <SceneSidebar scenes={visibleScenes} activeSceneId={activeSceneId} onSceneSelect={isUploading ? () => {} : handleSceneSelect} />

      <div className="flex-1 p-4 lg:p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 text-sm mb-1 inline-block">&larr; Retour</Link>
            <h2 className="text-lg font-semibold text-gray-900">
              {activeScene?.title || `Scène ${(activeScene?.sceneIndex ?? 0) + 1}`}
            </h2>
            {activeScene && (
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getSceneStatusConfig(activeScene.status).color}`}>
                {getSceneStatusConfig(activeScene.status).label}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4" role="tablist">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => !isUploading && setActiveTab(tab.key)} role="tab" disabled={isUploading}
              aria-selected={activeTab === tab.key}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              data-testid={`tab-${tab.key}`}>
              {tab.label} {tab.count !== undefined && tab.count > 0 ? `(${tab.count})` : ''}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeScene && activeTab === 'poi' && (
          <div className="space-y-4">
            {/* Scene title */}
            <div>
              <label htmlFor="poi-title" className="text-sm font-medium text-gray-700 block mb-1">Titre de la scène</label>
              <input
                id="poi-title"
                type="text"
                value={poiTitle}
                onChange={(e) => setPoiTitle(e.target.value)}
                placeholder="Ex: Place aux Aires"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                data-testid="poi-title-input"
              />
            </div>

            {/* POI description */}
            <div>
              <label htmlFor="poi-desc" className="text-sm font-medium text-gray-700 block mb-1">Description du point d&apos;intérêt</label>
              <textarea
                id="poi-desc"
                value={poiDescription}
                onChange={(e) => setPoiDescription(e.target.value)}
                placeholder="Aide au touriste — ce qu'il verra à cet endroit"
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            {/* Address search */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Localisation GPS</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={addressSearch}
                  onChange={(e) => setAddressSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddressSearch(); } }}
                  placeholder="Rechercher une adresse..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  data-testid="poi-address-search"
                />
                <button
                  onClick={handleAddressSearch}
                  disabled={isSearching}
                  className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  {isSearching ? '...' : '🔍 Chercher'}
                </button>
              </div>
              {searchResult && (
                <p className={`text-xs mb-2 ${searchResult.startsWith('📍') ? 'text-green-600' : 'text-red-500'}`}>
                  {searchResult}
                </p>
              )}

              {/* Manual coordinates */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="poi-lat" className="text-xs text-gray-500 block mb-0.5">Latitude</label>
                  <input
                    id="poi-lat"
                    type="text"
                    value={poiLat}
                    onChange={(e) => setPoiLat(e.target.value)}
                    placeholder="43.6591"
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <div>
                  <label htmlFor="poi-lng" className="text-xs text-gray-500 block mb-0.5">Longitude</label>
                  <input
                    id="poi-lng"
                    type="text"
                    value={poiLng}
                    onChange={(e) => setPoiLng(e.target.value)}
                    placeholder="6.9243"
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              {/* GPS status */}
              {poiLat && poiLng && (
                <p className="text-xs text-green-600 mt-1">📍 {parseFloat(poiLat).toFixed(4)}, {parseFloat(poiLng).toFixed(4)}</p>
              )}
              {!poiLat && !poiLng && (
                <p className="text-xs text-amber-500 mt-1">⚠ Pas de coordonnées GPS — recherchez une adresse ou saisissez les coordonnées</p>
              )}
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSavePoi}
                className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-5 rounded-lg text-sm transition-colors"
                data-testid="save-poi-btn"
              >
                💾 Enregistrer le POI
              </button>
              {poiSaved && <span className="text-sm text-green-600">✓ Enregistré</span>}
            </div>
          </div>
        )}

        {activeScene && activeTab === 'photos' && (
          <div>
            {activeScene.poiDescription && <p className="text-sm text-gray-500 mb-3">{activeScene.poiDescription}</p>}
            {activeScene.latitude && <p className="text-xs text-gray-400 mb-3">📍 {activeScene.latitude.toFixed(4)}, {activeScene.longitude?.toFixed(4)}</p>}
            <ScenePhotos scene={activeScene} sessionId={sessionId} onPhotosChange={handlePhotosChange} />
          </div>
        )}

        {activeScene && activeTab === 'text' && (
          <div>
            <QuotaDisplay quota={quota} />

            {activeScene.originalAudioKey && (
              <div className="mt-3">
                <TranscriptionControls
                  sceneId={activeScene.id}
                  sceneTitle={activeScene.title || `Scène ${activeScene.sceneIndex + 1}`}
                  transcriptionStatus={activeScene.transcriptionStatus}
                  transcriptText={activeScene.transcriptText}
                  error={null}
                  isQuotaExceeded={quota?.isExceeded ?? false}
                  onTrigger={handleTriggerTranscription}
                  onRetry={handleTriggerTranscription}
                />
              </div>
            )}

            {syncError && (
              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700" role="alert">{syncError}</div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <label htmlFor="scene-text" className="text-sm font-medium text-gray-700">Texte de la scène</label>
              <div className="text-xs text-gray-400">
                {isSaving && <span className="text-blue-500">Sauvegarde...</span>}
                {!isSaving && isDirty && <span>Non sauvegardé</span>}
                {!isSaving && !isDirty && editorText && <span className="text-green-500">Sauvegardé</span>}
              </div>
            </div>
            <textarea ref={textareaRef} id="scene-text" value={editorText} onChange={(e) => setEditorText(e.target.value)}
              placeholder="Saisissez ou modifiez le texte de cette scène..."
              maxLength={50000} rows={10}
              className="w-full mt-1 p-3 border border-gray-200 rounded-lg text-gray-800 text-base leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-teal-400"
              data-testid="scene-editor" />
          </div>
        )}

        {activeScene && activeSegment && activeTab === 'translation' && (
          <div className="space-y-4">
            <TranslationSelector
              segment={activeSegment}
              onTranslationStarted={() => logger.info(SERVICE_NAME, 'Translation started', { segmentId: activeSegment.id })}
              onManualTranslation={(lang) => logger.info(SERVICE_NAME, 'Manual translation started', { segmentId: activeSegment.id, lang })}
            />
            <TranslationEditor
              segment={activeSegment}
              sessionId={sessionId}
              onGenerateTTS={() => { setActiveTab('audio'); setShowTTSGenerator(true); }}
            />
          </div>
        )}

        {activeScene && activeSegment && activeTab === 'audio' && (
          <div className="space-y-4">
            {/* ── Preview audio selectionne ── */}
            <div className={`p-4 rounded-lg border-2 ${activeScene.studioAudioKey ? 'bg-teal-50 border-teal-300' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Audio du POI (publie)</p>
                  {activeScene.studioAudioKey ? (
                    <p className="text-sm font-medium text-teal-800 mt-1">
                      {activeScene.studioAudioKey.startsWith('data:') ? '🔊 Audio TTS' : '🎙️ Enregistrement studio'}
                      {' — '}
                      {activeScene.studioAudioKey.startsWith('data:')
                        ? `${LANG_FLAGS[ttsState?.language ?? ''] ?? ''} ${(ttsState?.language ?? '').toUpperCase()}`
                        : `${LANG_FLAGS[activeSegment.language] ?? ''} ${activeSegment.language.toUpperCase()}`
                      }
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 italic mt-1">Aucun audio — selectionnez une source ci-dessous</p>
                  )}
                </div>
                {activeScene.studioAudioKey && (
                  <button
                    onClick={async () => {
                      try {
                        const key = activeScene.studioAudioKey!;
                        const url = key.startsWith('data:') ? key : shouldUseStubs() ? key : await studioUploadService.getPlayableUrl(key);
                        audioPlayerService.play(url);
                      } catch (e) {
                        logger.error(SERVICE_NAME, 'Failed to play scene audio', { error: String(e) });
                      }
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium py-2 px-5 rounded-lg transition-colors"
                    data-testid="play-selected-audio"
                  >
                    Ecouter le POI
                  </button>
                )}
              </div>
              {/* Player bar — appears when audio is playing/paused */}
              <AudioPlayerBar compact />
            </div>

            {/* ── Sources disponibles ── */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Choisir la source audio
              </h3>
              <div className="space-y-2" role="radiogroup" aria-label="Source audio">
                {/* Audio terrain original */}
                {activeScene.originalAudioKey && (
                  <AudioSourceCard
                    icon="🌍"
                    label="Enregistrement terrain (original)"
                    sublabel={`${LANG_FLAGS[activeSegment.language] ?? ''} ${activeSegment.language.toUpperCase()} — Audio capture sur le terrain`}
                    isSelected={activeScene.studioAudioKey === activeScene.originalAudioKey}
                    isPlaying={false}
                    onPlay={async () => {

                      const url = shouldUseStubs() ? activeScene.originalAudioKey! : await studioUploadService.getPlayableUrl(activeScene.originalAudioKey!);
                      audioPlayerService.play(url);

                    }}
                    onSelect={() => selectAudioSource(activeScene.id, activeScene.originalAudioKey!, 'Enregistrement terrain')}
                  />
                )}

                {/* Audio studio enregistre (seulement si different du terrain et pas un data URL TTS) */}
                {activeScene.studioAudioKey && !activeScene.studioAudioKey.startsWith('data:') && activeScene.studioAudioKey !== activeScene.originalAudioKey && (
                  <AudioSourceCard
                    icon="🎙️"
                    label="Enregistrement studio"
                    sublabel={`${LANG_FLAGS[activeSegment.language] ?? ''} ${activeSegment.language.toUpperCase()} — Enregistre dans le Studio Web`}
                    isSelected={true}
                    isPlaying={false}
                    onPlay={async () => {
                      const url = shouldUseStubs() ? activeScene.studioAudioKey! : await studioUploadService.getPlayableUrl(activeScene.studioAudioKey!);
                      audioPlayerService.play(url);

                    }}
                    onSelect={() => {}}
                  />
                )}

                {/* Audio TTS genere ou en cours */}
                {ttsState && (ttsState.status === 'completed' || ttsState.status === 'processing') && (
                  <AudioSourceCard
                    icon="🔊"
                    label={ttsState.status === 'processing' ? 'Audio TTS (generation en cours...)' : 'Audio TTS (voix synthetique)'}
                    sublabel={ttsState.status === 'processing'
                      ? `${LANG_FLAGS[ttsState.language ?? ''] ?? ''} ${(ttsState.language ?? '').toUpperCase()} — Generation en cours...`
                      : `${LANG_FLAGS[ttsState.language ?? ''] ?? ''} ${(ttsState.language ?? '').toUpperCase()} — edge-tts${ttsState.durationMs ? ` — ${Math.round(ttsState.durationMs / 1000)}s` : ''}`
                    }
                    isSelected={!!ttsState.audioKey && activeScene.studioAudioKey === ttsState.audioKey}
                    isPlaying={false}
                    onPlay={() => { if (ttsState.audioKey) audioPlayerService.play(ttsState.audioKey); }}
                    onSelect={() => {
                      if (!ttsState.audioKey) return;
                      selectAudioSource(activeScene.id, ttsState.audioKey, 'Audio TTS');
                    }}
                  />
                )}

                {/* Audio TTS deja sauvegarde comme scene audio (data: URL) mais pas dans ttsState */}
                {activeScene.studioAudioKey?.startsWith('data:')
                  && !(ttsState?.status === 'completed' && ttsState.audioKey === activeScene.studioAudioKey)
                  && (
                  <AudioSourceCard
                    icon="🔊"
                    label="Audio TTS (sauvegarde)"
                    sublabel="Voix synthetique — precedemment genere"
                    isSelected={true}
                    isPlaying={false}
                    onPlay={() => audioPlayerService.play(activeScene.studioAudioKey!)}
                    onSelect={() => {}}
                  />
                )}
              </div>
            </div>

            {/* ── Toast confirmation ── */}
            {audioSaveToast && (
              <div className="p-2 bg-green-100 border border-green-300 rounded-lg text-center text-sm text-green-800 font-medium" data-testid="audio-save-toast">
                {audioSaveToast} selectionne comme audio du POI
              </div>
            )}

            {/* ── Player (full controls when listening to any source) ── */}
            <AudioPlayerBar label="Lecture audio" />

            {/* ── Actions ── */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowTTSGenerator(!showTTSGenerator)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showTTSGenerator ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                data-testid="toggle-tts-generator"
              >
                {showTTSGenerator ? 'Masquer TTS' : '+ Generer un audio TTS'}
              </button>
            </div>

            {/* ── TTS Generator (inline) ── */}
            {showTTSGenerator && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-3">
                <h3 className="text-sm font-semibold text-indigo-800">Generation audio TTS</h3>
                {/* Texte source + traduit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      {LANG_FLAGS[activeSegment.language] ?? ''} Original ({activeSegment.language.toUpperCase()})
                    </p>
                    <div className="p-2 bg-white border border-gray-200 rounded text-xs text-gray-600 max-h-24 overflow-y-auto">
                      {activeSegment.transcriptText || <span className="italic text-gray-400">Aucun texte</span>}
                    </div>
                  </div>
                  {translationState?.translatedText && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        {LANG_FLAGS[translationState.targetLang ?? ''] ?? ''} Traduction ({(translationState.targetLang ?? '').toUpperCase()})
                      </p>
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 max-h-24 overflow-y-auto">
                        {translationState.translatedText}
                      </div>
                    </div>
                  )}
                </div>
                <TTSControls
                  segment={activeSegment}
                  text={translationState?.translatedText ?? activeSegment.transcriptText ?? ''}
                  language={translationState?.targetLang ?? activeSegment.language}
                  gpuAvailable={gpuAvailable}
                  onSaveAsSceneAudio={(audioDataUrl, lang) => {
                    selectAudioSource(activeScene.id, audioDataUrl, `Audio TTS ${(lang ?? '').toUpperCase()}`);
                  }}
                />
              </div>
            )}

            {/* ── Prompteur ── */}
            {editorText ? (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Prompteur</h3>
                <div className="h-64">
                  <Teleprompter text={editorText} onComplete={() => logger.info(SERVICE_NAME, 'Prompter done')} />
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
                Pas de texte — allez dans l&apos;onglet Texte pour transcrire ou saisir le texte de cette scene.
              </div>
            )}

            {/* ── Enregistrement ── */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                {activeScene.studioAudioKey ? 'Nouvelle prise (remplace l\'audio existant)' : 'Enregistrement'}
              </h3>
              <AudioRecorder sceneId={activeScene.id}
                onRecordingComplete={async (sceneId) => {
                  const takes = useRecordingStore.getState().getSceneTakes(sceneId);
                  const latestTake = takes[takes.length - 1];
                  if (!latestTake?.blob) {
                    logger.warn(SERVICE_NAME, 'No blob found for take', { sceneId });
                    return;
                  }
                  const scene = visibleScenes.find((s) => s.id === sceneId);
                  const sceneIndex = scene?.sceneIndex ?? 0;

                  if (scene?.studioAudioKey) {
                    setPendingReplace({ sceneId, sceneIndex, blob: latestTake.blob });
                    return;
                  }
                  await doUploadAudio(latestTake.blob, sceneId, sceneIndex);
                }} />
              {isUploading && uploadProgress && (
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700 mb-1">Upload en cours...</p>
                  <div className="w-full bg-blue-100 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress.total > 0 ? Math.round((uploadProgress.loaded / uploadProgress.total) * 100) : 0}%` }} />
                  </div>
                </div>
              )}
              {uploadError && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{uploadError}</p>
                  <button
                    onClick={async () => {
                      if (!failedBlobRef.current) return;
                      const { blob, sceneId, sceneIndex } = failedBlobRef.current;
                      setIsUploading(true);
                      setUploadError(null);
                      const uploadId = `${sessionId}-scene-${sceneIndex}-audio`;
                      const unsub = studioUploadService.onProgress(uploadId, (p) => setUploadProgress(p));
                      try {
                        const result = await studioUploadService.uploadAudio(blob, sessionId, sceneIndex);
                        unsub();
                        if (result.ok) {
                          await updateSceneAudio(sceneId, result.s3Key);
                          failedBlobRef.current = null;
                          const refreshed = await listStudioScenes(sessionId);
                          setScenes(refreshed);
                        } else { setUploadError(result.error); }
                      } catch { unsub(); setUploadError('Upload echoue.'); }
                      finally { setIsUploading(false); setUploadProgress(null); }
                    }}
                    className="mt-2 text-sm font-medium text-red-800 underline hover:text-red-900"
                    data-testid="retry-upload-btn"
                  >
                    Reessayer
                  </button>
                </div>
              )}
              <TakesList sceneId={activeScene.id} />
              <FileImport sceneId={activeScene.id} />
            </div>

            {/* Replace audio confirmation */}
            {pendingReplace && (
              <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg" data-testid="replace-audio-dialog">
                <p className="text-sm font-medium text-amber-800 mb-2">Un audio existe deja pour cette scene.</p>
                <p className="text-xs text-amber-600 mb-3">Voulez-vous remplacer l&apos;audio existant ?</p>
                <div className="flex gap-2">
                  <button onClick={async () => { const { blob, sceneId, sceneIndex } = pendingReplace; setPendingReplace(null); await doUploadAudio(blob, sceneId, sceneIndex); }}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium py-1.5 px-4 rounded-lg transition-colors" data-testid="confirm-replace-audio">
                    Remplacer
                  </button>
                  <button onClick={() => setPendingReplace(null)}
                    className="border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-medium py-1.5 px-4 rounded-lg transition-colors" data-testid="cancel-replace-audio">
                    Garder l&apos;ancien
                  </button>
                </div>
              </div>
            )}

            {/* Quality feedback */}
            {activeScene.qualityScore && (
              <QualityFeedback result={{ overall: activeScene.qualityScore, details: { averageVolume: -15, peakClipping: false, silenceRatio: 10 }, message: activeScene.qualityScore === 'good' ? 'Bonne qualite' : 'A ameliorer' }} />
            )}
          </div>
        )}

        {archivedCount > 0 && (
          <p className="mt-4 text-xs text-gray-400">
            📦 {archivedCount} scène{archivedCount > 1 ? 's' : ''} archivée{archivedCount > 1 ? 's' : ''} (gérées dans l&apos;onglet Itinéraire)
          </p>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
          <Link href={`/guide/studio/${sessionId}/itinerary`} className="text-sm text-gray-500 hover:text-teal-600">
            ← Itinéraire
          </Link>
          <Link href={`/guide/studio/${sessionId}/preview`} className="text-sm text-teal-600 hover:text-teal-700 font-medium">
            Preview →
          </Link>
        </div>
      </div>
    </div>
  );
}
