import { SDRData, CloserData, LeadershipGoals } from '../types';
import { formatCurrency } from '../utils';
import ProgressBar from './ProgressBar';

interface PaceLiderancaTabProps {
  sdrData: (SDRData | null)[];
  closerData: (CloserData | null)[];
  leadershipGoals: LeadershipGoals;
}

function getPctClass(pct: number): string {
  if (pct >= 80) return 'pct-good';
  if (pct >= 50) return 'pct-warn';
  return 'pct-bad';
}

export default function PaceLiderancaTab({
  sdrData,
  closerData,
  leadershipGoals,
}: PaceLiderancaTabProps) {
  // Aggregate SDR totals
  const sdrTotals = {
    leads: sdrData.reduce((s, d) => s + (d?.leads ?? 0), 0),
    agendamentos: sdrData.reduce((s, d) => s + (d?.agendamentos ?? 0), 0),
    acontecidas: sdrData.reduce((s, d) => s + (d?.acontecidas ?? 0), 0),
    receita: sdrData.reduce((s, d) => s + (d?.receita ?? 0), 0),
    ligacoes_whatsapp: sdrData.reduce((s, d) => s + (d?.ligacoes_whatsapp ?? 0), 0),
    tempo_em_linha: sdrData.reduce((s, d) => s + (d?.tempo_em_linha ?? 0), 0),
  };

  // Aggregate Closer totals
  const closerTotals = {
    reunioes: closerData.reduce((s, d) => s + (d?.reunioes ?? 0), 0),
    contratos: closerData.reduce((s, d) => s + (d?.contratos ?? 0), 0),
    receita: closerData.reduce((s, d) => s + (d?.receita ?? 0), 0),
    vendas: closerData.reduce((s, d) => s + (d?.vendas ?? 0), 0),
    arr: closerData.reduce((s, d) => s + (d?.arr ?? 0), 0),
    mrr: closerData.reduce((s, d) => s + (d?.mrr ?? 0), 0),
    valor_recebido: closerData.reduce((s, d) => s + (d?.valor_recebido ?? 0), 0),
  };

  // Calculate percentages for SDR
  const sdrLeadsP = leadershipGoals.sdr.leads > 0 ? sdrTotals.leads / leadershipGoals.sdr.leads : 0;
  const sdrAgendP =
    leadershipGoals.sdr.agendamentos > 0
      ? sdrTotals.agendamentos / leadershipGoals.sdr.agendamentos
      : 0;
  const sdrAcontP =
    leadershipGoals.sdr.acontecidas > 0 ? sdrTotals.acontecidas / leadershipGoals.sdr.acontecidas : 0;
  const sdrRecP = leadershipGoals.sdr.receita > 0 ? sdrTotals.receita / leadershipGoals.sdr.receita : 0;

  const sdrOverallPct = Math.min(
    Math.round(((sdrLeadsP + sdrAgendP + sdrAcontP + sdrRecP) / 4) * 100),
    100
  );

  // Calculate percentages for Closer
  const closerReunP =
    leadershipGoals.closer.reunioes > 0 ? closerTotals.reunioes / leadershipGoals.closer.reunioes : 0;
  const closerContP =
    leadershipGoals.closer.contratos > 0 ? closerTotals.contratos / leadershipGoals.closer.contratos : 0;
  const closerRecP = leadershipGoals.closer.receita > 0 ? closerTotals.receita / leadershipGoals.closer.receita : 0;

  const closerOverallPct = Math.min(Math.round(((closerReunP + closerContP + closerRecP) / 3) * 100), 100);

  const isGoalsEmpty =
    Object.values(leadershipGoals.sdr).every((v) => v === 0) &&
    Object.values(leadershipGoals.closer).every((v) => v === 0);

  if (isGoalsEmpty) {
    return (
      <div className="pace-lideranca-tab">
        <div className="empty-state">
          <div className="empty-state-icon">⚙️</div>
          <div className="empty-state-title">Metas Gerais não configuradas</div>
          <div className="empty-state-hint">Clique em "Config" para definir as metas gerais da liderança</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pace-lideranca-tab">
      {/* SDR Liderança */}
      <div className="leadership-card">
        <div className="leadership-card-left">
          <div className="leadership-card-label">Liderança SDR</div>
          <div className="leadership-card-title">Performance Geral</div>
          <div className="leadership-card-perf">
            <span className={`leadership-perf-number ${getPctClass(sdrOverallPct)}`}>{sdrOverallPct}%</span>
          </div>
        </div>
        <div className="leadership-card-right">
          <ProgressBar value={sdrTotals.leads} max={leadershipGoals.sdr.leads} label="Leads (Meta)" />
          <ProgressBar
            value={sdrTotals.ligacoes_whatsapp}
            max={leadershipGoals.sdr.ligacoes_whatsapp}
            label="Ligações WhatsApp (Meta)"
            formatValue={(v) => Math.round(v).toString()}
          />
          <ProgressBar
            value={sdrTotals.tempo_em_linha}
            max={leadershipGoals.sdr.tempo_em_linha}
            label="Tempo em Linha (Meta)"
            formatValue={(v) => `${Math.round(v)} min`}
          />
          <ProgressBar
            value={sdrTotals.agendamentos}
            max={leadershipGoals.sdr.agendamentos}
            label="Agendamentos (Meta)"
          />
          <ProgressBar
            value={sdrTotals.acontecidas}
            max={leadershipGoals.sdr.acontecidas}
            label="Acontecidas (Meta)"
          />
          <ProgressBar
            value={sdrTotals.receita}
            max={leadershipGoals.sdr.receita}
            label="Receita Originada (Meta)"
            formatValue={formatCurrency}
            isCurrency
          />
        </div>
      </div>

      {/* Closer Liderança */}
      <div className="leadership-card closer-card">
        <div className="leadership-card-left">
          <div className="leadership-card-label">Liderança Closer</div>
          <div className="leadership-card-title">Performance Geral</div>
          <div className="leadership-card-perf">
            <span className={`leadership-perf-number ${getPctClass(closerOverallPct)}`}>{closerOverallPct}%</span>
          </div>
        </div>
        <div className="leadership-card-right">
          <ProgressBar
            value={closerTotals.reunioes}
            max={leadershipGoals.closer.reunioes}
            label="Reuniões (Meta)"
            formatValue={(v) => v.toFixed(1)}
          />
          <ProgressBar
            value={closerTotals.contratos}
            max={leadershipGoals.closer.contratos}
            label="Contratos (Meta)"
            formatValue={(v) => v.toFixed(2)}
          />
          <ProgressBar
            value={closerTotals.vendas}
            max={leadershipGoals.closer.vendas}
            label="Vendas (Meta)"
            formatValue={(v) => Math.round(v).toString()}
          />
          <ProgressBar
            value={closerTotals.receita}
            max={leadershipGoals.closer.receita}
            label="Receita (Meta)"
            formatValue={formatCurrency}
          />
          <ProgressBar
            value={closerTotals.arr}
            max={leadershipGoals.closer.arr}
            label="ARR (Meta)"
            formatValue={formatCurrency}
            isCurrency
          />
          <ProgressBar
            value={closerTotals.mrr}
            max={leadershipGoals.closer.mrr}
            label="MRR (Meta)"
            formatValue={formatCurrency}
            isCurrency
          />
          <ProgressBar
            value={closerTotals.valor_recebido}
            max={leadershipGoals.closer.valor_recebido}
            label="Valor Recebido (Meta)"
            formatValue={formatCurrency}
            isCurrency
          />
        </div>
      </div>
    </div>
  );
}
