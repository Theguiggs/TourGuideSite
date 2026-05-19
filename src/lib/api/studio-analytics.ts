import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import * as appsync from './appsync-client';

const SERVICE_NAME = 'StudioAnalyticsAPI';

// Cost estimates (NFR15 cap: < $1 / tour)
const WHISPER_USD_PER_MIN = 0.006;
const S3_USD_PER_GB_MONTH = 0.023;
const ESTIMATED_MIN_PER_SCENE = 1.5;   // average POI narration length
const ESTIMATED_MB_PER_SCENE = 3;      // AAC ~96kbps × 1.5min

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

export interface TourCost {
  tourId: string;
  tourTitle: string;
  transcribeMinutes: number;
  s3StorageMB: number;
  estimatedCostUSD: number;
}

export interface StudioAnalyticsSummary {
  funnel: StudioFunnelData;
  statusDistribution: StatusDistribution[];
  tourCosts: TourCost[];
  totalCostUSD: number;
  averageCostPerTourUSD: number;
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
  tourCosts: [
    { tourId: 't1', tourTitle: 'Grasse — Les Parfumeurs', transcribeMinutes: 22, s3StorageMB: 45, estimatedCostUSD: 0.68 },
    { tourId: 't2', tourTitle: 'Nice — Promenade', transcribeMinutes: 35, s3StorageMB: 78, estimatedCostUSD: 0.92 },
    { tourId: 't3', tourTitle: 'Cannes — Croisette', transcribeMinutes: 18, s3StorageMB: 32, estimatedCostUSD: 0.55 },
  ],
  totalCostUSD: 2.15,
  averageCostPerTourUSD: 0.72,
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

  // --- Tour costs ---
  // Estimate per-scene transcription minutes + storage. Whisper $0.006/min, S3 $0.023/GB/mo.
  const tourCosts: TourCost[] = (tours as unknown as Array<Record<string, unknown>>)
    .map((t) => {
      const sessionId = t.sessionId as string | undefined;
      const sceneList = sessionId ? (scenesBySession.get(sessionId) ?? []) : [];
      const sceneCountWithAudio = sceneList.filter(
        (sc) => sc.studioAudioKey || sc.originalAudioKey,
      ).length;
      const transcribeMinutes = Math.round(sceneCountWithAudio * ESTIMATED_MIN_PER_SCENE);
      const s3StorageMB = sceneCountWithAudio * ESTIMATED_MB_PER_SCENE;
      const estimatedCostUSD =
        transcribeMinutes * WHISPER_USD_PER_MIN +
        (s3StorageMB / 1024) * S3_USD_PER_GB_MONTH;
      return {
        tourId: t.id as string,
        tourTitle: (t.title as string) || 'Sans titre',
        transcribeMinutes,
        s3StorageMB,
        estimatedCostUSD,
      };
    })
    .sort((a, b) => b.estimatedCostUSD - a.estimatedCostUSD);

  const totalCostUSD = tourCosts.reduce((sum, t) => sum + t.estimatedCostUSD, 0);
  const averageCostPerTourUSD = tourCosts.length > 0 ? totalCostUSD / tourCosts.length : 0;

  logger.info(SERVICE_NAME, 'Real analytics computed', {
    sessions: sessionsTyped.length,
    scenes: scenes.length,
    tours: tours.length,
    publishedCount,
  });

  return {
    funnel,
    statusDistribution,
    tourCosts,
    totalCostUSD,
    averageCostPerTourUSD,
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
