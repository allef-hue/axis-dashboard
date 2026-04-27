import { SDRConfig, CloserConfig, SDRData, CloserData } from '../types';
import {
  getSDRStatus, getCloserStatus,
  getSDRPercent, getCloserPercent,
  formatCurrency, formatTime,
  calculatePaceForDateRange, limitDecimals,
} from '../utils';
import { usePermission } from '../context/PermissionContext';
import StatusBadge from './StatusBadge';
import ProgressBar from './ProgressBar';

interface PersonCardSDR {
  type: 'sdr';
  config: SDRConfig;
  monthlyConfig?: SDRConfig; // For gap display in period view
  data: SDRData | null;
  isPeriodView?: boolean;
  daysWithData?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  onEdit: () => void;
  onHistory: () => void;
}

interface PersonCardCloser {
  type: 'closer';
  config: CloserConfig;
  monthlyConfig?: CloserConfig; // For gap display in period view
  data: CloserData | null;
  isPeriodView?: boolean;
  daysWithData?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  onEdit: () => void;
  onHistory: () => void;
}

type PersonCardProps = PersonCardSDR | PersonCardCloser;

function getPctClass(pct: number): string {
  if (pct >= 80) return 'pct-good';
  if (pct >= 50) return 'pct-warn';
  return 'pct-bad';
}

export default function PersonCard(props: PersonCardProps) {
  const { type, config, monthlyConfig, data, isPeriodView, daysWithData, onEdit, onHistory } = props;
  const { canEdit } = usePermission();

  if (type === 'sdr') {
    const cfg = config as SDRConfig;
    const sdrData = data as SDRData | null;
    const eff: SDRData = sdrData ?? {
      id: cfg.id, nome: cfg.nome,
      leads: 0, agendamentos: 0, acontecidas: 0, receita: 0,
      ligacoes_whatsapp: 0, tempo_em_linha: 0,
      updatedAt: '',
    };
    const status = getSDRStatus(eff, cfg.metas);
    const pct = getSDRPercent(eff, cfg.metas);

    // Calcula o pace se datas forem fornecidas
    let paceInfo = null;
    if (props.startDate && props.endDate && cfg.metas.leads > 0) {
      paceInfo = calculatePaceForDateRange(cfg.metas.leads, props.startDate, props.endDate, eff.leads);
    }

    return (
      <div className={`person-card status-${status}`}>
        <div className="card-header">
          <div>
            <div className="card-name">{cfg.nome}</div>
            {isPeriodView && daysWithData !== undefined && daysWithData > 0 && (
              <div className="card-updated">{daysWithData} dia(s) com dados</div>
            )}
            {!isPeriodView && sdrData?.updatedAt && (
              <div className="card-updated">Atualizado às {formatTime(sdrData.updatedAt)}</div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <StatusBadge status={status} />
            <span className={`card-percent ${getPctClass(pct)}`}>{pct}%</span>
          </div>
        </div>

        <div className="card-metrics">
          <ProgressBar value={eff.leads} max={cfg.metas.leads} label="Leads" />
          <ProgressBar
            value={eff.ligacoes_whatsapp}
            max={cfg.metas.ligacoes_whatsapp}
            label="Ligações WhatsApp"
            formatValue={(v) => Math.round(v).toString()}
          />
          <ProgressBar
            value={eff.tempo_em_linha}
            max={cfg.metas.tempo_em_linha}
            label="Tempo em Linha"
            formatValue={(v) => `${Math.round(v)} min`}
          />
          <ProgressBar value={eff.agendamentos} max={cfg.metas.agendamentos} label="Agendamentos" />
          <ProgressBar value={eff.acontecidas} max={cfg.metas.acontecidas} label="Acontecidas" />
          <ProgressBar
            value={eff.rqa ?? 0}
            max={cfg.metas.rqa ?? 10}
            label="RQA"
            formatValue={(v) => v.toFixed(1)}
          />
          <ProgressBar
            value={eff.receita}
            max={cfg.metas.receita}
            label="Pago"
            formatValue={formatCurrency}
            isCurrency
          />
        </div>

        {/* Seção de Pace */}
        {paceInfo && (
          <div className="pace-section">
            <div className="pace-title">Leads (Pace do Período)</div>
            <div className="pace-row">
              <span className="pace-label">Realizado:</span>
              <span className="pace-value">{Math.round(eff.leads)}</span>
            </div>
            <div className="pace-row">
              <span className="pace-label">Pace esperado:</span>
              <span className="pace-value">{Math.round(paceInfo.paceEsperado)}</span>
            </div>
            <div className="pace-row">
              <span className="pace-label">Dias úteis:</span>
              <span className="pace-value">{paceInfo.diasUteis}</span>
            </div>
            <div className="pace-row pace-saude">
              <span className="pace-label">Saúde:</span>
              <span className={`pace-saude-value ${paceInfo.saude >= 100 ? 'saude-good' : paceInfo.saude >= 50 ? 'saude-warn' : 'saude-bad'}`}>
                {limitDecimals(paceInfo.saude, 2)}%
              </span>
            </div>
          </div>
        )}

        {isPeriodView && monthlyConfig && (
          <div className="card-gap-row">
            <div className="gap-label">Gap vs. Esperado:</div>
            <div className="gap-metrics">
              <span className={`gap-item ${eff.leads - cfg.metas.leads >= 0 ? 'gap-positive' : 'gap-negative'}`}>
                {eff.leads - cfg.metas.leads >= 0 ? '+' : ''}{Math.round(eff.leads - cfg.metas.leads)} Leads
              </span>
              <span className={`gap-item ${eff.agendamentos - cfg.metas.agendamentos >= 0 ? 'gap-positive' : 'gap-negative'}`}>
                {eff.agendamentos - cfg.metas.agendamentos >= 0 ? '+' : ''}{(eff.agendamentos - cfg.metas.agendamentos).toFixed(1)} Agend.
              </span>
              <span className={`gap-item ${eff.acontecidas - cfg.metas.acontecidas >= 0 ? 'gap-positive' : 'gap-negative'}`}>
                {eff.acontecidas - cfg.metas.acontecidas >= 0 ? '+' : ''}{Math.round(eff.acontecidas - cfg.metas.acontecidas)} Acont.
              </span>
              <span className={`gap-item ${(eff.rqa ?? 0) - (cfg.metas.rqa ?? 10) >= 0 ? 'gap-positive' : 'gap-negative'}`}>
                {(eff.rqa ?? 0) - (cfg.metas.rqa ?? 10) >= 0 ? '+' : ''}{((eff.rqa ?? 0) - (cfg.metas.rqa ?? 10)).toFixed(1)} RQA
              </span>
            </div>
          </div>
        )}

        {!sdrData && !isPeriodView && (
          <div className="card-empty-hint">Clique em "Meu Pace" para registrar seu dados</div>
        )}
        {!sdrData && isPeriodView && (
          <div className="card-empty-hint">Sem dados no período — preencha seu Pace diariamente</div>
        )}

        <div className="card-actions">
          <button
            className="btn-edit"
            onClick={onEdit}
            disabled={!canEdit(cfg.email)}
            title={canEdit(cfg.email) ? '' : 'Apenas você ou admin pode editar'}
          >
            {isPeriodView ? '✎ Meu Pace' : 'Meu Pace'}
          </button>
          <button className="btn-history" onClick={onHistory}>Histórico</button>
        </div>
        {!canEdit(cfg.email) && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '6px' }}>
            Apenas leitura
          </div>
        )}
      </div>
    );
  }

  // Closer
  const cfg = config as CloserConfig;
  const closerData = data as CloserData | null;
  const eff: CloserData = closerData ?? {
    id: cfg.id, nome: cfg.nome,
    reunioes: 0, contratos: 0, receita: 0,
    vendas: 0, arr: 0, mrr: 0, valor_recebido: 0,
    updatedAt: '',
  };
  const status = getCloserStatus(eff, cfg.metas);
  const pct = getCloserPercent(eff, cfg.metas);

  // Calcula o pace se datas forem fornecidas
  let closerPaceInfo = null;
  if (props.startDate && props.endDate && cfg.metas.reunioes > 0) {
    closerPaceInfo = calculatePaceForDateRange(cfg.metas.reunioes, props.startDate, props.endDate, eff.reunioes);
  }

  return (
    <div className={`person-card status-${status}`}>
      <div className="card-header">
        <div>
          <div className="card-name">{cfg.nome}</div>
          {isPeriodView && daysWithData !== undefined && daysWithData > 0 && (
            <div className="card-updated">{daysWithData} dia(s) com dados</div>
          )}
          {!isPeriodView && closerData?.updatedAt && (
            <div className="card-updated">Atualizado às {formatTime(closerData.updatedAt)}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <StatusBadge status={status} />
          <span className={`card-percent ${getPctClass(pct)}`}>{pct}%</span>
        </div>
      </div>

      <div className="card-metrics">
        <ProgressBar value={eff.reunioes} max={cfg.metas.reunioes} label="Reunião Acontecida" formatValue={(v) => v.toFixed(1)} />
        <ProgressBar value={eff.proposta ?? 0} max={cfg.metas.proposta ?? 1.5} label="Proposta" formatValue={(v) => v.toFixed(1)} />
        <ProgressBar value={eff.contratos} max={cfg.metas.contratos} label="Contrato Assinado" formatValue={(v) => v.toFixed(2)} />
      </div>

      {/* Additional metrics without metas */}
      <div className="card-additional-metrics">
        <div className="metric-simple">
          <span className="metric-simple-label">MRR</span>
          <span className="metric-simple-value">{formatCurrency(eff.mrr ?? 0)}</span>
        </div>
        <div className="metric-simple">
          <span className="metric-simple-label">ARR</span>
          <span className="metric-simple-value">{formatCurrency(eff.arr ?? 0)}</span>
        </div>
      </div>

      {/* Seção de Pace */}
      {closerPaceInfo && (
        <div className="pace-section">
          <div className="pace-title">Reuniões (Pace do Período)</div>
          <div className="pace-row">
            <span className="pace-label">Realizado:</span>
            <span className="pace-value">{limitDecimals(eff.reunioes, 2)}</span>
          </div>
          <div className="pace-row">
            <span className="pace-label">Pace esperado:</span>
            <span className="pace-value">{limitDecimals(closerPaceInfo.paceEsperado, 2)}</span>
          </div>
          <div className="pace-row">
            <span className="pace-label">Dias úteis:</span>
            <span className="pace-value">{closerPaceInfo.diasUteis}</span>
          </div>
          <div className="pace-row pace-saude">
            <span className="pace-label">Saúde:</span>
            <span className={`pace-saude-value ${closerPaceInfo.saude >= 100 ? 'saude-good' : closerPaceInfo.saude >= 50 ? 'saude-warn' : 'saude-bad'}`}>
              {limitDecimals(closerPaceInfo.saude, 2)}%
            </span>
          </div>
        </div>
      )}

      {isPeriodView && monthlyConfig && (
        <div className="card-gap-row">
          <div className="gap-label">Gap vs. Esperado:</div>
          <div className="gap-metrics">
            <span className={`gap-item ${eff.reunioes - cfg.metas.reunioes >= 0 ? 'gap-positive' : 'gap-negative'}`}>
              {eff.reunioes - cfg.metas.reunioes >= 0 ? '+' : ''}{(eff.reunioes - cfg.metas.reunioes).toFixed(1)} Reun.
            </span>
            <span className={`gap-item ${(eff.proposta ?? 0) - (cfg.metas.proposta ?? 1.5) >= 0 ? 'gap-positive' : 'gap-negative'}`}>
              {(eff.proposta ?? 0) - (cfg.metas.proposta ?? 1.5) >= 0 ? '+' : ''}{((eff.proposta ?? 0) - (cfg.metas.proposta ?? 1.5)).toFixed(1)} Prop.
            </span>
            <span className={`gap-item ${eff.contratos - cfg.metas.contratos >= 0 ? 'gap-positive' : 'gap-negative'}`}>
              {eff.contratos - cfg.metas.contratos >= 0 ? '+' : ''}{(eff.contratos - cfg.metas.contratos).toFixed(2)} Contr.
            </span>
          </div>
        </div>
      )}

      {!closerData && !isPeriodView && (
        <div className="card-empty-hint">Clique em "Meu Pace" para registrar seus dados</div>
      )}
      {!closerData && isPeriodView && (
        <div className="card-empty-hint">Sem dados no período — preencha seu Pace diariamente</div>
      )}

      <div className="card-actions">
        <button
          className="btn-edit"
          onClick={onEdit}
          disabled={!canEdit(cfg.email)}
          title={canEdit(cfg.email) ? '' : 'Apenas você ou admin pode editar'}
        >
          {isPeriodView ? '✎ Meu Pace' : 'Meu Pace'}
        </button>
        <button className="btn-history" onClick={onHistory}>Histórico</button>
      </div>
      {!canEdit(cfg.email) && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '6px' }}>
          Apenas leitura
        </div>
      )}
    </div>
  );
}
