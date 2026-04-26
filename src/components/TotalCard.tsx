import { SDRData, CloserData, SDRConfig, CloserConfig } from '../types';
import { formatCurrency } from '../utils';
import ProgressBar from './ProgressBar';

// Force rebuild - includes MRR/ARR totals for Closer Performance Geral (v2)


interface TotalCardSDR {
  type: 'sdr';
  allData: (SDRData | null)[];
  configs: SDRConfig[];
  periodLabel?: string;
  periodDays?: number;
}

interface TotalCardCloser {
  type: 'closer';
  allData: (CloserData | null)[];
  configs: CloserConfig[];
  periodLabel?: string;
  periodDays?: number;
}

type TotalCardProps = TotalCardSDR | TotalCardCloser;

function getPctClass(pct: number): string {
  if (pct >= 80) return 'pct-good';
  if (pct >= 50) return 'pct-warn';
  return 'pct-bad';
}

export default function TotalCard(props: TotalCardProps) {
  const isPeriod = props.periodDays !== undefined && props.periodDays > 1;
  const subLabel = isPeriod
    ? `${props.periodDays} dia(s)`
    : 'Hoje';

  if (props.type === 'sdr') {
    const { allData, configs } = props;

    const metas = {
      leads: configs.reduce((s, c) => s + c.metas.leads, 0),
      agendamentos: configs.reduce((s, c) => s + c.metas.agendamentos, 0),
      acontecidas: configs.reduce((s, c) => s + c.metas.acontecidas, 0),
      receita: configs.reduce((s, c) => s + c.metas.receita, 0),
      ligacoes_whatsapp: configs.reduce((s, c) => s + c.metas.ligacoes_whatsapp, 0),
      tempo_em_linha: configs.reduce((s, c) => s + c.metas.tempo_em_linha, 0),
      rqa: configs.reduce((s, c) => s + (c.metas.rqa ?? 0), 0),
    };

    const totals = {
      leads: allData.reduce((s, d) => s + (d?.leads ?? 0), 0),
      agendamentos: allData.reduce((s, d) => s + (d?.agendamentos ?? 0), 0),
      acontecidas: allData.reduce((s, d) => s + (d?.acontecidas ?? 0), 0),
      receita: allData.reduce((s, d) => s + (d?.receita ?? 0), 0),
      ligacoes_whatsapp: allData.reduce((s, d) => s + (d?.ligacoes_whatsapp ?? 0), 0),
      tempo_em_linha: allData.reduce((s, d) => s + (d?.tempo_em_linha ?? 0), 0),
      rqa: allData.reduce((s, d) => s + (d?.rqa ?? 0), 0),
    };

    const leadsP = metas.leads > 0 ? totals.leads / metas.leads : 0;
    const agendP = metas.agendamentos > 0 ? totals.agendamentos / metas.agendamentos : 0;
    const acontP = metas.acontecidas > 0 ? totals.acontecidas / metas.acontecidas : 0;
    const recP = metas.receita > 0 ? totals.receita / metas.receita : 0;
    const rqaMetaVal = metas.rqa || 50;
    const rqaP = totals.rqa / rqaMetaVal;
    const overallPct = Math.min(Math.round(((leadsP + agendP + acontP + recP + rqaP) / 5) * 100), 100);
    const pctClass = getPctClass(overallPct);
    const activeCount = allData.filter((d) => d !== null).length;

    return (
      <div className="total-card">
        <div className="total-card-left">
          <div className="total-card-label">Equipe SDR</div>
          <div className="total-card-title">Performance Geral</div>
          <div className="total-card-perf">
            <span className={`total-perf-number ${pctClass}`}>{overallPct}%</span>
          </div>
          <div className="total-team-count">{activeCount}/{configs.length} SDRs · {subLabel}</div>
          {isPeriod && props.periodLabel && (
            <div className="total-period-label">{props.periodLabel}</div>
          )}
        </div>
        <div className="total-card-right">
          <ProgressBar value={totals.leads} max={metas.leads} label="Leads (Total)" />
          <ProgressBar
            value={totals.ligacoes_whatsapp}
            max={metas.ligacoes_whatsapp}
            label="Ligações WhatsApp"
            formatValue={(v) => Math.round(v).toString()}
          />
          <ProgressBar
            value={totals.tempo_em_linha}
            max={metas.tempo_em_linha}
            label="Tempo em Linha (Total)"
            formatValue={(v) => `${Math.round(v)} min`}
          />
          <ProgressBar value={totals.agendamentos} max={metas.agendamentos} label="Agendamentos (Total)" />
          <ProgressBar value={totals.acontecidas} max={metas.acontecidas} label="Acontecidas (Total)" />
          <ProgressBar value={totals.rqa} max={metas.rqa || 50} label="RQA (Total)" formatValue={(v) => v.toFixed(1)} />
          <ProgressBar value={totals.receita} max={metas.receita} label="Pago (Total)" formatValue={formatCurrency} isCurrency />
        </div>
      </div>
    );
  }

  // Closer
  const { allData, configs } = props;

  const metas = {
    reunioes: configs.reduce((s, c) => s + c.metas.reunioes, 0),
    proposta: configs.reduce((s, c) => s + (c.metas.proposta ?? 0), 0),
    contratos: configs.reduce((s, c) => s + c.metas.contratos, 0),
  };

  const totals = {
    reunioes: allData.reduce((s, d) => s + (d?.reunioes ?? 0), 0),
    proposta: allData.reduce((s, d) => s + (d?.proposta ?? 0), 0),
    contratos: allData.reduce((s, d) => s + (d?.contratos ?? 0), 0),
    mrr: allData.reduce((s, d) => s + (d?.mrr ?? 0), 0),
    arr: allData.reduce((s, d) => s + (d?.arr ?? 0), 0),
  };

  const reunP = metas.reunioes > 0 ? totals.reunioes / metas.reunioes : 0;
  const propMetaVal = metas.proposta || 4.5;
  const propP = totals.proposta / propMetaVal;
  const contP = metas.contratos > 0 ? totals.contratos / metas.contratos : 0;
  const overallPct = Math.min(Math.round(((reunP + propP + contP) / 3) * 100), 100);
  const pctClass = getPctClass(overallPct);
  const activeCount = allData.filter((d) => d !== null).length;

  return (
    <div className="total-card closer-card">
      <div className="total-card-left">
        <div className="total-card-label">Equipe Closer</div>
        <div className="total-card-title">Performance Geral</div>
        <div className="total-card-perf">
          <span className={`total-perf-number ${pctClass}`}>{overallPct}%</span>
        </div>
        <div className="total-team-count">{activeCount}/{configs.length} Closers · {subLabel}</div>
        {isPeriod && props.periodLabel && (
          <div className="total-period-label">{props.periodLabel}</div>
        )}
      </div>
      <div className="total-card-right">
        <ProgressBar
          value={totals.reunioes}
          max={metas.reunioes}
          label="Reunião Acontecida (Total)"
          formatValue={(v) => v.toFixed(1)}
        />
        <ProgressBar
          value={totals.proposta}
          max={metas.proposta || 4.5}
          label="Proposta (Total)"
          formatValue={(v) => v.toFixed(1)}
        />
        <ProgressBar
          value={totals.contratos}
          max={metas.contratos}
          label="Contrato Assinado (Total)"
          formatValue={(v) => v.toFixed(2)}
        />
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>MRR</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text)' }}>{formatCurrency(totals.mrr)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>ARR</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text)' }}>{formatCurrency(totals.arr)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
