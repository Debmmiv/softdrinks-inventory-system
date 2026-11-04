import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { getPendingCount } from '../database/transactionRepo';
import { useAuth } from './AuthContext';

// ---- Types ----------------------------------------------------------------

interface SyncContextValue {
  pendingCount: number;
  /** Will be wired to @react-native-community/netinfo in Phase 3 */
  isOnline: boolean;
  refreshPendingCount: () => Promise<void>;
}

// ---- Context ---------------------------------------------------------------

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  // Phase 1: hardcoded offline — sync engine wired in Phase 3
  const isOnline = false;

  useEffect(() => {
    if (isAuthenticated) {
      refreshPendingCount();
    } else {
      setPendingCount(0);
    }
  }, [isAuthenticated]);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  return (
    <SyncContext.Provider value={{ pendingCount, isOnline, refreshPendingCount }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}
