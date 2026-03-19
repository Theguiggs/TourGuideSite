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
import type { StudioSession, StudioScene } from '@/types/studio';

const SERVICE_NAME = 'ScenesPage';

const Teleprompter = dynamic(
  () => import('@/components/studio/teleprompter').then((m) => ({ default: m.Teleprompter })),
  { ssr: false, loading: () => <div className="bg-gray-900 rounded-lg h-48 animate-pulse" /> },
);

export default function ScenesPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<StudioSession | null>(null);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorText, setEditorText] = useState('');
  const [activeTab, setActiveTab] = useState<'photos' | 'text' | 'audio'>('photos');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const failedBlobRef = useRef<{ blob: Blob; sceneId: string; sceneIndex: number } | null>(null);

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

  // Warn before leaving if upload in progress
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isUploading) { e.preventDefault(); }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isUploading]);

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
    { key: 'photos' as const, label: '📷 Photos', count: activeScene?.photosRefs.length },
    { key: 'text' as const, label: '📝 Texte' },
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

        {activeScene && activeTab === 'audio' && (
          <div className="space-y-4">
            {/* Prompteur */}
            {editorText ? (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Prompteur</h3>
                <div className="h-64">
                  <Teleprompter text={editorText} onComplete={() => logger.info(SERVICE_NAME, 'Prompter done')} />
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
                Pas de texte — allez dans l&apos;onglet Texte pour transcrire ou saisir le texte de cette scène.
              </div>
            )}

            {/* Existing audio from S3 */}
            {activeScene.studioAudioKey && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-lg">🎵</span>
                    <div>
                      <p className="text-sm font-medium text-green-800">Audio enregistré</p>
                      <p className="text-xs text-green-600 truncate max-w-xs">{activeScene.studioAudioKey.split('/').pop()}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const url = shouldUseStubs()
                          ? activeScene.studioAudioKey!
                          : await studioUploadService.getPlayableUrl(activeScene.studioAudioKey!);
                        audioPlayerService.play(url);
                      } catch (e) {
                        logger.error(SERVICE_NAME, 'Failed to play persisted audio', { error: String(e) });
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 px-4 rounded-lg transition-colors"
                    data-testid="play-persisted-audio"
                  >
                    ▶ Écouter
                  </button>
                </div>
              </div>
            )}

            {/* Enregistrement */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                {activeScene.studioAudioKey ? 'Nouvelle prise (remplace l\'audio existant)' : 'Enregistrement'}
              </h3>
              <AudioRecorder sceneId={activeScene.id}
                onRecordingComplete={async (sceneId) => {
                  logger.info(SERVICE_NAME, 'Audio upload Recording done', { sceneId });
                  // Get blob from recording store
                  const takes = useRecordingStore.getState().getSceneTakes(sceneId);
                  logger.info(SERVICE_NAME, 'Audio upload Takes count', { sceneId, count: takes.length });
                  const latestTake = takes[takes.length - 1];
                  if (!latestTake?.blob) {
                    logger.warn(SERVICE_NAME, 'No blob found for take', { sceneId });
                    return;
                  }
                  logger.info(SERVICE_NAME, 'Audio upload Blob info', { sceneId, type: latestTake.blob.type, size: latestTake.blob.size });
                  const scene = visibleScenes.find((s) => s.id === sceneId);
                  const sceneIndex = scene?.sceneIndex ?? 0;
                  logger.info(SERVICE_NAME, 'Audio upload Mode', { stubs: shouldUseStubs(), sceneIndex });

                  if (shouldUseStubs()) {
                    // Stub mode: use placeholder key
                    await updateSceneAudio(sceneId, `studio-audio/${sessionId}/${sceneId}.webm`);
                  } else {
                    // Real mode: upload to S3
                    setIsUploading(true);
                    setUploadError(null);
                    setUploadProgress(null);
                    const uploadId = `${sessionId}-scene-${sceneIndex}-audio`;
                    const unsub = studioUploadService.onProgress(uploadId, (p) => setUploadProgress(p));
                    try {
                      logger.info(SERVICE_NAME, 'Audio upload Starting S3 upload...');
                      const result = await studioUploadService.uploadAudio(latestTake.blob, sessionId, sceneIndex);
                      unsub();
                      logger.info(SERVICE_NAME, 'Audio upload Upload result', { ok: result.ok, s3Key: result.ok ? result.s3Key : undefined, error: !result.ok ? result.error : undefined });
                      if (result.ok) {
                        logger.info(SERVICE_NAME, 'Audio upload Calling updateSceneAudio...', { sceneId, s3Key: result.s3Key });
                        await updateSceneAudio(sceneId, result.s3Key);
                        logger.info(SERVICE_NAME, 'Audio upload updateSceneAudio done');
                        failedBlobRef.current = null;
                      } else {
                        setUploadError(result.error);
                        failedBlobRef.current = { blob: latestTake.blob, sceneId, sceneIndex };
                      }
                    } catch (e) {
                      unsub();
                      logger.error(SERVICE_NAME, 'Audio upload exception', { error: String(e) });
                      setUploadError('Upload échoué.');
                      failedBlobRef.current = { blob: latestTake.blob, sceneId, sceneIndex };
                    } finally {
                      setIsUploading(false);
                      setUploadProgress(null);
                    }
                  }
                  const refreshed = await listStudioScenes(sessionId);
                  setScenes(refreshed);
                }} />
              {/* Upload progress */}
              {isUploading && uploadProgress && (
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700 mb-1">Upload en cours...</p>
                  <div className="w-full bg-blue-100 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress.total > 0 ? Math.round((uploadProgress.loaded / uploadProgress.total) * 100) : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-500 mt-1">{uploadProgress.total > 0 ? Math.round((uploadProgress.loaded / uploadProgress.total) * 100) : 0}%</p>
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
                        } else {
                          setUploadError(result.error);
                        }
                      } catch {
                        unsub();
                        setUploadError('Upload échoué.');
                      } finally {
                        setIsUploading(false);
                        setUploadProgress(null);
                      }
                    }}
                    className="mt-2 text-sm font-medium text-red-800 underline hover:text-red-900"
                    data-testid="retry-upload-btn"
                  >
                    Réessayer
                  </button>
                </div>
              )}
              <TakesList sceneId={activeScene.id} />
              <FileImport sceneId={activeScene.id} />
            </div>

            {/* Quality feedback */}
            {activeScene.qualityScore && (
              <QualityFeedback result={{ overall: activeScene.qualityScore, details: { averageVolume: -15, peakClipping: false, silenceRatio: 10 }, message: activeScene.qualityScore === 'good' ? 'Bonne qualité' : 'À améliorer' }} />
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
