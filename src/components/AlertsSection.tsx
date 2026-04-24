import { useState } from 'react';
import { SDRData, CloserData, SDRConfig, CloserConfig } from '../types';
import { getSDRStatus, getCloserStatus, getSDRPercent, getCloserPercent } from '../utils';

interface AlertsSectionProps {
  sdrData: (SDRData | null)[];
  sdrConfigs: SDRConfig[];
  closerData: (CloserData | null)[];
  closerConfigs: CloserConfig[];
  isPeriodView?: boolean;
  daysWithAnyData?: number;
}

interface Alert {
  severity: 'critico' | 'atencao';
  title: string;
  suggestion: string;
}

const SDR_SUGGESTIONS: Record<string, string> = {
  leads: 'Aumentar volume de prospecção e contatos.',
  agendamentos: 'Revisar abordagem e pitch de qualificação.',
  acontecidas: 'Reforçar confirmação de reuniões agendadas.',
  receita: 'Focar em qualificação de leads de maior potencial.',
};

const CLOSER_SUGGESTIONS: Record<string, string> = {
  reunioes: 'Verificar agenda e follow-ups pendentes.',
  contratos: 'Revisar proposta comercial e objeções.',
  receita: 'Focar em oportunidades de maior ticket.',
};

function getSDRWeakMetric(data: SDRData, metas: SDRConfig['metas']): string {
  const scores: Record<string, number> = {
    leads: metas.leads > 0 ? data.leads / metas.leads : 0,
    agendamentos: metas.agendamentos > 0 ? data.agendamentos / metas.agendamentos : 0,
    acontecidas: metas.acontecidas > 0 ? data.acontecidas / metas.acontecidas : 0,
    receita: metas.receita > 0 ? data.receita / metas.receita : 0,
  };
  return Object.entries(scores).sort((a, b) => a[1] - b[1])[0][0];
}

function getCloserWeakMetric(data: CloserData, metas: CloserConfig['metas']): string {
  const scores: Record<string, number> = {
    reunioes: metas.reunioes > 0 ? data.reunioes / metas.reunioes : 0,
    contratos: metas.contratos > 0 ? data.contratos / metas.contratos : 0,
    receita: metas.receita > 0 ? data.receita / metas.receita : 0,
  };
  return Object.entries(scores).sort((a, b) => a[1] - b[1])[0][0];
}

const MAX_VISIBLE = 3;

export default function AlertsSection({
  sdrData,
  sdrConfigs,
  closerData,
  closerConfigs,
  isPeriodView,
  daysWithAnyData,
}: AlertsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  // In period view with no data yet, hide entirely — nothing meaningful to alert
  if (isPeriodView && (daysWithAnyData === undefined || daysWithAnyData === 0)) {
    return null;
  }

  const alerts: Alert[] = [];

  // SDR alerts — only for people with data (or in daily view)
  sdrConfigs.forEach((config, i) => {
    const data = sdrData[i];
    // In period view, skip people with no data (they just haven't filled in yet)
    if (isPeriodView && !data) return;

    const effectiveData: SDRData = data ?? {
      id: config.id, nome: config.nome,
      leads: 0, agendamentos: 0, acontecidas: 0, receita: 0,
      ligacoes_whatsapp: 0, tempo_em_linha: 0,
      updatedAt: '',
    };
    const status = getSDRStatus(effectiveData, config.metas);
    const pct = getSDRPercent(effectiveData, config.metas);
    const periodLabel = isPeriodView ? 'do período' : 'diária';

    if (status === 'critico') {
      const weak = getSDRWeakMetric(effectiveData, config.metas);
      alerts.push({
        severity: 'critico',
        title: `${config.nome} — CRÍTICO (${pct}% da meta ${periodLabel})`,
        suggestion: SDR_SUGGESTIONS[weak] ?? 'Revisar atividades.',
      });
    } else if (status === 'atencao') {
      const weak = getSDRWeakMetric(effectiveData, config.metas);
      alerts.push({
        severity: 'atencao',
        title: `${config.nome} — ATENÇÃO (${pct}% da meta ${periodLabel})`,
        suggestion: SDR_SUGGESTIONS[weak] ?? 'Monitorar de perto.',
      });
    }
  });

  // Closer alerts
  closerConfigs.forEach((config, i) => {
    const data = closerData[i];
    if (isPeriodView && !data) return;

    const effectiveData: CloserData = data ?? {
      id: config.id, nome: config.nome,
      reunioes: 0, contratos: 0, receita: 0,
      updatedAt: '',
    };
    const status = getCloserStatus(effectiveData, config.metas);
    const pct = getCloserPercent(effectiveData, config.metas);
    const periodLabel = isPeriodView ? 'do período' : 'diária';

    if (status === 'critico') {
      const weak = getCloserWeakMetric(effectiveData, config.metas);
      alerts.push({
        severity: 'critico',
        title: `${config.nome} — CRÍTICO (${pct}% da meta ${periodLabel})`,
        suggestion: CLOSER_SUGGESTIONS[weak] ?? 'Revisar agenda do dia.',
      });
    } else if (status === 'atencao') {
      const weak = getCloserWeakMetric(effectiveData, config.metas);
      alerts.push({
        severity: 'atencao',
        title: `${config.nome} — ATENÇÃO (${pct}% da meta ${periodLabel})`,
        suggestion: CLOSER_SUGGESTIONS[weak] ?? 'Monitorar de perto.',
      });
    }
  });

  if (alerts.length === 0) return null;

  // Sort: crítico first
  alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critico' ? -1 : 1));

  const visible = expanded ? alerts : alerts.slice(0, MAX_VISIBLE);
  const hidden = alerts.length - MAX_VISIBLE;

  return (
    <div className="alerts-section">
      <div className="section-title">
        Alertas
        <span className={`section-label ${alerts.some(a => a.severity === 'critico') ? 'label-danger' : 'label-warn'}`}>
          {alerts.length} ativo{alerts.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="alerts-grid">
        {visible.map((alert, i) => (
          <div key={i} className={`alert-card alert-${alert.severity}`}>
            <span className="alert-icon">
              {alert.severity === 'critico' ? '🔴' : '🟡'}
            </span>
            <div className="alert-content">
              <div className="alert-title">{alert.title}</div>
              <div className="alert-suggestion">→ {alert.suggestion}</div>
            </div>
          </div>
        ))}
      </div>

      {alerts.length > MAX_VISIBLE && (
        <button className="alerts-expand-btn" onClick={() => setExpanded((e) => !e)}>
          {expanded
            ? '▲ Mostrar menos'
            : `▼ Ver mais ${hidden} alerta${hidden !== 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
}
