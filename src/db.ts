/**
 * db.ts — Camada de dados cloud (Supabase) com fallback para localStorage
 *
 * Fluxo:
 *  - Leitura inicial: busca do Supabase → armazena no localStorage como cache
 *  - Escrita: salva no localStorage (imediato) + Supabase (async em background)
 *  - Se Supabase não estiver configurado: usa só localStorage
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { DayData, LeadershipGoals } from './types';
import {
  getDayData as localGet,
  saveDayData as localSave,
} from './storage';
import {
  loadLeadershipGoals as localLoadGoals,
  saveLeadershipGoals as localSaveGoals,
} from './leadershipStorage';

// ─── Day Data ──────────────────────────────────────────────────

/**
 * Salva os dados de uma pessoa de um dia específico no Supabase.
 * Sempre salva no localStorage primeiro para resposta instantânea.
 */
export async function saveDayDataCloud(date: string, dayData: DayData): Promise<void> {
  // 1. Salva localmente (imediato)
  localSave(date, dayData);

  if (!isSupabaseConfigured || !supabase) return;

  try {
    const upserts = [];

    for (const [personId, sdrData] of Object.entries(dayData.sdrs)) {
      upserts.push({
        date,
        person_id: personId,
        person_type: 'sdr',
        data: sdrData,
        updated_at: new Date().toISOString(),
      });
    }

    for (const [personId, closerData] of Object.entries(dayData.closers)) {
      upserts.push({
        date,
        person_id: personId,
        person_type: 'closer',
        data: closerData,
        updated_at: new Date().toISOString(),
      });
    }

    if (upserts.length > 0) {
      const { error } = await supabase
        .from('day_data')
        .upsert(upserts, { onConflict: 'date,person_id,person_type' });

      if (error) console.error('[DB] Erro ao salvar no Supabase:', error.message);
    }
  } catch (e) {
    console.error('[DB] saveDayDataCloud falhou:', e);
  }
}

/**
 * Deleta os dados de uma pessoa específica de um dia no Supabase.
 */
export async function deletePersonFromCloud(
  date: string,
  personId: string,
  personType: 'sdr' | 'closer'
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const { error } = await supabase
      .from('day_data')
      .delete()
      .eq('date', date)
      .eq('person_id', personId)
      .eq('person_type', personType);

    if (error) console.error('[DB] Erro ao deletar do Supabase:', error.message);
  } catch (e) {
    console.error('[DB] deletePersonFromCloud falhou:', e);
  }
}

/**
 * Busca dados de múltiplos dias do Supabase e sincroniza no localStorage.
 * Retorna um mapa date → DayData com os dados sincronizados.
 */
export async function syncDatesFromCloud(dates: string[]): Promise<Record<string, DayData>> {
  if (!isSupabaseConfigured || !supabase || dates.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from('day_data')
      .select('*')
      .in('date', dates);

    if (error) throw error;

    const result: Record<string, DayData> = {};

    for (const row of data ?? []) {
      if (!result[row.date]) {
        result[row.date] = { data: row.date, sdrs: {}, closers: {} };
      }
      if (row.person_type === 'sdr') {
        result[row.date].sdrs[row.person_id] = row.data;
      } else {
        result[row.date].closers[row.person_id] = row.data;
      }
    }

    // Sincronizar todos os dias no localStorage como cache
    for (const [date, dayData] of Object.entries(result)) {
      localSave(date, dayData);
    }

    return result;
  } catch (e) {
    console.error('[DB] syncDatesFromCloud falhou:', e);
    return {};
  }
}

/**
 * Busca dados de um único dia.
 * Tenta Supabase primeiro, cai para localStorage se falhar.
 */
export async function getDayDataCloud(date: string): Promise<DayData | null> {
  if (!isSupabaseConfigured || !supabase) {
    return localGet(date);
  }

  try {
    const { data, error } = await supabase
      .from('day_data')
      .select('*')
      .eq('date', date);

    if (error) throw error;

    if (!data || data.length === 0) return localGet(date);

    const dayData: DayData = { data: date, sdrs: {}, closers: {} };

    for (const row of data) {
      if (row.person_type === 'sdr') {
        dayData.sdrs[row.person_id] = row.data;
      } else {
        dayData.closers[row.person_id] = row.data;
      }
    }

    localSave(date, dayData);
    return dayData;
  } catch (e) {
    console.error('[DB] getDayDataCloud falhou, usando localStorage:', e);
    return localGet(date);
  }
}

// ─── Leadership Goals ──────────────────────────────────────────

export async function loadLeadershipGoalsCloud(): Promise<LeadershipGoals> {
  if (!isSupabaseConfigured || !supabase) {
    return localLoadGoals();
  }

  try {
    const { data, error } = await supabase
      .from('leadership_goals')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return localLoadGoals();

    const goals = data.goals as LeadershipGoals;
    localSaveGoals(goals);
    return goals;
  } catch (e) {
    console.error('[DB] loadLeadershipGoalsCloud falhou:', e);
    return localLoadGoals();
  }
}

export async function saveLeadershipGoalsCloud(goals: LeadershipGoals): Promise<void> {
  localSaveGoals(goals);

  if (!isSupabaseConfigured || !supabase) return;

  try {
    const { data: existing } = await supabase
      .from('leadership_goals')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('leadership_goals')
        .update({ goals, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('leadership_goals')
        .insert({ goals, updated_at: new Date().toISOString() });
    }
  } catch (e) {
    console.error('[DB] saveLeadershipGoalsCloud falhou:', e);
  }
}

export { isSupabaseConfigured };
