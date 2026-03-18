import { logger } from '@/lib/logger';

const SERVICE_NAME = 'BroadcastSync';
const CHANNEL_NAME = 'studio-sync';

interface StudioSyncMessage {
  type: 'session_editing' | 'session_released';
  sessionId: string;
  tabId: string;
}

type SyncListener = (msg: StudioSyncMessage) => void;

class BroadcastSyncImpl {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<SyncListener>();
  private _tabId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

  get tabId() {
    return this._tabId;
  }

  initialize(): void {
    if (typeof BroadcastChannel === 'undefined') {
      logger.warn(SERVICE_NAME, 'BroadcastChannel not supported');
      return;
    }
    if (this.channel) return;

    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = (event: MessageEvent<StudioSyncMessage>) => {
      logger.info(SERVICE_NAME, 'Received sync message', { type: event.data.type, sessionId: event.data.sessionId });
      this.listeners.forEach((l) => l(event.data));
    };
    logger.info(SERVICE_NAME, 'Initialized');
  }

  notifyEditing(sessionId: string): void {
    this.send({ type: 'session_editing', sessionId, tabId: this._tabId });
  }

  notifyReleased(sessionId: string): void {
    this.send({ type: 'session_released', sessionId, tabId: this._tabId });
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private send(msg: StudioSyncMessage): void {
    if (!this.channel) {
      logger.warn(SERVICE_NAME, 'Channel not initialized');
      return;
    }
    this.channel.postMessage(msg);
  }

  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

export const broadcastSync = new BroadcastSyncImpl();
