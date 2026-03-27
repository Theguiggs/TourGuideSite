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
