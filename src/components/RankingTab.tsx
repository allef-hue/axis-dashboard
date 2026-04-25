import { useState, useMemo } from 'react';
import { SDRConfig, CloserConfig, SDRData, CloserData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils';

interface RankingTabProps {
  sdrConfigs: SDRConfig[];
  closerConfigs: CloserConfig[];
  sdrDataArray: (SDRData | null)[];
  closerDataArray: (CloserData | null)[];
}

type SDRMetric = 'leads' | 'agendamentos' | 'acontecidas' | 'receita';
type CloserMetric = 'reunioes' | 'contratos' | 'receita';

interface RankingEntry {
  position: number;
  name: string;
  value: number;
}

export default function RankingTab({
  sdrConfigs,
  closerConfigs,
  sdrDataArray,
  closerDataArray,
}: RankingTabProps) {
  const [sdrMetric, setSdrMetric] = useState<SDRMetric>('leads');
  const [closerMetric, setCloserMetric] = useState<CloserMetric>('reunioes');

  const sdrRanking = useMemo((): RankingEntry[] => {
    const entries = sdrConfigs
      .map((config, i) => ({
        name: config.nome,
        value: sdrDataArray[i]?.[sdrMetric] ?? 0,
      }))
      .sort((a, b) => b.value - a.value)
      .map((entry, i) => ({
        position: i + 1,
        ...entry,
      }));
    return entries;
  }, [sdrConfigs, sdrDataArray, sdrMetric]);

  const closerRanking = useMemo((): RankingEntry[] => {
    const entries = closerConfigs
      .map((config, i) => ({
        name: config.nome,
        value: closerDataArray[i]?.[closerMetric] ?? 0,
      }))
      .sort((a, b) => b.value - a.value)
      .map((entry, i) => ({
        position: i + 1,
        ...entry,
      }));
    return entries;
  }, [closerConfigs, closerDataArray, closerMetric]);

  const sdrMetricLabel = {
    leads: 'Leads',
    agendamentos: 'Agendamentos',
    acontecidas: 'Acontecidas',
    receita: 'Receita',
  };

  const closerMetricLabel = {
    reunioes: 'Reuniões',
    contratos: 'Contratos',
    receita: 'Receita',
  };

  const formatValue = (value: number, metric: SDRMetric | CloserMetric) => {
    if (metric === 'receita') return formatCurrency(value);
    return value;
  };

  return (
    <div className="ranking-tab">
      {/* SDR RANKING */}
      <div className="ranking-section">
        <div className="ranking-header">
          <h2>Ranking SDR</h2>
          <div className="metric-selector">
            <label>Indicador:</label>
            <select value={sdrMetric} onChange={(e) => setSdrMetric(e.target.value as SDRMetric)}>
              <option value="leads">Leads</option>
              <option value="agendamentos">Agendamentos</option>
              <option value="acontecidas">Acontecidas</option>
              <option value="receita">Receita</option>
            </select>
          </div>
        </div>

        <div className="ranking-content">
          <div className="ranking-chart">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sdrRanking}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #ff6b35',
                    borderRadius: '4px',
                  }}
                  formatter={(value) => formatValue(value as number, sdrMetric)}
                />
                <Bar dataKey="value" fill="#ff6b35" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="ranking-table">
            <table>
              <thead>
                <tr>
                  <th>Posição</th>
                  <th>Nome</th>
                  <th>{sdrMetricLabel[sdrMetric]}</th>
                </tr>
              </thead>
              <tbody>
                {sdrRanking.map((entry) => (
                  <tr key={entry.name}>
                    <td className={`position pos-${entry.position}`}>{entry.position}º</td>
                    <td>{entry.name}</td>
                    <td className="value">{formatValue(entry.value, sdrMetric)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CLOSER RANKING */}
      <div className="ranking-section">
        <div className="ranking-header">
          <h2>Ranking Closer</h2>
          <div className="metric-selector">
            <label>Indicador:</label>
            <select value={closerMetric} onChange={(e) => setCloserMetric(e.target.value as CloserMetric)}>
              <option value="reunioes">Reuniões</option>
              <option value="contratos">Contratos</option>
              <option value="receita">Receita</option>
            </select>
          </div>
        </div>

        <div className="ranking-content">
          <div className="ranking-chart">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={closerRanking}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #00d4ff',
                    borderRadius: '4px',
                  }}
                  formatter={(value) => formatValue(value as number, closerMetric)}
                />
                <Bar dataKey="value" fill="#00d4ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="ranking-table">
            <table>
              <thead>
                <tr>
                  <th>Posição</th>
                  <th>Nome</th>
                  <th>{closerMetricLabel[closerMetric]}</th>
                </tr>
              </thead>
              <tbody>
                {closerRanking.map((entry) => (
                  <tr key={entry.name}>
                    <td className={`position pos-${entry.position}`}>{entry.position}º</td>
                    <td>{entry.name}</td>
                    <td className="value">{formatValue(entry.value, closerMetric)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
