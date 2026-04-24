import { DayData, SDRData, CloserData } from './types';
import { SDR_CONFIGS, CLOSER_CONFIGS } from './config';

const KEY_PREFIX = 'axis_day_';

export function getStorageKey(date: string): string {
  return `${KEY_PREFIX}${date}`;
}

export function getDayData(date: string): DayData | null {
  try {
    const raw = localStorage.getItem(getStorageKey(date));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DayData;
    // Migrate old SDR data that may be missing new fields
    for (const id of Object.keys(parsed.sdrs)) {
      if (parsed.sdrs[id].receita === undefined) {
        parsed.sdrs[id].receita = 0;
      }
      if (parsed.sdrs[id].ligacoes_whatsapp === undefined) {
        parsed.sdrs[id].ligacoes_whatsapp = 0;
      }
      if (parsed.sdrs[id].tempo_em_linha === undefined) {
        parsed.sdrs[id].tempo_em_linha = 0;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveDayData(date: string, data: DayData): void {
  try {
    localStorage.setItem(getStorageKey(date), JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save day data:', e);
  }
}

export function deleteDayData(date: string): void {
  try {
    localStorage.removeItem(getStorageKey(date));
  } catch (e) {
    console.error('Failed to delete day data:', e);
  }
}

// ─── Date range helpers ────────────────────────────────────────

/** Returns every date string from start to end (inclusive). */
export function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + 'T12:00:00');
  const endDate = new Date(end + 'T12:00:00');
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Week: Terça a Segunda (Tue → Mon)

export function getWeekDates(referenceDate: string): string[] {
  const date = new Date(referenceDate + 'T12:00:00');
  const dayOfWeek = date.getDay(); // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat

  // Days since last Tuesday:
  // Tue(2)→0, Wed(3)→1, Thu(4)→2, Fri(5)→3, Sat(6)→4, Sun(0)→5, Mon(1)→6
  let daysFromTuesday: number;
  if (dayOfWeek === 0) daysFromTuesday = 5;      // Sunday
  else if (dayOfWeek === 1) daysFromTuesday = 6;  // Monday
  else daysFromTuesday = dayOfWeek - 2;            // Tue=0, Wed=1, ...

  const tuesday = new Date(date);
  tuesday.setDate(date.getDate() - daysFromTuesday);

  const dates: string[] = [];
  for (let i = 0; i <= 6; i++) {
    const d = new Date(tuesday);
    d.setDate(tuesday.getDate() + i);
    const str = d.toISOString().split('T')[0];
    if (str <= referenceDate) dates.push(str);
  }
  return dates;
}

export function getMonthDates(referenceDate: string): string[] {
  const [year, month] = referenceDate.split('-');
  const firstDay = `${year}-${month}-01`;
  const dates: string[] = [];
  const current = new Date(firstDay + 'T12:00:00');
  while (true) {
    const str = current.toISOString().split('T')[0];
    if (str > referenceDate) break;
    dates.push(str);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// ─── Period aggregation ────────────────────────────────────────

export interface AggregatedSDREntry {
  leads: number;
  agendamentos: number;
  acontecidas: number;
  receita: number;
  ligacoes_whatsapp: number;
  tempo_em_linha: number;
  daysWithData: number;
}

export interface AggregatedCloserEntry {
  reunioes: number;
  contratos: number;
  receita: number;
  daysWithData: number;
}

export interface AggregatedData {
  sdrs: Record<string, AggregatedSDREntry>;
  closers: Record<string, AggregatedCloserEntry>;
  daysTotal: number;
  daysWithAnyData: number;
}

export function getAggregatedData(dates: string[]): AggregatedData {
  const sdrs: Record<string, AggregatedSDREntry> = {};
  const closers: Record<string, AggregatedCloserEntry> = {};
  let daysWithAnyData = 0;

  for (const date of dates) {
    const dayData = getDayData(date);
    if (!dayData) continue;

    const hasSomeData =
      Object.keys(dayData.sdrs).length > 0 ||
      Object.keys(dayData.closers).length > 0;
    if (hasSomeData) daysWithAnyData++;

    for (const [id, sdr] of Object.entries(dayData.sdrs)) {
      if (!sdrs[id]) sdrs[id] = { leads: 0, agendamentos: 0, acontecidas: 0, receita: 0, ligacoes_whatsapp: 0, tempo_em_linha: 0, daysWithData: 0 };
      sdrs[id].leads += sdr.leads;
      sdrs[id].agendamentos += sdr.agendamentos;
      sdrs[id].acontecidas += sdr.acontecidas;
      sdrs[id].receita += sdr.receita ?? 0;
      sdrs[id].ligacoes_whatsapp += sdr.ligacoes_whatsapp ?? 0;
      sdrs[id].tempo_em_linha += sdr.tempo_em_linha ?? 0;
      sdrs[id].daysWithData++;
    }

    for (const [id, closer] of Object.entries(dayData.closers)) {
      if (!closers[id]) closers[id] = { reunioes: 0, contratos: 0, receita: 0, daysWithData: 0 };
      closers[id].reunioes += closer.reunioes;
      closers[id].contratos += closer.contratos;
      closers[id].receita += closer.receita;
      closers[id].daysWithData++;
    }
  }

  return { sdrs, closers, daysTotal: dates.length, daysWithAnyData };
}

// ─── History ───────────────────────────────────────────────────

export type SDRHistoryEntry = {
  date: string;
  leads: number;
  agendamentos: number;
  acontecidas: number;
  receita: number;
  ligacoes_whatsapp: number;
  tempo_em_linha: number;
};

export type CloserHistoryEntry = {
  date: string;
  reunioes: number;
  contratos: number;
  receita: number;
};

function getDatesForLastNDays(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export function getHistory(personId: string, type: 'sdr', days: number): SDRHistoryEntry[];
export function getHistory(personId: string, type: 'closer', days: number): CloserHistoryEntry[];
export function getHistory(
  personId: string,
  type: 'sdr' | 'closer',
  days: number
): SDRHistoryEntry[] | CloserHistoryEntry[] {
  const dates = getDatesForLastNDays(days);

  if (type === 'sdr') {
    return dates.map((dateStr) => {
      const dayData = getDayData(dateStr);
      const sdrData = dayData?.sdrs[personId];
      return {
        date: dateStr,
        leads: sdrData?.leads ?? 0,
        agendamentos: sdrData?.agendamentos ?? 0,
        acontecidas: sdrData?.acontecidas ?? 0,
        receita: sdrData?.receita ?? 0,
        ligacoes_whatsapp: sdrData?.ligacoes_whatsapp ?? 0,
        tempo_em_linha: sdrData?.tempo_em_linha ?? 0,
      } as SDRHistoryEntry;
    });
  }

  return dates.map((dateStr) => {
    const dayData = getDayData(dateStr);
    const closerData = dayData?.closers[personId];
    return {
      date: dateStr,
      reunioes: closerData?.reunioes ?? 0,
      contratos: closerData?.contratos ?? 0,
      receita: closerData?.receita ?? 0,
    } as CloserHistoryEntry;
  });
}

export function getLastNDates(n: number): string[] {
  return getDatesForLastNDays(n);
}

export function getEmptySDRData(id: string, nome: string): SDRData {
  return {
    id, nome,
    leads: 0, agendamentos: 0, acontecidas: 0, receita: 0,
    ligacoes_whatsapp: 0, tempo_em_linha: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function getEmptyCloserData(id: string, nome: string): CloserData {
  return {
    id, nome,
    reunioes: 0, contratos: 0, receita: 0,
    updatedAt: new Date().toISOString(),
  };
}

// ─── CSV Import ────────────────────────────────────────────────
// Format: data,tipo,pessoa_id,v1,v2,v3[,v4]
// SDR:    v1=leads, v2=agendamentos, v3=acontecidas, v4=receita_originada
// Closer: v1=reunioes, v2=contratos, v3=receita

export interface ImportRow {
  date: string;
  type: 'sdr' | 'closer';
  personId: string;
  values: number[];
}

export interface ImportPreview {
  rows: ImportRow[];
  errors: string[];
  datesAffected: string[];
  personsAffected: string[];
}

export function parseImportCSV(text: string): ImportPreview {
  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  const errors: string[] = [];
  const rows: ImportRow[] = [];

  if (lines.length === 0) {
    errors.push('Arquivo vazio.');
    return { rows, errors, datesAffected: [], personsAffected: [] };
  }

  const dataLines = lines[0].toLowerCase().startsWith('data') ? lines.slice(1) : lines;

  const validSDRIds = new Set(SDR_CONFIGS.map((c) => c.id));
  const validCloserIds = new Set(CLOSER_CONFIGS.map((c) => c.id));

  dataLines.forEach((line, idx) => {
    const cols = line.split(',').map((c) => c.trim());
    if (cols.length < 5) {
      errors.push(`Linha ${idx + 2}: colunas insuficientes.`);
      return;
    }

    const [date, tipo, personId, ...vals] = cols;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Linha ${idx + 2}: data inválida "${date}" (use YYYY-MM-DD).`);
      return;
    }
    if (tipo !== 'sdr' && tipo !== 'closer') {
      errors.push(`Linha ${idx + 2}: tipo "${tipo}" inválido (use "sdr" ou "closer").`);
      return;
    }
    if (tipo === 'sdr' && !validSDRIds.has(personId)) {
      errors.push(`Linha ${idx + 2}: "${personId}" não encontrado nos SDRs.`);
      return;
    }
    if (tipo === 'closer' && !validCloserIds.has(personId)) {
      errors.push(`Linha ${idx + 2}: "${personId}" não encontrado nos Closers.`);
      return;
    }

    // SDR: up to 6 values (leads, agend, acont, receita, ligacoes_whatsapp, tempo_em_linha)
    // Closer: up to 3 values (reunioes, contratos, receita)
    const maxVals = tipo === 'sdr' ? 6 : 3;
    const values = vals.slice(0, maxVals).map((v) => {
      const n = parseFloat(v.replace(',', '.'));
      return isNaN(n) ? 0 : n;
    });

    rows.push({ date, type: tipo as 'sdr' | 'closer', personId, values });
  });

  const datesAffected = [...new Set(rows.map((r) => r.date))].sort();
  const personsAffected = [...new Set(rows.map((r) => r.personId))];

  return { rows, errors, datesAffected, personsAffected };
}

export function applyImportRows(rows: ImportRow[]): void {
  const sdrNomeMap = Object.fromEntries(SDR_CONFIGS.map((c) => [c.id, c.nome]));
  const closerNomeMap = Object.fromEntries(CLOSER_CONFIGS.map((c) => [c.id, c.nome]));

  const byDate: Record<string, ImportRow[]> = {};
  for (const row of rows) {
    if (!byDate[row.date]) byDate[row.date] = [];
    byDate[row.date].push(row);
  }

  for (const [date, dateRows] of Object.entries(byDate)) {
    const existing: DayData = getDayData(date) ?? { data: date, sdrs: {}, closers: {} };

    for (const row of dateRows) {
      if (row.type === 'sdr') {
        existing.sdrs[row.personId] = {
          id: row.personId,
          nome: sdrNomeMap[row.personId] ?? row.personId,
          leads: row.values[0] ?? 0,
          agendamentos: row.values[1] ?? 0,
          acontecidas: row.values[2] ?? 0,
          receita: row.values[3] ?? 0,
          ligacoes_whatsapp: row.values[4] ?? 0,
          tempo_em_linha: row.values[5] ?? 0,
          updatedAt: new Date().toISOString(),
        };
      } else {
        existing.closers[row.personId] = {
          id: row.personId,
          nome: closerNomeMap[row.personId] ?? row.personId,
          reunioes: row.values[0] ?? 0,
          contratos: row.values[1] ?? 0,
          receita: row.values[2] ?? 0,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    saveDayData(date, existing);
  }
}

export function generateCSVTemplate(): string {
  const lines: string[] = [];
  lines.push('# AXIS Dashboard — Template de Importação');
  lines.push('# SDR:    data,tipo,pessoa_id,leads,agendamentos,acontecidas,receita_originada,ligacoes_whatsapp,tempo_em_linha_min');
  lines.push('# Closer: data,tipo,pessoa_id,reunioes,contratos,receita_gerada');
  lines.push('# Datas no formato YYYY-MM-DD | Datas = dia a dia');
  lines.push('#');
  lines.push('data,tipo,pessoa_id,v1,v2,v3,v4,v5,v6');

  const today = new Date().toISOString().split('T')[0];
  SDR_CONFIGS.forEach((c) => {
    lines.push(`${today},sdr,${c.id},0,0,0,0,0,0`);
  });
  CLOSER_CONFIGS.forEach((c) => {
    lines.push(`${today},closer,${c.id},0,0,0`);
  });

  return lines.join('\n');
}
