import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';

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
    const { getClient } = await import('./appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: { data?: TourComment[] };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = await (client as any).models.TourComment.listTourCommentByTourId(
        { tourId },
        { authMode: 'userPool' },
      );
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = await (client as any).models.TourComment.list(
        { filter: { tourId: { eq: tourId } } },
        { authMode: 'userPool' },
      );
    }
    return ((result?.data ?? []) as TourComment[])
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch (e) {
    logger.error(SERVICE_NAME, 'listTourComments failed', { tourId, error: String(e) });
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
    const { getClient } = await import('./appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).models.TourComment.create(
      {
        tourId,
        sessionId: data.sessionId,
        sceneId: data.sceneId,
        author: data.author,
        authorName: data.authorName,
        message: data.message,
        action: data.action ?? 'comment',
        language: data.language,
      },
      { authMode: 'userPool' },
    );
    logger.info(SERVICE_NAME, 'Comment added', { tourId, action: data.action, author: data.author });
    return { ok: true, comment: result.data as TourComment };
  } catch (e) {
    logger.error(SERVICE_NAME, 'addTourComment failed', { tourId, error: String(e) });
    return { ok: false, error: String(e) };
  }
}
