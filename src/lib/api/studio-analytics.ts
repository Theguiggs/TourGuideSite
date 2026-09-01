import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import * as appsync from './appsync-client';

const SERVICE_NAME = 'StudioAnalyticsAPI';

// ─── LES QUATRE CONSTANTES ONT ÉTÉ RETIRÉES — AD-16 §6, story 16, tâche 6 ───
//
// `WHISPER_USD_PER_MIN`, `S3_USD_PER_GB_MONTH`, `ESTIMATED_MIN_PER_SCENE` et
// `ESTIMATED_MB_PER_SCENE` multipliaient un nombre de Scènes pour produire un
// « Coût unitaire par tour » affiché à l'écran. Aucune des quatre n'a jamais été
// mesurée sur ce système : c'était le « coût supposé » qu'AD-16 §6 interdit.
//
// Les deux colonnes qu'elles alimentaient — « Transcribe (min) » et « S3 (Mo) »
// — étaient inventées de la même façon, et sont parties avec elles. Ce qui
// reste ici est ce que ce module SAIT : combien de Scènes portent un audio.
//
// Le coût RÉEL se lit dans `spend-ledger-report.ts`, qui interroge le grand
// livre. Soit la page lit le réel, soit elle ne dit rien.

export interface StudioFunnelData {
  fieldSessions: number;
  studioCreated: number;
  transcribed: number;
  recorded: number;
  submitted: number;
  published: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

/** Ce que le Studio a réellement produit par Visite. Aucun coût : voir le grand livre. */
export interface TourProduction {
  tourId: string;
  tourTitle: string;
  /** Nombre de Scènes portant un audio — un FAIT, compté, pas estimé. */
  scenesWithAudio: number;
}

export interface StudioAnalyticsSummary {
  funnel: StudioFunnelData;
  statusDistribution: StatusDistribution[];
  tourProduction: TourProduction[];
}

const MOCK_ANALYTICS: StudioAnalyticsSummary = {
  funnel: {
    fieldSessions: 24,
    studioCreated: 18,
    transcribed: 15,
    recorded: 12,
    submitted: 8,
    published: 5,
  },
  statusDistribution: [
    { status: 'draft', count: 6, percentage: 25 },
    { status: 'editing', count: 4, percentage: 17 },
    { status: 'recording', count: 3, percentage: 12 },
    { status: 'submitted', count: 3, percentage: 12 },
    { status: 'published', count: 5, percentage: 21 },
    { status: 'revision_requested', count: 2, percentage: 8 },
    { status: 'rejected', count: 1, percentage: 4 },
  ],
  tourProduction: [
    { tourId: 't1', tourTitle: 'Grasse — Les Parfumeurs', scenesWithAudio: 15 },
    { tourId: 't2', tourTitle: 'Nice — Promenade', scenesWithAudio: 23 },
    { tourId: 't3', tourTitle: 'Cannes — Croisette', scenesWithAudio: 12 },
  ],
};

async function getRealStudioAnalytics(): Promise<StudioAnalyticsSummary> {
  const [sessions, scenes, tours] = await Promise.all([
    appsync.listAllStudioSessions(),
    appsync.listAllStudioScenes(),
    appsync.listAllGuideTours(),
  ]);

  // Index scenes by sessionId for fast lookup
  const scenesBySession = new Map<string, Array<Record<string, unknown>>>();
  for (const s of scenes as unknown as Array<Record<string, unknown>>) {
    const sid = s.sessionId as string | undefined;
    if (!sid) continue;
    const arr = scenesBySession.get(sid) ?? [];
    arr.push(s);
    scenesBySession.set(sid, arr);
  }

  // --- Funnel ---
  const sessionsTyped = sessions as unknown as Array<Record<string, unknown>>;
  const activeSessions = sessionsTyped.filter((s) => s.status !== 'archived');
  let transcribedCount = 0;
  let recordedCount = 0;
  let submittedCount = 0;
  let publishedCount = 0;

  for (const sess of activeSessions) {
    const sceneList = scenesBySession.get(sess.id as string) ?? [];
    const activeScenes = sceneList.filter((sc) => !sc.archived);
    const hasTranscription = activeScenes.some(
      (sc) => sc.transcriptText && (sc.transcriptText as string).trim().length > 0,
    );
    const hasAudio = activeScenes.some(
      (sc) => sc.studioAudioKey || sc.originalAudioKey,
    );
    if (hasTranscription) transcribedCount++;
    if (hasAudio) recordedCount++;

    const status = sess.status as string;
    if (['submitted', 'published', 'paused', 'revision_requested', 'rejected'].includes(status)) {
      submittedCount++;
    }
    if (status === 'published' || status === 'paused') publishedCount++;
  }

  // fieldSessions vs studioCreated: indistinguishable without mobile field-capture data,
  // so they share the count. Once mobile WalkSegment counts feed in, fieldSessions can diverge.
  const funnel: StudioFunnelData = {
    fieldSessions: activeSessions.length,
    studioCreated: activeSessions.length,
    transcribed: transcribedCount,
    recorded: recordedCount,
    submitted: submittedCount,
    published: publishedCount,
  };

  // --- Status distribution ---
  const statusCounts = new Map<string, number>();
  for (const sess of sessionsTyped) {
    const s = (sess.status as string) || 'draft';
    statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
  }
  const totalSessions = sessionsTyped.length || 1;
  const statusDistribution: StatusDistribution[] = Array.from(statusCounts.entries())
    .map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / totalSessions) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // --- Production par Visite ---
  // CE QUE CE MODULE SAIT, ET RIEN DE PLUS : le nombre de Scènes qui portent un
  // audio. Le coût de fabrication ne se déduit pas de ce nombre — il se lit au
  // grand livre (`spend-ledger-report.ts`), où il a été ÉCRIT par les points de
  // sortie après avoir appelé un fournisseur.
  const tourProduction: TourProduction[] = (tours as unknown as Array<Record<string, unknown>>)
    .map((t) => {
      const sessionId = t.sessionId as string | undefined;
      const sceneList = sessionId ? (scenesBySession.get(sessionId) ?? []) : [];
      return {
        tourId: t.id as string,
        tourTitle: (t.title as string) || 'Sans titre',
        scenesWithAudio: sceneList.filter((sc) => sc.studioAudioKey || sc.originalAudioKey).length,
      };
    })
    .sort((a, b) => b.scenesWithAudio - a.scenesWithAudio);

  logger.info(SERVICE_NAME, 'Real analytics computed', {
    sessions: sessionsTyped.length,
    scenes: scenes.length,
    tours: tours.length,
    publishedCount,
  });

  return {
    funnel,
    statusDistribution,
    tourProduction,
  };
}

export async function getStudioAnalytics(): Promise<StudioAnalyticsSummary> {
  if (shouldUseStubs()) {
    logger.info(SERVICE_NAME, 'Returning mock analytics');
    return MOCK_ANALYTICS;
  }
  try {
    return await getRealStudioAnalytics();
  } catch (e) {
    logger.error(SERVICE_NAME, 'getRealStudioAnalytics failed, falling back to mock', { error: String(e) });
    return MOCK_ANALYTICS;
  }
}
