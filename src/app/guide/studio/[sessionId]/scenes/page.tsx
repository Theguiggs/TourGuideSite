'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StepNav } from '@/components/studio/wizard';
import { getSceneStatusConfig, getStudioSession, listStudioScenes, updateSceneData } from '@/lib/api/studio';
import { audioPlayerService } from '@/lib/studio/audio-player-service';
import { getPlayableUrl } from '@/lib/studio/studio-upload-service';
import { shouldUseStubs } from '@/config/api-mode';
import { useStudioSessionStore, selectClearSession, selectSetActiveSession } from '@/lib/stores/studio-session-store';
import type { StudioScene, StudioSession } from '@/types/studio';
import { useStudioLocale } from '@/lib/i18n/studio-locale';
import { PageTitle } from '@murmure/design-system/web';

export default function ScenesPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const { t } = useStudioLocale();
  const [session, setSession] = useState<StudioSession | null>(null);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [editorText, setEditorText] = useState('');
  const [editorTitle, setEditorTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);

  const visibleScenes = useMemo(
    () => scenes.filter((scene) => !scene.archived).sort((a, b) => a.sceneIndex - b.sceneIndex),
    [scenes],
  );
  const activeScene = visibleScenes.find((scene) => scene.id === activeSceneId) ?? null;
  const locked = session?.status === 'submitted' || session?.status === 'published';
  const dirty = Boolean(activeScene) && (
    editorText !== (activeScene?.transcriptText ?? '') || editorTitle !== (activeScene?.title ?? '')
  );

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    Promise.all([getStudioSession(sessionId), listStudioScenes(sessionId)])
      .then(([loadedSession, loadedScenes]) => {
        if (cancelled) return;
        setSession(loadedSession);
        setScenes(loadedScenes);
        if (loadedSession) setActiveSession(loadedSession);
        const first = loadedScenes.filter((scene) => !scene.archived).sort((a, b) => a.sceneIndex - b.sceneIndex)[0];
        setActiveSceneId(first?.id ?? null);
        setEditorText(first?.transcriptText ?? '');
        setEditorTitle(first?.title ?? '');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
      audioPlayerService.stop();
      clearSession();
    };
  }, [clearSession, sessionId, setActiveSession]);

  const selectScene = useCallback((scene: StudioScene) => {
    if (dirty || isSaving) {
      setMessage(t('Enregistrez vos modifications avant de changer de scène.', 'Save your changes before changing scenes.'));
      return;
    }
    setActiveSceneId(scene.id);
    setEditorText(scene.transcriptText ?? '');
    setEditorTitle(scene.title ?? '');
    setMessage(null);
  }, [dirty, isSaving, t]);

  const saveText = useCallback(async () => {
    if (!activeScene || locked || !dirty) return;
    if (!editorTitle.trim()) {
      setMessage(t('Le titre de la scène est requis.', 'The scene title is required.'));
      return;
    }
    if (editorText.length > 10_000) {
      setMessage(t('Le texte ne peut pas dépasser 10 000 caractères.', 'Text cannot exceed 10,000 characters.'));
      return;
    }
    setIsSaving(true);
    const result = await updateSceneData(activeScene.id, {
      title: editorTitle.trim(),
      transcriptText: editorText,
    });
    if (result.ok) {
      setScenes((current) => current.map((scene) => (
        scene.id === activeScene.id
          ? { ...scene, title: editorTitle.trim(), transcriptText: editorText }
          : scene
      )));
      setEditorTitle(editorTitle.trim());
      setMessage(t('Scène sauvegardée.', 'Scene saved.'));
    } else {
      setMessage(result.error);
    }
    setIsSaving(false);
  }, [activeScene, dirty, editorText, editorTitle, locked, t]);

  useEffect(() => {
    if (!dirty && !isSaving) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const blockLinks = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('a')) {
        event.preventDefault();
        setMessage(t('Enregistrez vos modifications avant de quitter cette page.', 'Save your changes before leaving this page.'));
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', blockLinks, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', blockLinks, true);
    };
  }, [dirty, isSaving, t]);

  const playRecording = useCallback(async () => {
    const key = activeScene?.studioAudioKey || activeScene?.originalAudioKey;
    if (!key) return;
    const url = shouldUseStubs() || key.startsWith('data:') ? key : await getPlayableUrl(key);
    audioPlayerService.play(url);
  }, [activeScene]);

  if (isLoading) return <div className="p-6 text-body text-ink-60" role="status" aria-busy="true">{t('Chargement des scènes…', 'Loading scenes…')}</div>;
  if (!session) return <div className="p-6 text-danger" role="alert">{t('Session introuvable.', 'Session not found.')}</div>;

  return (
    <div className="grid min-h-[60vh] grid-cols-1 lg:grid-cols-[18rem_1fr]">
      <aside className="border-r border-line bg-paper-soft p-4">
        <h2 className="mb-3 text-body font-semibold text-ink">{t('Scènes', 'Scenes')}</h2>
        <div className="space-y-2">
          {visibleScenes.map((scene) => (
            <button
              key={scene.id}
              type="button"
              onClick={() => selectScene(scene)}
              data-testid={`sidebar-scene-${scene.id}`}
              className={`w-full rounded-lg border p-3 text-left ${scene.id === activeSceneId ? 'border-grenadine bg-grenadine-soft' : 'border-line bg-card'}`}
            >
              <span className="block text-meta text-ink-40">{t('Scène', 'Scene')} {scene.sceneIndex + 1}</span>
              <span className="block truncate text-body font-medium text-ink">{scene.title || t('Sans titre', 'Untitled')}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="p-4 lg:p-6" aria-label={t('Édition de la scène', 'Scene editor')}>
        <Link href={`/guide/studio/${sessionId}`} className="mb-2 inline-block text-body text-grenadine">&larr; {t('Retour', 'Back')}</Link>
        {activeScene ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <PageTitle size="h5">{activeScene.title || `${t('Scène', 'Scene')} ${activeScene.sceneIndex + 1}`}</PageTitle>
                <span className={`mt-1 inline-flex rounded-pill px-2 py-0.5 text-meta ${getSceneStatusConfig(activeScene.status).color}`}>
                  {getSceneStatusConfig(activeScene.status).label}
                </span>
              </div>
              {session.narrationMode === 'recording' && !locked && (
                <Link href={`/guide/studio/${sessionId}/record?sceneId=${activeScene.id}`} className="rounded-pill bg-grenadine px-4 py-2 text-body font-semibold text-paper">
                  {t('Enregistrer la voix', 'Record voice')}
                </Link>
              )}
            </div>

            {locked && <div className="rounded-lg border border-ocre-soft bg-ocre-soft p-3 text-body text-ocre-ink">{t('Contenu soumis — modification non disponible.', 'Submitted content — editing unavailable.')}</div>}
            {session.narrationMode === 'tts_on_demand' && (
              <div className="rounded-lg border border-mer-soft bg-mer-soft p-3 text-body text-mer" data-testid="tts-on-demand-guidance">
                {t('Finalisez le texte de chaque scène. La narration sera créée à la première écoute, hors du Studio.', 'Finalize each scene text. Narration will be created on first listen, outside the Studio.')}
              </div>
            )}

            <section>
              <label htmlFor="scene-title" className="mb-1 block text-body font-medium text-ink-80">{t('Titre de la scène', 'Scene title')}</label>
              <input
                id="scene-title"
                value={editorTitle}
                onChange={(event) => setEditorTitle(event.target.value)}
                readOnly={locked}
                required
                maxLength={120}
                className="mb-4 w-full rounded-lg border border-line p-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-grenadine"
                data-testid="scene-title-editor"
              />
              <label htmlFor="scene-text" className="mb-1 block text-body font-medium text-ink-80">{t('Texte de la scène', 'Scene text')}</label>
              <textarea
                id="scene-text"
                value={editorText}
                onChange={(event) => setEditorText(event.target.value)}
                readOnly={locked}
                rows={12}
                maxLength={10000}
                className="w-full rounded-lg border border-line p-3 text-base leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-grenadine disabled:opacity-60"
                data-testid="scene-editor"
              />
              <div className="mt-1 flex items-center justify-between gap-3 text-meta text-ink-40">
                <span>{editorText.length.toLocaleString()} / 10 000</span>
                {!locked && (
                  <button
                    type="button"
                    onClick={saveText}
                    disabled={!dirty || isSaving || !editorTitle.trim()}
                    className="rounded-pill bg-grenadine px-4 py-2 font-semibold text-paper disabled:opacity-40"
                    data-testid="save-scene"
                  >
                    {isSaving ? t('Sauvegarde…', 'Saving…') : t('Enregistrer la scène', 'Save scene')}
                  </button>
                )}
              </div>
              <div className="mt-1 text-meta text-ink-40" role="status">{isSaving ? t('Sauvegarde…', 'Saving…') : message}</div>
            </section>

            {session.narrationMode === 'recording' && (
              <section className="rounded-lg border border-line p-4">
                <h2 className="text-body font-semibold text-ink">{t('Voix humaine', 'Human voice')}</h2>
                {activeScene.studioAudioKey || activeScene.originalAudioKey ? (
                  <button type="button" onClick={playRecording} className="mt-3 rounded-pill border border-grenadine px-4 py-2 text-body font-semibold text-grenadine">
                    {t('Écouter l’enregistrement', 'Listen to recording')}
                  </button>
                ) : (
                  <p className="mt-2 text-body text-ink-60">{t('Aucun enregistrement pour cette scène.', 'No recording for this scene.')}</p>
                )}
              </section>
            )}
          </div>
        ) : (
          <p className="text-body text-ink-60">{t('Aucune scène active.', 'No active scene.')}</p>
        )}

        <StepNav
          prevHref={`/guide/studio/${sessionId}/itinerary`}
          prevLabel={t('Itinéraire', 'Itinerary')}
          nextHref={`/guide/studio/${sessionId}/preview`}
          nextLabel={t('Aperçu', 'Preview')}
          prevDisabled={dirty || isSaving}
          nextDisabled={dirty || isSaving}
        />
      </section>
    </div>
  );
}
