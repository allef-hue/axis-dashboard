import { todayString } from '../utils';

interface HeaderProps {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
  onSettings: () => void;
  darkMode: boolean;
  onDarkModeToggle: () => void;
}

export default function Header({
  startDate,
  endDate,
  onRangeChange,
  onSettings,
  darkMode,
  onDarkModeToggle,
}: HeaderProps) {
  const today = todayString();

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-logo">AXIS</div>
        <div className="header-subtitle">Grupo Vorp · Pace Comercial</div>
      </div>

      <div className="header-center">
        <div className="date-range-picker">
          <div className="date-range-field">
            <label className="date-range-label">De</label>
            <input
              type="date"
              className="date-input"
              value={startDate}
              max={endDate}
              onChange={(e) => e.target.value && onRangeChange(e.target.value, endDate)}
            />
          </div>
          <span className="date-range-arrow">→</span>
          <div className="date-range-field">
            <label className="date-range-label">Até</label>
            <input
              type="date"
              className="date-input"
              value={endDate}
              min={startDate}
              max={today}
              onChange={(e) => e.target.value && onRangeChange(startDate, e.target.value)}
            />
          </div>
        </div>

        <div className="period-tabs">
          <button
            className={`period-tab ${startDate === today && endDate === today ? 'active' : ''}`}
            onClick={() => onRangeChange(today, today)}
          >
            Hoje
          </button>
        </div>
      </div>

      <div className="header-right">
        <button className="btn-settings" onClick={onSettings} title="Configurações da equipe">
          ⚙️ Config
        </button>
        <button
          className="btn-theme"
          onClick={onDarkModeToggle}
          title={darkMode ? 'Modo claro' : 'Modo escuro'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
