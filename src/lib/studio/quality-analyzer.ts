import { logger } from '@/lib/logger';
import type { QualityScore } from '@/types/studio';

const SERVICE_NAME = 'QualityAnalyzer';

export interface QualityResult {
  overall: QualityScore;
  details: {
    averageVolume: number;     // dBFS, good range: -30 to -6
    peakClipping: boolean;     // peaks > -1 dBFS
    silenceRatio: number;      // % of silence, good: <40%
  };
  message: string;
}

/**
 * Analyze audio quality from a Blob using Web Audio API.
 * Returns result in <500ms (NFR5).
 */
export async function analyzeAudioQuality(blob: Blob): Promise<QualityResult> {
  try {
    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
      logger.warn(SERVICE_NAME, 'AudioContext not available');
      return fallbackResult();
    }

    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (AudioContext || webkitAudioContext)();

    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch {
      logger.warn(SERVICE_NAME, 'Failed to decode audio');
      await audioContext.close();
      return fallbackResult();
    }

    const channelData = audioBuffer.getChannelData(0);
    const result = analyzeChannelData(channelData, audioBuffer.sampleRate);

    await audioContext.close();
    logger.info(SERVICE_NAME, 'Analysis complete', { overall: result.overall });
    return result;
  } catch (e) {
    logger.warn(SERVICE_NAME, 'Analysis failed', { error: String(e) });
    return fallbackResult();
  }
}

function analyzeChannelData(data: Float32Array, sampleRate: number): QualityResult {
  const totalSamples = data.length;
  if (totalSamples === 0) return fallbackResult();

  // Calculate RMS volume
  let sumSquares = 0;
  let peakAmplitude = 0;
  let silentSamples = 0;
  const silenceThreshold = 0.01; // -40 dBFS

  for (let i = 0; i < totalSamples; i++) {
    const abs = Math.abs(data[i]);
    sumSquares += data[i] * data[i];
    if (abs > peakAmplitude) peakAmplitude = abs;
    if (abs < silenceThreshold) silentSamples++;
  }

  const rms = Math.sqrt(sumSquares / totalSamples);
  const averageVolume = rms > 0 ? 20 * Math.log10(rms) : -60; // dBFS
  const peakClipping = peakAmplitude > 0.95; // peaks near 0 dBFS
  const silenceRatio = Math.round((silentSamples / totalSamples) * 100);

  // Determine overall quality
  let overall: QualityScore = 'good';
  let message = 'Qualité : Bonne';

  if (peakClipping) {
    overall = 'needs_improvement';
    message = 'Saturation détectée — baissez le gain du micro';
  } else if (averageVolume < -30) {
    overall = 'needs_improvement';
    message = 'Volume trop bas — rapprochez-vous du micro';
  } else if (silenceRatio > 40) {
    overall = 'needs_improvement';
    message = 'Trop de silence — vérifiez que le micro est actif';
  }

  return {
    overall,
    details: { averageVolume: Math.round(averageVolume * 10) / 10, peakClipping, silenceRatio },
    message,
  };
}

function fallbackResult(): QualityResult {
  return {
    overall: null,
    details: { averageVolume: 0, peakClipping: false, silenceRatio: 0 },
    message: 'Analyse non disponible',
  };
}

// webkitAudioContext type declaration for Safari compatibility
declare const webkitAudioContext: typeof AudioContext;
