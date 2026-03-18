import React from 'react';
import { render, screen } from '@testing-library/react';
import { AudioRecorder } from '../audio-recorder';
import { useRecordingStore } from '@/lib/stores/recording-store';

describe('AudioRecorder', () => {
  beforeEach(() => {
    useRecordingStore.getState().resetStore();
  });

  it('shows permission button in idle state', () => {
    render(<AudioRecorder sceneId="scene-1" onRecordingComplete={jest.fn()} />);
    expect(screen.getByTestId('permission-btn')).toBeInTheDocument();
    expect(screen.getByTestId('permission-btn')).toHaveTextContent('Autoriser le micro');
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
});
