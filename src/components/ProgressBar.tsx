interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  formatValue?: (v: number) => string;
  isCurrency?: boolean; // renders with green accent styling
}

function getPctClass(pct: number): string {
  if (pct >= 80) return 'pct-good';
  if (pct >= 50) return 'pct-warn';
  return 'pct-bad';
}

function getFillClass(pct: number): string {
  if (pct >= 80) return 'fill-good';
  if (pct >= 50) return 'fill-warn';
  return 'fill-bad';
}

export default function ProgressBar({ value, max, label, formatValue, isCurrency }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const fillWidth = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const pctClass = getPctClass(pct);
  const fillClass = getFillClass(pct);

  const fmtVal = formatValue ? formatValue(value) : String(value);
  const fmtMax = formatValue ? formatValue(max) : String(max);

  return (
    <div className={`metric-row${isCurrency ? ' metric-row-currency' : ''}`}>
      <div className="metric-labels">
        <span className={`metric-name${isCurrency ? ' metric-name-currency' : ''}`}>{label}</span>
        <span className="metric-value">
          {fmtVal}
          <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>/{fmtMax}</span>
        </span>
        <span className={`metric-pct ${pctClass}`}>{pct}%</span>
      </div>
      <div className="progress-track">
        <div
          className={`progress-fill ${fillClass}`}
          style={{ width: `${fillWidth}%` }}
        />
      </div>
    </div>
  );
}
