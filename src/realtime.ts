/**
 * realtime.ts — Supabase Realtime (WebSocket) para sincronização em tempo real
 *
 * Subscriptions para mudanças em day_data e leadership_goals
 * Notifica via callbacks quando há novos dados
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { DayData, LeadershipGoals } from './types';
import { saveDayData as localSave } from './storage';
import { saveLeadershipGoals as localSaveGoals } from './leadershipStorage';

let dayDataChannel: any = null;
let goalsChannel: any = null;

/**
 * Setup Realtime subscriptions para day_data e leadership_goals
 * Retorna função para cleanup
 */
export function setupRealtimeSubscriptions(
  onDataChange: (date: string, dayData: DayData) => void,
  onGoalsChange: (goals: LeadershipGoals) => void
): () => void {
  if (!isSupabaseConfigured || !supabase) {
    console.log('[Realtime] Supabase não configurado, realtime desabilitado');
    return () => {}; // noop cleanup
  }

  console.log('[Realtime] Iniciando subscriptions...');

  // ─── Subscribe to day_data changes ───────────────────────────────────
  dayDataChannel = supabase
    .channel('day_data_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'day_data' },
      (payload: any) => {
        console.log('[Realtime] day_data mudou:', payload);

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const record = payload.new as any;
          const date = record.date;

          // Buscar todos os dados do dia para reconstruir DayData
          fetchDayDataRealtime(date, onDataChange);
        }

        if (payload.eventType === 'DELETE') {
          const record = payload.old as any;
          const date = record.date;
          fetchDayDataRealtime(date, onDataChange);
        }
      }
    )
    .subscribe((status: string) => {
      console.log(`[Realtime] day_data subscription status: ${status}`);
    });

  // ─── Subscribe to leadership_goals changes ────────────────────────────
  goalsChannel = supabase
    .channel('goals_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leadership_goals' },
      (payload: any) => {
        console.log('[Realtime] leadership_goals mudou:', payload);

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          fetchGoalsRealtime(onGoalsChange);
        }

        if (payload.eventType === 'DELETE') {
          fetchGoalsRealtime(onGoalsChange);
        }
      }
    )
    .subscribe((status: string) => {
      console.log(`[Realtime] goals subscription status: ${status}`);
    });

  // Return cleanup function
  return cleanupRealtimeSubscriptions;
}

/**
 * Fetch day data from Supabase and notify via callback
 */
async function fetchDayDataRealtime(
  date: string,
  onDataChange: (date: string, dayData: DayData) => void
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const { data, error } = await supabase
      .from('day_data')
      .select('*')
      .eq('date', date);

    if (error) {
      console.error('[Realtime] Erro ao fetch day_data:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log(`[Realtime] Nenhum dado para ${date}`);
      return;
    }

    // Reconstruct DayData from records
    const dayData: DayData = { data: date, sdrs: {}, closers: {} };

    data.forEach((record: any) => {
      const personId = record.person_id;
      const personData = record.data || {};

      if (record.person_type === 'sdr') {
        dayData.sdrs[personId] = {
          id: personId,
          ...personData,
          updatedAt: record.updated_at,
        };
      } else if (record.person_type === 'closer') {
        dayData.closers[personId] = {
          id: personId,
          ...personData,
          updatedAt: record.updated_at,
        };
      }
    });

    // Salvar no localStorage para cache
    localSave(date, dayData);

    // Notificar callback
    onDataChange(date, dayData);

    console.log('[Realtime] dayData atualizado para', date, dayData);
  } catch (error) {
    console.error('[Realtime] fetchDayDataRealtime error:', error);
  }
}

/**
 * Fetch leadership goals from Supabase and notify via callback
 */
async function fetchGoalsRealtime(onGoalsChange: (goals: LeadershipGoals) => void): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const { data, error } = await supabase.from('leadership_goals').select('*');

    if (error) {
      console.error('[Realtime] Erro ao fetch goals:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log('[Realtime] Nenhuma meta de liderança');
      return;
    }

    // Reconstruct LeadershipGoals
    const goals: LeadershipGoals = {
      sdr: {
        leads: 0,
        agendamentos: 0,
        acontecidas: 0,
        receita: 0,
        ligacoes_whatsapp: 0,
        tempo_em_linha: 0,
      },
      closer: {
        reunioes: 0,
        contratos: 0,
        receita: 0,
        vendas: 0,
        arr: 0,
        mrr: 0,
        valor_recebido: 0,
      },
    };

    data.forEach((record: any) => {
      const role = record.role as 'sdr' | 'closer';
      if (role === 'sdr' || role === 'closer') {
        goals[role] = { ...goals[role], ...record.goals };
      }
    });

    // Salvar no localStorage
    localSaveGoals(goals);

    // Notificar callback
    onGoalsChange(goals);

    console.log('[Realtime] goals atualizado:', goals);
  } catch (error) {
    console.error('[Realtime] fetchGoalsRealtime error:', error);
  }
}

/**
 * Cleanup subscriptions
 */
export function cleanupRealtimeSubscriptions(): void {
  console.log('[Realtime] Limpando subscriptions...');

  if (dayDataChannel && supabase) {
    supabase.removeChannel(dayDataChannel);
    dayDataChannel = null;
  }

  if (goalsChannel && supabase) {
    supabase.removeChannel(goalsChannel);
    goalsChannel = null;
  }

  console.log('[Realtime] Subscriptions limpas');
}
