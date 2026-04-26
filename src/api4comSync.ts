/**
 * api4comSync.ts
 * Busca dados de ligações da API4com e mapeia para SDRs do Axis.
 */

const API_TOKEN = import.meta.env.VITE_API4COM_TOKEN as string;
const API_BASE  = 'https://api.api4com.com/api/v1';

// Mapeamento: primeiro nome do SDR no Axis → email no API4com
// Comparação por primeiro nome (case-insensitive)
const SDR_EMAIL_MAP: Record<string, string> = {
  'joao':   'joao.silva@grupovorp.com',
  'joão':   'joao.silva@grupovorp.com',
  'rudhero':'rudhero.silva@grupovorp.com',
  'nicolas':'nicolas.roberto@grupovorp.com',
  'bruno':  'bruno.brito@grupovorp.com',
  'cauã':   'jose.gomes@grupovorp.com',
  'caua':   'jose.gomes@grupovorp.com',
};

function firstNameKey(nome: string): string {
  return nome.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function emailForSDR(nome: string): string | null {
  const key = firstNameKey(nome);
  // Tentar match exato
  if (SDR_EMAIL_MAP[key]) return SDR_EMAIL_MAP[key];
  // Tentar sem acentos vs mapa (cobre "Cauã" → "caua")
  for (const [k, v] of Object.entries(SDR_EMAIL_MAP)) {
    if (k.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === key) return v;
  }
  return null;
}

export interface SDRCallStats {
  ligacoes: number;       // total de ligações
  tempoEmLinha: number;   // duração total em minutos
  conexoes: number;       // chamadas > 40s
}

/**
 * Busca chamadas de um dia específico e agrega por SDR.
 * Retorna mapa: sdrId → stats
 */
export async function syncAPI4ComForDate(
  date: string,  // "YYYY-MM-DD"
  sdrConfigs: { id: string; nome: string }[]
): Promise<Record<string, SDRCallStats>> {
  if (!API_TOKEN) throw new Error('Token API4com não configurado');

  const filter = JSON.stringify({
    where: {
      and: [
        { started_at: { gt: `${date}T00:00:00Z` } },
        { ended_at:   { lt: `${date}T23:59:59Z` } },
      ],
    },
    limit: 1000,
    order: 'started_at asc',
  });

  let page = 1;
  let allCalls: any[] = [];
  let hasMore = true;

  while (hasMore) {
    const url = `${API_BASE}/calls?access_token=${API_TOKEN}&page=${page}&filter=${encodeURIComponent(filter)}`;
    const res = await fetch(url);
    if (res.status === 429) throw new Error('Limite de requisições atingido. Aguarde alguns minutos.');
    if (!res.ok) throw new Error(`Erro API4com: ${res.status}`);
    const data = await res.json();
    const records: any[] = Array.isArray(data) ? data : data.data || [];
    allCalls = [...allCalls, ...records];
    hasMore = records.length === 1000;
    page++;
  }

  // Agregar por email
  const statsByEmail: Record<string, SDRCallStats> = {};
  for (const call of allCalls) {
    const email = call.email || '';
    if (!email.endsWith('@grupovorp.com')) continue;
    if (!statsByEmail[email]) statsByEmail[email] = { ligacoes: 0, tempoEmLinha: 0, conexoes: 0 };
    statsByEmail[email].ligacoes++;
    statsByEmail[email].tempoEmLinha += Math.round((call.duration || 0) / 60 * 10) / 10;
    if (call.hangup_cause === 'NORMAL_CLEARING' && call.duration > 40) {
      statsByEmail[email].conexoes++;
    }
  }

  // Mapear para SDR IDs do Axis
  const result: Record<string, SDRCallStats> = {};
  for (const cfg of sdrConfigs) {
    const email = emailForSDR(cfg.nome);
    if (email && statsByEmail[email]) {
      result[cfg.id] = {
        ligacoes: statsByEmail[email].ligacoes,
        tempoEmLinha: Math.round(statsByEmail[email].tempoEmLinha),
        conexoes: statsByEmail[email].conexoes,
      };
    }
  }

  return result;
}
