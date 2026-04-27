export interface SDRData {
  id: string;
  nome: string;
  leads: number;
  agendamentos: number;
  acontecidas: number;
  receita: number; // Receita originada (das reuniões agendadas pelo SDR)
  ligacoes_whatsapp: number; // Ligações pelo WhatsApp
  tempo_em_linha: number; // Tempo em linha (minutos)
  rqa?: number; // RQA - Requisição de Qualificação do Agendamento
  updatedAt: string;
}

export interface CloserData {
  id: string;
  nome: string;
  reunioes: number;
  proposta?: number; // Propostas enviadas
  contratos: number;
  receita: number; // Receita gerada/paga pelo Closer
  vendas?: number; // Quantidade de vendas
  arr?: number; // Annual Recurring Revenue
  mrr?: number; // Monthly Recurring Revenue
  valor_recebido?: number; // Valor recebido
  updatedAt: string;
}

export interface DayData {
  data: string; // "YYYY-MM-DD"
  sdrs: Record<string, SDRData>;
  closers: Record<string, CloserData>;
}

export type Status = 'no_pace' | 'atencao' | 'critico';

export interface SDRConfig {
  id: string;
  nome: string;
  email?: string; // Email do usuário que pode editar este card (ex: jose@grupovorp.com)
  diasUteis: number; // Dias úteis no mês (referência para cálculo de metas diárias)
  metas: {
    leads: number; // Meta diária (ex: 44 leads/dia)
    agendamentos: number; // Meta diária
    acontecidas: number; // Meta diária
    receita: number; // Meta diária
    ligacoes_whatsapp: number; // Meta mensal (não se multiplica por dias)
    tempo_em_linha: number; // Meta mensal em minutos (não se multiplica por dias)
    rqa?: number; // Meta mensal de RQA (não se multiplica por dias)
  };
}

export interface CloserConfig {
  id: string;
  nome: string;
  email?: string; // Email do usuário que pode editar este card (ex: allef@grupovorp.com)
  diasUteis: number; // Dias úteis esperados no mês (para scaling de métricas mensais)
  metas: {
    reunioes: number; // Meta diária (ex: 1.36 reuniões/dia)
    proposta?: number; // Meta diária de propostas
    contratos: number; // Meta diária
    receita: number; // Meta diária
    mrr?: number; // Meta mensal (não é per-dia, escala com dias úteis do período)
    arr?: number; // Meta mensal (não é per-dia, escala com dias úteis do período)
  };
}

export interface LeadershipGoals {
  sdr: {
    leads: number;
    agendamentos: number;
    acontecidas: number;
    receita: number;
    ligacoes_whatsapp: number;
    tempo_em_linha: number;
  };
  closer: {
    reunioes: number;
    contratos: number;
    receita: number;
    vendas: number;
    arr: number;
    mrr: number;
    valor_recebido: number;
  };
  // Configs do time — sincronizadas via Supabase junto com as metas
  sdrConfigs?: SDRConfig[];
  closerConfigs?: CloserConfig[];
}
