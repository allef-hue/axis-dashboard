import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage: string | null;
  lastSyncTime: Date | null;
}

interface SyncContextType {
  status: SyncStatus;
  setSyncing: () => void;
  setSuccess: () => void;
  setError: (message: string) => void;
  setIdle: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>({
    state: 'idle',
    errorMessage: null,
    lastSyncTime: null,
  });

  const setSyncing = useCallback(() => {
    setStatus({
      state: 'syncing',
      errorMessage: null,
      lastSyncTime: null,
    });
  }, []);

  const setSuccess = useCallback(() => {
    setStatus({
      state: 'success',
      errorMessage: null,
      lastSyncTime: new Date(),
    });

    // Auto-dismiss after 2 seconds
    const timer = setTimeout(() => {
      setStatus((prev) => ({
        ...prev,
        state: 'idle',
      }));
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const setError = useCallback((message: string) => {
    setStatus({
      state: 'error',
      errorMessage: message,
      lastSyncTime: null,
    });
  }, []);

  const setIdle = useCallback(() => {
    setStatus({
      state: 'idle',
      errorMessage: null,
      lastSyncTime: null,
    });
  }, []);

  return (
    <SyncContext.Provider value={{ status, setSyncing, setSuccess, setError, setIdle }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncStatus() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within SyncProvider');
  }
  return context;
}

// Global callback reference for db.ts
let globalSyncCallbacks: SyncContextType | null = null;

export function setSyncCallbacks(callbacks: SyncContextType) {
  globalSyncCallbacks = callbacks;
}

export function getSyncCallbacks() {
  return globalSyncCallbacks;
}
