import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function API4ComTab() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2026-04-25');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const API_TOKEN = import.meta.env.VITE_API4COM_TOKEN || '';

  async function fetchCalls(start: string, end: string) {
    if (!API_TOKEN) {
      setError('Token da API4com não configurado.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filter = JSON.stringify({
        where: {
          and: [
            { started_at: { gt: `${start}T00:00:00Z` } },
            { ended_at: { lt: `${end}T23:59:59Z` } },
          ],
        },
        limit: 1000,
        order: 'started_at asc',
      });

      const url = `https://api.api4com.com/api/v1/calls?access_token=${API_TOKEN}&page=1&filter=${encodeURIComponent(filter)}`;
      const res = await fetch(url);

      if (res.status === 429) {
        setError('Limite de requisições atingido. Aguarde alguns minutos.');
        return;
      }

      if (!res.ok) {
        setError(`Erro ${res.status} ao buscar dados`);
        return;
      }

      const data = await res.json();
      const records = Array.isArray(data) ? data : data.data || [];
      const filtered = records.filter((c: any) => c.email?.endsWith('@grupovorp.com'));

      setCalls(filtered);
    } catch (e: any) {
      setError(e.message || 'Erro ao buscar dados');
    } finally {
      setLoading(false);
    }
  }

  const allUsers = useMemo(() => {
    const set = new Set<string>();
    calls.forEach((c: any) => {
      const u = c.email?.split('@')[0];
      if (u) set.add(u);
    });
    return [...set].sort();
  }, [calls]);

  const toggleUser = (u: string) =>
    setSelectedUsers(p => p.includes(u) ? p.filter(x => x !== u) : [...p, u]);

  const filtered = useMemo(
    () => selectedUsers.length === 0 ? calls : calls.filter((c: any) => selectedUsers.includes(c.email?.split('@')[0])),
    [calls, selectedUsers]
  );

  const totalLigacoes = filtered.length;
  const totalDuration = filtered.reduce((s: number, c: any) => s + (c.duration || 0), 0);
  const conexoes = filtered.filter((c: any) => c.hangup_cause === 'NORMAL_CLEARING' && c.duration > 40).length;
  const leadsUnicos = new Set(filtered.map((c: any) => c.to)).size;

  const porDia = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((c: any) => {
      const d = new Date(c.started_at);
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([dia, quantidade]) => ({ dia, quantidade }));
  }, [filtered]);

  const porHorario = useMemo(() => {
    const map: Record<number, number> = {};
    for (let h = 8; h <= 21; h++) map[h] = 0;
    filtered.forEach((c: any) => {
      const h = new Date(c.started_at).getHours();
      if (h >= 8 && h <= 21) map[h] = (map[h] || 0) + 1;
    });
    return Object.entries(map).map(([h, quantidade]) => ({ hora: `${h}h`, quantidade }));
  }, [filtered]);

  return (
    <div className="a4c-tab">
      <div className="a4c-filters">
        <div className="a4c-date-row">
          <div className="a4c-date-field">
            <label>De</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="a4c-date-field">
            <label>Até</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button className="a4c-apply-btn" onClick={() => fetchCalls(startDate, endDate)} disabled={loading}>
            {loading ? 'Buscando...' : 'Aplicar'}
          </button>
        </div>

        {allUsers.length > 0 && (
          <div className="a4c-user-filter">
            <span className="a4c-user-filter-label">SDR:</span>
            <div className="a4c-user-chips">
              <button className={`a4c-chip ${selectedUsers.length === 0 ? 'active' : ''}`} onClick={() => setSelectedUsers([])}>Todos</button>
              {allUsers.map(u => (
                <button key={u} className={`a4c-chip ${selectedUsers.includes(u) ? 'active' : ''}`} onClick={() => toggleUser(u)}>
                  {u}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <div className="a4c-error">{error}</div>}

      {!calls.length && !loading && (
        <div className="a4c-empty">
          <p>Selecione o período e clique em <strong>Aplicar</strong></p>
        </div>
      )}

      {calls.length > 0 && (
        <>
          <div className="a4c-kpi-grid">
            <div className="a4c-kpi-card">
              <span className="a4c-kpi-label">Ligações</span>
              <span className="a4c-kpi-value">{totalLigacoes}</span>
            </div>
            <div className="a4c-kpi-card">
              <span className="a4c-kpi-label">Conexões (+40s)</span>
              <span className="a4c-kpi-value">{conexoes}</span>
            </div>
            <div className="a4c-kpi-card">
              <span className="a4c-kpi-label">Tempo de Linha</span>
              <span className="a4c-kpi-value">{Math.floor(totalDuration / 60)}m</span>
            </div>
            <div className="a4c-kpi-card">
              <span className="a4c-kpi-label">Leads Únicos</span>
              <span className="a4c-kpi-value">{leadsUnicos}</span>
            </div>
          </div>

          <div className="a4c-row">
            <div className="a4c-card">
              <h3 className="a4c-card-title">Ligações por Dia</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={porDia} margin={{ top: 8, right: 8, left: -20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="dia" tick={{ fill: '#888', fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="quantidade" fill="#ff6b35" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="a4c-card">
              <h3 className="a4c-card-title">Ligações por Faixa de Horário</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={porHorario} margin={{ top: 8, right: 8, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="hora" tick={{ fill: '#888', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="quantidade" fill="#ff6b35" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
