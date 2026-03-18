import { broadcastSync } from '../broadcast-sync';

const mockPostMessage = jest.fn();
const mockClose = jest.fn();

class MockBroadcastChannel {
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage = mockPostMessage;
  close = mockClose;
}

(global as Record<string, unknown>).BroadcastChannel = MockBroadcastChannel;

describe('BroadcastSync', () => {
  beforeEach(() => {
    broadcastSync.destroy();
    jest.clearAllMocks();
  });

  afterEach(() => {
    broadcastSync.destroy();
  });

  it('initializes and has a tabId', () => {
    broadcastSync.initialize();
    expect(broadcastSync.tabId).toBeTruthy();
  });

  it('sends editing notification via postMessage', () => {
    broadcastSync.initialize();
    broadcastSync.notifyEditing('session-1');
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'session_editing', sessionId: 'session-1' }),
    );
  });

  it('sends released notification via postMessage', () => {
    broadcastSync.initialize();
    broadcastSync.notifyReleased('session-1');
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'session_released', sessionId: 'session-1' }),
    );
  });

  it('does not send when not initialized', () => {
    broadcastSync.notifyEditing('session-1');
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('closes channel on destroy', () => {
    broadcastSync.initialize();
    broadcastSync.destroy();
    expect(mockClose).toHaveBeenCalled();
  });

  it('handles missing BroadcastChannel gracefully', () => {
    const original = global.BroadcastChannel;
    delete (global as Record<string, unknown>).BroadcastChannel;
    broadcastSync.destroy();
    broadcastSync.initialize(); // Should not throw
    expect(mockPostMessage).not.toHaveBeenCalled();
    (global as Record<string, unknown>).BroadcastChannel = original;
  });
});
