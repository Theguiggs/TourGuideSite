import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AudioRecorder } from '../audio-recorder';
import { useRecordingStore } from '@/lib/stores/recording-store';
import { mediaRecorderService } from '@/lib/studio/media-recorder-service';

describe('AudioRecorder', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    useRecordingStore.getState().resetStore();
  });

  it('offers a single recording action in idle state', () => {
    render(<AudioRecorder sceneId="scene-1" onRecordingComplete={jest.fn()} />);
    expect(screen.getByTestId('record-btn')).toHaveTextContent('Enregistrer');
    expect(screen.queryByTestId('permission-btn')).not.toBeInTheDocument();
  });

  it('shows record button in ready state', () => {
    useRecordingStore.getState().setRecorderState('ready');
    render(<AudioRecorder sceneId="scene-1" onRecordingComplete={jest.fn()} />);
    expect(screen.getByTestId('record-btn')).toBeInTheDocument();
    expect(screen.getByTestId('record-btn')).toHaveTextContent('Enregistrer');
  });

  it('shows recording indicator and controls in recording state', () => {
    useRecordingStore.getState().setRecorderState('recording');
    render(<AudioRecorder sceneId="scene-1" onRecordingComplete={jest.fn()} />);
    expect(screen.getByText('Enregistrement...')).toBeInTheDocument();
    expect(screen.getByTestId('pause-record-btn')).toBeInTheDocument();
    expect(screen.getByTestId('stop-record-btn')).toBeInTheDocument();
  });

  it('shows paused state with resume button', () => {
    useRecordingStore.getState().setRecorderState('paused');
    render(<AudioRecorder sceneId="scene-1" onRecordingComplete={jest.fn()} />);
    expect(screen.getByText('En pause')).toBeInTheDocument();
    expect(screen.getByTestId('resume-record-btn')).toBeInTheDocument();
  });

  it('shows device selector when multiple devices available', () => {
    useRecordingStore.getState().setDevices([
      { deviceId: 'mic-1', label: 'Built-in' },
      { deviceId: 'mic-2', label: 'USB Mic' },
    ]);
    render(<AudioRecorder sceneId="scene-1" onRecordingComplete={jest.fn()} />);
    expect(screen.getByTestId('device-select')).toBeInTheDocument();
  });

  it('hides device selector with single device', () => {
    useRecordingStore.getState().setDevices([{ deviceId: 'mic-1', label: 'Built-in' }]);
    render(<AudioRecorder sceneId="scene-1" onRecordingComplete={jest.fn()} />);
    expect(screen.queryByTestId('device-select')).not.toBeInTheDocument();
  });

  it('shows a precise error without entering a false recording state when the microphone API is unavailable', async () => {
    Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: false });
    render(<AudioRecorder sceneId="scene-1" onRecordingComplete={jest.fn()} />);
    fireEvent.click(screen.getByTestId('record-btn'));
    expect(await screen.findByTestId('recorder-error')).toHaveTextContent(/HTTPS|localhost/);
    expect(useRecordingStore.getState().recorderState).toBe('idle');
    expect(screen.queryByText('Enregistrement...')).not.toBeInTheDocument();
  });

  it('requests permission and starts recording from the same click', async () => {
    Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: jest.fn(), enumerateDevices: jest.fn() },
    });
    jest.spyOn(mediaRecorderService, 'getState').mockReturnValue('idle');
    jest.spyOn(mediaRecorderService, 'requestPermission').mockResolvedValue({ ok: true });
    jest.spyOn(mediaRecorderService, 'enumerateDevices').mockResolvedValue({ ok: true, devices: [] });
    const startRecording = jest.spyOn(mediaRecorderService, 'startRecording').mockReturnValue({ ok: true });
    render(<AudioRecorder sceneId="scene-1" onRecordingComplete={jest.fn()} />);

    fireEvent.click(screen.getByTestId('record-btn'));

    await waitFor(() => expect(startRecording).toHaveBeenCalledTimes(1));
    expect(useRecordingStore.getState().recorderState).toBe('recording');
  });

  it('can expose status only when the prompter owns the controls', () => {
    render(<AudioRecorder sceneId="scene-1" onRecordingComplete={jest.fn()} showControls={false} />);
    expect(screen.getByTestId('recorder-status')).toHaveTextContent(/activé au démarrage/i);
    expect(screen.queryByTestId('record-btn')).not.toBeInTheDocument();
  });

  it('stores, selects and returns the exact completed take', async () => {
    const blob = new Blob(['voice'], { type: 'audio/webm' });
    jest.spyOn(mediaRecorderService, 'stopRecording').mockResolvedValue({
      ok: true,
      recording: { blob, mimeType: 'audio/webm', durationMs: 900 },
    });
    jest.spyOn(mediaRecorderService, 'getState').mockReturnValue('ready');
    useRecordingStore.getState().setRecorderState('recording');
    const onComplete = jest.fn();
    render(<AudioRecorder sceneId="scene-1" onRecordingComplete={onComplete} />);

    fireEvent.click(screen.getByTestId('stop-record-btn'));

    await screen.findByTestId('record-btn');
    const selected = useRecordingStore.getState().getSelectedTake('scene-1');
    expect(selected?.blob).toBe(blob);
    expect(onComplete).toHaveBeenCalledWith('scene-1', selected);
  });
});
