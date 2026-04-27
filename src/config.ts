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
    email: 'joao@grupovorp.com',
    diasUteis: 22,
    metas: { leads: 44, agendamentos: 3, acontecidas: 2, receita: 950.33, ligacoes_whatsapp: 200, tempo_em_linha: 3000, rqa: 10 },
  },
  {
    id: 'rudhero',
    nome: 'Rudhero',
    email: 'rudhero@grupovorp.com',
    diasUteis: 22,
    metas: { leads: 44, agendamentos: 3, acontecidas: 2, receita: 950.33, ligacoes_whatsapp: 200, tempo_em_linha: 3000, rqa: 10 },
  },
  {
    id: 'nicolas',
    nome: 'Nicolas',
    email: 'nicolas@grupovorp.com',
    diasUteis: 22,
    metas: { leads: 44, agendamentos: 3, acontecidas: 2, receita: 950.33, ligacoes_whatsapp: 200, tempo_em_linha: 3000, rqa: 10 },
  },
  {
    id: 'bruno_nobre',
    nome: 'Bruno Nobre',
    email: 'bruno.nobre@grupovorp.com',
    diasUteis: 22,
    metas: { leads: 44, agendamentos: 3, acontecidas: 2, receita: 950.33, ligacoes_whatsapp: 200, tempo_em_linha: 3000, rqa: 10 },
  },
  {
    id: 'caua',
    nome: 'Cauã',
    email: 'caua@grupovorp.com',
    diasUteis: 22,
    metas: { leads: 44, agendamentos: 3, acontecidas: 2, receita: 950.33, ligacoes_whatsapp: 200, tempo_em_linha: 3000, rqa: 10 },
  },
];

export const CLOSER_CONFIGS: CloserConfig[] = [
  {
    id: 'eliel',
    nome: 'Eliel',
    email: 'eliel@grupovorp.com',
    diasUteis: 22,
    metas: { reunioes: 3.5, proposta: 1.5, contratos: 0.58, receita: 1583.88, mrr: 0, arr: 0 },
  },
  {
    id: 'gabriel_cinato',
    nome: 'Gabriel Cinato',
    email: 'gabriel@grupovorp.com',
    diasUteis: 22,
    metas: { reunioes: 3.5, proposta: 1.5, contratos: 0.58, receita: 1583.88, mrr: 0, arr: 0 },
  },
  {
    id: 'bruno_levy',
    nome: 'Bruno Levy',
    email: 'bruno.levy@grupovorp.com',
    diasUteis: 22,
    metas: { reunioes: 3.5, proposta: 1.5, contratos: 0.58, receita: 1583.88, mrr: 0, arr: 0 },
  },
];

// Você (Admin)
export const ADMIN_EMAIL = 'allef@grupovorp.com';

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
