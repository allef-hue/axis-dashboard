import { SDRConfig, CloserConfig } from './types';

// ─── Metas Mensais Individuais ─────────────────────────────────
// Metas FIXAS por mês (não se multiplicam por dias)
// SDR: leads=44, agendamentos=3, acontecidas=2, receita=R$950,33
// Closer: reunioes=3.5, contratos=0.58, receita=R$1.583,88
//
// Meta Equipe/Mês (5 SDRs + 3 Closers, receita total):
//   SDR  total: 5 × 950,33  = R$ 4.751,65
//   Closer total: 3 × 1583,88 = R$ 4.751,64

export const SDR_CONFIGS: SDRConfig[] = [
  {
    id: 'joao_silva',
    nome: 'João da Silva',
    diasUteis: 22,
    metas: { leads: 44, agendamentos: 3, acontecidas: 2, receita: 950.33, ligacoes_whatsapp: 200, tempo_em_linha: 3000 },
  },
  {
    id: 'rudhero',
    nome: 'Rudhero',
    diasUteis: 22,
    metas: { leads: 44, agendamentos: 3, acontecidas: 2, receita: 950.33, ligacoes_whatsapp: 200, tempo_em_linha: 3000 },
  },
  {
    id: 'nicolas',
    nome: 'Nicolas',
    diasUteis: 22,
    metas: { leads: 44, agendamentos: 3, acontecidas: 2, receita: 950.33, ligacoes_whatsapp: 200, tempo_em_linha: 3000 },
  },
  {
    id: 'bruno_nobre',
    nome: 'Bruno Nobre',
    diasUteis: 22,
    metas: { leads: 44, agendamentos: 3, acontecidas: 2, receita: 950.33, ligacoes_whatsapp: 200, tempo_em_linha: 3000 },
  },
  {
    id: 'caua',
    nome: 'Cauã',
    diasUteis: 22,
    metas: { leads: 44, agendamentos: 3, acontecidas: 2, receita: 950.33, ligacoes_whatsapp: 200, tempo_em_linha: 3000 },
  },
];

export const CLOSER_CONFIGS: CloserConfig[] = [
  {
    id: 'eliel',
    nome: 'Eliel',
    diasUteis: 22,
    metas: { reunioes: 3.5, contratos: 0.58, receita: 1583.88 },
  },
  {
    id: 'gabriel_cinato',
    nome: 'Gabriel Cinato',
    diasUteis: 22,
    metas: { reunioes: 3.5, contratos: 0.58, receita: 1583.88 },
  },
  {
    id: 'bruno_levy',
    nome: 'Bruno Levy',
    diasUteis: 22,
    metas: { reunioes: 3.5, contratos: 0.58, receita: 1583.88 },
  },
];

// Metas totais da equipe por dia (base de cálculo para TotalCard)
export const SDR_TEAM_METAS = {
  leads: 220,
  agendamentos: 15,
  acontecidas: 10,
  receita: 4751.65, // 5 × 950,33
};

export const CLOSER_TEAM_METAS = {
  reunioes: 10,
  contratos: 1.75,
  receita: 4751.64, // 3 × 1.583,88
};
