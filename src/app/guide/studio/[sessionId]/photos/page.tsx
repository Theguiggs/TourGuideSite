'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { getStudioSession, listStudioScenes } from '@/lib/api/studio';
import { SceneSidebar } from '@/components/studio/scene-sidebar';
import { ScenePhotos } from '@/components/studio/scene-photos';
import { useStudioSessionStore, selectSetActiveSession, selectClearSession } from '@/lib/stores/studio-session-store';
import type { StudioSession, StudioScene } from '@/types/studio';

const SERVICE_NAME = 'PhotosPage';

export default function PhotosPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<StudioSession | null>(null);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);

  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null;

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
        if (scns.length > 0) setActiveSceneId(scns[0].id);
        logger.info(SERVICE_NAME, 'Photos page loaded', { sessionId });
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
    return () => { cancelled = true; clearSession(); };
  }, [sessionId, setActiveSession, clearSession]);

  const handlePhotosChange = useCallback((sceneId: string, photos: string[]) => {
    setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, photosRefs: photos } : s));
    logger.info(SERVICE_NAME, 'Photos updated', { sceneId, count: photos.length });
  }, []);

  if (isLoading) {
    return <div className="p-6" aria-busy="true"><div className="bg-gray-100 rounded-lg h-64 animate-pulse" /></div>;
  }

  if (error || !session) {
    return (
      <div className="p-6">
        <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 hover:text-teal-700 text-sm mb-4 inline-block">&larr; Retour</Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">{error || 'Session introuvable.'}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[50vh]">
      <SceneSidebar scenes={scenes} activeSceneId={activeSceneId} onSceneSelect={setActiveSceneId} />

      <div className="flex-1 p-4 lg:p-6">
        <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 hover:text-teal-700 text-sm mb-1 inline-block">
          &larr; Retour à la session
        </Link>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Photos — {activeScene?.title || `Scène ${(activeScene?.sceneIndex ?? 0) + 1}`}
        </h2>

        {activeScene && (
          <div>
            {activeScene.poiDescription && (
              <p className="text-sm text-gray-600 mb-3">{activeScene.poiDescription}</p>
            )}
            {activeScene.latitude && activeScene.longitude && (
              <p className="text-xs text-gray-400 mb-3">
                📍 {activeScene.latitude.toFixed(4)}, {activeScene.longitude.toFixed(4)}
              </p>
            )}
            <ScenePhotos scene={activeScene} onPhotosChange={handlePhotosChange} />
          </div>
        )}
      </div>
    </div>
  );
}
