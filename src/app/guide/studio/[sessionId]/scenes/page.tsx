'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { logger } from '@/lib/logger';
import { getStudioSession, listStudioScenes, updateSceneText, updateSceneAudio, getSceneStatusConfig, listSegmentsByScene, updateSceneSegment } from '@/lib/api/studio';
import { triggerTranscription, getTranscriptionQuota } from '@/lib/api/transcription';
import { listLanguagePurchases } from '@/lib/api/language-purchase';
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
import { LanguageTabs } from '@/components/studio/language-tabs';
import type { LanguageTabItem } from '@/components/studio/language-tabs';
import { useLanguagePurchaseStore } from '@/lib/stores/language-purchase-store';
import { useLanguageBatchStore, selectBatchProgress } from '@/lib/stores/language-batch-store';
import { LANG_TO_COUNTRY, LANGUAGE_CONFIG } from '@/components/studio/language-checkout/language-checkbox-card';
import { TTSControls } from '@/components/studio/tts-controls';
import { AudioPlayerBar } from '@/components/studio/audio-player';
import { AudioMixer } from '@/components/studio/audio-mixer';
import { type SceneAudioMix, DEFAULT_MIX } from '@/lib/studio/ambiance-catalog';
import { useTranslationStore, selectSegmentTranslation } from '@/lib/stores/translation-store';
import { useTTSStore, selectSegmentTTS } from '@/lib/stores/tts-store';
import { checkMicroserviceHealth } from '@/lib/api/translation';
import type { StudioSession, StudioScene, SceneSegment } from '@/types/studio';
import { getSceneSegments } from '@/types/studio';
import { LanguageSceneList, TourInfoTranslation } from '@/components/studio/language-scene-list';
import { StalenessAlert } from '@/components/studio/staleness-alert/staleness-alert';
import { getStaleSegments } from '@/lib/multilang/staleness-detector';
import { SplitEditor } from '@/components/studio/split-editor';
import { LanguageAudioSection } from '@/components/studio/language-audio-section';
import { requestTTS, getTTSStatus } from '@/lib/api/tts';

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
  const [activeTab, setActiveTab] = useState<'poi' | 'photos' | 'text' | 'audio'>('poi');
  const [gpuAvailable, setGpuAvailable] = useState(true);
  const [openTool, setOpenTool] = useState<'none' | 'tts' | 'record' | 'mixer'>('none');
  const [audioSaveToast, setAudioSaveToast] = useState<string | null>(null);
  const [sceneMixes, setSceneMixes] = useState<Record<string, SceneAudioMix>>({});
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
  const [activeLanguageTab, setActiveLanguageTab] = useState<string | null>(null);
  const [tourDescription, setTourDescription] = useState<string>('');
  const [langSegments, setLangSegments] = useState<SceneSegment[]>([]);
  const [langCompletedSceneIds, setLangCompletedSceneIds] = useState<string[]>([]);
  // Cache completed counts per language (survives tab switches)
  const completedCountCache = useRef<Record<string, number>>({});
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  // selectedLangSceneId removed — V2: all scenes shown inline

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);
  const quota = useTranscriptionStore(selectQuota);
  const setQuota = useTranscriptionStore((s) => s.setQuota);
  const setSceneStatus = useTranscriptionStore((s) => s.setSceneStatus);
  const startPolling = useTranscriptionStore((s) => s.startPolling);
  const stopAllPolling = useTranscriptionStore((s) => s.stopAllPolling);

  // Language purchases for this session — use useMemo to avoid infinite loop (array selector)
  const allPurchases = useLanguagePurchaseStore((s) => s.purchases);
  const purchases = useMemo(() => {
    const prefix = `${sessionId}_`;
    return Object.entries(allPurchases)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value);
  }, [allPurchases, sessionId]);
  const activePurchases = useMemo(
    () => purchases.filter((p) => p.status === 'active'),
    [purchases],
  );

  // Hydrate language purchases from AppSync on mount (survives page refresh)
  const setPurchases = useLanguagePurchaseStore((s) => s.setPurchases);
  useEffect(() => {
    if (!session) return;
    // Only hydrate if the store is empty for this session
    const prefix = `${sessionId}_`;
    const hasStoreData = Object.keys(allPurchases).some((k) => k.startsWith(prefix));
    if (hasStoreData) return;

    listLanguagePurchases(sessionId).then((result) => {
      if (result.ok && result.value.length > 0) {
        setPurchases(result.value);
        logger.info(SERVICE_NAME, 'Hydrated language purchases from AppSync', { count: result.value.length });
      }
    });
  }, [session, sessionId, allPurchases, setPurchases]);

  // Set default language tab to session base language once loaded
  useEffect(() => {
    if (session && activeLanguageTab === null) {
      setActiveLanguageTab(session.language);
    }
  }, [session, activeLanguageTab]);

  // Reusable function to reload segments for the active language tab
  const refreshLangSegments = useCallback(async () => {
    if (!session || !activeLanguageTab || activeLanguageTab === session.language) {
      // Don't flash to empty — keep existing data until new data loads
      if (activeLanguageTab === session?.language) {
        setLangSegments([]);
        setLangCompletedSceneIds([]);
      }
      return;
    }
    const activeScenes = scenes.filter((s) => !s.archived);
    const allSegments: SceneSegment[] = [];
    const completed: string[] = [];
    for (const scene of activeScenes) {
      const segs = await listSegmentsByScene(scene.id);
      const langSeg = segs.find((s) => s.language === activeLanguageTab);
      if (langSeg) {
        allSegments.push(langSeg);
        if (langSeg.transcriptText && langSeg.audioKey && !langSeg.audioKey.startsWith('tts-')) {
          completed.push(scene.id);
        }
      }
    }
    setLangSegments(allSegments);
    setLangCompletedSceneIds(completed);
    // Cache the count for this language
    if (activeLanguageTab) {
      completedCountCache.current[activeLanguageTab] = completed.length;
    }
  }, [session, activeLanguageTab, scenes]);

  // Track which languages have had batch auto-triggered (avoid re-triggering)
  const batchTriggeredRef = useRef<Set<string>>(new Set());

  // Fetch segments for non-base language tab + auto-trigger batch if needed
  useEffect(() => {
    let cancelled = false;
    refreshLangSegments()
      .then(async () => {
        if (cancelled || !activeLanguageTab || !session || activeLanguageTab === session.language) return;

        // Check if this is a Standard/Pro purchase with no translated segments yet
        const purchase = purchases.find((p) => p.language === activeLanguageTab && p.status === 'active');
        if (!purchase || purchase.purchaseType === 'manual' || purchase.qualityTier === 'manual') return;
        // Don't auto-translate if language is submitted or approved (locked)
        if (['submitted', 'approved'].includes(purchase.moderationStatus)) return;
        if (batchTriggeredRef.current.has(activeLanguageTab)) return;

        // Check if segments already have translated content (query fresh, don't use stale state)
        const activeScenes = scenes.filter((s) => !s.archived);
        let translatedCount = 0;
        for (const scene of activeScenes) {
          const segs = await listSegmentsByScene(scene.id);
          if (segs.some((s) => s.language === activeLanguageTab && s.transcriptText)) {
            translatedCount++;
          }
        }
        const scenesAlreadyTranslated = translatedCount >= activeScenes.length;
        const sessionInfoMissing = !session.translatedDescriptions?.[activeLanguageTab] || !session.translatedTitles?.[activeLanguageTab];

        // If scenes already translated AND session info already translated, nothing to do
        if (scenesAlreadyTranslated && !sessionInfoMissing) return;

        batchTriggeredRef.current.add(activeLanguageTab);

        try {
          const { executeBatch } = await import('@/lib/multilang/batch-translation-service');
          const { getGuideTourById } = await import('@/lib/api/appsync-client');

          // Load tour description for translation
          let tourDescriptionForBatch = '';
          if (session.tourId) {
            const tour = await getGuideTourById(session.tourId);
            tourDescriptionForBatch = (tour as Record<string, unknown>)?.description as string ?? '';
          }

          // If only session info is missing (scenes done), translate just title/description
          if (scenesAlreadyTranslated && sessionInfoMissing) {
            setBatchMessage(`Traduction titre/description en cours (${activeLanguageTab.toUpperCase()})...`);
            logger.info(SERVICE_NAME, 'Translating session info only (scenes already done)', { lang: activeLanguageTab });

            // Call executeBatch with empty scenes — it will only run translateSessionInfo
            const result = await executeBatch(
              sessionId,
              [],
              [{ code: activeLanguageTab, label: activeLanguageTab.toUpperCase() }],
              purchase.qualityTier as 'standard' | 'pro',
              undefined,
              session.title ?? '',
              tourDescriptionForBatch,
              session.language,
              session.tourId ?? undefined,
            );

            if (result.ok) {
              setBatchMessage('Titre et description traduits !');
              setTimeout(() => setBatchMessage(null), 5000);
            }

            // Reload session to get updated translatedTitles/translatedDescriptions
            const refreshedSession = await getStudioSession(sessionId);
            if (refreshedSession) setSession(refreshedSession);
            return;
          }

          // Full batch: scenes + session info
          const langConfigs = [{ code: activeLanguageTab, label: activeLanguageTab.toUpperCase() }];
          let completedCount = 0;
          setBatchMessage(`Traduction automatique en cours (${activeLanguageTab.toUpperCase()})...`);
          logger.info(SERVICE_NAME, 'Auto-triggering batch translation', { lang: activeLanguageTab, tier: purchase.qualityTier });

          const result = await executeBatch(
            sessionId,
            activeScenes,
            langConfigs,
            purchase.qualityTier as 'standard' | 'pro',
            (lang, sceneId, step) => {
              if (step === 'tts_completed') completedCount++;
              setBatchMessage(`Traduction ${lang.toUpperCase()} : ${completedCount}/${activeScenes.length} scenes...`);
              logger.info(SERVICE_NAME, 'Batch progress', { lang, sceneId, step });
            },
            session.title ?? '',
            tourDescriptionForBatch,
            session.language,
            session.tourId ?? undefined,
          );

          if (result.ok) {
            setBatchMessage(`Traduction terminee ! ${result.value.completedScenes} scenes traduites.`);
            setTimeout(() => setBatchMessage(null), 5000);
            logger.info(SERVICE_NAME, 'Batch completed', { completed: result.value.completedScenes });
            await refreshLangSegments();
            // Reload session to get updated translatedTitles/translatedDescriptions
            const refreshedSession = await getStudioSession(sessionId);
            if (refreshedSession) setSession(refreshedSession);
          } else {
            setBatchMessage('Erreur lors de la traduction automatique.');
            setTimeout(() => setBatchMessage(null), 5000);
          }
        } catch (err) {
          logger.error(SERVICE_NAME, 'Batch translation failed', { error: String(err) });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          logger.error(SERVICE_NAME, 'Failed to fetch lang segments', { error: String(e) });
        }
      });
    return () => { cancelled = true; };
  }, [refreshLangSegments]);

  // Build language tab items
  const languageTabItems: LanguageTabItem[] = (() => {
    if (!session) return [];
    const baseLanguage = session.language;
    const sceneCount = scenes.filter((s) => !s.archived).length;

    const baseLangConfig = LANGUAGE_CONFIG.find((c) => c.code === baseLanguage);
    const baseTab: LanguageTabItem = {
      code: baseLanguage,
      label: baseLangConfig?.label ?? baseLanguage.toUpperCase(),
      countryCode: LANG_TO_COUNTRY[baseLanguage] ?? baseLanguage,
      isBase: true,
      progress: { completed: sceneCount, total: sceneCount },
    };

    // Include both active and refunded purchases in tabs
    const visiblePurchases = purchases.filter((p) => p.status === 'active' || p.status === 'refunded');
    const purchaseTabs: LanguageTabItem[] = visiblePurchases.map((p) => {
      const langConfig = LANGUAGE_CONFIG.find((c) => c.code === p.language);
      const batchProgress = useLanguageBatchStore.getState().progress[p.language];
      // Always use cache for stable display (updated after every refresh/save)
      const completedFromCache = completedCountCache.current[p.language] ?? 0;
      const completedFromBatch = batchProgress?.completed ?? 0;
      return {
        code: p.language,
        label: langConfig?.label ?? p.language.toUpperCase(),
        countryCode: LANG_TO_COUNTRY[p.language] ?? p.language,
        isBase: false,
        progress: {
          completed: Math.max(completedFromCache, completedFromBatch),
          total: sceneCount,
        },
      };
    });

    return [baseTab, ...purchaseTabs];
  })();

  const visibleScenes = scenes.filter((s) => !s.archived);
  const archivedCount = scenes.filter((s) => s.archived).length;
  const activeScene = visibleScenes.find((s) => s.id === activeSceneId) ?? null;
  const editorTextRef = useRef(editorText);
  editorTextRef.current = editorText;
  const activeSceneIdRef = useRef(activeSceneId);
  activeSceneIdRef.current = activeSceneId;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const guideId = session?.guideId ?? null;

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
        // Load tour description for TourInfoTranslation display
        if (sess?.tourId) {
          import('@/lib/api/appsync-client').then(({ getGuideTourById }) => {
            getGuideTourById(sess.tourId!).then((tour) => {
              setTourDescription((tour as Record<string, unknown>)?.description as string ?? '');
            });
          });
        }
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
        // Pre-compute completed counts for all purchased languages (so tabs show correct 6/6)
        if (visible.length > 0) {
          const allSegs = (await Promise.all(visible.map((s) => listSegmentsByScene(s.id)))).flat();
          const langSet = new Set(allSegs.map((s) => s.language));
          for (const lang of langSet) {
            if (lang === sess?.language) continue;
            const count = visible.filter((scene) => {
              const seg = allSegs.find((s) => s.sceneId === scene.id && s.language === lang);
              return seg?.transcriptText && seg?.audioKey && !seg.audioKey.startsWith('tts-');
            }).length;
            completedCountCache.current[lang] = count;
          }
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
  }, [activeSceneId, activeScene?.latitude, activeScene?.longitude, activeScene?.title, activeScene?.poiDescription]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Always include all POI fields in the update — empty string → null
    const parsedLat = poiLat ? parseFloat(poiLat) : null;
    const parsedLng = poiLng ? parseFloat(poiLng) : null;
    const updates: Record<string, unknown> = {
      title: poiTitle || null,
      poiDescription: poiDescription || null,
      latitude: (parsedLat !== null && !isNaN(parsedLat)) ? parsedLat : null,
      longitude: (parsedLng !== null && !isNaN(parsedLng)) ? parsedLng : null,
    };

    // Update local state with current form values
    setScenes((prev) => prev.map((s) => {
      if (s.id !== activeScene.id) return s;
      return {
        ...s,
        title: poiTitle || s.title,
        poiDescription: poiDescription || s.poiDescription,
        latitude: updates.latitude as number | null,
        longitude: updates.longitude as number | null,
      };
    }));

    // Persist to backend (works in both stub and real mode)
    try {
      const { updateSceneData } = await import('@/lib/api/studio');
      await updateSceneData(activeScene.id, updates);
    } catch (e) {
      logger.error(SERVICE_NAME, 'Failed to save POI', { sceneId: activeScene.id, error: String(e) });
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
    updateSceneAudio(sceneId, audioKey, sessionId);
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

  const isLocked = ['submitted', 'published', 'revision_requested'].includes(session.status);
  const isBaseLangLocked = isLocked && (activeLanguageTab === session.language || !activeLanguageTab || languageTabItems.length <= 1);

  // Lock translated language tab when submitted or approved
  const activePurchase = purchases.find((p) => p.language === activeLanguageTab && p.status === 'active');
  const isActiveLangLocked = !!(activePurchase && ['submitted', 'approved'].includes(activePurchase.moderationStatus));

  // Translation tab removed — translation is now handled via language tabs (ML-4 refonte)
  const tabs = [
    { key: 'poi' as const, label: '📍 POI' },
    { key: 'photos' as const, label: '📷 Photos', count: activeScene?.photosRefs.length },
    { key: 'text' as const, label: '📝 Texte' },
    { key: 'audio' as const, label: '🎙️ Audio' },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-[60vh]">
      {/* DEBUG: Remove after testing */}
      <div className="fixed bottom-2 right-2 z-50 text-xs px-2 py-1 rounded" style={{ background: shouldUseStubs() ? '#ef4444' : '#22c55e', color: 'white' }}>
        {shouldUseStubs() ? '⚠️ STUBS' : '✅ REAL'}
      </div>
      <SceneSidebar scenes={visibleScenes} activeSceneId={activeSceneId} onSceneSelect={isUploading ? () => {} : handleSceneSelect} />

      <div className="flex-1 p-4 lg:p-6">
        {/* Batch translation progress banner */}
        {batchMessage && (
          <div className="mb-3 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-700 flex items-center gap-2" role="status" aria-live="polite">
            <svg className="h-4 w-4 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            {batchMessage}
          </div>
        )}

        {/* Language tabs — only visible when purchased languages exist */}
        {languageTabItems.length > 1 && (
          <LanguageTabs
            languages={languageTabItems}
            activeLanguage={activeLanguageTab ?? session.language}
            onLanguageChange={(lang) => { setActiveLanguageTab(lang); }}
          />
        )}

        {/* Read-only banner for base language */}
        {isBaseLangLocked && (
          <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status" data-testid="readonly-banner">
            Contenu soumis &mdash; modification non disponible. Vous pouvez travailler sur les langues traduites.
          </div>
        )}

        {/* Non-base language: Refunded banner */}
        {activeLanguageTab && activeLanguageTab !== session.language && languageTabItems.length > 1 &&
          purchases.some((p) => p.language === activeLanguageTab && p.status === 'refunded') && (
          <div
            className="rounded-lg border border-purple-300 bg-purple-50 p-6 text-center space-y-2"
            data-testid="language-refunded-banner"
          >
            <p className="text-lg font-semibold text-purple-800">Langue non disponible</p>
            <p className="text-sm text-purple-600">
              Cette langue a ete remboursee. Les segments traduits sont conserves mais ne peuvent plus etre edites.
            </p>
            <p className="text-xs text-purple-400">
              Vous pouvez re-acheter cette langue depuis le menu multilangue.
            </p>
          </div>
        )}

        {/* Non-base language: locked banner when submitted/approved */}
        {isActiveLangLocked && (
          <div className="mb-3 rounded-lg border border-teal-300 bg-teal-50 px-4 py-3 text-sm text-teal-800" role="status" data-testid="lang-locked-banner">
            Langue {activeLanguageTab?.toUpperCase()} soumise pour modération — modification non disponible.
            {activePurchase?.moderationStatus === 'approved' && ' Cette langue a été approuvée.'}
          </div>
        )}

        {/* Non-base language: TourInfoTranslation + all scenes inline */}
        {activeLanguageTab && activeLanguageTab !== session.language && languageTabItems.length > 1 &&
          !purchases.some((p) => p.language === activeLanguageTab && p.status === 'refunded') && (<>
          <TourInfoTranslation
            sessionId={sessionId}
            language={activeLanguageTab}
            sourceTitle={session.title ?? ''}
            sourceDescription={tourDescription}
            translatedTitle={session.translatedTitles?.[activeLanguageTab] ?? ''}
            translatedDescription={session.translatedDescriptions?.[activeLanguageTab] ?? ''}
            readOnly
            onTitleChange={isActiveLangLocked ? undefined : async (lang, title) => {
              const updated = { ...(session.translatedTitles ?? {}), [lang]: title };
              setSession((prev) => prev ? { ...prev, translatedTitles: updated } : prev);
              const { updateStudioSessionMutation } = await import('@/lib/api/appsync-client');
              const result = await updateStudioSessionMutation(sessionId, { translatedTitles: updated });
              if (!result.ok) logger.error(SERVICE_NAME, 'Failed to save translated title', { lang, error: result.error });
            }}
            onDescriptionChange={isActiveLangLocked ? undefined : async (lang, desc) => {
              const updated = { ...(session.translatedDescriptions ?? {}), [lang]: desc };
              setSession((prev) => prev ? { ...prev, translatedDescriptions: updated } : prev);
              const { updateStudioSessionMutation } = await import('@/lib/api/appsync-client');
              const result = await updateStudioSessionMutation(sessionId, { translatedDescriptions: updated });
              if (!result.ok) logger.error(SERVICE_NAME, 'Failed to save translated description', { lang, error: result.error });
            }}
            onRequestTranslation={isActiveLangLocked ? undefined : async () => {
              const lang = activeLanguageTab;
              const purchase = purchases.find((p) => p.language === lang && p.status === 'active');
              const tier = (purchase?.qualityTier as 'standard' | 'pro') ?? 'standard';
              const { requestTranslation, getTranslationStatus } = await import('@/lib/api/translation');

              console.log('[TourInfoTranslation] Starting translation', { lang, tier, title: session.title, descLength: tourDescription.length });

              // Helper: translate one text, handle polling if needed
              const translateText = async (id: string, text: string): Promise<string | null> => {
                if (!text) return null;
                try {
                  let result = await requestTranslation(id, text, session.language ?? 'fr', lang, tier);
                  console.log('[TourInfoTranslation] requestTranslation result', { id, status: result.status, hasText: !!result.translatedText });
                  // Poll if still processing (stub mode)
                  let attempts = 0;
                  while ((result.status === 'processing' || result.status === 'pending') && attempts < 30) {
                    await new Promise((r) => setTimeout(r, 1000));
                    const check = await getTranslationStatus(result.jobId);
                    if (check) result = check;
                    attempts++;
                  }
                  if (result.status !== 'completed') {
                    console.error('[TourInfoTranslation] Translation failed', { id, status: result.status });
                  }
                  return result.status === 'completed' ? result.translatedText : null;
                } catch (err) {
                  console.error('[TourInfoTranslation] Translation threw', { id, error: String(err) });
                  return null;
                }
              };

              // Translate title + description in parallel
              const [newTitle, newDesc] = await Promise.all([
                translateText(`session-title-${sessionId}-${lang}`, session.title ?? ''),
                translateText(`session-desc-${sessionId}-${lang}`, tourDescription),
              ]);

              console.log('[TourInfoTranslation] Translation results', { lang, newTitle: newTitle?.substring(0, 50), newDesc: newDesc?.substring(0, 50) });

              if (!newTitle && !newDesc) {
                throw new Error('Traduction echouee — verifiez que le microservice tourne sur localhost:8000');
              }

              // Save to StudioSession
              const updatedTitles = { ...(session.translatedTitles ?? {}), ...(newTitle ? { [lang]: newTitle } : {}) };
              const updatedDescs = { ...(session.translatedDescriptions ?? {}), ...(newDesc ? { [lang]: newDesc } : {}) };
              const { updateStudioSessionMutation, getGuideTourById, updateGuideTourMutation } = await import('@/lib/api/appsync-client');
              const saveResult = await updateStudioSessionMutation(sessionId, {
                translatedTitles: updatedTitles,
                translatedDescriptions: updatedDescs,
              });
              console.log('[TourInfoTranslation] Save result', { ok: saveResult.ok });

              // Also sync to GuideTour
              if (session.tourId && newDesc) {
                try {
                  const tour = await getGuideTourById(session.tourId);
                  const existing = (tour as Record<string, unknown>)?.translatedDescriptions ?? {};
                  await updateGuideTourMutation(session.tourId, {
                    translatedDescriptions: { ...(typeof existing === 'object' ? existing : {}), [lang]: newDesc },
                  });
                } catch { /* non-fatal */ }
              }

              // Update local React state so UI refreshes immediately
              setSession((prev) => prev ? {
                ...prev,
                translatedTitles: updatedTitles,
                translatedDescriptions: updatedDescs,
              } : prev);
            }}
          />
          {/* Staleness alert — hidden when language is locked (submitted/approved) */}
          {!isActiveLangLocked && (() => {
            const activeScenes = scenes.filter((s) => !s.archived);
            const staleInfos = getStaleSegments(langSegments, activeScenes);
            return (
              <StalenessAlert
                staleCount={staleInfos.length}
                staleSegmentIds={staleInfos.map((s) => s.segmentId)}
                segments={langSegments}
                scenes={activeScenes}
                onRetranslate={async (ids) => {
                  logger.info(SERVICE_NAME, 'Retranslate stale from alert', { lang: activeLanguageTab, segmentIds: ids });
                  if (!session || !activeLanguageTab) return;
                  const purchase = purchases.find((p) => p.language === activeLanguageTab && p.status === 'active');
                  if (!purchase) return;
                  const staleSceneIds = new Set(
                    langSegments.filter((s) => ids.includes(s.id)).map((s) => s.sceneId),
                  );
                  const scenesToRetranslate = scenes.filter((s) => !s.archived && staleSceneIds.has(s.id));
                  if (scenesToRetranslate.length === 0) return;
                  setBatchMessage(`Retraduction en cours (${activeLanguageTab.toUpperCase()})...`);
                  try {
                    const { executeBatch } = await import('@/lib/multilang/batch-translation-service');
                    const { getGuideTourById } = await import('@/lib/api/appsync-client');
                    const langConfigs = [{ code: activeLanguageTab, label: activeLanguageTab.toUpperCase() }];
                    let completedCount = 0;
                    // Load tour description for retranslation
                    let retranslateDesc = '';
                    if (session.tourId) {
                      const tour = await getGuideTourById(session.tourId);
                      retranslateDesc = (tour as Record<string, unknown>)?.description as string ?? '';
                    }
                    const result = await executeBatch(
                      sessionId,
                      scenesToRetranslate,
                      langConfigs,
                      (purchase.qualityTier as 'standard' | 'pro') ?? 'standard',
                      (lang, sceneId, step) => {
                        if (step === 'tts_completed') completedCount++;
                        setBatchMessage(`Retraduction ${lang.toUpperCase()} : ${completedCount}/${scenesToRetranslate.length} scenes...`);
                      },
                      session.title ?? '',
                      retranslateDesc,
                      session.language,
                      session.tourId ?? undefined,
                    );
                    if (result.ok) {
                      setBatchMessage(`Retraduction terminee ! ${result.value.completedScenes} scenes mises a jour.`);
                      setTimeout(() => setBatchMessage(null), 5000);
                      await refreshLangSegments();
                      // Reload session to get updated translatedDescriptions
                      const refreshedSess = await getStudioSession(sessionId);
                      if (refreshedSess) setSession(refreshedSess);
                    } else {
                      setBatchMessage('Erreur lors de la retraduction.');
                      setTimeout(() => setBatchMessage(null), 5000);
                    }
                  } catch (err) {
                    logger.error(SERVICE_NAME, 'Retranslate stale failed', { error: String(err) });
                    setBatchMessage('Erreur lors de la retraduction.');
                    setTimeout(() => setBatchMessage(null), 5000);
                  }
                }}
                onDismiss={async (ids) => {
                  // Mark segments as up-to-date without re-translating.
                  // Useful when the scene was modified for non-translatable reasons (GPS, photos, audio).
                  logger.info(SERVICE_NAME, 'Dismiss staleness', { lang: activeLanguageTab, count: ids.length });
                  const now = new Date().toISOString();
                  await Promise.all(ids.map((id) => updateSceneSegment(id, { sourceUpdatedAt: now })));
                  await refreshLangSegments();
                  setBatchMessage('Alerte ignoree. Traductions marquees a jour.');
                  setTimeout(() => setBatchMessage(null), 3000);
                }}
              />
            );
          })()}
          <LanguageSceneList
            scenes={scenes.filter((s) => !s.archived)}
            lang={activeLanguageTab}
            completedSceneIds={langCompletedSceneIds}
            segments={langSegments}
            sessionId={sessionId}
            onRetryScene={isActiveLangLocked ? undefined : (sceneId) => logger.info(SERVICE_NAME, 'Retry scene', { sceneId, lang: activeLanguageTab })}
            onResumeBatch={isActiveLangLocked ? undefined : () => logger.info(SERVICE_NAME, 'Resume batch', { lang: activeLanguageTab })}
            hasMissingScenes={langSegments.length < scenes.filter((s) => !s.archived).length}
            onSceneClick={(sceneId) => { logger.info(SERVICE_NAME, 'Scene click', { sceneId, lang: activeLanguageTab }); }}
            onRetranslateStale={isActiveLangLocked ? undefined : (sceneIds) => logger.info(SERVICE_NAME, 'Retranslate stale', { lang: activeLanguageTab, sceneIds })}
            onGenerateMissingAudio={isActiveLangLocked ? undefined : async () => {
              logger.info(SERVICE_NAME, 'Generate missing audio', { lang: activeLanguageTab });
              const activeScenes = scenes.filter((s) => !s.archived);
              for (const scene of activeScenes) {
                const seg = langSegments.find((s) => s.sceneId === scene.id && s.language === activeLanguageTab);
                if (seg && seg.transcriptText && !seg.audioKey) {
                  logger.info(SERVICE_NAME, 'Generating TTS for scene', { sceneId: scene.id, segmentId: seg.id });
                  const ttsResult = await requestTTS(seg.id, seg.transcriptText, activeLanguageTab);
                  if (ttsResult.status === 'completed' && ttsResult.audioKey) {
                    await updateSceneSegment(seg.id, { audioKey: ttsResult.audioKey, audioSource: 'tts' });
                  } else if (ttsResult.status === 'processing' && ttsResult.jobId) {
                    // Poll for completion (stub: 5s delay)
                    const poll = async () => {
                      for (let i = 0; i < 20; i++) {
                        await new Promise((r) => setTimeout(r, 1000));
                        const status = await getTTSStatus(ttsResult.jobId);
                        if (status && status.status === 'completed' && status.audioKey) {
                          await updateSceneSegment(seg.id, { audioKey: status.audioKey, audioSource: 'tts' });
                          return;
                        }
                        if (status && status.status === 'failed') return;
                      }
                    };
                    await poll();
                  }
                }
              }
              await refreshLangSegments();
            }}
            onListenPreview={() => { alert('Fonctionnalite a venir'); }}
            onFullPreview={() => { alert('Fonctionnalite a venir'); }}
            onSubmitLanguage={() => logger.info(SERVICE_NAME, 'Submit language', { lang: activeLanguageTab })}
          />

          {/* All scenes inline: SplitEditor + LanguageAudioSection per scene */}
          <div className="mt-4 space-y-6" data-testid="language-scenes-inline">
            {scenes.filter((s) => !s.archived).map((sceneItem) => {
              const langSegment = langSegments.find((s) => s.sceneId === sceneItem.id && s.language === activeLanguageTab);
              const segment = langSegment ?? {
                id: `pending-${sceneItem.id}-${activeLanguageTab}`,
                sceneId: sceneItem.id,
                segmentIndex: 0,
                audioKey: null,
                transcriptText: null,
                startTimeMs: null,
                endTimeMs: null,
                language: activeLanguageTab,
                sourceSegmentId: null,
                ttsGenerated: false,
                translationProvider: null,
                costProvider: null,
                costCharged: null,
                status: 'empty' as const,
                manuallyEdited: false,
                translatedTitle: null,
                sourceUpdatedAt: null,
                audioSource: undefined,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              const sourceText = sceneItem.transcriptText ?? '';
              return (
                <div key={sceneItem.id} className="space-y-3" data-testid={`language-scene-detail-${sceneItem.id}`}>
                  <h3 className="text-md font-semibold text-gray-900">
                    {segment.translatedTitle || sceneItem.title || `Scene ${sceneItem.sceneIndex + 1}`}
                  </h3>
                  <SplitEditor
                    segment={segment}
                    sourceText={sourceText}
                    sourceTitle={sceneItem.title ?? ''}
                    sourceLang={session.language}
                    targetLang={activeLanguageTab}
                    sessionId={sessionId}
                    readOnly
                    onSaved={() => {
                      // Refresh from AppSync to get real values
                      refreshLangSegments().catch((e) => logger.error(SERVICE_NAME, 'Refresh after save failed', { error: String(e) }));
                    }}
                    onSegmentCreated={(realSeg) => {
                      // Replace the pending placeholder with the real segment in langSegments
                      setLangSegments((prev) => {
                        const filtered = prev.filter((s) => !(s.sceneId === sceneItem.id && s.language === activeLanguageTab));
                        return [...filtered, realSeg];
                      });
                      logger.info(SERVICE_NAME, 'Segment created from SplitEditor', { sceneId: sceneItem.id, realId: realSeg.id });
                      // Also refresh to ensure badges update
                      refreshLangSegments().catch((e) => logger.error(SERVICE_NAME, 'Refresh after create failed', { error: String(e) }));
                    }}
                  />
                  <LanguageAudioSection
                    segment={segment}
                    sessionId={sessionId}
                    targetLanguage={activeLanguageTab}
                    translatedText={segment.transcriptText ?? ''}
                    gpuAvailable={gpuAvailable}
                    onAudioSaved={() => {
                      // Refresh from AppSync to get real audioKey values
                      refreshLangSegments().catch((e) => logger.error(SERVICE_NAME, 'Refresh after audio saved failed', { error: String(e) }));
                    }}
                  />
                  <hr className="border-gray-200" />
                </div>
              );
            })}
          </div>
        </>)}

        {/* Base language: existing scenes flow */}
        {(!activeLanguageTab || activeLanguageTab === session.language || languageTabItems.length <= 1) && (<>
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
                disabled={isBaseLangLocked}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100 disabled:text-gray-500"
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
                disabled={isBaseLangLocked}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100 disabled:text-gray-500"
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
                  disabled={isBaseLangLocked}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100 disabled:text-gray-500"
                  data-testid="poi-address-search"
                />
                <button
                  onClick={handleAddressSearch}
                  disabled={isSearching || isBaseLangLocked}
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
                    disabled={isBaseLangLocked}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100 disabled:text-gray-500"
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
                    disabled={isBaseLangLocked}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100 disabled:text-gray-500"
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
            {!isBaseLangLocked && (
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
            )}
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

            {activeScene.originalAudioKey && !isBaseLangLocked && (
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
              maxLength={50000} rows={10} readOnly={isBaseLangLocked}
              className={`w-full mt-1 p-3 border border-gray-200 rounded-lg text-gray-800 text-base leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-teal-400 ${isBaseLangLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
              data-testid="scene-editor" />
          </div>
        )}

        {/* Translation tab removed — translation is handled via language tabs (ML-4 refonte multilangue) */}

        {activeScene && activeSegment && activeTab === 'audio' && (
          <div className="space-y-4">

            {/* ════ SECTION 1 : Audio du POI + Player unique ════ */}
            <div className="p-4 bg-gray-900 rounded-xl text-white">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Audio du POI</p>
                  <p className="text-sm font-medium mt-0.5">
                    {!activeScene.studioAudioKey
                      ? 'Aucun audio selectionne'
                      : activeScene.studioAudioKey.startsWith('data:')
                        ? `🔊 TTS — ${LANG_FLAGS[ttsState?.language ?? ''] ?? ''} ${(ttsState?.language ?? activeSegment.language).toUpperCase()}`
                        : `🎙️ Enregistrement — ${LANG_FLAGS[activeSegment.language] ?? ''} ${activeSegment.language.toUpperCase()}`
                    }
                  </p>
                </div>
                {activeScene.studioAudioKey && (
                  <button
                    onClick={async () => {
                      const key = activeScene.studioAudioKey!;
                      const url = key.startsWith('data:') ? key : shouldUseStubs() ? key : await studioUploadService.getPlayableUrl(key);
                      audioPlayerService.play(url);
                    }}
                    className="bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium py-2 px-5 rounded-lg transition-colors"
                    data-testid="play-selected-audio"
                  >
                    Ecouter
                  </button>
                )}
              </div>
              <AudioPlayerBar compact />
            </div>

            {/* Toast */}
            {audioSaveToast && (
              <div className="p-2 bg-green-100 border border-green-300 rounded-lg text-center text-xs text-green-800 font-medium" data-testid="audio-save-toast">
                {audioSaveToast} selectionne comme audio du POI
              </div>
            )}

            {/* ════ SECTION 2 : Choisir la source ════ */}
            {!isBaseLangLocked && (<div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Choisir la source</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2" role="radiogroup" aria-label="Source audio">
                {/* Terrain */}
                {activeScene.originalAudioKey && (() => {
                  const sel = activeScene.studioAudioKey === activeScene.originalAudioKey;
                  return (
                    <button onClick={() => selectAudioSource(activeScene.id, activeScene.originalAudioKey!, 'Terrain')}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${sel ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <p className="text-lg mb-1">🌍</p>
                      <p className={`text-xs font-medium ${sel ? 'text-teal-800' : 'text-gray-800'}`}>Terrain</p>
                      <p className="text-[10px] text-gray-500">{LANG_FLAGS[activeSegment.language]} {activeSegment.language.toUpperCase()}</p>
                      {sel && <p className="text-[9px] text-teal-600 font-semibold mt-1">ACTIF</p>}
                    </button>
                  );
                })()}

                {/* Studio */}
                {activeScene.studioAudioKey && !activeScene.studioAudioKey.startsWith('data:') && activeScene.studioAudioKey !== activeScene.originalAudioKey && (
                  <button className="p-3 rounded-lg border-2 border-teal-500 bg-teal-50 text-left">
                    <p className="text-lg mb-1">🎙️</p>
                    <p className="text-xs font-medium text-teal-800">Studio</p>
                    <p className="text-[10px] text-gray-500">{LANG_FLAGS[activeSegment.language]} {activeSegment.language.toUpperCase()}</p>
                    <p className="text-[9px] text-teal-600 font-semibold mt-1">ACTIF</p>
                  </button>
                )}

                {/* TTS */}
                {ttsState && (ttsState.status === 'completed' || ttsState.status === 'processing') && (() => {
                  const sel = !!ttsState.audioKey && activeScene.studioAudioKey === ttsState.audioKey;
                  return (
                    <button
                      onClick={() => { if (ttsState.audioKey) selectAudioSource(activeScene.id, ttsState.audioKey, 'Audio TTS'); }}
                      disabled={ttsState.status === 'processing'}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        ttsState.status === 'processing' ? 'border-indigo-300 bg-indigo-50 animate-pulse'
                        : sel ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <p className="text-lg mb-1">🔊</p>
                      <p className={`text-xs font-medium ${sel ? 'text-teal-800' : 'text-gray-800'}`}>
                        {ttsState.status === 'processing' ? 'TTS...' : 'TTS'}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {LANG_FLAGS[ttsState.language ?? ''] ?? ''} {(ttsState.language ?? '').toUpperCase()}
                        {ttsState.durationMs ? ` ${Math.round(ttsState.durationMs / 1000)}s` : ''}
                      </p>
                      {sel && <p className="text-[9px] text-teal-600 font-semibold mt-1">ACTIF</p>}
                    </button>
                  );
                })()}

                {/* TTS saved (data: URL not in store) */}
                {activeScene.studioAudioKey?.startsWith('data:')
                  && !(ttsState?.status === 'completed' && ttsState.audioKey === activeScene.studioAudioKey) && (
                  <button className="p-3 rounded-lg border-2 border-teal-500 bg-teal-50 text-left">
                    <p className="text-lg mb-1">🔊</p>
                    <p className="text-xs font-medium text-teal-800">TTS</p>
                    <p className="text-[10px] text-gray-500">Precedemment genere</p>
                    <p className="text-[9px] text-teal-600 font-semibold mt-1">ACTIF</p>
                  </button>
                )}
              </div>
            </div>)}

            {/* ════ SECTION 3 : Outils (collapsibles) ════ */}
            {!isBaseLangLocked && (<div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Outils</p>
              <div className="flex gap-2 mb-2">
                {[
                  { key: 'tts' as const, label: '🔊 Generer TTS', color: 'indigo' },
                  { key: 'record' as const, label: '🎙️ Enregistrer', color: 'teal' },
                  { key: 'mixer' as const, label: '🎛️ Mixer', color: 'purple' },
                ].map((tool) => (
                  <button
                    key={tool.key}
                    onClick={() => setOpenTool(openTool === tool.key ? 'none' : tool.key)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      openTool === tool.key
                        ? `bg-${tool.color}-100 text-${tool.color}-700 border border-${tool.color}-300`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    data-testid={`tool-${tool.key}`}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>

              {/* ── Outil : TTS ── */}
              {openTool === 'tts' && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">{LANG_FLAGS[activeSegment.language]} Original</p>
                      <div className="p-2 bg-white border border-gray-200 rounded text-xs text-gray-600 max-h-20 overflow-y-auto">
                        {activeSegment.transcriptText || <span className="italic text-gray-400">Aucun texte</span>}
                      </div>
                    </div>
                    {translationState?.translatedText && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">{LANG_FLAGS[translationState.targetLang ?? '']} Traduction</p>
                        <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 max-h-20 overflow-y-auto">
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
                    onSaveAsSceneAudio={(audioDataUrl, lang) => selectAudioSource(activeScene.id, audioDataUrl, `TTS ${(lang ?? '').toUpperCase()}`)}
                  />
                </div>
              )}

              {/* ── Outil : Enregistrer ── */}
              {openTool === 'record' && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg space-y-3">
                  {editorText && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Prompteur</p>
                      <div className="h-48">
                        <Teleprompter text={editorText} onComplete={() => logger.info(SERVICE_NAME, 'Prompter done')} />
                      </div>
                    </div>
                  )}
                  <AudioRecorder sceneId={activeScene.id}
                    onRecordingComplete={async (sceneId) => {
                      const takes = useRecordingStore.getState().getSceneTakes(sceneId);
                      const latestTake = takes[takes.length - 1];
                      if (!latestTake?.blob) return;
                      const scene = visibleScenes.find((s) => s.id === sceneId);
                      const sceneIndex = scene?.sceneIndex ?? 0;
                      if (scene?.studioAudioKey) { setPendingReplace({ sceneId, sceneIndex, blob: latestTake.blob }); return; }
                      await doUploadAudio(latestTake.blob, sceneId, sceneIndex);
                    }} />
                  {isUploading && uploadProgress && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <div className="w-full bg-blue-100 rounded-full h-1.5">
                        <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress.total > 0 ? Math.round((uploadProgress.loaded / uploadProgress.total) * 100) : 0}%` }} />
                      </div>
                    </div>
                  )}
                  {uploadError && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-xs text-red-700">{uploadError} <button onClick={async () => {
                        if (!failedBlobRef.current) return;
                        const { blob, sceneId, sceneIndex } = failedBlobRef.current;
                        setIsUploading(true); setUploadError(null);
                        const uploadId = `${sessionId}-scene-${sceneIndex}-audio`;
                        const unsub = studioUploadService.onProgress(uploadId, (p) => setUploadProgress(p));
                        try { const result = await studioUploadService.uploadAudio(blob, sessionId, sceneIndex); unsub();
                          if (result.ok) { await updateSceneAudio(sceneId, result.s3Key); failedBlobRef.current = null; const refreshed = await listStudioScenes(sessionId); setScenes(refreshed); }
                          else { setUploadError(result.error); }
                        } catch { unsub(); setUploadError('Upload echoue.'); }
                        finally { setIsUploading(false); setUploadProgress(null); }
                      }} className="underline font-medium" data-testid="retry-upload-btn">Reessayer</button></p>
                    </div>
                  )}
                  <TakesList sceneId={activeScene.id} />
                  <FileImport sceneId={activeScene.id} />
                </div>
              )}

              {/* ── Outil : Mixer ── */}
              {openTool === 'mixer' && activeScene.studioAudioKey && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <AudioMixer
                    speechUrl={activeScene.studioAudioKey}
                    mix={sceneMixes[activeScene.id] ?? DEFAULT_MIX}
                    onMixChange={(newMix) => setSceneMixes((prev) => ({ ...prev, [activeScene.id]: newMix }))}
                  />
                </div>
              )}
              {openTool === 'mixer' && !activeScene.studioAudioKey && (
                <div className="p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-500">
                  Selectionnez d&apos;abord un audio pour utiliser le mixer.
                </div>
              )}
            </div>)}

            {/* Replace audio confirmation */}
            {pendingReplace && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg" data-testid="replace-audio-dialog">
                <p className="text-sm font-medium text-amber-800 mb-2">Remplacer l&apos;audio existant ?</p>
                <div className="flex gap-2">
                  <button onClick={async () => { const { blob, sceneId, sceneIndex } = pendingReplace; setPendingReplace(null); await doUploadAudio(blob, sceneId, sceneIndex); }}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium py-1.5 px-4 rounded-lg" data-testid="confirm-replace-audio">Remplacer</button>
                  <button onClick={() => setPendingReplace(null)}
                    className="border border-gray-300 text-gray-600 text-xs font-medium py-1.5 px-4 rounded-lg" data-testid="cancel-replace-audio">Garder</button>
                </div>
              </div>
            )}

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
        </>)}

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
