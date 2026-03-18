import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'StudioAnalyticsAPI';

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

export async function getStudioAnalytics(): Promise<StudioAnalyticsSummary> {
  if (shouldUseStubs()) {
    logger.info(SERVICE_NAME, 'Returning mock analytics');
    return MOCK_ANALYTICS;
  }
  logger.warn(SERVICE_NAME, 'Real API not implemented');
  return MOCK_ANALYTICS;
}
