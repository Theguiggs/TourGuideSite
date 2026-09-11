'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { getStudioSession, listStudioScenes, updateSceneData } from '@/lib/api/studio';
import { SceneSidebar } from '@/components/studio/scene-sidebar';
import { ScenePhotos } from '@/components/studio/scene-photos';
import { removeStoredAudio } from '@/lib/studio/studio-upload-service';
import { useStudioSessionStore, selectSetActiveSession, selectClearSession } from '@/lib/stores/studio-session-store';
import type { StudioSession, StudioScene } from '@/types/studio';

const SERVICE_NAME = 'PhotosPage';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function PhotosPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<StudioSession | null>(null);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

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

  /**
   * Persiste la liste de photos de la scène.
   *
   * Rien ne l'écrivait : la page se contentait de mettre à jour son état local,
   * si bien qu'un rechargement effaçait tout le travail. La mise à jour locale
   * reste optimiste (l'aperçu est immédiat) mais elle est REVERTÉE si l'écriture
   * échoue — mieux vaut voir la photo disparaître que croire qu'elle est sauvée.
   */
  const handlePhotosChange = useCallback(
    async (sceneId: string, photos: string[], removed: string[] = []) => {
      const previous = scenes.find((s) => s.id === sceneId)?.photosRefs ?? [];
      setScenes((prev) => prev.map((s) => (s.id === sceneId ? { ...s, photosRefs: photos } : s)));
      setSaveState('saving');
      setSaveError(null);

      const result = await updateSceneData(sceneId, { photosRefs: photos });

      if (!result.ok) {
        setScenes((prev) => prev.map((s) => (s.id === sceneId ? { ...s, photosRefs: previous } : s)));
        setSaveState('error');
        setSaveError(result.error);
        logger.error(SERVICE_NAME, 'Photos persist failed', { sceneId, error: result.error });
        return;
      }

      setSaveState('saved');
      logger.info(SERVICE_NAME, 'Photos persisted', { sceneId, count: photos.length });

      // La base ne référence plus ces objets : on peut les retirer de S3. Après,
      // jamais avant — un échec d'écriture aurait sinon laissé une référence
      // vers un objet supprimé.
      for (const key of removed) {
        void removeStoredAudio(key);
      }
    },
    [scenes],
  );

  if (isLoading) {
    return <div className="p-6" aria-busy="true"><div className="bg-paper-soft rounded-lg h-64 animate-pulse" /></div>;
  }

  if (error || !session) {
    return (
      <div className="p-6">
        <Link href={`/guide/studio/${sessionId}`} className="text-grenadine hover:opacity-80 text-body mb-4 inline-block">&larr; Retour</Link>
        <div className="bg-grenadine-soft border border-grenadine-soft rounded-lg p-4 text-danger" role="alert">{error || 'Session introuvable.'}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[50vh]">
      <SceneSidebar scenes={scenes} activeSceneId={activeSceneId} onSceneSelect={setActiveSceneId} />

      <div className="flex-1 p-4 lg:p-6">
        <Link href={`/guide/studio/${sessionId}`} className="text-grenadine hover:opacity-80 text-body mb-1 inline-block">
          &larr; Retour à la session
        </Link>
        <h2 className="text-h6 font-semibold text-ink mb-4">
          Photos — {activeScene?.title || `Scène ${(activeScene?.sceneIndex ?? 0) + 1}`}
        </h2>

        {activeScene && (
          <div>
            {activeScene.poiDescription && (
              <p className="text-body text-ink-80 mb-3">{activeScene.poiDescription}</p>
            )}
            {activeScene.latitude && activeScene.longitude && (
              <p className="text-meta text-ink-40 mb-3">
                📍 {activeScene.latitude.toFixed(4)}, {activeScene.longitude.toFixed(4)}
              </p>
            )}
            <ScenePhotos scene={activeScene} sessionId={sessionId} onPhotosChange={handlePhotosChange} />

            {/* Le guide doit savoir si ses photos sont arrivées. */}
            {saveState === 'saving' && (
              <p className="mt-2 text-body text-mer" role="status" data-testid="photos-saving">
                Sauvegarde…
              </p>
            )}
            {saveState === 'saved' && (
              <p className="mt-2 text-body text-success" role="status" data-testid="photos-saved">
                Photos enregistrées.
              </p>
            )}
            {saveState === 'error' && (
              <p className="mt-2 text-body text-danger" role="alert" data-testid="photos-save-error">
                Sauvegarde impossible : {saveError ?? 'erreur inconnue'}. Vos photos n&apos;ont pas été conservées.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
