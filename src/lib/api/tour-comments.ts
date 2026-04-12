import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { getClient } from './appsync-client';

const SERVICE_NAME = 'TourCommentsAPI';

export interface TourComment {
  id: string;
  tourId: string;
  sessionId: string | null;
  sceneId: string | null;
  author: 'admin' | 'guide';
  authorName: string;
  message: string;
  action: 'approved' | 'rejected' | 'revision' | 'comment' | 'resubmitted' | 'submitted' | null;
  language: string | null;
  createdAt: string;
}

// --- Stub state ---
const stubComments: TourComment[] = [];

// --- Public API ---

export async function listTourComments(tourId: string): Promise<TourComment[]> {
  if (shouldUseStubs()) {
    return stubComments
      .filter((c) => c.tourId === tourId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  try {
    const client = getClient();
    // TourComment model may not be deployed yet — check before calling
    if (!client.models.TourComment) {
      logger.warn(SERVICE_NAME, 'TourComment model not available on AppSync client — skipping');
      return [];
    }
    const result = await client.models.TourComment.listTourCommentByTourId(
      { tourId },
      { authMode: 'userPool' },
    );
    return ((result?.data ?? []) as TourComment[])
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch (e) {
    const errMsg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    logger.error(SERVICE_NAME, 'listTourComments failed', { tourId, error: errMsg });
    return [];
  }
}

export async function addTourComment(
  tourId: string,
  data: {
    message: string;
    author: 'admin' | 'guide';
    authorName: string;
    action?: TourComment['action'];
    sessionId?: string;
    sceneId?: string;
    language?: string;
  },
): Promise<{ ok: true; comment: TourComment } | { ok: false; error: string }> {
  const comment: TourComment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    tourId,
    sessionId: data.sessionId ?? null,
    sceneId: data.sceneId ?? null,
    author: data.author,
    authorName: data.authorName,
    message: data.message,
    action: data.action ?? 'comment',
    language: data.language ?? null,
    createdAt: new Date().toISOString(),
  };

  if (shouldUseStubs()) {
    stubComments.push(comment);
    return { ok: true, comment };
  }

  try {
    const client = getClient();
    if (!client.models.TourComment) {
      logger.warn(SERVICE_NAME, 'TourComment model not available on AppSync client — skipping');
      return { ok: false, error: 'TourComment model not deployed' };
    }
    const result = await client.models.TourComment.create(
      {
        tourId,
        sessionId: data.sessionId,
        sceneId: data.sceneId,
        author: data.author,
        authorName: data.authorName,
        message: data.message,
        action: (data.action ?? 'comment') as 'comment',
        language: data.language,
      },
      { authMode: 'userPool' },
    );
    logger.info(SERVICE_NAME, 'Comment added', { tourId, action: data.action, author: data.author });
    return { ok: true, comment: result.data as TourComment };
  } catch (e) {
    const errMsg = e instanceof Error ? `${e.name}: ${e.message}` : JSON.stringify(e);
    logger.error(SERVICE_NAME, 'addTourComment failed', { tourId, error: errMsg });
    return { ok: false, error: errMsg };
  }
}
