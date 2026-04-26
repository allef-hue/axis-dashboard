/**
 * AuditHistoryModal.tsx — Modal para visualizar histórico de alterações
 * Mostra quem alterou o quê, quando e qual era o valor anterior/novo
 */

import { useState, useEffect } from 'react';
import { getAuditHistory, AuditEntry } from '../db';
import { formatTime, formatDate } from '../utils';
import { supabase } from '../supabase';

interface AuditHistoryModalProps {
  personId: string;
  personName: string;
  onClose: () => void;
  startDate?: string;
  endDate?: string;
}

export default function AuditHistoryModal({
  personId,
  personName,
  onClose,
  startDate,
  endDate,
}: AuditHistoryModalProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEntryNotification, setNewEntryNotification] = useState(false);

  useEffect(() => {
    loadAuditHistory();
  }, [personId, startDate, endDate]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel(`audit_${personId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_log',
          filter: `record_id=like.%${personId}%`,
        },
        (payload) => {
          // Novo registro de auditoria chegou em tempo real
          const newEntry = payload.new as AuditEntry;
          setEntries((prev) => [newEntry, ...prev]);

          // Mostrar notificação
          setNewEntryNotification(true);
          setTimeout(() => setNewEntryNotification(false), 4000);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [personId]);

  async function loadAuditHistory() {
    setLoading(true);
    const data = await getAuditHistory(personId, startDate, endDate);
    setEntries(data);
    setLoading(false);
  }

  function getOperationIcon(operation: string): string {
    switch (operation) {
      case 'INSERT': return '✨';
      case 'UPDATE': return '✏️';
      case 'DELETE': return '🗑️';
      default: return '•';
    }
  }

  function getOperationLabel(operation: string): string {
    switch (operation) {
      case 'INSERT': return 'Criado';
      case 'UPDATE': return 'Alterado';
      case 'DELETE': return 'Removido';
      default: return operation;
    }
  }

  function getChangedFields(oldValues?: Record<string, unknown>, newValues?: Record<string, unknown>) {
    if (!oldValues || !newValues) return [];

    const changes: Array<{ field: string; before: unknown; after: unknown }> = [];

    // Verificar campos que mudaram
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
    allKeys.forEach((key) => {
      if (key === 'id' || key === 'updated_at') return; // Pula campos internos
      const before = oldValues[key];
      const after = newValues[key];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        changes.push({ field: key, before, after });
      }
    });

    return changes;
  }

  function formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content audit-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>📋 Histórico de Alterações</h2>
          <p className="modal-subtitle">{personName}</p>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Real-time Notification */}
        {newEntryNotification && (
          <div className="audit-notification">
            ✨ Nova alteração detectada!
          </div>
        )}

        {/* Content */}
        <div className="modal-body audit-history">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Carregando histórico...
            </div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Nenhuma alteração registrada para este período
            </div>
          ) : (
            <div className="audit-entries">
              {entries.map((entry) => {
                const changes = getChangedFields(entry.old_values, entry.new_values);
                return (
                  <div key={entry.id} className="audit-entry">
                    {/* Timeline bullet */}
                    <div className="audit-bullet">
                      <span className="audit-icon">{getOperationIcon(entry.operation)}</span>
                    </div>

                    {/* Content */}
                    <div className="audit-content">
                      {/* Header da entrada */}
                      <div className="audit-header">
                        <div className="audit-info">
                          <span className="audit-date">{formatDate(entry.record_id.split('|')[0])}</span>
                          <span className="audit-time">{formatTime(entry.changed_at)}</span>
                          <span className={`audit-operation audit-${entry.operation.toLowerCase()}`}>
                            {getOperationLabel(entry.operation)}
                          </span>
                        </div>
                        {entry.user_email && (
                          <span className="audit-user">👤 {entry.user_email}</span>
                        )}
                      </div>

                      {/* Mudanças de campos */}
                      {changes.length > 0 && (
                        <div className="audit-changes">
                          {changes.map((change) => (
                            <div key={change.field} className="audit-change">
                              <span className="change-field">{change.field}</span>
                              <span className="change-arrow">→</span>
                              <span className="change-value">
                                <span className="value-before">{formatValue(change.before)}</span>
                                <span className="value-sep">⟹</span>
                                <span className="value-after">{formatValue(change.after)}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Se for INSERT, mostra valores iniciais */}
                      {entry.operation === 'INSERT' && entry.new_values && (
                        <div className="audit-initial">
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Valores iniciais: {JSON.stringify(entry.new_values).substring(0, 60)}...
                          </span>
                        </div>
                      )}

                      {/* Se for DELETE, mostra o que foi removido */}
                      {entry.operation === 'DELETE' && entry.old_values && (
                        <div className="audit-deleted">
                          <span style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>
                            Removido: {JSON.stringify(entry.old_values).substring(0, 60)}...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Fechar
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Total: {entries.length} alteração{entries.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <style>{`
        .audit-notification {
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.95), rgba(56, 142, 60, 0.95));
          color: white;
          padding: 0.75rem 1rem;
          text-align: center;
          font-weight: 600;
          font-size: 0.9rem;
          border-bottom: 2px solid var(--success);
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .audit-modal {
          max-width: 700px;
          max-height: 80vh;
        }

        .audit-history {
          max-height: 60vh;
          overflow-y: auto;
          padding: 0;
        }

        .audit-entries {
          position: relative;
          padding: 1.5rem 0;
        }

        .audit-entries::before {
          content: '';
          position: absolute;
          left: 15px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(to bottom, var(--success), var(--warning), var(--danger));
        }

        .audit-entry {
          display: flex;
          gap: 1rem;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border);
          position: relative;
        }

        .audit-entry:last-child {
          border-bottom: none;
        }

        .audit-bullet {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--card-bg);
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          z-index: 1;
        }

        .audit-content {
          flex: 1;
          min-width: 0;
        }

        .audit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .audit-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.9rem;
        }

        .audit-date {
          font-weight: 600;
          color: var(--text);
        }

        .audit-time {
          color: var(--text-secondary);
          font-size: 0.85rem;
        }

        .audit-operation {
          padding: 0.25rem 0.6rem;
          border-radius: 3px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .audit-insert {
          background: rgba(76, 175, 80, 0.2);
          color: var(--success);
        }

        .audit-update {
          background: rgba(255, 193, 7, 0.2);
          color: var(--warning);
        }

        .audit-delete {
          background: rgba(244, 67, 54, 0.2);
          color: var(--danger);
        }

        .audit-user {
          font-size: 0.85rem;
          color: var(--text-secondary);
          background: var(--bg);
          padding: 0.25rem 0.6rem;
          border-radius: 3px;
        }

        .audit-changes {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.5rem;
          padding: 0.75rem;
          background: var(--bg);
          border-radius: 4px;
        }

        .audit-change {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          flex-wrap: wrap;
        }

        .change-field {
          font-weight: 600;
          color: var(--text);
          min-width: fit-content;
        }

        .change-arrow {
          color: var(--text-secondary);
          opacity: 0.5;
        }

        .change-value {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          flex: 1;
        }

        .value-before {
          color: var(--danger);
          opacity: 0.7;
          text-decoration: line-through;
        }

        .value-sep {
          color: var(--text-secondary);
          opacity: 0.3;
          font-size: 0.75rem;
        }

        .value-after {
          color: var(--success);
          font-weight: 600;
        }

        .audit-initial {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: rgba(76, 175, 80, 0.1);
          border-left: 2px solid var(--success);
        }

        .audit-deleted {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: rgba(244, 67, 54, 0.1);
          border-left: 2px solid var(--danger);
        }

        .modal-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border);
        }
      `}</style>
    </div>
  );
}
