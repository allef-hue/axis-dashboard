import { useSyncStatus } from '../context/SyncContext';
import { useCallback } from 'react';

export default function SyncIndicator() {
  const { status } = useSyncStatus();

  const handleRetry = useCallback(() => {
    // User can click error icon to manually retry
    // Or they can just modify and save again (safer approach)
  }, []);

  if (status.state === 'idle') {
    return null;
  }

  return (
    <div className="sync-indicator" title={getTooltipText(status)}>
      {status.state === 'syncing' && (
        <svg
          className="sync-icon sync-icon--syncing"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M1 4v6h6M23 20v-6h-6" />
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64M3.51 15A9 9 0 0 0 18.36 18.36" />
        </svg>
      )}

      {status.state === 'success' && (
        <svg
          className="sync-icon sync-icon--success"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}

      {status.state === 'error' && (
        <svg
          className="sync-icon sync-icon--error"
          viewBox="0 0 24 24"
          fill="currentColor"
          onClick={handleRetry}
        >
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" />
          <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}

      {status.state === 'error' && (
        <div className="sync-tooltip">
          <div className="sync-tooltip-title">Erro na sincronização</div>
          <div className="sync-tooltip-message">{status.errorMessage}</div>
          <div className="sync-tooltip-hint">Clique para retentar ou salve novamente</div>
        </div>
      )}
    </div>
  );
}

function getTooltipText(status: { state: string; errorMessage: string | null; lastSyncTime: Date | null }): string {
  if (status.state === 'syncing') {
    return 'Sincronizando...';
  }
  if (status.state === 'success') {
    if (status.lastSyncTime) {
      return `Sincronizado em ${formatTime(status.lastSyncTime)}`;
    }
    return 'Sincronizado com sucesso!';
  }
  if (status.state === 'error') {
    return `Erro: ${status.errorMessage}`;
  }
  return '';
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'agora';
  if (minutes < 60) return `${minutes}m atrás`;
  if (hours < 24) return `${hours}h atrás`;
  return date.toLocaleDateString('pt-BR');
}
