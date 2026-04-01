'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { logger } from '@/lib/logger';
import { getStudioSession, listStudioScenes, listSegmentsByScene } from '@/lib/api/studio';
import { SceneSidebar } from '@/components/studio/scene-sidebar';
import { AudioRecorder } from '@/components/studio/audio-recorder';
import { TakesList } from '@/components/studio/takes-list';
import { FileImport } from '@/components/studio/file-import';
import { useStudioSessionStore, selectSetActiveSession, selectClearSession } from '@/lib/stores/studio-session-store';
import { useRecordingStore } from '@/lib/stores/recording-store';
import { useCallback } from 'react';
import type { StudioSession, StudioScene } from '@/types/studio';

const SERVICE_NAME = 'RecordPage';

// Code splitting: Teleprompter uses rAF — no SSR (NFR1, architecture spec)
const Teleprompter = dynamic(
  () => import('@/components/studio/teleprompter').then((m) => ({ default: m.Teleprompter })),
  { ssr: false, loading: () => <div className="bg-gray-900 rounded-lg h-96 animate-pulse" /> },
);

export default function RecordPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId;
  const querySceneId = searchParams.get('sceneId');
  const queryLang = searchParams.get('lang');

  const [session, setSession] = useState<StudioSession | null>(null);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translatedTextLoaded, setTranslatedTextLoaded] = useState(false);

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);

  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null;
  // Use translated text if recording in another language
  // If translated text is loaded but empty, show a placeholder message instead of source text
  const sceneText = queryLang && translatedTextLoaded
    ? (translatedText || `[Aucun texte ${queryLang.toUpperCase()} pour cette scene. Redigez le texte dans l'onglet de la langue avant d'enregistrer.]`)
    : (activeScene?.transcriptText ?? '');

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

        // If recording in another language, load the translated text
        if (queryLang && initialSceneId) {
          try {
            const segments = await listSegmentsByScene(initialSceneId);
            const langSegment = segments.find((s) => s.language === queryLang);
            setTranslatedText(langSegment?.transcriptText ?? null);
          } catch (segErr) {
            logger.warn(SERVICE_NAME, 'Could not load translated segment', { error: String(segErr) });
          }
          setTranslatedTextLoaded(true);
        }
        logger.info(SERVICE_NAME, 'Record page loaded', { sessionId, scenesCount: scns.length, lang: queryLang, sceneId: initialSceneId });
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
  }, [sessionId, setActiveSession, clearSession]);

  if (isLoading) {
    return (
      <div className="p-6" aria-busy="true">
        <span className="sr-only">Chargement du prompteur...</span>
        <div className="bg-gray-900 rounded-lg h-96 animate-pulse" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-6">
        <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 hover:text-teal-700 text-sm mb-4 inline-block">
          &larr; Retour à la session
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
          {error || 'Session introuvable.'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[60vh]">
      <SceneSidebar
        scenes={scenes}
        activeSceneId={activeSceneId}
        onSceneSelect={async (sceneId: string) => {
          setActiveSceneId(sceneId);
          // Load translated text for new scene if recording in another language
          if (queryLang) {
            try {
              const segments = await listSegmentsByScene(sceneId);
              const langSeg = segments.find((s) => s.language === queryLang);
              setTranslatedText(langSeg?.transcriptText ?? null);
              setTranslatedTextLoaded(true);
            } catch {
              setTranslatedText(null);
              setTranslatedTextLoaded(true);
            }
          }
        }}
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 hover:text-teal-700 text-sm mb-1 inline-block">
              &larr; Retour à la session
            </Link>
            <h2 className="text-lg font-semibold text-gray-900">
              Prompteur — {activeScene?.title || `Scène ${(activeScene?.sceneIndex ?? 0) + 1}`}
              {queryLang && (
                <span className="ml-2 text-sm font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {queryLang.toUpperCase()}
                </span>
              )}
            </h2>
          </div>
          <p className="text-xs text-gray-400">Espace = pause/reprendre · Échap = stop</p>
        </div>

        {sceneText ? (
          <div className="flex-1 mb-4">
            <Teleprompter
              text={sceneText}
              onComplete={() => logger.info(SERVICE_NAME, 'Prompter completed', { sceneId: activeSceneId })}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg mb-4" data-testid="no-text">
            <div className="text-center text-gray-500 p-6">
              <p className="text-lg font-medium mb-2">Pas de texte pour cette scène</p>
              <p className="text-sm">Transcrivez ou saisissez le texte dans l&apos;éditeur avant d&apos;utiliser le prompteur.</p>
              <Link
                href={`/guide/studio/${sessionId}/edit`}
                className="inline-block mt-3 text-teal-600 hover:text-teal-700 font-medium text-sm"
              >
                Ouvrir l&apos;éditeur
              </Link>
            </div>
          </div>
        )}

        {/* Recording section */}
        {activeSceneId && (
          <div className="space-y-3">
            <AudioRecorder
              sceneId={activeSceneId}
              onRecordingComplete={(id) => logger.info(SERVICE_NAME, 'Recording complete for scene', { sceneId: id })}
            />
            <TakesList sceneId={activeSceneId} />
            <FileImport sceneId={activeSceneId} />
          </div>
        )}
      </div>
    </div>
  );
}
