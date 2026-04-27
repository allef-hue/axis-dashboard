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
 * Calcula a data da Páscoa para um ano específico (Algoritmo de Computus)
 * @param year Ano
 */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Retorna feriados nacionais, estaduais (CE) e municipais (Fortaleza) para um ano.
 * @param year Ano
 */
export function getFortalezaHolidays(year: number): Set<string> {
  const holidays = new Set<string>();

  // === FERIADOS NACIONAIS ===
  holidays.add(`${year}-01-01`); // Ano Novo
  holidays.add(`${year}-04-21`); // Tiradentes
  holidays.add(`${year}-05-01`); // Dia do Trabalho
  holidays.add(`${year}-09-07`); // Independência
  holidays.add(`${year}-10-12`); // Nossa Senhora Aparecida
  holidays.add(`${year}-11-02`); // Finados
  holidays.add(`${year}-11-15`); // Proclamação da República
  holidays.add(`${year}-11-20`); // Consciência Negra
  holidays.add(`${year}-12-25`); // Natal

  // === FERIADOS ESTADUAIS (CEARÁ) ===
  holidays.add(`${year}-03-19`); // São José (padroeiro do estado)

  // === FERIADOS MUNICIPAIS (FORTALEZA) ===
  holidays.add(`${year}-08-15`); // Nossa Senhora das Dores (padroeira de Fortaleza)

  // === FERIADOS MÓVEIS (baseados na Páscoa) ===
  const easter = getEasterDate(year);

  // Sexta-feira Santa (2 dias antes da Páscoa)
  const goodFriday = new Date(easter);
  goodFriday.setDate(goodFriday.getDate() - 2);
  const goodFridayStr = `${goodFriday.getFullYear()}-${String(goodFriday.getMonth() + 1).padStart(2, '0')}-${String(goodFriday.getDate()).padStart(2, '0')}`;
  holidays.add(goodFridayStr);

  // Corpus Christi (39 dias depois da Páscoa)
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(corpusChristi.getDate() + 39);
  const corpusChristiStr = `${corpusChristi.getFullYear()}-${String(corpusChristi.getMonth() + 1).padStart(2, '0')}-${String(corpusChristi.getDate()).padStart(2, '0')}`;
  holidays.add(corpusChristiStr);

  return holidays;
}

/**
 * Calcula o total de dias úteis em um mês específico (Fortaleza/CE).
 * Exclui sábados, domingos e feriados federais.
 * @param year Ano
 * @param month Mês (1-12)
 */
export function getWorkingDaysInMonth(year: number, month: number): number {
  const holidays = getFortalezaHolidays(year);
  let count = 0;
  const lastDay = new Date(year, month, 0);

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Contar se for dia útil (seg-sex) e não for feriado
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
      count++;
    }
  }
  return count;
}

/**
 * Calcula quantos dias úteis já se passaram de um mês até uma data específica.
 * @param year Ano
 * @param month Mês (1-12)
 * @param day Dia do mês
 */
export function getWorkingDaysPassed(year: number, month: number, day: number): number {
  const holidays = getFortalezaHolidays(year);
  let count = 0;

  for (let d = 1; d <= day; d++) {
    const date = new Date(year, month - 1, d);
    const dayOfWeek = date.getDay();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
      count++;
    }
  }
  return count;
}

/**
 * Calcula o total de dias úteis entre duas datas (inclusivas).
 * Exclui sábados, domingos e feriados de Fortaleza/CE.
 * @param startDate Data inicial (YYYY-MM-DD)
 * @param endDate Data final (YYYY-MM-DD)
 */
export function getWorkingDaysBetween(startDate: string, endDate: string): number {
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

  const holidays = getFortalezaHolidays(startYear);
  let count = 0;

  const current = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);

  while (current <= end) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    const day = current.getDate();
    const dayOfWeek = current.getDay();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Contar feriados para outros anos se necessário
    let yearHolidays = holidays;
    if (year !== startYear) {
      yearHolidays = getFortalezaHolidays(year);
    }

    // Contar se for dia útil (seg-sex) e não for feriado
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !yearHolidays.has(dateStr)) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Limita um número a no máximo 3 casas decimais.
 * @param value Número a ser formatado
 * @param decimals Número de casas decimais (padrão: 3)
 */
export function limitDecimals(value: number, decimals: number = 3): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Calcula a meta diária ideal baseada na meta total do mês e dias úteis.
 * @param metaTotalMes Meta total do mês
 * @param workingDaysInMonth Total de dias úteis do mês
 */
export function getMetaDiariaIdeal(metaTotalMes: number, workingDaysInMonth: number): number {
  if (workingDaysInMonth === 0) return 0;
  return limitDecimals(metaTotalMes / workingDaysInMonth);
}

/**
 * Calcula o pace esperado (meta até hoje) baseado em dias úteis passados.
 * @param metaDiariaIdeal Meta diária ideal
 * @param workingDaysPassed Dias úteis já passados no mês
 */
export function getPaceEsperado(metaDiariaIdeal: number, workingDaysPassed: number): number {
  return limitDecimals(metaDiariaIdeal * workingDaysPassed);
}

/**
 * Calcula a saúde do pace (% de atingimento da meta esperada).
 * @param realizadoAtual O que foi realizado
 * @param paceEsperado Meta esperada até agora
 */
export function getSaudedoPace(realizadoAtual: number, paceEsperado: number): number {
  if (paceEsperado === 0) return 0;
  return limitDecimals((realizadoAtual / paceEsperado) * 100);
}

/**
 * Calcula o pace baseado em um intervalo de datas (filtro).
 * Retorna: { paceEsperado, saude, diasUteis }
 * @param metaTotalMes Meta total do mês
 * @param startDate Data inicial do filtro (YYYY-MM-DD)
 * @param endDate Data final do filtro (YYYY-MM-DD)
 * @param realizadoAtual Valor realizado até agora
 */
export function calculatePaceForDateRange(
  metaTotalMes: number,
  startDate: string,
  endDate: string,
  realizadoAtual: number
): { paceEsperado: number; saude: number; diasUteis: number } {
  const diasUteis = getWorkingDaysBetween(startDate, endDate);

  if (diasUteis === 0) {
    return { paceEsperado: 0, saude: 0, diasUteis: 0 };
  }

  // Meta diária ideal = meta total / dias úteis do mês
  const [year, month] = startDate.split('-').map(Number);
  const diasUteisMes = getWorkingDaysInMonth(year, month);
  const metaDiariaIdeal = getMetaDiariaIdeal(metaTotalMes, diasUteisMes);

  // Pace esperado = meta diária * dias úteis do filtro
  const paceEsperado = getPaceEsperado(metaDiariaIdeal, diasUteis);

  // Saúde do pace
  const saude = getSaudedoPace(realizadoAtual, paceEsperado);

  return { paceEsperado, saude, diasUteis };
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
