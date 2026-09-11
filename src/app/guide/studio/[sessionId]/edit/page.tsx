'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { getStudioSession, listStudioScenes, updateSceneText } from '@/lib/api/studio';
import { useStudioSessionStore, selectSetActiveSession, selectClearSession } from '@/lib/stores/studio-session-store';
import { studioPersistenceService } from '@/lib/studio/studio-persistence-service';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SceneSidebar } from '@/components/studio/scene-sidebar';
import type { StudioSession, StudioScene } from '@/types/studio';

const SERVICE_NAME = 'EditPage';

export default function EditPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<StudioSession | null>(null);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [editorText, setEditorText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);

  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null;
  const editorTextRef = useRef(editorText);
  editorTextRef.current = editorText;
  const activeSceneIdRef = useRef(activeSceneId);
  activeSceneIdRef.current = activeSceneId;
  /**
   * Texte tel qu'il a été CHARGÉ pour la scène courante (backend ou brouillon
   * retenu). Sert de point de comparaison : sans lui, la page ne savait pas
   * distinguer « le guide a modifié » de « le guide a seulement regardé », et
   * réécrivait dans les deux cas.
   */
  const loadedTextRef = useRef('');
  /** Un brouillon local plus récent que le backend a été restauré. */
  const [restoredDraft, setRestoredDraft] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

        // Select first scene
        if (scns.length > 0) {
          const firstScene = scns[0];
          setActiveSceneId(firstScene.id);

          // Le brouillon local ne l'emporte que s'il est PLUS RÉCENT que la
          // dernière écriture du backend. Appliqué sans condition, il masquait
          // toute correction faite ailleurs — puis l'écrasait au démontage.
          const draft = studioPersistenceService.loadDraft(sessionId);
          const backendText = firstScene.transcriptText ?? '';
          const useDraft = studioPersistenceService.isSceneDraftFresher(draft, firstScene.id, firstScene.updatedAt);
          const draftText = draft?.scenes[firstScene.id]?.transcriptText;
          if (!useDraft && draftText !== undefined && draftText !== backendText) {
            // Brouillon périmé : on le retire pour qu'il ne resurgisse pas.
            studioPersistenceService.clearSceneDraft(sessionId, firstScene.id);
            logger.info(SERVICE_NAME, 'Stale local draft discarded in favour of backend', { sceneId: firstScene.id });
          }
          const initialText = useDraft && draftText !== undefined ? draftText : backendText;
          setEditorText(initialText);
          loadedTextRef.current = initialText;
          if (useDraft && draftText !== undefined && draftText !== backendText) {
            setRestoredDraft(true);
          }
        }

        logger.info(SERVICE_NAME, 'Edit page loaded', { sessionId, scenesCount: scns.length });
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
      // Flush save on unmount (navigation away) — SEULEMENT si le texte a
      // réellement changé. L'écriture était inconditionnelle : ouvrir puis
      // quitter l'éditeur sans rien taper réécrivait la scène avec le texte
      // affiché, ce qui suffisait à réinstaller une version périmée.
      const sceneId = activeSceneIdRef.current;
      const text = editorTextRef.current;
      if (sceneId && sessionId && text !== loadedTextRef.current) {
        studioPersistenceService.saveDraft(sessionId, sceneId, text);
        void updateSceneText(sceneId, text).then((result) => {
          // Le backend a le texte : le brouillon local n'a plus de raison d'être
          // et ne peut donc plus primer à la prochaine ouverture.
          if (result.ok) studioPersistenceService.clearSceneDraft(sessionId, sceneId);
        });
        logger.info(SERVICE_NAME, 'Flushed save on unmount', { sceneId });
      }
      clearSession();
    };
  }, [sessionId, setActiveSession, clearSession]);

  // Handle scene selection — uses ref to avoid stale closure on editorText
  const handleSceneSelect = useCallback((sceneId: string) => {
    // Flush current scene to localStorage + AppSync before switching, et là
    // encore seulement si son texte a bougé depuis le chargement.
    if (activeSceneId && sessionId) {
      const currentText = editorTextRef.current;
      if (currentText !== loadedTextRef.current) {
        studioPersistenceService.saveDraft(sessionId, activeSceneId, currentText);
        void updateSceneText(activeSceneId, currentText).then((result) => {
          if (result.ok) studioPersistenceService.clearSceneDraft(sessionId, activeSceneId);
        });
      }
    }

    setActiveSceneId(sceneId);
    const scene = scenes.find((s) => s.id === sceneId);

    // Même arbitrage qu'au chargement : le brouillon ne gagne que s'il est le
    // plus récent des deux.
    const draft = studioPersistenceService.loadDraft(sessionId);
    const backendText = scene?.transcriptText ?? '';
    const useDraft = studioPersistenceService.isSceneDraftFresher(draft, sceneId, scene?.updatedAt);
    const draftText = draft?.scenes[sceneId]?.transcriptText;
    if (!useDraft && draftText !== undefined && draftText !== backendText) {
      studioPersistenceService.clearSceneDraft(sessionId, sceneId);
    }
    const nextText = useDraft && draftText !== undefined ? draftText : backendText;
    setEditorText(nextText);
    loadedTextRef.current = nextText;
    setRestoredDraft(useDraft && draftText !== undefined && draftText !== backendText);
    setSyncError(null);
  }, [activeSceneId, sessionId, scenes]);

  // Auto-save: LocalStorage + AppSync
  const handleSave = useCallback(async (text: string) => {
    if (!activeSceneId || !sessionId) return;

    // 1. Save to localStorage (always works)
    studioPersistenceService.saveDraft(sessionId, activeSceneId, text);

    // 2. Sync to AppSync
    const result = await updateSceneText(activeSceneId, text);
    if (!result.ok) {
      setSyncError('Sauvegarde locale uniquement — reconnectez-vous');
      logger.warn(SERVICE_NAME, 'AppSync sync failed, draft in localStorage', { sceneId: activeSceneId });
    } else {
      // Le backend fait foi de nouveau : le brouillon est retiré pour qu'il ne
      // puisse plus, plus tard, primer sur une version plus récente.
      studioPersistenceService.clearSceneDraft(sessionId, activeSceneId);
      loadedTextRef.current = text;
      setRestoredDraft(false);
      setSyncError(null);
    }
  }, [activeSceneId, sessionId]);

  // Warn before closing tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeSceneIdRef.current && sessionId) {
        studioPersistenceService.saveDraft(sessionId, activeSceneIdRef.current, editorTextRef.current);
      }
      // Only show browser prompt if there are unsaved changes
      if (editorTextRef.current !== '') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId]);

  const { isSaving, lastSavedAt, isDirty, resetBaseline } = useAutoSave({
    data: editorText,
    onSave: handleSave,
    debounceMs: 30_000,
    inputRef: textareaRef,
    saveOnBlur: true,
    enabled: !!activeSceneId,
  });

  // Reset baseline when scene changes (loaded text is not a "modification")
  useEffect(() => {
    resetBaseline();
  }, [activeSceneId, resetBaseline]);

  if (isLoading) {
    return (
      <div className="p-6" aria-busy="true">
        <span className="sr-only">Chargement de l&apos;éditeur...</span>
        <div className="bg-paper-soft rounded-lg h-64 animate-pulse" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-6">
        <Link href={`/guide/studio/${sessionId}`} className="text-grenadine hover:opacity-80 text-body mb-4 inline-block">
          &larr; Retour a la session
        </Link>
        <div className="bg-grenadine-soft border border-grenadine-soft rounded-lg p-4 text-danger" role="alert">
          {error || 'Session introuvable.'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[50vh]">
      <SceneSidebar
        scenes={scenes}
        activeSceneId={activeSceneId}
        onSceneSelect={handleSceneSelect}
      />

      <div className="flex-1 p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Link href={`/guide/studio/${sessionId}`} className="text-grenadine hover:opacity-80 text-body mb-1 inline-block">
              &larr; Retour a la session
            </Link>
            <h2 className="text-h6 font-semibold text-ink">
              {activeScene?.title || `Scène ${(activeScene?.sceneIndex ?? 0) + 1}`}
            </h2>
          </div>

          <div className="text-meta text-ink-40 text-right">
            {isSaving && <span className="text-mer">Sauvegarde...</span>}
            {!isSaving && isDirty && <span>Modifications non sauvegardées</span>}
            {!isSaving && !isDirty && lastSavedAt && (
              <span className="text-success">Sauvegardé</span>
            )}
          </div>
        </div>

        {syncError && (
          <div className="mb-3 p-2 bg-ocre-soft border border-ocre rounded text-body text-ink" role="alert">
            {syncError}
          </div>
        )}

        {/* Un brouillon local plus récent a été restauré : le guide doit le
            savoir, sinon il croit lire ce que contient le backend. */}
        {restoredDraft && (
          <div
            className="mb-3 p-2 bg-mer-soft border border-mer rounded text-body text-ink"
            role="status"
            data-testid="restored-draft-notice"
          >
            Brouillon local restauré — il est plus récent que la version enregistrée.
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={editorText}
          onChange={(e) => setEditorText(e.target.value)}
          placeholder="Saisissez ou modifiez le texte de cette scène..."
          maxLength={10000}
          className="w-full min-h-[300px] p-4 border border-line rounded-lg text-ink text-body-lg leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-grenadine focus:border-transparent"
          data-testid="scene-editor"
          aria-label={`Texte de la scène ${activeScene?.title || ''}`}
        />

        <p className="mt-2 text-meta text-ink-40">
          Sauvegarde automatique toutes les 30 secondes et a la perte de focus.
        </p>
      </div>
    </div>
  );
}
