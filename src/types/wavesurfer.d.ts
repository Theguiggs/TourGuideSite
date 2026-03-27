declare module 'wavesurfer.js' {
  interface WaveSurferOptions {
    container: HTMLElement;
    waveColor?: string;
    progressColor?: string;
    cursorColor?: string;
    height?: number;
    barWidth?: number;
    barGap?: number;
    url?: string;
  }

  interface WaveSurfer {
    destroy(): void;
    play(): void;
    pause(): void;
    seekTo(progress: number): void;
    getCurrentTime(): number;
    getDuration(): number;
  }

  const WaveSurferDefault: {
    create(options: WaveSurferOptions): WaveSurfer;
  };

  export default WaveSurferDefault;
}
