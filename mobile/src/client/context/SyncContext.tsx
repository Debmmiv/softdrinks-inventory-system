import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { getPendingCount } from '../database/transactionRepo';
import { useAuth } from './AuthContext';
import { useInventory } from './InventoryContext';
import { networkService } from '../services/networkService';
import { syncEngine, type SyncResult } from '../services/syncEngine';

const STORAGE_LAST_SYNC_KEY = 'last_downstream_sync_timestamp';

// ---- Types ----------------------------------------------------------------

export interface SyncContextValue {
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  refreshPendingCount: () => Promise<void>;
  syncNow: () => Promise<SyncResult>;
}

// ---- Context ---------------------------------------------------------------

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { refresh: refreshInventory } = useInventory();
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch (err) {
      console.warn('[SyncContext] refreshPendingCount error:', err);
    }
  }, []);

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    const result = await syncEngine.syncAll(refreshInventory);
    await refreshPendingCount();
    try {
      const lastSync = await SecureStore.getItemAsync(STORAGE_LAST_SYNC_KEY);
      setLastSyncedAt(lastSync);
    } catch (err) {
      console.warn('[SyncContext] Failed reading last sync timestamp:', err);
    }
    return result;
  }, [refreshInventory, refreshPendingCount]);

  useEffect(() => {
    networkService.init();

    // Load initial sync timestamp
    SecureStore.getItemAsync(STORAGE_LAST_SYNC_KEY)
      .then((ts) => setLastSyncedAt(ts))
      .catch(console.warn);

    // Subscribe to network connectivity changes
    const unsubNet = networkService.subscribe((online) => {
      setIsOnline(online);
      // Automatically push queue when transitioning from offline to online (FR18)
      if (online && isAuthenticated) {
        syncNow().catch(console.warn);
      }
    });

    // Subscribe to sync engine status changes
    const unsubSync = syncEngine.subscribeSyncing((syncing) => {
      setIsSyncing(syncing);
      if (!syncing) {
        refreshPendingCount().catch(console.warn);
      }
    });

    return () => {
      unsubNet();
      unsubSync();
    };
  }, [isAuthenticated, syncNow, refreshPendingCount]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshPendingCount();
    } else {
      setPendingCount(0);
    }
  }, [isAuthenticated, refreshPendingCount]);

  return (
    <SyncContext.Provider
      value={{
        pendingCount,
        isOnline,
        isSyncing,
        lastSyncedAt,
        refreshPendingCount,
        syncNow,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}
