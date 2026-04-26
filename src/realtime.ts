/**
 * realtime.ts — Supabase Realtime (WebSocket) para sincronização em tempo real
 *
 * Subscriptions para mudanças em day_data e leadership_goals
 * Notifica via callbacks quando há novos dados
 *
 * Quando leadership_goals muda, também sincroniza configs do time (SDRs/Closers)
 * para que todos vejam as mesmas configurações instantaneamente.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { DayData, LeadershipGoals, SDRConfig, CloserConfig } from './types';
import { saveDayData as localSave } from './storage';
import { saveLeadershipGoals as localSaveGoals } from './leadershipStorage';
import {
  saveSDRConfigs as localSaveSDRConfigs,
  saveCloserConfigs as localSaveCloserConfigs,
} from './configStorage';

let dayDataChannel: any = null;
let goalsChannel: any = null;

/**
 * Setup Realtime subscriptions para day_data e leadership_goals
 * Retorna função para cleanup
 */
export function setupRealtimeSubscriptions(
  onDataChange: (date: string, dayData: DayData) => void,
  onGoalsChange: (goals: LeadershipGoals, sdrConfigs?: SDRConfig[], closerConfigs?: CloserConfig[]) => void
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
        console.log('[Realtime] day_data mudou:', payload.eventType);

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const record = payload.new as any;
          fetchDayDataRealtime(record.date, onDataChange);
        }

        if (payload.eventType === 'DELETE') {
          const record = payload.old as any;
          fetchDayDataRealtime(record.date, onDataChange);
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
        console.log('[Realtime] leadership_goals mudou:', payload.eventType);

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          // O payload.new já tem os dados — usar diretamente para menor latência
          const record = payload.new as any;
          if (record?.goals) {
            const rawGoals = record.goals as LeadershipGoals;
            handleGoalsUpdate(rawGoals, onGoalsChange);
          } else {
            fetchGoalsRealtime(onGoalsChange);
          }
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
 * Processa um update de goals recebido via Realtime.
 * Também extrai e aplica configs do time se presentes.
 */
function handleGoalsUpdate(
  rawGoals: LeadershipGoals,
  onGoalsChange: (goals: LeadershipGoals, sdrConfigs?: SDRConfig[], closerConfigs?: CloserConfig[]) => void
): void {
  // Extrair configs do time se presentes
  const sdrConfigs = rawGoals.sdrConfigs;
  const closerConfigs = rawGoals.closerConfigs;

  // Salvar configs localmente se chegaram do cloud
  if (Array.isArray(sdrConfigs) && sdrConfigs.length > 0) {
    localSaveSDRConfigs(sdrConfigs);
    console.log('[Realtime] Configs SDR sincronizadas:', sdrConfigs.length);
  }
  if (Array.isArray(closerConfigs) && closerConfigs.length > 0) {
    localSaveCloserConfigs(closerConfigs);
    console.log('[Realtime] Configs Closer sincronizadas:', closerConfigs.length);
  }

  // Montar goals sem os campos de config para o state do React
  const goals: LeadershipGoals = {
    sdr: {
      leads: rawGoals.sdr?.leads ?? 0,
      agendamentos: rawGoals.sdr?.agendamentos ?? 0,
      acontecidas: rawGoals.sdr?.acontecidas ?? 0,
      receita: rawGoals.sdr?.receita ?? 0,
      ligacoes_whatsapp: rawGoals.sdr?.ligacoes_whatsapp ?? 0,
      tempo_em_linha: rawGoals.sdr?.tempo_em_linha ?? 0,
    },
    closer: {
      reunioes: rawGoals.closer?.reunioes ?? 0,
      contratos: rawGoals.closer?.contratos ?? 0,
      receita: rawGoals.closer?.receita ?? 0,
      vendas: rawGoals.closer?.vendas ?? 0,
      arr: rawGoals.closer?.arr ?? 0,
      mrr: rawGoals.closer?.mrr ?? 0,
      valor_recebido: rawGoals.closer?.valor_recebido ?? 0,
    },
  };

  // Salvar no localStorage
  localSaveGoals(goals);

  // Notificar callback com goals + configs
  onGoalsChange(goals, sdrConfigs, closerConfigs);
  console.log('[Realtime] goals + configs atualizados via Realtime');
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
      // Pode ter sido deletado — notifica com dados vazios
      const emptyDayData: DayData = { data: date, sdrs: {}, closers: {} };
      localSave(date, emptyDayData);
      onDataChange(date, emptyDayData);
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
          nome: personData.nome || personId,
          leads: personData.leads ?? 0,
          agendamentos: personData.agendamentos ?? 0,
          acontecidas: personData.acontecidas ?? 0,
          receita: personData.receita ?? 0,
          ligacoes_whatsapp: personData.ligacoes_whatsapp ?? 0,
          tempo_em_linha: personData.tempo_em_linha ?? 0,
          updatedAt: record.updated_at || '',
        };
      } else if (record.person_type === 'closer') {
        dayData.closers[personId] = {
          id: personId,
          nome: personData.nome || personId,
          reunioes: personData.reunioes ?? 0,
          contratos: personData.contratos ?? 0,
          receita: personData.receita ?? 0,
          vendas: personData.vendas,
          arr: personData.arr,
          mrr: personData.mrr,
          valor_recebido: personData.valor_recebido,
          updatedAt: record.updated_at || '',
        };
      }
    });

    // Salvar no localStorage para cache
    localSave(date, dayData);

    // Notificar callback
    onDataChange(date, dayData);

    console.log('[Realtime] dayData atualizado para', date);
  } catch (error) {
    console.error('[Realtime] fetchDayDataRealtime error:', error);
  }
}

/**
 * Fetch leadership goals from Supabase and notify via callback
 */
async function fetchGoalsRealtime(
  onGoalsChange: (goals: LeadershipGoals, sdrConfigs?: SDRConfig[], closerConfigs?: CloserConfig[]) => void
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const { data, error } = await supabase
      .from('leadership_goals')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[Realtime] Erro ao fetch goals:', error.message);
      return;
    }

    if (!data) {
      console.log('[Realtime] Nenhuma meta de liderança');
      return;
    }

    handleGoalsUpdate(data.goals as LeadershipGoals, onGoalsChange);
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
