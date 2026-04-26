import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import LoginPage from './components/LoginPage';
import ApprovalPage from './components/ApprovalPage';
import { supabase, isSupabaseConfigured } from './supabase';

function Root() {
  // null = carregando, false = não logado, true = logado
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Detecta se está na rota de aprovação/rejeição
  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const isApprovalRoute = pathname === '/approve' || pathname === '/reject';
  const approvalAction = pathname === '/approve' ? 'approve' : pathname === '/reject' ? 'reject' : null;
  const approvalToken = searchParams.get('token');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // Sem Supabase configurado → não exige login
      setAuthed(true);
      return;
    }

    // Se está na rota de aprovação, não verifica autenticação ainda
    if (isApprovalRoute) {
      return;
    }

    // Verifica sessão atual
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
    });

    // Escuta mudanças de sessão (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });

    return () => subscription.unsubscribe();
  }, [isApprovalRoute]);

  // Se está na rota de aprovação, mostra ApprovalPage
  if (isApprovalRoute && approvalAction && approvalToken) {
    return (
      <ApprovalPage
        action={approvalAction as 'approve' | 'reject'}
        token={approvalToken}
        onComplete={() => {
          // Redireciona para login após completar
          window.location.href = '/';
        }}
      />
    );
  }

  // Enquanto verifica a sessão, mostra tela preta (evita flash)
  if (authed === null) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'var(--bg, #0f0f0f)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: '#ff6b1a', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '0.1em' }}>
          AXIS
        </span>
      </div>
    );
  }

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />;
  }

  return <App />;
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
