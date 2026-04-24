import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface TrendChartProps {
  data: { date: string; value: number }[];
  color: string;
  label: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    return (
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          color: '#f5f2ed',
        }}
      >
        <div style={{ color: '#888', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontWeight: 700 }}>{payload[0].value}</div>
      </div>
    );
  }
  return null;
}

export default function TrendChart({ data, color, label: _label }: TrendChartProps) {
  const avg =
    data.length > 0
      ? data.reduce((s, d) => s + d.value, 0) / data.length
      : 0;

  return (
    <div className="trend-chart-wrapper">
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={data} margin={{ top: 8, right: 4, bottom: 4, left: 4 }}>
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={avg}
            stroke="rgba(255,255,255,0.1)"
            strokeDasharray="3 3"
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
