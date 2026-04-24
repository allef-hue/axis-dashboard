import { SDRData, CloserData, SDRConfig, CloserConfig, Status } from './types';

export function getSDRPercent(
  data: SDRData,
  metas: SDRConfig['metas']
): number {
  const leadsP = metas.leads > 0 ? data.leads / metas.leads : 0;
  const agendP = metas.agendamentos > 0 ? data.agendamentos / metas.agendamentos : 0;
  const acontP = metas.acontecidas > 0 ? data.acontecidas / metas.acontecidas : 0;
  const recP = metas.receita > 0 ? data.receita / metas.receita : 0;
  const avg = (leadsP + agendP + acontP + recP) / 4;
  return Math.min(Math.round(avg * 100), 100);
}

export function getCloserPercent(
  data: CloserData,
  metas: CloserConfig['metas']
): number {
  const reunP = metas.reunioes > 0 ? data.reunioes / metas.reunioes : 0;
  const contP = metas.contratos > 0 ? data.contratos / metas.contratos : 0;
  const recP = metas.receita > 0 ? data.receita / metas.receita : 0;
  const avg = (reunP + contP + recP) / 3;
  return Math.min(Math.round(avg * 100), 100);
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

export function formatCurrency(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', {
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
