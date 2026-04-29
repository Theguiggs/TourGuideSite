'use client';

import { useState, useCallback } from 'react';
import type { StudioScene } from '@/types/studio';
import { getSceneStatusConfig } from '@/lib/api/studio';
import { addModerationFeedback, updateSessionStatus } from '@/lib/api/studio-submission';
import { audioPlayerService } from '@/lib/studio/audio-player-service';
import { useAuth } from '@/lib/auth/auth-context';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'StudioModerationPanel';

interface StudioModerationPanelProps {
  sessionId: string;
  scenes: StudioScene[];
  isAdmin: boolean;
  onStatusChange?: () => void;
}

export function StudioModerationPanel({ sessionId, scenes, isAdmin, onStatusChange }: StudioModerationPanelProps) {
  const { isAdmin: authIsAdmin } = useAuth();
  // Double-guard: prop AND auth context must both confirm admin
  const canModerate = isAdmin && authIsAdmin;
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingType, setPlayingType] = useState<'original' | 'studio' | null>(null);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handlePlay = useCallback((sceneId: string, type: 'original' | 'studio', url: string) => {
    if (playingId === sceneId && playingType === type) {
      audioPlayerService.pause();
      setPlayingId(null);
      setPlayingType(null);
    } else {
      audioPlayerService.play(url);
      setPlayingId(sceneId);
      setPlayingType(type);
    }
  }, [playingId, playingType]);

  const handleApprove = useCallback(async () => {
    if (!canModerate) return;
    setIsProcessing(true);
    const result = await updateSessionStatus(sessionId, 'published');
    setMessage(result.ok ? 'Tour approuvé !' : 'Erreur lors de l\'approbation.');
    setIsProcessing(false);
    if (result.ok) onStatusChange?.();
    logger.info(SERVICE_NAME, 'Approved', { sessionId });
  }, [sessionId, onStatusChange, canModerate]);

  const handleReject = useCallback(async () => {
    if (!canModerate) return;
    setIsProcessing(true);
    // Save per-scene feedback
    const failedScenes: string[] = [];
    for (const [sceneId, text] of Object.entries(feedbackText)) {
      if (text.trim()) {
        const fbResult = await addModerationFeedback(sceneId, text.trim());
        if (!fbResult.ok) failedScenes.push(sceneId);
      }
    }
    if (failedScenes.length > 0) {
      logger.warn(SERVICE_NAME, 'Some feedback saves failed', { failedScenes });
    }
    const result = await updateSessionStatus(sessionId, 'revision_requested');
    if (result.ok) {
      setMessage(failedScenes.length > 0 ? 'Révision demandée (certains feedbacks non sauvés).' : 'Révision demandée.');
      onStatusChange?.();
    } else {
      setMessage('Erreur lors du rejet.');
    }
    setIsProcessing(false);
    logger.info(SERVICE_NAME, 'Rejected with feedback', { sessionId, failedScenes });
  }, [sessionId, feedbackText, onStatusChange, canModerate]);

  return (
    <div data-testid="studio-moderation-panel">
      <h3 className="text-lg font-semibold text-ink mb-4">Scènes du tour</h3>

      <div className="space-y-3 mb-6">
        {scenes.map((scene, index) => {
          const statusConfig = getSceneStatusConfig(scene.status);
          const isPlayingOriginal = playingId === scene.id && playingType === 'original';
          const isPlayingStudio = playingId === scene.id && playingType === 'studio';

          return (
            <div key={scene.id} className="p-4 border border-line rounded-lg" data-testid={`mod-scene-${scene.id}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="w-6 h-6 rounded-full bg-paper-deep flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <span className="font-medium text-ink">{scene.title || `Scène ${index + 1}`}</span>
                <span className={`px-1.5 py-0 rounded text-[10px] font-medium ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                {scene.qualityScore && (
                  <span className={`px-1.5 py-0 rounded text-[10px] font-medium ${
                    scene.qualityScore === 'good' ? 'bg-olive-soft text-success' : 'bg-ocre-soft text-ocre'
                  }`}>
                    {scene.qualityScore === 'good' ? '✓ Bonne' : '⚠ À améliorer'}
                  </span>
                )}
              </div>

              {/* Audio comparison (FR44) */}
              <div className="flex gap-2 mb-2">
                {scene.originalAudioKey && (
                  <button
                    onClick={() => handlePlay(scene.id, 'original', scene.originalAudioKey!)}
                    className={`text-xs px-2 py-1 rounded transition ${
                      isPlayingOriginal ? 'bg-mer text-white' : 'bg-mer-soft text-mer hover:opacity-90'
                    }`}
                    data-testid={`play-original-${scene.id}`}
                  >
                    {isPlayingOriginal ? '⏸ Terrain' : '▶ Terrain'}
                  </button>
                )}
                {scene.studioAudioKey && (
                  <button
                    onClick={() => handlePlay(scene.id, 'studio', scene.studioAudioKey!)}
                    className={`text-xs px-2 py-1 rounded transition ${
                      isPlayingStudio ? 'bg-grenadine text-white' : 'bg-grenadine-soft text-grenadine hover:opacity-90'
                    }`}
                    data-testid={`play-studio-${scene.id}`}
                  >
                    {isPlayingStudio ? '⏸ Studio' : '▶ Studio'}
                  </button>
                )}
              </div>

              {/* Transcribed text */}
              {scene.transcriptText && (
                <p className="text-sm text-ink-80 mb-2 line-clamp-3">{scene.transcriptText}</p>
              )}

              {/* Existing feedback */}
              {scene.moderationFeedback && (
                <p className="text-xs text-danger mb-2">💬 Feedback : {scene.moderationFeedback}</p>
              )}

              {/* Admin feedback input */}
              {canModerate && (
                <textarea
                  value={feedbackText[scene.id] ?? ''}
                  onChange={(e) => setFeedbackText((prev) => ({ ...prev, [scene.id]: e.target.value }))}
                  placeholder="Feedback pour cette scène (optionnel)..."
                  className="w-full text-xs border border-line rounded p-2 resize-none h-16"
                  data-testid={`feedback-input-${scene.id}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Admin actions */}
      {canModerate && (
        <div className="flex gap-3 items-center">
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="bg-success hover:opacity-90 disabled:bg-ink-40 text-white font-medium py-2 px-5 rounded-lg text-sm transition"
            data-testid="approve-btn"
          >
            ✓ Approuver
          </button>
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="bg-danger hover:opacity-90 disabled:bg-ink-40 text-white font-medium py-2 px-5 rounded-lg text-sm transition"
            data-testid="reject-btn"
          >
            ✗ Révision demandée
          </button>
          {message && (
            <span className={`text-sm ${message.includes('approuvé') ? 'text-success' : 'text-ocre'}`} role="status">
              {message}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
