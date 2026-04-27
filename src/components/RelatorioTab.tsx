import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { SDRConfig, CloserConfig, SDRData, CloserData, LeadershipGoals } from '../types';
import { formatCurrency } from '../utils';
import AlertsSection from './AlertsSection';
import TotalCard from './TotalCard';

interface RelatorioTabProps {
  sdrConfigs: SDRConfig[];
  closerConfigs: CloserConfig[];
  sdrDataArray: (SDRData | null)[];
  closerDataArray: (CloserData | null)[];
  periodSDRConfigs: SDRConfig[];
  periodCloserConfigs: CloserConfig[];
  leadershipGoals: LeadershipGoals;
  startDate: string;
  endDate: string;
  isPeriodView?: boolean;
  daysWithAnyData?: number;
}

type SDRMetric = 'leads' | 'agendamentos' | 'acontecidas' | 'receita' | 'ligacoes_whatsapp' | 'tempo_em_linha';
type CloserMetric = 'reunioes' | 'contratos' | 'receita' | 'vendas' | 'arr' | 'mrr' | 'valor_recebido';

const SDR_METRICS: { key: SDRMetric; label: string; currency?: boolean }[] = [
  { key: 'leads', label: 'Leads' },
  { key: 'agendamentos', label: 'Agendamentos' },
  { key: 'acontecidas', label: 'Acontecidas' },
  { key: 'receita', label: 'Receita', currency: true },
  { key: 'ligacoes_whatsapp', label: 'Ligações WhatsApp' },
  { key: 'tempo_em_linha', label: 'Tempo em Linha (min)' },
];

const CLOSER_METRICS: { key: CloserMetric; label: string; currency?: boolean }[] = [
  { key: 'reunioes', label: 'Reuniões' },
  { key: 'contratos', label: 'Contratos' },
  { key: 'receita', label: 'Receita', currency: true },
  { key: 'vendas', label: 'Vendas' },
  { key: 'arr', label: 'ARR', currency: true },
  { key: 'mrr', label: 'MRR', currency: true },
  { key: 'valor_recebido', label: 'Valor Recebido', currency: true },
];

function getBarColor(pct: number): string {
  if (pct >= 100) return '#22c55e';
  if (pct >= 70) return '#f59e0b';
  return '#ef4444';
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '0.85rem',
};

export default function RelatorioTab({
  sdrConfigs,
  closerConfigs,
  sdrDataArray,
  closerDataArray,
  periodSDRConfigs,
  periodCloserConfigs,
  startDate,
  endDate,
  isPeriodView,
  daysWithAnyData,
}: RelatorioTabProps) {
  const [sdrMetric, setSdrMetric] = useState<SDRMetric>('leads');
  const [closerMetric, setCloserMetric] = useState<CloserMetric>('reunioes');

  const sdrMetricDef = SDR_METRICS.find(m => m.key === sdrMetric)!;
  const closerMetricDef = CLOSER_METRICS.find(m => m.key === closerMetric)!;

  // ─── Resumo Geral SDR ──────────────────────────────────────────
  const sdrSummary = useMemo(() => {
    const totals = { leads: 0, agendamentos: 0, acontecidas: 0, receita: 0 };
    sdrDataArray.forEach(d => {
      if (!d) return;
      totals.leads += d.leads ?? 0;
      totals.agendamentos += d.agendamentos ?? 0;
      totals.acontecidas += d.acontecidas ?? 0;
      totals.receita += d.receita ?? 0;
    });
    return totals;
  }, [sdrDataArray]);

  // ─── Resumo Geral Closer ───────────────────────────────────────
  const closerSummary = useMemo(() => {
    const totals = { reunioes: 0, contratos: 0, receita: 0, vendas: 0 };
    closerDataArray.forEach(d => {
      if (!d) return;
      totals.reunioes += d.reunioes ?? 0;
      totals.contratos += d.contratos ?? 0;
      totals.receita += d.receita ?? 0;
      totals.vendas += (d.vendas ?? 0);
    });
    return totals;
  }, [closerDataArray]);

  // ─── Dados para gráfico SDR ────────────────────────────────────
  const sdrChartData = useMemo(() => {
    return sdrConfigs.map((cfg, i) => {
      const data = sdrDataArray[i];
      const periodCfg = periodSDRConfigs[i] || cfg;
      const realizado = (data as any)?.[sdrMetric] ?? 0;
      const meta = (periodCfg.metas as any)[sdrMetric] ?? 0;
      const pct = meta > 0 ? Math.round((realizado / meta) * 100) : 0;
      return {
        nome: (cfg?.nome ?? '').split(' ')[0] || 'Desconhecido', // Primeiro nome
        Realizado: Math.round(realizado * 100) / 100,
        Meta: Math.round(meta * 100) / 100,
        pct,
      };
    });
  }, [sdrConfigs, sdrDataArray, periodSDRConfigs, sdrMetric]);

  // ─── Dados para gráfico Closer ─────────────────────────────────
  const closerChartData = useMemo(() => {
    return closerConfigs.map((cfg, i) => {
      const data = closerDataArray[i];
      const periodCfg = periodCloserConfigs[i] || cfg;
      const realizado = (data as any)?.[closerMetric] ?? 0;
      const meta = (periodCfg.metas as any)[closerMetric] ?? 0;
      const pct = meta > 0 ? Math.round((realizado / meta) * 100) : 0;
      return {
        nome: (cfg?.nome ?? '').split(' ')[0] || 'Desconhecido',
        Realizado: Math.round(realizado * 100) / 100,
        Meta: Math.round(meta * 100) / 100,
        pct,
      };
    });
  }, [closerConfigs, closerDataArray, periodCloserConfigs, closerMetric]);

  // ─── Dados para gráfico de Performance Geral ──────────────────
  const performanceData = useMemo(() => {
    const sdrItems = sdrConfigs.map((cfg, i) => {
      const data = sdrDataArray[i];
      const periodCfg = periodSDRConfigs[i] || cfg;
      const leads = data?.leads ?? 0;
      const metaLeads = periodCfg.metas.leads ?? 1;
      const pct = Math.min(Math.round((leads / metaLeads) * 100), 150);
      return { nome: (cfg?.nome ?? '').split(' ')[0] || 'Desconhecido', pct, tipo: 'SDR' };
    });
    const closerItems = closerConfigs.map((cfg, i) => {
      const data = closerDataArray[i];
      const periodCfg = periodCloserConfigs[i] || cfg;
      const reunioes = data?.reunioes ?? 0;
      const metaReunioes = periodCfg.metas.reunioes ?? 1;
      const pct = Math.min(Math.round((reunioes / metaReunioes) * 100), 150);
      return { nome: (cfg?.nome ?? '').split(' ')[0] || 'Desconhecido', pct, tipo: 'Closer' };
    });
    return [...sdrItems, ...closerItems];
  }, [sdrConfigs, closerConfigs, sdrDataArray, closerDataArray, periodSDRConfigs, periodCloserConfigs]);

  const formatTick = (val: any) =>
    sdrMetricDef.currency ? `R$${((val ?? 0) / 1000).toFixed(0)}k` : String(val ?? 0);

  const formatCloserTick = (val: any) =>
    closerMetricDef.currency ? `R$${((val ?? 0) / 1000).toFixed(0)}k` : String(val ?? 0);

  return (
    <div className="relatorio-tab">

      {/* ─── Alertas ────────────────────────────────── */}
      <AlertsSection
        sdrData={sdrDataArray}
        sdrConfigs={periodSDRConfigs}
        closerData={closerDataArray}
        closerConfigs={periodCloserConfigs}
        isPeriodView={isPeriodView}
        daysWithAnyData={daysWithAnyData}
      />

      {/* ─── Performance Geral Cards ──────────────────── */}
      <section className="performance-overview-section">
        <div className="performance-cards-grid">
          <TotalCard
            type="sdr"
            allData={sdrDataArray}
            configs={periodSDRConfigs}
            periodLabel={`${sdrDataArray.filter(d => d !== null).length} dia(s)`}
            periodDays={1}
            startDate={startDate}
            endDate={endDate}
          />
          <TotalCard
            type="closer"
            allData={closerDataArray}
            configs={periodCloserConfigs}
            periodLabel={`${closerDataArray.filter(d => d !== null).length} dia(s)`}
            periodDays={1}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </section>

      {/* ─── Resumo Geral ─────────────────────────────── */}
      <section className="relatorio-section">
        <div className="relatorio-header">
          <h2>Resumo Geral</h2>
        </div>

        <div className="relatorio-summary-row">
          <div className="relatorio-team-block">
            <div className="relatorio-team-label sdr-label">Equipe SDR</div>
            <div className="relatorio-summary-grid">
              <div className="relatorio-summary-card">
                <span className="relatorio-card-label">Leads</span>
                <span className="relatorio-card-value">{(sdrSummary?.leads ?? 0).toLocaleString('pt-BR')}</span>
              </div>
              <div className="relatorio-summary-card">
                <span className="relatorio-card-label">Agendamentos</span>
                <span className="relatorio-card-value">{(sdrSummary?.agendamentos ?? 0).toLocaleString('pt-BR')}</span>
              </div>
              <div className="relatorio-summary-card">
                <span className="relatorio-card-label">Acontecidas</span>
                <span className="relatorio-card-value">{(sdrSummary?.acontecidas ?? 0).toLocaleString('pt-BR')}</span>
              </div>
              <div className="relatorio-summary-card">
                <span className="relatorio-card-label">Receita</span>
                <span className="relatorio-card-value">{formatCurrency(sdrSummary?.receita ?? 0)}</span>
              </div>
            </div>
          </div>

          <div className="relatorio-team-block">
            <div className="relatorio-team-label closer-label">Equipe Closer</div>
            <div className="relatorio-summary-grid">
              <div className="relatorio-summary-card">
                <span className="relatorio-card-label">Reuniões</span>
                <span className="relatorio-card-value">{(closerSummary?.reunioes ?? 0).toLocaleString('pt-BR')}</span>
              </div>
              <div className="relatorio-summary-card">
                <span className="relatorio-card-label">Contratos</span>
                <span className="relatorio-card-value">{(closerSummary?.contratos ?? 0).toLocaleString('pt-BR')}</span>
              </div>
              <div className="relatorio-summary-card">
                <span className="relatorio-card-label">Receita</span>
                <span className="relatorio-card-value">{formatCurrency(closerSummary?.receita ?? 0)}</span>
              </div>
              <div className="relatorio-summary-card">
                <span className="relatorio-card-label">Vendas</span>
                <span className="relatorio-card-value">{(closerSummary?.vendas ?? 0).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Performance Geral (%) ────────────────────── */}
      <section className="relatorio-section">
        <div className="relatorio-header">
          <h2>🎯 Performance Geral (% da Meta)</h2>
          <span className="relatorio-header-hint">SDR = leads | Closer = reuniões</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={performanceData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="nome" tick={{ fill: '#aaa', fontSize: 12 }} />
            <YAxis tick={{ fill: '#aaa', fontSize: 12 }} unit="%" domain={[0, 150]} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(val: number) => [`${val}%`, 'Performance']}
            />
            <Bar dataKey="pct" name="Performance" radius={[4, 4, 0, 0]}>
              {performanceData.map((entry, idx) => (
                <Cell key={idx} fill={getBarColor(entry.pct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="relatorio-legend">
          <span className="legend-dot" style={{ background: '#22c55e' }} />100%+ Meta
          <span className="legend-dot" style={{ background: '#f59e0b', marginLeft: 16 }} />70–99% Meta
          <span className="legend-dot" style={{ background: '#ef4444', marginLeft: 16 }} />Abaixo de 70%
        </div>
      </section>

      {/* ─── Gráfico SDR ──────────────────────────────── */}
      <section className="relatorio-section">
        <div className="relatorio-header">
          <h2>🟠 Análise SDR — Realizado vs Meta</h2>
          <div className="metric-selector">
            <label className="metric-selector-label">Indicador:</label>
            <select
              className="person-filter-select"
              value={sdrMetric}
              onChange={e => setSdrMetric(e.target.value as SDRMetric)}
            >
              {SDR_METRICS.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={sdrChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="nome" tick={{ fill: '#aaa', fontSize: 12 }} />
            <YAxis tick={{ fill: '#aaa', fontSize: 12 }} tickFormatter={formatTick} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(val: any) =>
                sdrMetricDef.currency ? formatCurrency(val ?? 0) : (val ?? 0).toLocaleString('pt-BR')
              }
            />
            <Legend wrapperStyle={{ color: '#aaa', fontSize: '0.85rem' }} />
            <Bar dataKey="Realizado" fill="#ff6b35" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Meta" fill="#3b3b3b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* ─── Gráfico Closer ───────────────────────────── */}
      <section className="relatorio-section">
        <div className="relatorio-header">
          <h2>🔵 Análise Closer — Realizado vs Meta</h2>
          <div className="metric-selector">
            <label className="metric-selector-label">Indicador:</label>
            <select
              className="person-filter-select"
              value={closerMetric}
              onChange={e => setCloserMetric(e.target.value as CloserMetric)}
            >
              {CLOSER_METRICS.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={closerChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="nome" tick={{ fill: '#aaa', fontSize: 12 }} />
            <YAxis tick={{ fill: '#aaa', fontSize: 12 }} tickFormatter={formatCloserTick} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(val: any) =>
                closerMetricDef.currency ? formatCurrency(val ?? 0) : (val ?? 0).toLocaleString('pt-BR')
              }
            />
            <Legend wrapperStyle={{ color: '#aaa', fontSize: '0.85rem' }} />
            <Bar dataKey="Realizado" fill="#00d4ff" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Meta" fill="#3b3b3b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

    </div>
  );
}
