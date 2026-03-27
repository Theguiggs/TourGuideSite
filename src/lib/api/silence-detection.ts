import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'SilenceDetectionAPI';

// --- Types ---

export interface DetectedSegment {
  startMs: number;
  endMs: number;
  suggestedTitle?: string;
}

export interface SilenceDetectionResult {
  ok: boolean;
  segments: DetectedSegment[];
  error?: string;
}

// --- Stub API ---

function stubDetect(_audioKey: string): SilenceDetectionResult {
  // Generate 3-5 random segments for a ~3min audio
  const segmentCount = 3 + Math.floor(Math.random() * 3);
  const totalDuration = 180_000; // 3 min
  const segmentDuration = Math.floor(totalDuration / segmentCount);
  const segments: DetectedSegment[] = [];

  for (let i = 0; i < segmentCount; i++) {
    const startMs = i * segmentDuration + (i > 0 ? 800 : 0); // 800ms gap for silence
    const endMs = (i + 1) * segmentDuration;
    segments.push({
      startMs,
      endMs,
      suggestedTitle: `Segment ${i + 1}`,
    });
  }

  logger.info(SERVICE_NAME, 'Stub silence detection', { segmentCount });
  return { ok: true, segments };
}

// --- Public API ---

export async function detectSilences(audioKey: string): Promise<SilenceDetectionResult> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 1500)); // Simulate processing
    return stubDetect(audioKey);
  }

  try {
    // Convert S3 key to a pre-signed URL before sending to microservice
    const { getPlayableUrl } = await import('@/lib/studio/studio-upload-service');
    const presignedUrl = await getPlayableUrl(audioKey);

    const { getMicroserviceUrl, getMicroserviceHeaders } = await import('./microservice-config');
    const response = await fetch(`${getMicroserviceUrl()}/v1/silence-detect`, {
      method: 'POST',
      headers: getMicroserviceHeaders(),
      body: JSON.stringify({ audio_url: presignedUrl }),
    });
    const data = await response.json();

    if (data.ok) {
      return {
        ok: true,
        segments: data.segments.map((s: { start_ms: number; end_ms: number }) => ({
          startMs: s.start_ms,
          endMs: s.end_ms,
        })),
      };
    }

    return { ok: false, segments: [], error: data.error };
  } catch (err) {
    logger.error(SERVICE_NAME, 'Silence detection failed', { error: String(err) });
    return { ok: false, segments: [], error: 'Détection de silences échouée.' };
  }
}

/** Test-only: reset stubs */
export function __resetSilenceStubs(): void {
  // No state to reset
}
