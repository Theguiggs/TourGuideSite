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

          // Restore from localStorage draft if available
          const draft = studioPersistenceService.loadDraft(sessionId);
          const draftText = draft?.scenes[firstScene.id]?.transcriptText;
          setEditorText(draftText ?? firstScene.transcriptText ?? '');
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
      // Flush save on unmount (navigation away)
      const sceneId = activeSceneIdRef.current;
      if (sceneId && sessionId) {
        const text = editorTextRef.current;
        studioPersistenceService.saveDraft(sessionId, sceneId, text);
        updateSceneText(sceneId, text); // fire-and-forget
        logger.info(SERVICE_NAME, 'Flushed save on unmount', { sceneId });
      }
      clearSession();
    };
  }, [sessionId, setActiveSession, clearSession]);

  // Handle scene selection — uses ref to avoid stale closure on editorText
  const handleSceneSelect = useCallback((sceneId: string) => {
    // Flush current scene to localStorage + AppSync before switching
    if (activeSceneId && sessionId) {
      const currentText = editorTextRef.current;
      studioPersistenceService.saveDraft(sessionId, activeSceneId, currentText);
      updateSceneText(activeSceneId, currentText); // fire-and-forget sync
    }

    setActiveSceneId(sceneId);
    const scene = scenes.find((s) => s.id === sceneId);

    // Load from draft or scene data
    const draft = studioPersistenceService.loadDraft(sessionId);
    const draftText = draft?.scenes[sceneId]?.transcriptText;
    setEditorText(draftText ?? scene?.transcriptText ?? '');
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
        <div className="bg-gray-100 rounded-lg h-64 animate-pulse" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-6">
        <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 hover:text-teal-700 text-sm mb-4 inline-block">
          &larr; Retour a la session
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
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
            <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 hover:text-teal-700 text-sm mb-1 inline-block">
              &larr; Retour a la session
            </Link>
            <h2 className="text-lg font-semibold text-gray-900">
              {activeScene?.title || `Scène ${(activeScene?.sceneIndex ?? 0) + 1}`}
            </h2>
          </div>

          <div className="text-xs text-gray-400 text-right">
            {isSaving && <span className="text-blue-500">Sauvegarde...</span>}
            {!isSaving && isDirty && <span>Modifications non sauvegardées</span>}
            {!isSaving && !isDirty && lastSavedAt && (
              <span className="text-green-500">Sauvegardé</span>
            )}
          </div>
        </div>

        {syncError && (
          <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700" role="alert">
            {syncError}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={editorText}
          onChange={(e) => setEditorText(e.target.value)}
          placeholder="Saisissez ou modifiez le texte de cette scène..."
          maxLength={50000}
          className="w-full min-h-[300px] p-4 border border-gray-200 rounded-lg text-gray-800 text-base leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
          data-testid="scene-editor"
          aria-label={`Texte de la scène ${activeScene?.title || ''}`}
        />

        <p className="mt-2 text-xs text-gray-400">
          Sauvegarde automatique toutes les 30 secondes et a la perte de focus.
        </p>
      </div>
    </div>
  );
}
