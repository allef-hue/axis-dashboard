export interface SDRData {
  id: string;
  nome: string;
  leads: number;
  agendamentos: number;
  acontecidas: number;
  receita: number; // Receita originada (das reuniões agendadas pelo SDR)
  ligacoes_whatsapp: number; // Ligações pelo WhatsApp
  tempo_em_linha: number; // Tempo em linha (minutos)
  updatedAt: string;
}

export interface CloserData {
  id: string;
  nome: string;
  reunioes: number;
  contratos: number;
  receita: number; // Receita gerada/paga pelo Closer
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
  diasUteis: number; // Dias úteis no mês (para cálculo de pace)
  metas: {
    leads: number;
    agendamentos: number;
    acontecidas: number;
    receita: number; // Meta mensal
    ligacoes_whatsapp: number; // Meta mensal
    tempo_em_linha: number; // Meta mensal em minutos
  };
}

export interface CloserConfig {
  id: string;
  nome: string;
  diasUteis: number; // Dias úteis no mês
  metas: {
    reunioes: number;
    contratos: number;
    receita: number; // Meta mensal
  };
}
