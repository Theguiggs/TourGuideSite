'use client';

import { useState, useEffect, useRef } from 'react';
import { tg } from '@murmure/design-system';
import { logger } from '@/lib/logger';
import { detectSilences, type DetectedSegment } from '@/lib/api/silence-detection';
import type { SceneSegment } from '@/types/studio';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

const SERVICE_NAME = 'AdvancedEditor';

interface AdvancedEditorProps {
  audioKey: string | null;
  audioUrl: string | null;
  segments: SceneSegment[];
  onSegmentsChange?: (segments: DetectedSegment[]) => void;
}

export function AdvancedEditor({ audioKey, audioUrl, onSegmentsChange }: AdvancedEditorProps) {
  const { t } = useStudioLocale();
  const [detectedSegments, setDetectedSegments] = useState<DetectedSegment[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [waveformReady, setWaveformReady] = useState(false);
  const waveformRef = useRef<HTMLDivElement>(null);

  // Detect silences on first load
  useEffect(() => {
    if (!audioKey || detectedSegments.length > 0) return;

    setIsDetecting(true);
    detectSilences(audioKey).then((result) => {
      if (result.ok) {
        setDetectedSegments(result.segments);
        onSegmentsChange?.(result.segments);
        logger.info(SERVICE_NAME, 'Silence detection complete', { count: result.segments.length });
      }
    }).finally(() => setIsDetecting(false));
  }, [audioKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load wavesurfer dynamically
  useEffect(() => {
    if (!audioUrl || !waveformRef.current) return;

    let ws: unknown = null;

    import('wavesurfer.js').then((WaveSurfer) => {
      if (!waveformRef.current) return;

      ws = WaveSurfer.default.create({
        container: waveformRef.current,
        waveColor: tg.colors.ink40,
        progressColor: tg.colors.mer,
        cursorColor: tg.colors.ardoise,
        height: 128,
        barWidth: 2,
        barGap: 1,
        url: audioUrl,
      });

      setWaveformReady(true);
      logger.info(SERVICE_NAME, 'Waveform loaded');
    }).catch((err) => {
      logger.warn(SERVICE_NAME, 'wavesurfer.js not available', { error: String(err) });
    });

    return () => {
      if (ws && typeof (ws as { destroy: () => void }).destroy === 'function') {
        (ws as { destroy: () => void }).destroy();
      }
    };
  }, [audioUrl]);

  return (
    <div className="space-y-4" data-testid="advanced-editor">
      <div className="flex items-center justify-between">
        <h3 className="text-body font-semibold text-ink">{t('Mode avancé', 'Advanced mode')}</h3>
        <span className="text-meta text-ink-40">{detectedSegments.length} {t('segments détectés', 'segments detected')}</span>
      </div>

      {/* Waveform */}
      {audioUrl ? (
        <div className="bg-ink rounded-lg p-2">
          <div ref={waveformRef} data-testid="waveform-container" />
          {!waveformReady && (
            <div className="h-32 flex items-center justify-center text-ink-40 text-body">
              {t('Chargement du waveform...', 'Loading waveform...')}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-paper-soft rounded-lg h-32 flex items-center justify-center text-ink-40 text-body">
          {t('Aucun audio disponible', 'No audio available')}
        </div>
      )}

      {/* Segment markers */}
      {isDetecting && (
        <div className="p-3 bg-mer-soft rounded-lg animate-pulse text-body text-mer">
          {t('Détection des silences en cours...', 'Detecting silences...')}
        </div>
      )}

      {detectedSegments.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-meta font-medium text-ink-60 uppercase">Segments</h4>
          {detectedSegments.map((seg, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2 bg-paper-soft rounded text-body"
              data-testid={`segment-marker-${i}`}
            >
              <span className="w-6 h-6 rounded-pill bg-grenadine-soft text-grenadine flex items-center justify-center text-meta font-bold">
                {i + 1}
              </span>
              <span className="text-ink-80">
                {formatTime(seg.startMs)} — {formatTime(seg.endMs)}
              </span>
              <span className="text-ink-40 text-meta">
                ({Math.round((seg.endMs - seg.startMs) / 1000)}s)
              </span>
              {seg.suggestedTitle && (
                <span className="text-meta text-ink-60 ml-auto">{seg.suggestedTitle}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
