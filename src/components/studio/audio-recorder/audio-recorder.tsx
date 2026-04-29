'use client';

import { useCallback } from 'react';
import { useRecordingStore, selectRecorderState, selectDevices, selectSelectedDeviceId } from '@/lib/stores/recording-store';
import { mediaRecorderService } from '@/lib/studio/media-recorder-service';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'AudioRecorder';

interface AudioRecorderProps {
  sceneId: string;
  onRecordingComplete: (sceneId: string) => void;
}

export function AudioRecorder({ sceneId, onRecordingComplete }: AudioRecorderProps) {
  const recorderState = useRecordingStore(selectRecorderState);
  const devices = useRecordingStore(selectDevices);
  const selectedDeviceId = useRecordingStore(selectSelectedDeviceId);
  const setRecorderState = useRecordingStore((s) => s.setRecorderState);
  const setDevices = useRecordingStore((s) => s.setDevices);
  const selectDevice = useRecordingStore((s) => s.selectDevice);
  const addTake = useRecordingStore((s) => s.addTake);

  const handleRequestPermission = useCallback(async () => {
    const result = await mediaRecorderService.requestPermission(selectedDeviceId ?? undefined);
    if (result.ok) {
      setRecorderState('ready');
      const devResult = await mediaRecorderService.enumerateDevices();
      if (devResult.ok) setDevices(devResult.devices);
    } else {
      setRecorderState('idle');
      logger.warn(SERVICE_NAME, 'Permission denied');
    }
  }, [selectedDeviceId, setRecorderState, setDevices]);

  const handleStartRecording = useCallback(() => {
    const result = mediaRecorderService.startRecording();
    if (result.ok) {
      setRecorderState('recording');
    }
  }, [setRecorderState]);

  const handlePauseRecording = useCallback(() => {
    mediaRecorderService.pauseRecording();
    setRecorderState('paused');
  }, [setRecorderState]);

  const handleResumeRecording = useCallback(() => {
    mediaRecorderService.resumeRecording();
    setRecorderState('recording');
  }, [setRecorderState]);

  const handleStopRecording = useCallback(async () => {
    const result = await mediaRecorderService.stopRecording();
    setRecorderState('ready');
    if (result) {
      addTake(sceneId, result);
      onRecordingComplete(sceneId);
      logger.info(SERVICE_NAME, 'Recording complete', { sceneId, durationMs: result.durationMs });
    }
  }, [sceneId, setRecorderState, addTake, onRecordingComplete]);

  const handleDeviceChange = useCallback(async (deviceId: string) => {
    selectDevice(deviceId);
    await mediaRecorderService.requestPermission(deviceId);
  }, [selectDevice]);

  return (
    <div className="p-4 bg-paper-soft rounded-lg border border-line" data-testid="audio-recorder">
      {/* Device selector */}
      {devices.length > 1 && (
        <div className="mb-3">
          <label htmlFor="device-select" className="text-xs text-ink-60 block mb-1">
            Microphone
          </label>
          <select
            id="device-select"
            value={selectedDeviceId ?? ''}
            onChange={(e) => handleDeviceChange(e.target.value)}
            className="w-full text-sm border border-line rounded px-2 py-1"
            data-testid="device-select"
          >
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Recording controls */}
      <div className="flex items-center gap-3">
        {recorderState === 'idle' && (
          <button
            onClick={handleRequestPermission}
            className="bg-grenadine hover:opacity-90 text-white font-medium py-2 px-4 rounded-lg text-sm transition"
            data-testid="permission-btn"
          >
            🎙️ Autoriser le micro
          </button>
        )}

        {recorderState === 'ready' && (
          <button
            onClick={handleStartRecording}
            className="bg-danger hover:opacity-90 text-white font-medium py-2 px-4 rounded-lg text-sm transition"
            data-testid="record-btn"
          >
            🔴 Enregistrer
          </button>
        )}

        {recorderState === 'recording' && (
          <>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-danger rounded-full animate-pulse" aria-hidden="true" />
              <span className="text-sm text-danger font-medium">Enregistrement...</span>
            </div>
            <button
              onClick={handlePauseRecording}
              className="bg-ocre hover:opacity-90 text-white font-medium py-1.5 px-3 rounded-lg text-sm transition"
              data-testid="pause-record-btn"
            >
              ⏸ Pause
            </button>
            <button
              onClick={handleStopRecording}
              className="bg-ink-80 hover:bg-ink-60 text-white font-medium py-1.5 px-3 rounded-lg text-sm transition"
              data-testid="stop-record-btn"
            >
              ⏹ Arrêter
            </button>
          </>
        )}

        {recorderState === 'paused' && (
          <>
            <span className="text-sm text-ocre font-medium">En pause</span>
            <button
              onClick={handleResumeRecording}
              className="bg-danger hover:opacity-90 text-white font-medium py-1.5 px-3 rounded-lg text-sm transition"
              data-testid="resume-record-btn"
            >
              ▶ Reprendre
            </button>
            <button
              onClick={handleStopRecording}
              className="bg-ink-80 hover:bg-ink-60 text-white font-medium py-1.5 px-3 rounded-lg text-sm transition"
              data-testid="stop-record-btn-paused"
            >
              ⏹ Arrêter
            </button>
          </>
        )}

        {recorderState === 'stopped' && (
          <button
            onClick={handleStartRecording}
            className="bg-danger hover:opacity-90 text-white font-medium py-2 px-4 rounded-lg text-sm transition"
            data-testid="record-again-btn"
          >
            🔴 Nouvelle prise
          </button>
        )}
      </div>
    </div>
  );
}
