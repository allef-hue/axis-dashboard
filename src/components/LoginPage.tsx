/**
 * LoginPage.tsx — Tela de autenticação do AXIS
 * Login e cadastro via Supabase Auth (email + senha)
 */

import { useState } from 'react';
import { supabase } from '../supabase';
import { isAuthorizedDomain, createAccessRequest, checkAccessStatus } from '../utils';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError('');

    // Verifica status de acesso antes de tentar fazer login
    const accessStatus = await checkAccessStatus(email);
    if (accessStatus === 'rejected') {
      setLoading(false);
      setError('Acesso não autorizado. Sua requisição foi rejeitada.');
      return;
    }
    if (accessStatus === 'pending') {
      setLoading(false);
      setError('Sua requisição ainda está em análise. Aguarde a aprovação de um administrador.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setError('E-mail ou senha incorretos. Tente novamente.');
    } else {
      onLogin();
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError('');

    // Verifica se o domínio está autorizado
    if (isAuthorizedDomain(email)) {
      // Domínio autorizado → signup normal
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      setLoading(false);

      if (error) {
        if (error.message.includes('already registered')) {
          setError('Este e-mail já está cadastrado. Faça login.');
        } else {
          setError(error.message);
        }
      } else {
        setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro e depois faça login.');
        setMode('login');
      }
    } else {
      // Domínio não autorizado → criar requisição de acesso
      const result = await createAccessRequest(email, name);
      setLoading(false);

      if (result.success) {
        setSuccess('Requisição enviada! Você receberá um e-mail assim que sua conta for aprovada.');
        // Limpa o formulário
        setEmail('');
        setPassword('');
        setName('');
        // Volta para login após um tempo
        setTimeout(() => setMode('login'), 3000);
      } else {
        setError(result.error || 'Erro ao processar sua requisição. Tente novamente.');
      }
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Link de recuperação enviado para seu e-mail!');
    }
  }

  function switchMode(newMode: 'login' | 'signup' | 'forgot') {
    setMode(newMode);
    setError('');
    setSuccess('');
  }

  return (
    <div className="login-overlay">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <span className="login-logo-text">AXIS</span>
          <span className="login-logo-sub">GRUPO VORP · PACE COMERCIAL</span>
        </div>

        {/* Title */}
        <div className="login-title">
          {mode === 'login' && <><h1>Bem-vindo de volta 👋</h1><p>Faça login na sua conta para continuar</p></>}
          {mode === 'signup' && <><h1>Criar conta</h1><p>Cadastre-se com seu e-mail corporativo</p></>}
          {mode === 'forgot' && <><h1>Recuperar senha</h1><p>Enviaremos um link para seu e-mail</p></>}
        </div>

        {/* Feedback messages */}
        {error && <div className="login-error">{error}</div>}
        {success && <div className="login-success">{success}</div>}

        {/* Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="login-field">
              <input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="login-field login-field-password">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button type="button" className="login-eye" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="login-forgot-link">
              <button type="button" onClick={() => switchMode('forgot')}>Esqueceu a senha?</button>
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="login-form">
            <div className="login-field">
              <input
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="login-field">
              <input
                type="email"
                placeholder="Seu e-mail corporativo"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="login-field login-field-password">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Crie uma senha (mín. 6 caracteres)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button type="button" className="login-eye" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Criar conta'}
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="login-form">
            <div className="login-field">
              <input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>
        )}

        {/* Footer links */}
        <div className="login-footer">
          {mode === 'login' && (
            <span>Ainda não tem conta? <button onClick={() => switchMode('signup')}>Cadastre-se</button></span>
          )}
          {(mode === 'signup' || mode === 'forgot') && (
            <span>Já tem conta? <button onClick={() => switchMode('login')}>Entrar</button></span>
          )}
        </div>
      </div>
    </div>
  );
}
