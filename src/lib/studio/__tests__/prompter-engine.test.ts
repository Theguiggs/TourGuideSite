import { PrompterEngine } from '../prompter-engine';

// Mock requestAnimationFrame / cancelAnimationFrame
let rafCallbacks: ((timestamp: number) => void)[] = [];
let rafId = 0;

beforeEach(() => {
  rafCallbacks = [];
  rafId = 0;
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    rafCallbacks.push(cb);
    return ++rafId;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
    rafCallbacks = [];
  });
  jest.spyOn(performance, 'now').mockReturnValue(0);
});

afterEach(() => {
  jest.restoreAllMocks();
});

function advanceFrame(timestamp: number) {
  jest.spyOn(performance, 'now').mockReturnValue(timestamp);
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  cbs.forEach((cb) => cb(timestamp));
}

describe('PrompterEngine', () => {
  it('starts in idle state', () => {
    const engine = new PrompterEngine();
    const state = engine.getState();
    expect(state.isScrolling).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.currentWordIndex).toBe(0);
    expect(state.elapsedMs).toBe(0);
    engine.destroy();
  });

  it('starts scrolling', () => {
    const engine = new PrompterEngine();
    engine.start(100);
    expect(engine.getState().isScrolling).toBe(true);
    expect(engine.getState().isPaused).toBe(false);
    engine.destroy();
  });

  it('pauses and resumes', () => {
    const engine = new PrompterEngine();
    engine.start(100);
    engine.pause();
    expect(engine.getState().isPaused).toBe(true);
    expect(engine.getState().isScrolling).toBe(true);

    engine.start(100); // resume
    expect(engine.getState().isPaused).toBe(false);
    engine.destroy();
  });

  it('stops scrolling', () => {
    const engine = new PrompterEngine();
    engine.start(100);
    engine.stop();
    expect(engine.getState().isScrolling).toBe(false);
    engine.destroy();
  });

  it('resets all state', () => {
    const engine = new PrompterEngine();
    engine.setSpeed(8);
    engine.start(100);
    engine.reset();
    const state = engine.getState();
    expect(state.isScrolling).toBe(false);
    expect(state.speed).toBe(5);
    expect(state.currentWordIndex).toBe(0);
    expect(state.elapsedMs).toBe(0);
    engine.destroy();
  });

  it('sets speed within bounds', () => {
    const engine = new PrompterEngine();
    engine.setSpeed(15);
    expect(engine.getState().speed).toBe(10);
    engine.setSpeed(-1);
    expect(engine.getState().speed).toBe(1);
    engine.setSpeed(7);
    expect(engine.getState().speed).toBe(7);
    engine.destroy();
  });

  it('togglePause toggles between pause and resume', () => {
    const engine = new PrompterEngine();
    engine.start(100);
    engine.togglePause();
    expect(engine.getState().isPaused).toBe(true);
    engine.togglePause();
    expect(engine.getState().isPaused).toBe(false);
    engine.destroy();
  });

  it('advances word index and scroll position on tick', () => {
    const engine = new PrompterEngine();
    engine.start(100);

    // Simulate 2 seconds of frames
    advanceFrame(1000);
    advanceFrame(2000);

    const state = engine.getState();
    expect(state.scrollPosition).toBeGreaterThan(0);
    expect(state.elapsedMs).toBeGreaterThan(0);
    engine.destroy();
  });

  it('notifies subscribers on state changes', () => {
    const engine = new PrompterEngine();
    const listener = jest.fn();
    engine.subscribe(listener);
    engine.start(50);
    expect(listener).toHaveBeenCalled();
    engine.destroy();
  });

  it('unsubscribes correctly', () => {
    const engine = new PrompterEngine();
    const listener = jest.fn();
    const unsub = engine.subscribe(listener);
    unsub();
    engine.start(50);
    // Listener was called once for start, but after unsub no more
    const count = listener.mock.calls.length;
    engine.pause();
    expect(listener.mock.calls.length).toBe(count);
    engine.destroy();
  });
});
