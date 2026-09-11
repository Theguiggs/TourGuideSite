'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { logger } from '@/lib/logger';
import { getStudioSession, listStudioScenes } from '@/lib/api/studio';
import { SceneSidebar } from '@/components/studio/scene-sidebar';
import { AudioRecorder } from '@/components/studio/audio-recorder';
import { TakesList } from '@/components/studio/takes-list';
import { FileImport } from '@/components/studio/file-import';
import { useStudioSessionStore, selectSetActiveSession, selectClearSession } from '@/lib/stores/studio-session-store';
import { useRecordingStore } from '@/lib/stores/recording-store';
import { useTakePersistence } from '@/hooks/use-take-persistence';
import { OnboardingBubble } from '@/components/studio/onboarding-bubble';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import type { StudioSession, StudioScene } from '@/types/studio';

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

  const [session, setSession] = useState<StudioSession | null>(null);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);

  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null;
  const sceneText = activeScene?.transcriptText ?? '';

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
      // Le store n'est vidé QUE si tout est arrivé à bon port. Il était vidé
      // inconditionnellement, ce qui effaçait le seul exemplaire de toute prise
      // non encore téléversée à la moindre navigation. Les prises en attente
      // survivent donc à un aller-retour dans le Studio (le store est un module,
      // pas un état de composant) et repartent à l'affichage de la page.
      if (!useRecordingStore.getState().hasUnsyncedTakes()) {
        useRecordingStore.getState().resetStore();
      } else {
        logger.warn(SERVICE_NAME, 'Unsynced takes kept in memory on unmount', { sessionId });
      }
    };
  }, [sessionId, setActiveSession, clearSession, querySceneId]);

  // La page /record vit hors du wizard : elle relit elle-même le choix du guide
  // sur les bulles d'aide, faute de quoi « Ne plus afficher » serait sans effet ici.
  const loadOnboarding = useOnboardingStore((s) => s.loadOnboarding);
  useEffect(() => {
    loadOnboarding();
  }, [loadOnboarding]);

  // Garde de fermeture d'onglet : une prise non synchronisée n'existe nulle part
  // ailleurs que dans cette page. Le navigateur affiche sa propre confirmation.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!useRecordingStore.getState().hasUnsyncedTakes()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Une prise persistée met à jour la Scène affichée : le bandeau de statut et
  // la liste des scènes cessent d'annoncer « sans audio » sans recharger.
  const handleTakePersisted = useCallback((sceneId: string, s3Key: string) => {
    setScenes((prev) =>
      prev.map((s) =>
        s.id === sceneId
          ? { ...s, studioAudioKey: s3Key, status: 'recorded', baseAudioSource: 'recording' }
          : s,
      ),
    );
  }, []);

  const { syncState, error: syncError, retry } = useTakePersistence({
    sessionId,
    sceneId: activeSceneId,
    sceneIndex: activeScene?.sceneIndex ?? 0,
    language: session?.language ?? 'fr',
    onPersisted: handleTakePersisted,
  });

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
        <Link href={`/guide/studio/${sessionId}`} className="text-grenadine hover:opacity-80 text-sm mb-4 inline-block">
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
        <Link href={`/guide/studio/${sessionId}/scenes`} className="text-grenadine hover:opacity-80 text-sm mb-4 inline-block">
          &larr; Retour aux scènes
        </Link>
        <div className="rounded-lg border border-mer-soft bg-mer-soft p-5 text-mer" role="status">
          Cette version utilise la voix de synthèse à la demande. Finalisez ses textes dans le Studio ; aucun enregistrement ni TTS n’est produit ici.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[60vh]">
      <SceneSidebar
        scenes={scenes}
        activeSceneId={activeSceneId}
        onSceneSelect={setActiveSceneId}
      />

      <div className="flex-1 p-4 lg:p-6 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Link href={`/guide/studio/${sessionId}`} className="text-grenadine hover:opacity-80 text-sm mb-1 inline-block">
              &larr; Retour à la session
            </Link>
            <h2 className="text-lg font-semibold text-ink">
              Prompteur — {activeScene?.title || `Scène ${(activeScene?.sceneIndex ?? 0) + 1}`}
            </h2>
          </div>
          <p className="text-xs text-ink-40">Espace = pause/reprendre · Échap = stop</p>
        </div>

        {sceneText ? (
          <div className="flex-1 mb-4">
            <Teleprompter
              text={sceneText}
              onComplete={() => logger.info(SERVICE_NAME, 'Prompter completed', { sceneId: activeSceneId })}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-paper-soft rounded-lg mb-4" data-testid="no-text">
            <div className="text-center text-ink-60 p-6">
              <p className="text-lg font-medium mb-2">Pas de texte pour cette scène</p>
              <p className="text-sm">Transcrivez ou saisissez le texte dans l&apos;éditeur avant d&apos;utiliser le prompteur.</p>
              <Link
                href={`/guide/studio/${sessionId}/edit`}
                className="inline-block mt-3 text-grenadine hover:opacity-80 font-medium text-sm"
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
            <AudioRecorder
              sceneId={activeSceneId}
              onRecordingComplete={(id) => logger.info(SERVICE_NAME, 'Recording complete for scene', { sceneId: id })}
            />

            {/* État de la prise retenue. Sans ce bandeau, le guide n'a aucun
                moyen de savoir si son enregistrement est arrivé au backend. */}
            {syncState === 'uploading' && (
              <p className="text-sm text-mer flex items-center gap-2" role="status" data-testid="take-sync-uploading">
                <span className="w-2 h-2 bg-mer rounded-full animate-pulse" aria-hidden="true" />
                Sauvegarde de la prise en cours…
              </p>
            )}
            {syncState === 'synced' && (
              <p className="text-sm text-success" role="status" data-testid="take-sync-ok">
                Prise enregistrée sur votre visite.
              </p>
            )}
            {syncState === 'error' && (
              <div
                className="rounded-lg border border-danger bg-grenadine-soft p-3 text-sm text-ink"
                role="alert"
                data-testid="take-sync-error"
              >
                <p className="font-medium">Sauvegarde impossible — la prise n&apos;est que dans cet onglet.</p>
                {syncError && <p className="mt-1 text-ink-80">{syncError}</p>}
                <button
                  onClick={retry}
                  className="mt-2 bg-ocre-soft text-ink border border-ocre font-medium py-1.5 px-3 rounded-lg text-sm hover:opacity-90 transition"
                  data-testid="take-sync-retry"
                >
                  Réessayer
                </button>
              </div>
            )}

            <TakesList sceneId={activeSceneId} />
            <FileImport sceneId={activeSceneId} />
          </div>
        )}
      </div>
    </div>
  );
}
