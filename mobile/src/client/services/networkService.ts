import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type NetworkChangeCallback = (isOnline: boolean) => void;

class NetworkService {
  private listeners: Set<NetworkChangeCallback> = new Set();
  private isOnline = false;
  private unsubscribe: (() => void) | null = null;

  init() {
    if (this.unsubscribe) return;

    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (online !== this.isOnline) {
        this.isOnline = online;
        this.notifyListeners();
      }
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      this.isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      this.notifyListeners();
    });
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  async checkOnlineAsync(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
    return this.isOnline;
  }

  subscribe(callback: NetworkChangeCallback): () => void {
    this.listeners.add(callback);
    callback(this.isOnline);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.isOnline);
      } catch (err) {
        console.error('[NetworkService] listener error:', err);
      }
    }
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
  }
}

export const networkService = new NetworkService();
