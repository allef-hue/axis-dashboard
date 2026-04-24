import { useMemo } from 'react';
import { SDRConfig, CloserConfig } from '../types';
import { getDayData } from '../storage';
import { formatDate, formatCurrency } from '../utils';
import TrendChart from './TrendChart';

interface HistoryModalSDR {
  type: 'sdr';
  config: SDRConfig;
  onClose: () => void;
}

interface HistoryModalCloser {
  type: 'closer';
  config: CloserConfig;
  onClose: () => void;
}

type HistoryModalProps = HistoryModalSDR | HistoryModalCloser;

interface SDREntry {
  date: string;
  leads: number;
  agendamentos: number;
  acontecidas: number;
}

interface CloserEntry {
  date: string;
  reunioes: number;
  contratos: number;
  receita: number;
}

function getDatesForLastNDays(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function getSDRHistory(personId: string, days: number): SDREntry[] {
  return getDatesForLastNDays(days).map((dateStr) => {
    const dayData = getDayData(dateStr);
    const d = dayData?.sdrs[personId];
    return {
      date: dateStr,
      leads: d?.leads ?? 0,
      agendamentos: d?.agendamentos ?? 0,
      acontecidas: d?.acontecidas ?? 0,
    };
  });
}

function getCloserHistory(personId: string, days: number): CloserEntry[] {
  return getDatesForLastNDays(days).map((dateStr) => {
    const dayData = getDayData(dateStr);
    const d = dayData?.closers[personId];
    return {
      date: dateStr,
      reunioes: d?.reunioes ?? 0,
      contratos: d?.contratos ?? 0,
      receita: d?.receita ?? 0,
    };
  });
}

function calcTrend(data: number[]): { dir: 'up' | 'down' | 'flat'; pct: number } {
  if (data.length < 2) return { dir: 'flat', pct: 0 };
  const half = Math.floor(data.length / 2);
  const prev = data.slice(0, half).reduce((s, v) => s + v, 0) / half;
  const curr = data.slice(half).reduce((s, v) => s + v, 0) / (data.length - half);
  if (prev === 0 && curr === 0) return { dir: 'flat', pct: 0 };
  if (prev === 0) return { dir: 'up', pct: 100 };
  const change = ((curr - prev) / prev) * 100;
  if (Math.abs(change) < 1) return { dir: 'flat', pct: 0 };
  return { dir: change > 0 ? 'up' : 'down', pct: Math.abs(Math.round(change)) };
}

function TrendIndicator({ dir, pct }: { dir: 'up' | 'down' | 'flat'; pct: number }) {
  if (dir === 'flat') return <span className="trend-flat">— Estável</span>;
  return (
    <span className={dir === 'up' ? 'trend-up' : 'trend-down'}>
      {dir === 'up' ? '▲' : '▼'} {pct}% vs período anterior
    </span>
  );
}

export default function HistoryModal(props: HistoryModalProps) {
  const { type, config, onClose } = props;

  const sdrHistory = useMemo(() => {
    if (type === 'sdr') return getSDRHistory(config.id, 7);
    return [];
  }, [type, config.id]);

  const closerHistory = useMemo(() => {
    if (type === 'closer') return getCloserHistory(config.id, 7);
    return [];
  }, [type, config.id]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  if (type === 'sdr') {
    const leadsData = sdrHistory.map((h) => ({ date: formatDate(h.date), value: h.leads }));
    const agendData = sdrHistory.map((h) => ({ date: formatDate(h.date), value: h.agendamentos }));
    const acontData = sdrHistory.map((h) => ({ date: formatDate(h.date), value: h.acontecidas }));

    const leadsTrend = calcTrend(sdrHistory.map((h) => h.leads));
    const agendTrend = calcTrend(sdrHistory.map((h) => h.agendamentos));
    const acontTrend = calcTrend(sdrHistory.map((h) => h.acontecidas));

    return (
      <div className="modal-overlay" onClick={handleOverlayClick}>
        <div className="modal history-modal" role="dialog" aria-modal="true">
          <div className="modal-header">
            <div>
              <div className="modal-title">{config.nome}</div>
              <div className="modal-date">SDR · Últimos 7 dias</div>
            </div>
            <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
          </div>

          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Leads</th>
                  <th>Agend.</th>
                  <th>Acontec.</th>
                </tr>
              </thead>
              <tbody>
                {sdrHistory.map((h) => (
                  <tr key={h.date}>
                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                      {formatDate(h.date)}
                    </td>
                    <td>{h.leads}</td>
                    <td>{h.agendamentos}</td>
                    <td>{h.acontecidas}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="history-charts">
              <div className="history-chart-item">
                <div className="history-chart-label">Leads</div>
                <TrendChart data={leadsData} color="var(--primary)" label="Leads" />
                <div className="trend-stat"><TrendIndicator {...leadsTrend} /></div>
              </div>
              <div className="history-chart-item">
                <div className="history-chart-label">Agendamentos</div>
                <TrendChart data={agendData} color="var(--success)" label="Agendamentos" />
                <div className="trend-stat"><TrendIndicator {...agendTrend} /></div>
              </div>
              <div className="history-chart-item">
                <div className="history-chart-label">Acontecidas</div>
                <TrendChart data={acontData} color="var(--warning)" label="Acontecidas" />
                <div className="trend-stat"><TrendIndicator {...acontTrend} /></div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-cancel" style={{ flex: 1 }} onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>
    );
  }

  // Closer
  const reunData = closerHistory.map((h) => ({ date: formatDate(h.date), value: h.reunioes }));
  const contData = closerHistory.map((h) => ({ date: formatDate(h.date), value: h.contratos }));
  const recData = closerHistory.map((h) => ({ date: formatDate(h.date), value: h.receita }));

  const reunTrend = calcTrend(closerHistory.map((h) => h.reunioes));
  const contTrend = calcTrend(closerHistory.map((h) => h.contratos));
  const recTrend = calcTrend(closerHistory.map((h) => h.receita));

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal history-modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <div className="modal-title">{config.nome}</div>
            <div className="modal-date">Closer · Últimos 7 dias</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <table className="history-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Reuniões</th>
                <th>Contratos</th>
                <th>Receita</th>
              </tr>
            </thead>
            <tbody>
              {closerHistory.map((h) => (
                <tr key={h.date}>
                  <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                    {formatDate(h.date)}
                  </td>
                  <td>{h.reunioes.toFixed(1)}</td>
                  <td>{h.contratos.toFixed(2)}</td>
                  <td>{formatCurrency(h.receita)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="history-charts">
            <div className="history-chart-item">
              <div className="history-chart-label">Reuniões</div>
              <TrendChart data={reunData} color="var(--primary)" label="Reuniões" />
              <div className="trend-stat"><TrendIndicator {...reunTrend} /></div>
            </div>
            <div className="history-chart-item">
              <div className="history-chart-label">Contratos</div>
              <TrendChart data={contData} color="var(--success)" label="Contratos" />
              <div className="trend-stat"><TrendIndicator {...contTrend} /></div>
            </div>
            <div className="history-chart-item">
              <div className="history-chart-label">Receita</div>
              <TrendChart data={recData} color="var(--warning)" label="Receita" />
              <div className="trend-stat"><TrendIndicator {...recTrend} /></div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" style={{ flex: 1 }} onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
