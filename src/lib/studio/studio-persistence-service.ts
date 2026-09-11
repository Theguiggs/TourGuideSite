import { logger } from '@/lib/logger';

const SERVICE_NAME = 'StudioPersistenceService';
const DRAFT_KEY_PREFIX = 'studio_draft_';
const LAST_SESSION_KEY = 'studio_last_session';

export interface SegmentDraft {
  transcriptText: string;
  translatedTexts: Record<string, string>;
  dirty: boolean;
}

export interface SceneDraft {
  transcriptText: string;
  dirty: boolean;
  segments?: Record<string, SegmentDraft>;
}

export interface StudioDraft {
  sessionId: string;
  scenes: Record<string, SceneDraft>;
  lastSavedAt: number;
  syncedWithBackend: boolean;
}

class StudioPersistenceServiceImpl {
  saveDraft(sessionId: string, sceneId: string, text: string): void {
    try {
      const key = `${DRAFT_KEY_PREFIX}${sessionId}`;
      const existing = this.loadDraft(sessionId);
      const draft: StudioDraft = existing ?? {
        sessionId,
        scenes: {},
        lastSavedAt: 0,
        syncedWithBackend: false,
      };

      draft.scenes[sceneId] = { transcriptText: text, dirty: true };
      draft.lastSavedAt = Date.now();
      draft.syncedWithBackend = false;

      localStorage.setItem(key, JSON.stringify(draft));
      logger.info(SERVICE_NAME, 'Draft saved', { sessionId, sceneId });
    } catch (e) {
      logger.error(SERVICE_NAME, 'Failed to save draft', { sessionId, error: String(e) });
    }
  }

  saveSegmentTranslation(sessionId: string, sceneId: string, segmentId: string, language: string, text: string): void {
    try {
      const key = `${DRAFT_KEY_PREFIX}${sessionId}`;
      const existing = this.loadDraft(sessionId);
      const draft: StudioDraft = existing ?? {
        sessionId,
        scenes: {},
        lastSavedAt: 0,
        syncedWithBackend: false,
      };

      if (!draft.scenes[sceneId]) {
        draft.scenes[sceneId] = { transcriptText: '', dirty: false };
      }
      if (!draft.scenes[sceneId].segments) {
        draft.scenes[sceneId].segments = {};
      }
      if (!draft.scenes[sceneId].segments![segmentId]) {
        draft.scenes[sceneId].segments![segmentId] = { transcriptText: '', translatedTexts: {}, dirty: false };
      }

      draft.scenes[sceneId].segments![segmentId].translatedTexts[language] = text;
      draft.scenes[sceneId].segments![segmentId].dirty = true;
      draft.lastSavedAt = Date.now();
      draft.syncedWithBackend = false;

      localStorage.setItem(key, JSON.stringify(draft));
      logger.info(SERVICE_NAME, 'Segment translation saved', { sessionId, sceneId, segmentId, language });
    } catch (e) {
      logger.error(SERVICE_NAME, 'Failed to save segment translation', { sessionId, error: String(e) });
    }
  }

  loadDraft(sessionId: string): StudioDraft | null {
    try {
      const key = `${DRAFT_KEY_PREFIX}${sessionId}`;
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // Runtime schema validation
      if (
        typeof parsed !== 'object' || parsed === null ||
        typeof parsed.sessionId !== 'string' ||
        typeof parsed.scenes !== 'object' || parsed.scenes === null ||
        typeof parsed.lastSavedAt !== 'number'
      ) {
        logger.warn(SERVICE_NAME, 'Invalid draft schema, discarding', { sessionId });
        return null;
      }
      return parsed as StudioDraft;
    } catch (e) {
      logger.warn(SERVICE_NAME, 'Failed to load draft', { sessionId, error: String(e) });
      return null;
    }
  }

  deleteDraft(sessionId: string): void {
    try {
      localStorage.removeItem(`${DRAFT_KEY_PREFIX}${sessionId}`);
      logger.info(SERVICE_NAME, 'Draft deleted', { sessionId });
    } catch {
      // ignore
    }
  }

  /**
   * Retire le brouillon d'UNE scène, le backend faisant désormais foi.
   *
   * Sans cet appel, le brouillon local restait `dirty: true` à vie et primait
   * sur le backend à chaque ouverture de l'éditeur : une correction faite
   * ailleurs (page Scènes, autre appareil, autre onglet) était masquée par une
   * version plus ancienne, puis réécrite par-dessus au démontage de la page.
   *
   * Le brouillon entier disparaît quand il ne reste plus aucune scène : une clé
   * vide dans `localStorage` n'est qu'un piège pour la prochaine lecture.
   */
  clearSceneDraft(sessionId: string, sceneId: string): void {
    try {
      const existing = this.loadDraft(sessionId);
      if (!existing?.scenes[sceneId]) return;
      delete existing.scenes[sceneId];
      if (Object.keys(existing.scenes).length === 0) {
        this.deleteDraft(sessionId);
        return;
      }
      localStorage.setItem(`${DRAFT_KEY_PREFIX}${sessionId}`, JSON.stringify(existing));
      logger.info(SERVICE_NAME, 'Scene draft cleared after backend sync', { sessionId, sceneId });
    } catch (e) {
      logger.warn(SERVICE_NAME, 'Failed to clear scene draft', { sessionId, sceneId, error: String(e) });
    }
  }

  /**
   * Le brouillon local d'une scène doit-il l'emporter sur le texte du backend ?
   *
   * Oui seulement s'il est PLUS RÉCENT que la dernière écriture connue du
   * backend. La page appliquait le brouillon sans condition, ce qui faisait
   * gagner l'ancien à tous les coups.
   *
   * `sceneUpdatedAt` illisible ou absent : le brouillon l'emporte, faute de
   * point de comparaison — c'est le cas d'une scène jamais écrite côté serveur,
   * où le brouillon est bien la seule copie.
   */
  isSceneDraftFresher(draft: StudioDraft | null, sceneId: string, sceneUpdatedAt: string | null | undefined): boolean {
    const entry = draft?.scenes[sceneId];
    if (!entry) return false;
    const backendAt = sceneUpdatedAt ? Date.parse(sceneUpdatedAt) : NaN;
    if (Number.isNaN(backendAt)) return true;
    return draft!.lastSavedAt > backendAt;
  }

  saveLastSessionId(sessionId: string): void {
    try {
      localStorage.setItem(LAST_SESSION_KEY, sessionId);
    } catch {
      // ignore
    }
  }

  getLastSessionId(): string | null {
    try {
      return localStorage.getItem(LAST_SESSION_KEY);
    } catch {
      return null;
    }
  }

  clearLastSession(): void {
    try {
      localStorage.removeItem(LAST_SESSION_KEY);
    } catch {
      // ignore
    }
  }
}

export const studioPersistenceService = new StudioPersistenceServiceImpl();
