/**
 * ApprovalPage.tsx — Página de aprovação/rejeição de requisições de acesso
 * Acessada via links nos e-mails enviados para Allef
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

interface ApprovalPageProps {
  action: 'approve' | 'reject';
  token: string;
  onComplete?: () => void;
}

interface ProcessingState {
  loading: boolean;
  message: string;
  success: boolean;
  email?: string;
}

export default function ApprovalPage({ action, token, onComplete }: ApprovalPageProps) {
  const [state, setState] = useState<ProcessingState>({
    loading: true,
    message: 'Processando...',
    success: false,
  });

  useEffect(() => {
    processApproval();
  }, []);

  async function processApproval() {
    if (!supabase) {
      setState({
        loading: false,
        message: 'Erro: Supabase não configurado',
        success: false,
      });
      return;
    }

    try {
      // Chama a Edge Function para processar a decisão
      const { data, error } = await supabase.functions.invoke('process_access_decision', {
        body: { token, action },
      });

      if (error) {
        setState({
          loading: false,
          message: `Erro ao processar solicitação: ${error.message || 'Erro desconhecido'}`,
          success: false,
        });
        return;
      }

      if (action === 'approve') {
        setState({
          loading: false,
          message: data?.message || 'Acesso aprovado! O usuário receberá instruções por e-mail.',
          success: true,
          email: data?.email,
        });
      } else {
        setState({
          loading: false,
          message: data?.message || 'Acesso rejeitado.',
          success: true,
          email: data?.email,
        });
      }

      // Chama callback após completar
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setState({
        loading: false,
        message: `Erro ao processar: ${errorMsg}`,
        success: false,
      });
    }
  }

  return (
    <div className="login-overlay">
      <div className="login-card" style={{ textAlign: 'center' }}>
        {/* Logo */}
        <div className="login-logo">
          <span className="login-logo-text">AXIS</span>
          <span className="login-logo-sub">GRUPO VORP · PACE COMERCIAL</span>
        </div>

        {/* Status */}
        <div style={{ marginTop: '2rem' }}>
          {state.loading ? (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
              <h2 style={{ marginBottom: '0.5rem' }}>Processando solicitação...</h2>
            </>
          ) : state.success && action === 'approve' ? (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ marginBottom: '0.5rem' }}>Acesso aprovado!</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                {state.email && `${state.email} receberá as instruções por e-mail.`}
              </p>
            </>
          ) : state.success && action === 'reject' ? (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
              <h2 style={{ marginBottom: '0.5rem' }}>Acesso rejeitado</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                {state.email && `${state.email} foi notificado da rejeição.`}
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
              <h2 style={{ marginBottom: '0.5rem' }}>Erro ao processar</h2>
            </>
          )}

          {/* Message */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            background: state.success ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
            color: state.success ? 'var(--success)' : 'var(--danger)',
            fontSize: '0.9rem',
          }}>
            {state.message}
          </div>

          {/* Redirect message */}
          {!state.loading && (
            <p style={{
              marginTop: '2rem',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
            }}>
              Você será redirecionado em breve...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
