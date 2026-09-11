'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { logger } from '@/lib/logger';
import { getStudioSession, listStudioScenes, updateSceneAudio, updateSceneData } from '@/lib/api/studio';
import { SceneSidebar } from '@/components/studio/scene-sidebar';
import { AudioRecorder, type AudioRecorderHandle } from '@/components/studio/audio-recorder';
import { TakesList } from '@/components/studio/takes-list';
import { FileImport } from '@/components/studio/file-import';
import { useStudioSessionStore, selectSetActiveSession, selectClearSession } from '@/lib/stores/studio-session-store';
import { useRecordingStore } from '@/lib/stores/recording-store';
import type { StudioSession, StudioScene } from '@/types/studio';
import type { Take } from '@/lib/stores/recording-store';
import { uploadAudio, getPlayableUrl, onProgress, removeStoredAudio } from '@/lib/studio/studio-upload-service';
import { audioPlayerService } from '@/lib/studio/audio-player-service';
import { OnboardingBubble } from '@/components/studio/onboarding-bubble';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';

const SERVICE_NAME = 'RecordPage';

// Code splitting: Teleprompter uses rAF — no SSR (NFR1, architecture spec)
const Teleprompter = dynamic(
  () => import('@/components/studio/teleprompter').then((m) => ({ default: m.Teleprompter })),
  { ssr: false, loading: () => <div className="bg-ink rounded-lg h-96 animate-pulse" /> },
);

export default function RecordPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId;
  const querySceneId = searchParams.get('sceneId');
  // `lang` is the historical query parameter used by links from the former
  // multilingual scene editor. Keep accepting it so an old/deep link cannot
  // bypass the source-language-only recording rule.
  const requestedLanguage = searchParams.get('language') ?? searchParams.get('lang');

  const [session, setSession] = useState<StudioSession | null>(null);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'uploading' | 'persisting' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [persistedTakeIds, setPersistedTakeIds] = useState<Set<string>>(() => new Set());
  const [savedTakeIdByScene, setSavedTakeIdByScene] = useState<Record<string, string>>({});
  const [isDeletingAudio, setIsDeletingAudio] = useState(false);
  const uploadedKeysRef = useRef(new Map<string, string>());
  const replacementConfirmedRef = useRef(new Set<string>());
  const persistenceInFlightRef = useRef(false);
  const audioRecorderRef = useRef<AudioRecorderHandle>(null);

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);
  // La page /record vit hors du wizard : elle relit elle-même le choix du guide
  // sur les bulles d'aide, faute de quoi « Ne plus afficher » serait sans effet ici.
  const loadOnboarding = useOnboardingStore((s) => s.loadOnboarding);
  useEffect(() => {
    loadOnboarding();
  }, [loadOnboarding]);
  const takes = useRecordingStore((state) => state.takes);
  const selectedTakeId = useRecordingStore((state) => activeSceneId ? state.selectedTakeId[activeSceneId] : null);
  const recorderState = useRecordingStore((state) => state.recorderState);

  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null;
  const sceneText = activeScene?.transcriptText ?? '';
  const sourceLanguage = session
    ? ((session as StudioSession & { sourceLanguage?: string }).sourceLanguage ?? session.language)
    : null;
  const normalizeLanguage = (value: string) => value.trim().replaceAll('_', '-').toLowerCase();
  const isSourceLanguage = !requestedLanguage
    || (sourceLanguage !== null && normalizeLanguage(requestedLanguage) === normalizeLanguage(sourceLanguage));
  const hasUnpersistedTake = useMemo(
    () => Object.values(takes).flat().some((take) => !persistedTakeIds.has(take.id)),
    [persistedTakeIds, takes],
  );
  const isRecording = recorderState === 'recording' || recorderState === 'paused' || recorderState === 'requesting_permission';
  const isSavingAudio = saveState === 'uploading' || saveState === 'persisting' || isDeletingAudio;
  const hasPendingWork = hasUnpersistedTake || isRecording || isSavingAudio;

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
        // If sceneId from query param, use it; otherwise default to first scene
        const initialSceneId = querySceneId && scns.some((s) => s.id === querySceneId)
          ? querySceneId
          : scns[0]?.id ?? null;
        if (initialSceneId) setActiveSceneId(initialSceneId);

        logger.info(SERVICE_NAME, 'Record page loaded', { sessionId, scenesCount: scns.length, sceneId: initialSceneId });
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
    return () => {
      cancelled = true;
      clearSession();
      useRecordingStore.getState().resetStore();
    };
  }, [sessionId, setActiveSession, clearSession, querySceneId]);

  useEffect(() => {
    if (!hasPendingWork) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasPendingWork]);

  const confirmNavigation = useCallback(() => {
    if (!hasPendingWork) return true;
    if (isSavingAudio || isRecording) {
      setSaveMessage('Terminez ou arrêtez l’opération audio en cours avant de quitter cette page.');
      return false;
    }
    return window.confirm("Une prise ou une sauvegarde audio est en cours. Quitter cette page fera perdre les prises non sauvegardées. Continuer ?");
  }, [hasPendingWork, isRecording, isSavingAudio]);

  const persistTake = useCallback(async (scene: StudioScene, take: Take) => {
    if (persistenceInFlightRef.current) {
      setSaveMessage('Une sauvegarde audio est déjà en cours. Attendez sa fin avant de relancer.');
      return;
    }
    if (persistedTakeIds.has(take.id)) {
      setSaveState('saved');
      setSaveMessage('Cette prise est déjà associée à la scène.');
      return;
    }

    persistenceInFlightRef.current = true;
    let unsubscribeProgress: (() => void) | null = null;
    try {
      const hasExistingAudio = Boolean(scene.studioAudioKey || scene.originalAudioKey);
      if (hasExistingAudio && !replacementConfirmedRef.current.has(take.id)) {
        const confirmed = window.confirm("Cette scène possède déjà un audio. Voulez-vous le remplacer par cette prise ?");
        if (!confirmed) {
          setSaveState('idle');
          setSaveMessage("Audio existant conservé. La nouvelle prise reste disponible sur cette page.");
          return;
        }
        replacementConfirmedRef.current.add(take.id);
      }

      setSaveMessage(null);
      let s3Key = uploadedKeysRef.current.get(take.id);
      if (!s3Key) {
        setSaveState('uploading');
        setUploadPercent(0);
        const uploadId = `${sessionId}-scene-${scene.sceneIndex}-audio`;
        unsubscribeProgress = onProgress(uploadId, ({ loaded, total }) => {
          setUploadPercent(total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0);
        });
        // La langue nomme l'objet S3 : sans elle, une prise allemande était
        // indiscernable d'une prise française par sa clé.
        const uploadResult = await uploadAudio(take.blob, sessionId, scene.sceneIndex, scene.id, sourceLanguage ?? 'fr');
        unsubscribeProgress();
        unsubscribeProgress = null;
        if (!uploadResult.ok) {
          setSaveState('error');
          setSaveMessage(uploadResult.error);
          return;
        }
        s3Key = uploadResult.s3Key;
        uploadedKeysRef.current.set(take.id, s3Key);
      }

      setSaveState('persisting');
      const persistResult = await updateSceneAudio(scene.id, s3Key, sessionId, scene.sceneIndex, 'recording', sourceLanguage ?? 'fr');
      if (!persistResult.ok) {
        setSaveState('error');
        setSaveMessage(persistResult.error);
        return;
      }

      setScenes((current) => current.map((item) => item.id === scene.id ? {
        ...item,
        studioAudioKey: s3Key,
        baseAudioSource: 'recording',
        status: 'recorded',
        updatedAt: new Date().toISOString(),
      } : item));
      setPersistedTakeIds((current) => new Set(current).add(take.id));
      setSavedTakeIdByScene((current) => ({ ...current, [scene.id]: take.id }));
      setSaveState('saved');
      setSaveMessage('Prise enregistrée et associée à la scène.');
    } catch (e) {
      logger.error(SERVICE_NAME, 'Unexpected recording persistence failure', { error: String(e), sceneId: scene.id });
      setSaveState('error');
      setSaveMessage("La sauvegarde audio a échoué de manière inattendue. La prise est conservée pour réessayer.");
    } finally {
      unsubscribeProgress?.();
      persistenceInFlightRef.current = false;
    }
  }, [persistedTakeIds, sessionId, sourceLanguage]);

  const handleRecordingComplete = useCallback((sceneId: string, take: Take) => {
    const sceneTakes = useRecordingStore.getState().getSceneTakes(sceneId);
    const takeNumber = sceneTakes.findIndex((item) => item.id === take.id) + 1;
    setSaveState('idle');
    setUploadPercent(0);
    setSaveMessage(`Prise ${takeNumber || sceneTakes.length} prête. Écoutez vos essais puis choisissez celle à enregistrer pour la scène.`);
  }, []);

  const saveSelectedTake = useCallback(() => {
    if (!activeScene) return;
    const take = useRecordingStore.getState().getSelectedTake(activeScene.id);
    if (!take) {
      setSaveState('error');
      setSaveMessage('Sélectionnez ou enregistrez une prise avant de la sauvegarder.');
      return;
    }
    void persistTake(activeScene, take);
  }, [activeScene, persistTake]);

  const playSavedAudio = useCallback(async () => {
    const key = activeScene?.studioAudioKey ?? activeScene?.originalAudioKey;
    if (!key) return;
    try {
      const played = await audioPlayerService.play(await getPlayableUrl(key));
      if (!played) setSaveMessage("Impossible de lire l'audio enregistré.");
    } catch (e) {
      logger.error(SERVICE_NAME, 'Saved audio playback failed', { error: String(e) });
      setSaveMessage("Impossible de lire l'audio enregistré.");
    }
  }, [activeScene]);

  const deleteSavedAudio = useCallback(async () => {
    if (!activeScene || isDeletingAudio) return;
    const keys = [...new Set([activeScene.studioAudioKey, activeScene.originalAudioKey]
      .filter((key): key is string => Boolean(key)))];
    if (keys.length === 0) return;
    const confirmed = window.confirm(
      'Supprimer l’audio enregistré de cette scène ? Le texte sera conservé et vous pourrez enregistrer une nouvelle prise ou choisir le TTS depuis l’onglet Général.',
    );
    if (!confirmed) return;

    setIsDeletingAudio(true);
    setSaveState('idle');
    setSaveMessage(null);
    try {
      const result = await updateSceneData(activeScene.id, {
        studioAudioKey: null,
        originalAudioKey: null,
        baseAudioSource: null,
        status: activeScene.transcriptText?.trim() ? 'edited' : 'empty',
        takesCount: 0,
        selectedTakeIndex: null,
      });
      if (!result.ok) {
        setSaveState('error');
        setSaveMessage(result.error);
        return;
      }

      audioPlayerService.stop();
      setScenes((current) => current.map((scene) => scene.id === activeScene.id ? {
        ...scene,
        studioAudioKey: null,
        originalAudioKey: null,
        baseAudioSource: null,
        status: activeScene.transcriptText?.trim() ? 'edited' : 'empty',
        takesCount: 0,
        selectedTakeIndex: null,
      } : scene));

      const savedTakeId = savedTakeIdByScene[activeScene.id];
      if (savedTakeId) {
        setPersistedTakeIds((current) => {
          const next = new Set(current);
          next.delete(savedTakeId);
          return next;
        });
        uploadedKeysRef.current.delete(savedTakeId);
        replacementConfirmedRef.current.delete(savedTakeId);
        setSavedTakeIdByScene((current) => {
          const next = { ...current };
          delete next[activeScene.id];
          return next;
        });
      }

      const removals = await Promise.all(keys.map((key) => removeStoredAudio(key)));
      const storageWarning = removals.some((item) => !item.ok);
      setSaveMessage(storageWarning
        ? 'Audio retiré de la scène. Le nettoyage du fichier de stockage devra être relancé.'
        : 'Audio supprimé de la scène. Le texte est conservé.');
    } catch (e) {
      logger.error(SERVICE_NAME, 'Saved audio deletion failed', { sceneId: activeScene.id, error: String(e) });
      setSaveState('error');
      setSaveMessage('La suppression de l’audio a échoué. Réessayez.');
    } finally {
      setIsDeletingAudio(false);
    }
  }, [activeScene, isDeletingAudio, savedTakeIdByScene]);

  const startSynchronizedRecording = useCallback(async () => {
    return audioRecorderRef.current?.start() ?? false;
  }, []);

  const pauseSynchronizedRecording = useCallback(() => {
    audioRecorderRef.current?.pause();
  }, []);

  const resumeSynchronizedRecording = useCallback(() => {
    return audioRecorderRef.current?.resume() ?? false;
  }, []);

  const stopSynchronizedRecording = useCallback(async () => {
    await audioRecorderRef.current?.stop();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6" aria-busy="true">
        <span className="sr-only">Chargement du prompteur...</span>
        <div className="bg-ink rounded-lg h-96 animate-pulse" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-6">
        <Link href={`/guide/studio/${sessionId}`} className="text-grenadine hover:opacity-80 text-body mb-4 inline-block">
          &larr; Retour à la session
        </Link>
        <div className="bg-grenadine-soft border border-grenadine-soft rounded-lg p-4 text-danger" role="alert">
          {error || 'Session introuvable.'}
        </div>
      </div>
    );
  }

  if (session.narrationMode !== 'recording') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Link href={`/guide/studio/${sessionId}/scenes`} className="text-grenadine hover:opacity-80 text-body mb-4 inline-block">
          &larr; Retour aux scènes
        </Link>
        <div className="rounded-lg border border-mer-soft bg-mer-soft p-5 text-mer" role="status">
          Cette version utilise la voix de synthèse à la demande. Finalisez ses textes dans le Studio ; aucun enregistrement ni TTS n’est produit ici.
        </div>
      </div>
    );
  }

  if (!isSourceLanguage) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Link href={`/guide/studio/${sessionId}/scenes`} className="text-grenadine hover:opacity-80 text-body mb-4 inline-block">
          &larr; Retour aux scènes
        </Link>
        <div className="rounded-lg border border-mer-soft bg-mer-soft p-5 text-mer" role="status" data-testid="translated-language-blocked">
          Le prompteur et l’enregistrement humain sont réservés à la langue source ({sourceLanguage}). Les traductions seront narrées à la demande hors du Studio.
        </div>
      </div>
    );
  }

  if (['submitted', 'published', 'paused', 'revision_requested', 'archived', 'ready_for_cleanup'].includes(session.status)) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Link href={`/guide/studio/${sessionId}/scenes`} className="text-grenadine hover:opacity-80 text-body mb-4 inline-block">
          &larr; Retour aux scènes
        </Link>
        <div className="rounded-lg border border-ocre-soft bg-ocre-soft p-5 text-ocre-ink" role="status">
          Cette version n’est pas modifiable. Créez ou ouvrez une version éditable pour enregistrer une voix.
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col lg:flex-row min-h-[60vh]"
      onClickCapture={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest('a') && !confirmNavigation()) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <SceneSidebar
        scenes={scenes}
        activeSceneId={activeSceneId}
        onSceneSelect={(sceneId) => {
          if (sceneId === activeSceneId || confirmNavigation()) setActiveSceneId(sceneId);
        }}
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Link href={`/guide/studio/${sessionId}`} className="text-grenadine hover:opacity-80 text-body mb-1 inline-block">
              &larr; Retour à la session
            </Link>
            <h2 className="text-h6 font-semibold text-ink">
              Prompteur — {activeScene?.title || `Scène ${(activeScene?.sceneIndex ?? 0) + 1}`}
            </h2>
          </div>
          <p className="text-meta text-ink-40">Espace = pause/reprendre · Échap = stop</p>
        </div>

        {sceneText ? (
          <div className="flex-1 mb-4">
            <Teleprompter
              text={sceneText}
              onComplete={() => logger.info(SERVICE_NAME, 'Prompter completed', { sceneId: activeSceneId })}
              onStartRequested={startSynchronizedRecording}
              onPauseRequested={pauseSynchronizedRecording}
              onResumeRequested={resumeSynchronizedRecording}
              onStopRequested={stopSynchronizedRecording}
              startLabel="Enregistrer avec le prompteur"
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-paper-soft rounded-lg mb-4" data-testid="no-text">
            <div className="text-center text-ink-60 p-6">
              <p className="text-h6 font-medium mb-2">Pas de texte pour cette scène</p>
              <p className="text-body">Transcrivez ou saisissez le texte dans l&apos;éditeur avant d&apos;utiliser le prompteur.</p>
              <Link
                href={`/guide/studio/${sessionId}/edit`}
                className="inline-block mt-3 text-grenadine hover:opacity-80 font-medium text-body"
              >
                Ouvrir l&apos;éditeur
              </Link>
            </div>
          </div>
        )}

        {/* Recording section */}
        {activeSceneId && (
          <div className="space-y-3">
            <OnboardingBubble feature="recording" position="bottom" />
            <fieldset disabled={isSavingAudio} className="contents">
              <AudioRecorder
                ref={audioRecorderRef}
                sceneId={activeSceneId}
                onRecordingComplete={handleRecordingComplete}
                showControls={false}
              />
              <TakesList sceneId={activeSceneId} savedTakeId={savedTakeIdByScene[activeSceneId]} />
              <FileImport sceneId={activeSceneId} />
            </fieldset>
            {(takes[activeSceneId]?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={saveSelectedTake}
                disabled={isSavingAudio || isRecording || selectedTakeId === savedTakeIdByScene[activeSceneId]}
                className="rounded-pill bg-grenadine px-4 py-2 text-body font-semibold text-paper disabled:opacity-50"
                data-testid="save-selected-take"
              >
                {selectedTakeId === savedTakeIdByScene[activeSceneId]
                  ? 'Cette prise est enregistrée pour la scène'
                  : saveState === 'error'
                    ? 'Réessayer avec la prise sélectionnée'
                    : 'Enregistrer la prise sélectionnée pour la scène'}
              </button>
            )}
            {saveState === 'uploading' && (
              <div role="status" className="text-body text-ink-60" data-testid="upload-progress">
                Envoi de la prise… {uploadPercent}%
              </div>
            )}
            {saveState === 'persisting' && (
              <div role="status" className="text-body text-ink-60">Association de la prise à la scène…</div>
            )}
            {saveMessage && (
              <div
                role={saveState === 'error' ? 'alert' : 'status'}
                className={`rounded-lg p-3 text-body ${saveState === 'error' ? 'bg-grenadine-soft text-danger' : 'bg-mer-soft text-mer'}`}
                data-testid="recording-save-message"
              >
                {saveMessage}
              </div>
            )}
            {(activeScene?.studioAudioKey || activeScene?.originalAudioKey) && (
              <div className="rounded-xl border border-mer bg-mer-soft p-4" data-testid="saved-scene-audio">
                <p className="font-semibold text-ink">Audio actuellement enregistré pour cette scène</p>
                <p className="mt-1 text-body text-ink-60">Il restera disponible lorsque vous reviendrez sur cette scène.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={playSavedAudio}
                    className="rounded-pill border border-grenadine px-4 py-2 text-body font-semibold text-grenadine"
                    data-testid="play-saved-audio"
                  >
                    ▶ Écouter l’audio
                  </button>
                  <button
                    type="button"
                    onClick={deleteSavedAudio}
                    disabled={isDeletingAudio || isRecording}
                    className="rounded-pill border border-danger px-4 py-2 text-body font-semibold text-danger disabled:opacity-50"
                    data-testid="delete-saved-audio"
                  >
                    {isDeletingAudio ? 'Suppression…' : 'Supprimer l’audio'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
