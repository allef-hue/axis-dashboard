/**
 * db.ts — Camada de dados cloud (Supabase) com fallback para localStorage
 *
 * Fluxo:
 *  - Leitura inicial: busca do Supabase → armazena no localStorage como cache
 *  - Escrita: salva no localStorage (imediato) + Supabase (async em background)
 *  - Se Supabase não estiver configurado: usa só localStorage
 *
 * Configs (SDR/Closer) são armazenadas DENTRO do registro leadership_goals
 * no campo sdrConfigs/closerConfigs — assim ficam sincronizadas automaticamente.
 *
 * Sincronização: Emite eventos via getSyncCallbacks() para UI feedback
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { DayData, LeadershipGoals, SDRConfig, CloserConfig } from './types';
import { getSyncCallbacks } from './context/SyncContext';
import {
  getDayData as localGet,
  saveDayData as localSave,
} from './storage';
import {
  loadLeadershipGoals as localLoadGoals,
  saveLeadershipGoals as localSaveGoals,
} from './leadershipStorage';
import {
  loadSDRConfigs as localLoadSDRConfigs,
  loadCloserConfigs as localLoadCloserConfigs,
  saveSDRConfigs as localSaveSDRConfigs,
  saveCloserConfigs as localSaveCloserConfigs,
} from './configStorage';

// ─── Day Data ──────────────────────────────────────────────────

/**
 * Salva os dados de uma pessoa de um dia específico no Supabase.
 * Sempre salva no localStorage primeiro para resposta instantânea.
 * Emite eventos de sync para feedback na UI.
 */
export async function saveDayDataCloud(date: string, dayData: DayData): Promise<void> {
  // 1. Salva localmente (imediato)
  localSave(date, dayData);

  const syncCallbacks = getSyncCallbacks();
  if (syncCallbacks) {
    syncCallbacks.setSyncing();
  }

  if (!isSupabaseConfigured || !supabase) {
    if (syncCallbacks) {
      syncCallbacks.setSuccess();
    }
    return;
  }

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

      if (error) {
        throw new Error(error.message);
      }
    }

    if (syncCallbacks) {
      syncCallbacks.setSuccess();
    }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido';
    console.error('[DB] saveDayDataCloud falhou:', errorMsg);
    if (syncCallbacks) {
      syncCallbacks.setError(errorMsg);
    }
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

/**
 * Carrega goals + configs do time do Supabase.
 * As configs ficam armazenadas dentro do mesmo JSON de goals.
 */
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

    // Sincronizar configs do time se presentes no cloud
    if (Array.isArray(goals.sdrConfigs) && goals.sdrConfigs.length > 0) {
      localSaveSDRConfigs(goals.sdrConfigs);
      console.log('[DB] SDR configs sincronizadas do cloud:', goals.sdrConfigs.length);
    }
    if (Array.isArray(goals.closerConfigs) && goals.closerConfigs.length > 0) {
      localSaveCloserConfigs(goals.closerConfigs);
      console.log('[DB] Closer configs sincronizadas do cloud:', goals.closerConfigs.length);
    }

    return goals;
  } catch (e) {
    console.error('[DB] loadLeadershipGoalsCloud falhou:', e);
    return localLoadGoals();
  }
}

/**
 * Salva goals + configs do time no Supabase.
 * Inclui automaticamente as configs atuais do localStorage.
 * Emite eventos de sync para feedback na UI.
 */
export async function saveLeadershipGoalsCloud(goals: LeadershipGoals): Promise<void> {
  localSaveGoals(goals);

  const syncCallbacks = getSyncCallbacks();
  if (syncCallbacks) {
    syncCallbacks.setSyncing();
  }

  if (!isSupabaseConfigured || !supabase) {
    if (syncCallbacks) {
      syncCallbacks.setSuccess();
    }
    return;
  }

  // Incluir configs do time no payload para sincronizar com todos
  const payload: LeadershipGoals = {
    ...goals,
    sdrConfigs: goals.sdrConfigs ?? localLoadSDRConfigs(),
    closerConfigs: goals.closerConfigs ?? localLoadCloserConfigs(),
  };

  try {
    const { data: existing } = await supabase
      .from('leadership_goals')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('leadership_goals')
        .update({ goals: payload, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('leadership_goals')
        .insert({ goals: payload, updated_at: new Date().toISOString() });
    }
    console.log('[DB] Goals + configs salvas no cloud');
    if (syncCallbacks) {
      syncCallbacks.setSuccess();
    }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido';
    console.error('[DB] saveLeadershipGoalsCloud falhou:', errorMsg);
    if (syncCallbacks) {
      syncCallbacks.setError(errorMsg);
    }
  }
}

/**
 * Salva as configs do time (SDR + Closer) no Supabase junto com os goals existentes.
 * Chame sempre que as configs forem alteradas nas Configurações.
 * Emite eventos de sync para feedback na UI.
 */
export async function saveConfigsCloud(
  sdrConfigs: SDRConfig[],
  closerConfigs: CloserConfig[]
): Promise<void> {
  // Salvar localmente primeiro (resposta imediata)
  localSaveSDRConfigs(sdrConfigs);
  localSaveCloserConfigs(closerConfigs);

  const syncCallbacks = getSyncCallbacks();
  if (syncCallbacks) {
    syncCallbacks.setSyncing();
  }

  if (!isSupabaseConfigured || !supabase) {
    if (syncCallbacks) {
      syncCallbacks.setSuccess();
    }
    return;
  }

  try {
    // Buscar goals existentes para não perder dados
    const { data: existing } = await supabase
      .from('leadership_goals')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentGoals = (existing?.goals as LeadershipGoals) ?? localLoadGoals();
    const payload: LeadershipGoals = {
      ...currentGoals,
      sdrConfigs,
      closerConfigs,
    };

    if (existing?.id) {
      await supabase
        .from('leadership_goals')
        .update({ goals: payload, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('leadership_goals')
        .insert({ goals: payload, updated_at: new Date().toISOString() });
    }
    console.log('[DB] Configs do time salvas no cloud');
    if (syncCallbacks) {
      syncCallbacks.setSuccess();
    }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido';
    console.error('[DB] saveConfigsCloud falhou:', errorMsg);
    if (syncCallbacks) {
      syncCallbacks.setError(errorMsg);
    }
  }
}

// ─── AUDITORIA ──────────────────────────────────────────────────

/**
 * Interface para representar um log de auditoria
 */
export interface AuditEntry {
  id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  user_email?: string;
  changed_at: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
}

/**
 * Busca o histórico de alterações para uma pessoa em um período
 * @param personId ID da pessoa (ex: 'joao_silva')
 * @param startDate Data inicial (YYYY-MM-DD)
 * @param endDate Data final (YYYY-MM-DD)
 */
export async function getAuditHistory(
  personId: string,
  startDate?: string,
  endDate?: string
): Promise<AuditEntry[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    let query = supabase
      .from('audit_log')
      .select('*')
      .like('record_id', `%${personId}%`)
      .order('changed_at', { ascending: false });

    if (startDate) {
      query = query.gte('changed_at', `${startDate}T00:00:00`);
    }

    if (endDate) {
      query = query.lte('changed_at', `${endDate}T23:59:59`);
    }

    const { data, error } = await query.limit(500);

    if (error) {
      console.error('[Audit] Erro ao buscar histórico:', error.message);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('[Audit] getAuditHistory falhou:', e);
    return [];
  }
}

/**
 * Busca o histórico de um dia específico para todos
 */
export async function getAuditHistoryByDate(date: string): Promise<AuditEntry[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .like('record_id', `${date}|%`)
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('[Audit] Erro ao buscar histórico do dia:', error.message);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('[Audit] getAuditHistoryByDate falhou:', e);
    return [];
  }
}

/**
 * Busca quem alterou nos últimos N dias
 */
export async function getRecentChanges(days: number = 7): Promise<AuditEntry[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .gte('changed_at', startDate.toISOString())
      .order('changed_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('[Audit] Erro ao buscar mudanças recentes:', error.message);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('[Audit] getRecentChanges falhou:', e);
    return [];
  }
}

// ─── Admin Management ──────────────────────────────────────────

/**
 * Retorna lista de emails que são admins
 */
export async function getAdmins(): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('admins')
      .select('email')
      .eq('status', 'active');

    if (error) {
      console.error('[Admins] Erro ao buscar:', error.message);
      return [];
    }

    return data?.map((row) => row.email) || [];
  } catch (e) {
    console.error('[Admins] getAdmins falhou:', e);
    return [];
  }
}

/**
 * Adiciona um novo admin
 */
export async function addAdmin(email: string, addedBy: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase não configurado' };
  }

  try {
    const { error } = await supabase
      .from('admins')
      .insert([{ email, added_by: addedBy, status: 'active' }]);

    if (error) {
      if (error.message.includes('duplicate')) {
        return { success: false, error: 'Este email já é admin' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido';
    return { success: false, error: errorMsg };
  }
}

/**
 * Remove um admin
 */
export async function removeAdmin(email: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase não configurado' };
  }

  try {
    const { error } = await supabase
      .from('admins')
      .update({ status: 'inactive' })
      .eq('email', email);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido';
    return { success: false, error: errorMsg };
  }
}

export { isSupabaseConfigured };
