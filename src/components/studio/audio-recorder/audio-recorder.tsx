'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useRecordingStore, selectRecorderState, selectDevices, selectSelectedDeviceId } from '@/lib/stores/recording-store';
import { mediaRecorderService } from '@/lib/studio/media-recorder-service';
import { logger } from '@/lib/logger';
import { useStudioLocale } from '@/lib/i18n/studio-locale';
import type { Take } from '@/lib/stores/recording-store';

const SERVICE_NAME = 'AudioRecorder';

interface AudioRecorderProps {
  sceneId: string;
  onRecordingComplete: (sceneId: string, take: Take) => void;
  showControls?: boolean;
}

export interface AudioRecorderHandle {
  start: () => Promise<boolean>;
  pause: () => void;
  resume: () => boolean;
  stop: () => Promise<void>;
}

export const AudioRecorder = forwardRef<AudioRecorderHandle, AudioRecorderProps>(function AudioRecorder({
  sceneId,
  onRecordingComplete,
  showControls = true,
}, ref) {
  const { t } = useStudioLocale();
  const recorderState = useRecordingStore(selectRecorderState);
  const devices = useRecordingStore(selectDevices);
  const selectedDeviceId = useRecordingStore(selectSelectedDeviceId);
  const setRecorderState = useRecordingStore((s) => s.setRecorderState);
  const setDevices = useRecordingStore((s) => s.setDevices);
  const selectDevice = useRecordingStore((s) => s.selectDevice);
  const selectTake = useRecordingStore((s) => s.selectTake);
  const addTake = useRecordingStore((s) => s.addTake);
  const [error, setError] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const stopInFlightRef = useRef(false);

  // Keep the UI aligned with asynchronous recorder failures, then release the
  // microphone when leaving the page.
  useEffect(() => {
    const unsubscribe = mediaRecorderService.subscribe((state) => {
      setRecorderState(state);
      const recorderError = mediaRecorderService.getLastError();
      if (recorderError) setError(recorderError.message);
    });
    return () => {
      unsubscribe();
      mediaRecorderService.releaseStream();
    };
  }, [setRecorderState]);

  const handleRequestPermission = useCallback(async (): Promise<boolean> => {
    setError(null);
    setRecorderState('requesting_permission');
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setRecorderState('idle');
      setError(t(
        'Le microphone est indisponible. Ouvrez le Studio en HTTPS ou sur localhost avec un navigateur compatible.',
        'The microphone is unavailable. Open Studio over HTTPS or on localhost with a compatible browser.',
      ));
      return false;
    }
    const result = await mediaRecorderService.requestPermission(selectedDeviceId ?? undefined);
    if (result.ok) {
      setRecorderState('ready');
      void mediaRecorderService.enumerateDevices().then((devResult) => {
        if (devResult.ok) setDevices(devResult.devices);
      });
      return true;
    } else {
      setRecorderState('idle');
      setError(result.error.message);
      logger.warn(SERVICE_NAME, 'Permission denied');
      return false;
    }
  }, [selectedDeviceId, setRecorderState, setDevices, t]);

  const handleStartRecording = useCallback((): boolean => {
    setError(null);
    const result = mediaRecorderService.startRecording();
    if (result.ok) {
      setRecorderState('recording');
      return true;
    } else {
      setRecorderState(mediaRecorderService.getState());
      setError(result.error.message);
      return false;
    }
  }, [setRecorderState]);

  const handleStartWithPermission = useCallback(async (): Promise<boolean> => {
    const currentState = mediaRecorderService.getState();
    if (currentState === 'recording') return true;
    if (currentState === 'paused') {
      mediaRecorderService.resumeRecording();
      setRecorderState('recording');
      return true;
    }
    if (currentState === 'idle' && !await handleRequestPermission()) return false;
    return handleStartRecording();
  }, [handleRequestPermission, handleStartRecording, setRecorderState]);

  const handlePauseRecording = useCallback(() => {
    mediaRecorderService.pauseRecording();
    setRecorderState('paused');
  }, [setRecorderState]);

  const handleResumeRecording = useCallback((): boolean => {
    mediaRecorderService.resumeRecording();
    const resumed = mediaRecorderService.getState() === 'recording';
    setRecorderState(mediaRecorderService.getState());
    return resumed;
  }, [setRecorderState]);

  const handleStopRecording = useCallback(async () => {
    if (stopInFlightRef.current) return;
    stopInFlightRef.current = true;
    setIsStopping(true);
    setError(null);
    try {
      const result = await mediaRecorderService.stopRecording();
      setRecorderState(mediaRecorderService.getState());
      if (result.ok) {
        const take = addTake(sceneId, result.recording);
        selectTake(sceneId, take.id);
        onRecordingComplete(sceneId, take);
        logger.info(SERVICE_NAME, 'Recording complete', { sceneId, durationMs: result.recording.durationMs });
      } else {
        setError(result.error.message);
      }
    } finally {
      stopInFlightRef.current = false;
      setIsStopping(false);
    }
  }, [sceneId, setRecorderState, addTake, selectTake, onRecordingComplete]);

  const handleDeviceChange = useCallback(async (deviceId: string) => {
    setError(null);
    selectDevice(deviceId);
    // Release the old stream before acquiring the new device
    mediaRecorderService.releaseStream();
    const result = await mediaRecorderService.requestPermission(deviceId);
    if (!result.ok) {
      setRecorderState('idle');
      setError(result.error.message);
    }
  }, [selectDevice, setRecorderState]);

  useImperativeHandle(ref, () => ({
    start: handleStartWithPermission,
    pause: handlePauseRecording,
    resume: handleResumeRecording,
    stop: handleStopRecording,
  }), [handlePauseRecording, handleResumeRecording, handleStartWithPermission, handleStopRecording]);

  const recorderStatus = recorderState === 'requesting_permission'
    ? t('Autorisation du micro…', 'Requesting microphone access…')
    : recorderState === 'recording'
      ? t('Enregistrement en cours', 'Recording in progress')
      : recorderState === 'paused'
        ? t('Enregistrement en pause', 'Recording paused')
        : recorderState === 'ready' || recorderState === 'stopped'
          ? t('Micro prêt', 'Microphone ready')
          : t('Le micro sera activé au démarrage', 'The microphone will be enabled when you start');

  return (
    <div className="p-4 bg-paper-soft rounded-lg border border-line" data-testid="audio-recorder">
      {/* Device selector */}
      {devices.length > 1 && (
        <div className="mb-3">
          <label htmlFor="device-select" className="text-meta text-ink-60 block mb-1">
            {t('Microphone', 'Microphone')}
          </label>
          <select
            id="device-select"
            value={selectedDeviceId ?? ''}
            onChange={(e) => handleDeviceChange(e.target.value)}
            className="w-full text-body border border-line rounded px-2 py-1"
            data-testid="device-select"
          >
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
            ))}
          </select>
        </div>
      )}

      {showControls ? (
      <div className="flex items-center gap-3">
        {(recorderState === 'idle' || recorderState === 'ready' || recorderState === 'stopped') && (
          <button
            onClick={handleStartWithPermission}
            className="bg-danger hover:opacity-90 text-white font-medium py-2 px-4 rounded-lg text-body transition"
            data-testid="record-btn"
          >
            🔴 {recorderState === 'stopped' ? t('Nouvelle prise', 'New take') : t('Enregistrer', 'Record')}
          </button>
        )}

        {recorderState === 'requesting_permission' && (
          <span className="text-body text-ink-60" role="status">{t('Autorisation du micro…', 'Requesting microphone access…')}</span>
        )}

        {recorderState === 'recording' && (
          <>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-danger rounded-pill animate-pulse" aria-hidden="true" />
              <span className="text-body text-danger font-medium">{t('Enregistrement...', 'Recording...')}</span>
            </div>
            <button
              onClick={handlePauseRecording}
              className="bg-ocre hover:brightness-110 text-ink font-medium py-1.5 px-3 rounded-lg text-body transition"
              data-testid="pause-record-btn"
            >
              ⏸ {t('Pause', 'Pause')}
            </button>
            <button
              onClick={handleStopRecording}
              disabled={isStopping}
              className="bg-ink-80 hover:bg-ink-60 text-white font-medium py-1.5 px-3 rounded-lg text-body transition"
              data-testid="stop-record-btn"
            >
              ⏹ {isStopping ? t('Arrêt…', 'Stopping…') : t('Arrêter', 'Stop')}
            </button>
          </>
        )}

        {recorderState === 'paused' && (
          <>
            <span className="text-body text-ocre-ink font-medium">En pause</span>
            <button
              onClick={handleResumeRecording}
              className="bg-danger hover:opacity-90 text-white font-medium py-1.5 px-3 rounded-lg text-body transition"
              data-testid="resume-record-btn"
            >
              ▶ Reprendre
            </button>
            <button
              onClick={handleStopRecording}
              disabled={isStopping}
              className="bg-ink-80 hover:bg-ink-60 text-white font-medium py-1.5 px-3 rounded-lg text-body transition"
              data-testid="stop-record-btn-paused"
            >
              ⏹ {isStopping ? t('Arrêt…', 'Stopping…') : t('Arrêter', 'Stop')}
            </button>
          </>
        )}

      </div>
      ) : (
        <div className="flex items-center gap-2 text-body text-ink-60" role="status" data-testid="recorder-status">
          <span
            className={`h-2.5 w-2.5 rounded-pill ${recorderState === 'recording' ? 'animate-pulse bg-danger' : recorderState === 'paused' ? 'bg-ocre' : 'bg-ink-40'}`}
            aria-hidden="true"
          />
          {recorderStatus}
        </div>
      )}
      {error && (
        <p className="mt-3 text-body text-danger" role="alert" data-testid="recorder-error">{error}</p>
      )}
    </div>
  );
});
