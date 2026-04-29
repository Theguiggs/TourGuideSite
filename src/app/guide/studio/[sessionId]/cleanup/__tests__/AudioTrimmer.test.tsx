import { render, screen, fireEvent, act } from '@testing-library/react';
import { AudioTrimmer } from '../components/AudioTrimmer';

function setAudioDuration(el: HTMLAudioElement, seconds: number) {
  Object.defineProperty(el, 'duration', { configurable: true, value: seconds });
  fireEvent.loadedMetadata(el);
}

describe('AudioTrimmer', () => {
  it('renders empty state when no audio URL', () => {
    render(
      <AudioTrimmer audioUrl={null} trimStart={null} trimEnd={null} onTrimChange={jest.fn()} />,
    );
    expect(screen.getByTestId('audio-trimmer-empty')).toBeInTheDocument();
  });

  it('updates trim start when slider moves', () => {
    const onTrimChange = jest.fn();
    render(
      <AudioTrimmer
        audioUrl="/mock/audio.aac"
        trimStart={0}
        trimEnd={10}
        onTrimChange={onTrimChange}
      />,
    );
    const audio = document.querySelector('audio') as HTMLAudioElement;
    act(() => { setAudioDuration(audio, 30); });
    const start = screen.getByTestId('audio-trim-start') as HTMLInputElement;
    fireEvent.change(start, { target: { value: '2.5' } });
    expect(onTrimChange).toHaveBeenCalledWith(2.5, 10);
  });

  it('clamps trim end above start', () => {
    const onTrimChange = jest.fn();
    render(
      <AudioTrimmer
        audioUrl="/mock/audio.aac"
        trimStart={5}
        trimEnd={15}
        onTrimChange={onTrimChange}
      />,
    );
    const audio = document.querySelector('audio') as HTMLAudioElement;
    act(() => { setAudioDuration(audio, 30); });
    const end = screen.getByTestId('audio-trim-end') as HTMLInputElement;
    fireEvent.change(end, { target: { value: '1' } });
    const [, nextEnd] = onTrimChange.mock.calls[0];
    expect(nextEnd).toBeGreaterThanOrEqual(5.1);
  });

  it('formats duration label', () => {
    render(
      <AudioTrimmer
        audioUrl="/mock/audio.aac"
        trimStart={0}
        trimEnd={65}
        onTrimChange={jest.fn()}
      />,
    );
    const audio = document.querySelector('audio') as HTMLAudioElement;
    act(() => { setAudioDuration(audio, 90); });
    expect(screen.getByTestId('audio-trim-duration').textContent).toBe('1:30');
    expect(screen.getByTestId('audio-trim-end-label').textContent).toBe('1:05');
  });

  // Regression (CR-2026-04-20): trimStart must clamp to >= 0 even if the input
  // somehow emits a negative value (locale, programmatic, manipulated DOM).
  it('clamps negative trimStart to 0', () => {
    const onTrimChange = jest.fn();
    render(
      <AudioTrimmer
        audioUrl="/mock/audio.aac"
        trimStart={1}
        trimEnd={10}
        onTrimChange={onTrimChange}
      />,
    );
    const audio = document.querySelector('audio') as HTMLAudioElement;
    act(() => { setAudioDuration(audio, 30); });
    const start = screen.getByTestId('audio-trim-start') as HTMLInputElement;
    fireEvent.change(start, { target: { value: '-5' } });
    const [nextStart] = onTrimChange.mock.calls[0];
    expect(nextStart).toBeGreaterThanOrEqual(0);
  });

  // Regression (CR-2026-04-20): trimEnd must clamp to <= duration so we never
  // persist a trimEnd past the actual media length.
  it('clamps trimEnd above duration to duration', () => {
    const onTrimChange = jest.fn();
    render(
      <AudioTrimmer
        audioUrl="/mock/audio.aac"
        trimStart={0}
        trimEnd={10}
        onTrimChange={onTrimChange}
      />,
    );
    const audio = document.querySelector('audio') as HTMLAudioElement;
    act(() => { setAudioDuration(audio, 20); });
    const end = screen.getByTestId('audio-trim-end') as HTMLInputElement;
    fireEvent.change(end, { target: { value: '999' } });
    const [, nextEnd] = onTrimChange.mock.calls[0];
    expect(nextEnd).toBeLessThanOrEqual(20);
  });
});
