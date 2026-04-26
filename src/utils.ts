import { SDRData, CloserData, SDRConfig, CloserConfig, Status } from './types';
import { supabase } from './supabase';

/** Safe ratio: returns 0 for NaN, Infinity, or undefined */
function safeRatio(value: number | undefined, meta: number | undefined): number {
  const v = value ?? 0;
  const m = meta ?? 0;
  if (!m || !isFinite(m)) return 0;
  const r = v / m;
  return isFinite(r) && !isNaN(r) ? r : 0;
}

export function getSDRPercent(
  data: SDRData,
  metas: SDRConfig['metas']
): number {
  const leadsP = safeRatio(data.leads, metas.leads);
  const agendP = safeRatio(data.agendamentos, metas.agendamentos);
  const acontP = safeRatio(data.acontecidas, metas.acontecidas);
  const recP = safeRatio(data.receita, metas.receita);
  const avg = (leadsP + agendP + acontP + recP) / 4;
  const result = Math.min(Math.round(avg * 100), 100);
  return isNaN(result) ? 0 : result;
}

export function getCloserPercent(
  data: CloserData,
  metas: CloserConfig['metas']
): number {
  const reunP = safeRatio(data.reunioes, metas.reunioes);
  const contP = safeRatio(data.contratos, metas.contratos);
  const recP = safeRatio(data.receita, metas.receita);
  const avg = (reunP + contP + recP) / 3;
  const result = Math.min(Math.round(avg * 100), 100);
  return isNaN(result) ? 0 : result;
}

export function getSDRStatus(
  data: SDRData,
  metas: SDRConfig['metas']
): Status {
  const pct = getSDRPercent(data, metas);
  if (pct >= 80) return 'no_pace';
  if (pct >= 50) return 'atencao';
  return 'critico';
}

export function getCloserStatus(
  data: CloserData,
  metas: CloserConfig['metas']
): Status {
  const pct = getCloserPercent(data, metas);
  if (pct >= 80) return 'no_pace';
  if (pct >= 50) return 'atencao';
  return 'critico';
}

export function formatCurrency(v: number | undefined | null): string {
  const value = v ?? 0;
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function getStatusColor(status: Status): string {
  switch (status) {
    case 'no_pace': return 'var(--success)';
    case 'atencao': return 'var(--warning)';
    case 'critico': return 'var(--danger)';
  }
}

export function getPercentColor(pct: number): string {
  if (pct >= 80) return 'var(--success)';
  if (pct >= 50) return 'var(--warning)';
  return 'var(--danger)';
}

export function getDayOfWeekLabel(dateStr: string): string {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const d = new Date(dateStr + 'T12:00:00');
  return days[d.getDay()];
}

/** Count working days (Mon-Fri) between start and end dates inclusive */
export function countWorkingDays(start: string, end: string): number {
  let count = 0;
  const current = new Date(start + 'T12:00:00');
  const endDate = new Date(end + 'T12:00:00');
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++; // 0=Sun, 6=Sat
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Valida se o domínio de email é autorizado
 * @param email E-mail do usuário
 * @returns true se @grupovorp.com ou @grupovorp.com.br
 */
export function isAuthorizedDomain(email: string): boolean {
  return email.endsWith('@grupovorp.com') || email.endsWith('@grupovorp.com.br');
}

/**
 * Cria uma requisição de acesso no Supabase
 * @param email Email do usuário solicitando acesso
 * @param fullName Nome completo do usuário
 */
export async function createAccessRequest(email: string, fullName: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase não configurado' };
  }

  try {
    const { error } = await supabase
      .from('access_requests')
      .insert([{ email, full_name: fullName, status: 'pending' }]);

    if (error) {
      if (error.message.includes('duplicate')) {
        return { success: false, error: 'Este e-mail já foi solicitado. Aguarde a análise.' };
      }
      return { success: false, error: error.message };
    }

    // Chama a Edge Function para enviar email
    try {
      await supabase.functions.invoke('send_access_request_email', {
        body: { email, fullName },
      });
    } catch (fnError) {
      console.error('[Access Request] Erro ao invocar Edge Function:', fnError);
      // A requisição foi criada, mas o email pode não ter sido enviado
      // Continua mesmo assim para não bloquear o usuário
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
    return { success: false, error: errorMsg };
  }
}

/**
 * Verifica o status de acesso de um usuário
 * @param email Email do usuário
 * @returns 'approved' | 'rejected' | 'pending' | null
 */
export async function checkAccessStatus(email: string): Promise<'approved' | 'rejected' | 'pending' | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('access_requests')
      .select('status')
      .eq('email', email)
      .single();

    if (error) return null;
    return data?.status as 'approved' | 'rejected' | 'pending';
  } catch (err) {
    console.error('[Access Status] Erro:', err);
    return null;
  }
}
