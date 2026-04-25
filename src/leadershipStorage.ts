import { LeadershipGoals } from './types';

const STORAGE_KEY = 'axis_leadership_goals';

const defaultGoals: LeadershipGoals = {
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

export function loadLeadershipGoals(): LeadershipGoals {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultGoals;
  try {
    const parsed = JSON.parse(stored) as LeadershipGoals;
    // Migrate old data: ensure all fields exist
    return {
      sdr: {
        leads: parsed.sdr?.leads ?? 0,
        agendamentos: parsed.sdr?.agendamentos ?? 0,
        acontecidas: parsed.sdr?.acontecidas ?? 0,
        receita: parsed.sdr?.receita ?? 0,
        ligacoes_whatsapp: parsed.sdr?.ligacoes_whatsapp ?? 0,
        tempo_em_linha: parsed.sdr?.tempo_em_linha ?? 0,
      },
      closer: {
        reunioes: parsed.closer?.reunioes ?? 0,
        contratos: parsed.closer?.contratos ?? 0,
        receita: parsed.closer?.receita ?? 0,
        vendas: parsed.closer?.vendas ?? 0,
        arr: parsed.closer?.arr ?? 0,
        mrr: parsed.closer?.mrr ?? 0,
        valor_recebido: parsed.closer?.valor_recebido ?? 0,
      },
    };
  } catch {
    return defaultGoals;
  }
}

export function saveLeadershipGoals(goals: LeadershipGoals): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}
