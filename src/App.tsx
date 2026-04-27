import { useState, useEffect, useCallback, useMemo } from 'react';
import { DayData, SDRData, CloserData, SDRConfig, CloserConfig, LeadershipGoals } from './types';
import {
  loadSDRConfigs,
  loadCloserConfigs,
  saveSDRConfigs,
  saveCloserConfigs,
} from './configStorage';
import {
  saveDayData,
  getDateRange,
  getAggregatedData,
  applyImportRows,
  ImportRow,
} from './storage';
import {
  loadLeadershipGoals,
} from './leadershipStorage';
import {
  getDayDataCloud,
  saveDayDataCloud,
  deletePersonFromCloud,
  syncDatesFromCloud,
  loadLeadershipGoalsCloud,
  saveLeadershipGoalsCloud,
  saveConfigsCloud,
  isSupabaseConfigured,
} from './db';
import { setupRealtimeSubscriptions } from './realtime';
import { SyncProvider } from './context/SyncContext';
// import { syncAPI4ComForDate } from './api4comSync';
import { todayString, formatDate, countWorkingDays } from './utils';

import Header from './components/Header';
import PersonCard from './components/PersonCard';
import TotalCard from './components/TotalCard';
import AlertsSection from './components/AlertsSection';
import EditModal from './components/EditModal';
import AuditHistoryModal from './components/AuditHistoryModal';
import SettingsModal from './components/SettingsModal';
import RankingTab from './components/RankingTab';
import PaceLiderancaTab from './components/PaceLiderancaTab';
import RelatorioTab from './components/RelatorioTab';
// import API4ComTab from './components/API4ComTab';

interface EditingPerson {
  id: string;
  type: 'sdr' | 'closer';
}

function getEmptyDayData(date: string): DayData {
  return { data: date, sdrs: {}, closers: {} };
}

function exportToCSV(
  startDate: string,
  endDate: string,
  sdrDataArr: (SDRData | null)[],
  closerDataArr: (CloserData | null)[],
  sdrConfigs: SDRConfig[],
  closerConfigs: CloserConfig[],
  periodDays: number
): void {
  const isSingleDay = startDate === endDate;
  const periodLabel = isSingleDay
    ? `Hoje — ${formatDate(startDate)}`
    : `${formatDate(startDate)} → ${formatDate(endDate)} (${periodDays} dias)`;

  const rows: string[] = [];
  rows.push(`AXIS Dashboard — ${periodLabel}`);
  rows.push(`Período: ${periodDays} dia(s)`);
  rows.push('');
  rows.push('EQUIPE SDR');
  rows.push('Nome,ID,Leads,Agendamentos,Acontecidas,Receita,Meta Leads,Meta Agend,Meta Acont,Meta Receita');
  sdrConfigs.forEach((cfg, i) => {
    const d = sdrDataArr[i];
    const m = cfg.metas;
    rows.push(
      `${cfg.nome},${cfg.id},${d?.leads ?? 0},${d?.agendamentos ?? 0},${d?.acontecidas ?? 0},${d?.receita ?? 0},${m.leads},${m.agendamentos},${m.acontecidas},${m.receita}`
    );
  });
  rows.push('');
  rows.push('EQUIPE CLOSER');
  rows.push('Nome,ID,Reunioes,Contratos,Receita,Meta Reun,Meta Cont,Meta Rec');
  closerConfigs.forEach((cfg, i) => {
    const d = closerDataArr[i];
    const m = cfg.metas;
    rows.push(
      `${cfg.nome},${cfg.id},${d?.reunioes ?? 0},${d?.contratos ?? 0},${d?.receita ?? 0},${m.reunioes},${m.contratos},${m.receita}`
    );
  });

  const csv = rows.join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `axis-${startDate}--${endDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function App() {
  const [sdrConfigs, setSdrConfigs] = useState<SDRConfig[]>(() => loadSDRConfigs());
  const [closerConfigs, setCloserConfigs] = useState<CloserConfig[]>(() => loadCloserConfigs());
  const [leadershipGoals, setLeadershipGoals] = useState<LeadershipGoals>(() => loadLeadershipGoals());
  const [startDate, setStartDate] = useState<string>(todayString());
  const [endDate, setEndDate] = useState<string>(todayString());
  const [dayData, setDayData] = useState<DayData>(getEmptyDayData(todayString()));
  const [editingPerson, setEditingPerson] = useState<EditingPerson | null>(null);
  const [historyPerson, setHistoryPerson] = useState<EditingPerson | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState(false);
  const [importRefresh, setImportRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState<'pace-time' | 'ranking' | 'relatorio' | 'lideranca'>('pace-time');
  // const [isSyncing, setIsSyncing] = useState(false);
  // const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const isSingleDay = startDate === endDate;

  // Carrega metas de liderança + configs do time do cloud na inicialização
  useEffect(() => {
    loadLeadershipGoalsCloud().then((goals) => {
      setLeadershipGoals(goals);
      // Se o cloud tem configs mais recentes, aplicar no state
      if (Array.isArray(goals.sdrConfigs) && goals.sdrConfigs.length > 0) {
        setSdrConfigs(goals.sdrConfigs);
      }
      if (Array.isArray(goals.closerConfigs) && goals.closerConfigs.length > 0) {
        setCloserConfigs(goals.closerConfigs);
      }
    });
  }, []);

  // Setup Realtime subscriptions para sincronização em tempo real
  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.log('[App] Supabase não configurado, realtime desabilitado');
      return;
    }

    console.log('[App] Configurando Realtime subscriptions...');

    const handleDataChange = (date: string, newDayData: DayData) => {
      console.log('[App] onDataChange notificado para', date);
      // Se o usuário está vendo essa data, atualiza
      if (date === startDate) {
        setDayData(newDayData);
      }
      // Sempre atualiza o importRefresh para recalcular dados agregados
      setImportRefresh((n) => n + 1);
    };

    const handleGoalsChange = (newGoals: LeadershipGoals, newSdrConfigs?: SDRConfig[], newCloserConfigs?: CloserConfig[]) => {
      console.log('[App] onGoalsChange notificado');
      setLeadershipGoals(newGoals);
      // Aplicar configs do time se vieram junto com o update de goals
      if (Array.isArray(newSdrConfigs) && newSdrConfigs.length > 0) {
        setSdrConfigs(newSdrConfigs);
        console.log('[App] SDR configs atualizadas via Realtime');
      }
      if (Array.isArray(newCloserConfigs) && newCloserConfigs.length > 0) {
        setCloserConfigs(newCloserConfigs);
        console.log('[App] Closer configs atualizadas via Realtime');
      }
    };

    // Setup e retorna cleanup function
    const cleanup = setupRealtimeSubscriptions(handleDataChange, handleGoalsChange);

    // Cleanup ao desmontar
    return () => {
      console.log('[App] Limpando Realtime subscriptions...');
      cleanup();
    };
  }, [startDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize Sync callbacks for UI feedback
  useEffect(() => {
    // This hook runs once at mount to set up the sync context
    // We need to use a callback approach since we can't use hooks inside db.ts
    // Instead, we'll set up the callbacks via context provider
  }, []);

  // Load single-day data for edit modal / single-day view
  useEffect(() => {
    getDayDataCloud(startDate).then((stored) => {
      setDayData(stored ?? getEmptyDayData(startDate));
    });
  }, [startDate, importRefresh]);

  // Sincroniza dados do período inteiro do Supabase quando o range muda
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const dates = getDateRange(startDate, endDate);
    // setIsSyncing(true);
    syncDatesFromCloud(dates).then(() => {
      // setIsSyncing(false);
      setImportRefresh((n) => n + 1);
    });
  }, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.body.classList.toggle('light-mode', !darkMode);
  }, [darkMode]);

  // ─── Date range → date array ──────────────────────────────────
  const periodDates = useMemo(
    () => getDateRange(startDate, endDate),
    [startDate, endDate]
  );

  const days = periodDates.length;
  const workingDaysInRange = useMemo(
    () => isSingleDay ? 1 : countWorkingDays(startDate, endDate),
    [isSingleDay, startDate, endDate]
  );

  // ─── Aggregated data (range mode only) ───────────────────────
  const aggregated = useMemo(() => {
    if (isSingleDay) return null;
    return getAggregatedData(periodDates);
  }, [isSingleDay, periodDates, importRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Effective display data ───────────────────────────────────
  const effectiveSDRData: (SDRData | null)[] = useMemo(() => {
    if (isSingleDay || !aggregated) {
      return sdrConfigs.map((c) => dayData.sdrs[c.id] ?? null);
    }
    return sdrConfigs.map((c) => {
      const agg = aggregated.sdrs[c.id];
      if (!agg) return null;
      return {
        id: c.id,
        nome: c.nome,
        leads: agg.leads,
        agendamentos: agg.agendamentos,
        acontecidas: agg.acontecidas,
        receita: agg.receita,
        updatedAt: `${agg.daysWithData} dia(s) com dados`,
      } as SDRData;
    });
  }, [isSingleDay, dayData, aggregated]);

  const effectiveCloserData: (CloserData | null)[] = useMemo(() => {
    if (isSingleDay || !aggregated) {
      return closerConfigs.map((c) => dayData.closers[c.id] ?? null);
    }
    return closerConfigs.map((c) => {
      const agg = aggregated.closers[c.id];
      if (!agg) return null;
      return {
        id: c.id,
        nome: c.nome,
        reunioes: agg.reunioes,
        contratos: agg.contratos,
        receita: agg.receita,
        updatedAt: `${agg.daysWithData} dia(s) com dados`,
      } as CloserData;
    });
  }, [isSingleDay, dayData, aggregated]);

  // ─── Expected configs: metas proporcionais ao período ─────────
  // target = (meta_mensal / dias_úteis_mês) × dias_úteis_no_período
  const expectedSDRConfigs: SDRConfig[] = useMemo(
    () =>
      sdrConfigs.map((c) => ({
        ...c,
        metas: {
          leads: (c.metas.leads / c.diasUteis) * workingDaysInRange,
          agendamentos: (c.metas.agendamentos / c.diasUteis) * workingDaysInRange,
          acontecidas: (c.metas.acontecidas / c.diasUteis) * workingDaysInRange,
          receita: (c.metas.receita / c.diasUteis) * workingDaysInRange,
          ligacoes_whatsapp: (c.metas.ligacoes_whatsapp / c.diasUteis) * workingDaysInRange,
          tempo_em_linha: (c.metas.tempo_em_linha / c.diasUteis) * workingDaysInRange,
        },
      })),
    [sdrConfigs, workingDaysInRange]
  );

  const expectedCloserConfigs: CloserConfig[] = useMemo(
    () =>
      closerConfigs.map((c) => ({
        ...c,
        metas: {
          reunioes: (c.metas.reunioes / c.diasUteis) * workingDaysInRange,
          contratos: (c.metas.contratos / c.diasUteis) * workingDaysInRange,
          receita: (c.metas.receita / c.diasUteis) * workingDaysInRange,
        },
      })),
    [closerConfigs, workingDaysInRange]
  );

  // Para compatibilidade com componentes existentes
  const periodSDRConfigs: SDRConfig[] = expectedSDRConfigs;
  const periodCloserConfigs: CloserConfig[] = expectedCloserConfigs;

  // ─── Filtro de pessoa (selectedPersonId) ──────────────────────
  const filteredSDRConfigs = useMemo(() => {
    if (!selectedPersonId) return periodSDRConfigs;
    return periodSDRConfigs.filter(cfg => cfg.id === selectedPersonId);
  }, [periodSDRConfigs, selectedPersonId]);

  const filteredCloserConfigs = useMemo(() => {
    if (!selectedPersonId) return periodCloserConfigs;
    return periodCloserConfigs.filter(cfg => cfg.id === selectedPersonId);
  }, [periodCloserConfigs, selectedPersonId]);

  const filteredSDRData = useMemo(() => {
    if (!selectedPersonId) return effectiveSDRData;
    const idx = periodSDRConfigs.findIndex(cfg => cfg.id === selectedPersonId);
    return idx >= 0 ? [effectiveSDRData[idx]] : [];
  }, [effectiveSDRData, periodSDRConfigs, selectedPersonId]);

  const filteredCloserData = useMemo(() => {
    if (!selectedPersonId) return effectiveCloserData;
    const idx = periodCloserConfigs.findIndex(cfg => cfg.id === selectedPersonId);
    return idx >= 0 ? [effectiveCloserData[idx]] : [];
  }, [effectiveCloserData, periodCloserConfigs, selectedPersonId]);

  // ─── Period label ─────────────────────────────────────────────
  const periodLabel = useMemo(() => {
    if (isSingleDay) return '';
    return `${formatDate(startDate)} → ${formatDate(endDate)} (${days} dia${days !== 1 ? 's' : ''})`;
  }, [isSingleDay, startDate, endDate, days]);

  // ─── Range change handler ─────────────────────────────────────
  const handleRangeChange = useCallback((start: string, end: string) => {
    if (!start || !end) return;
    if (start > end) { setStartDate(end); setEndDate(start); }
    else { setStartDate(start); setEndDate(end); }
  }, []);

  // ─── Save / delete handlers ───────────────────────────────────
  // const handleSyncAPI4Com = useCallback(async () => {
  // }, []);

  const handleSaveSDR = useCallback(
    (data: SDRData, saveDate: string = startDate) => {
      const newDayData: DayData = { ...dayData, sdrs: { ...dayData.sdrs, [data.id]: data } };
      setDayData(newDayData);
      saveDayDataCloud(saveDate, newDayData); // salva local + cloud
      setEditingPerson(null);
      setImportRefresh((n) => n + 1);
    },
    [dayData, startDate]
  );

  const handleSaveCloser = useCallback(
    (data: CloserData, saveDate: string = startDate) => {
      const newDayData: DayData = { ...dayData, closers: { ...dayData.closers, [data.id]: data } };
      setDayData(newDayData);
      saveDayDataCloud(saveDate, newDayData); // salva local + cloud
      setEditingPerson(null);
      setImportRefresh((n) => n + 1);
    },
    [dayData, startDate]
  );

  const handleDeleteSDR = useCallback(
    (id: string) => {
      const newSdrs = { ...dayData.sdrs };
      delete newSdrs[id];
      const newDayData: DayData = { ...dayData, sdrs: newSdrs };
      setDayData(newDayData);
      saveDayData(startDate, newDayData); // atualiza localStorage
      deletePersonFromCloud(startDate, id, 'sdr'); // deleta do cloud
      setEditingPerson(null);
      setImportRefresh((n) => n + 1);
    },
    [dayData, startDate]
  );

  const handleDeleteCloser = useCallback(
    (id: string) => {
      const newClosers = { ...dayData.closers };
      delete newClosers[id];
      const newDayData: DayData = { ...dayData, closers: newClosers };
      setDayData(newDayData);
      saveDayData(startDate, newDayData); // atualiza localStorage
      deletePersonFromCloud(startDate, id, 'closer'); // deleta do cloud
      setEditingPerson(null);
      setImportRefresh((n) => n + 1);
    },
    [dayData, startDate]
  );

  const handleImportConfirm = useCallback((rows: ImportRow[]) => {
    applyImportRows(rows);
    setImportRefresh((n) => n + 1);
  }, []);

  const handleExportCSV = useCallback(() => {
    exportToCSV(
      startDate,
      endDate,
      effectiveSDRData,
      effectiveCloserData,
      periodSDRConfigs,
      periodCloserConfigs,
      days
    );
  }, [startDate, endDate, effectiveSDRData, effectiveCloserData, periodSDRConfigs, periodCloserConfigs, days]);

  // ─── Settings save ────────────────────────────────────────────
  const handleSaveSettings = useCallback(
    (newSdr: SDRConfig[], newCloser: CloserConfig[], newLeadership?: LeadershipGoals) => {
      saveSDRConfigs(newSdr);
      saveCloserConfigs(newCloser);

      // Sempre sincronizar configs do time para todos no Supabase
      saveConfigsCloud(newSdr, newCloser);

      if (newLeadership) {
        // Incluir configs no payload de goals para garantir sincronização
        const goalsWithConfigs: LeadershipGoals = {
          ...newLeadership,
          sdrConfigs: newSdr,
          closerConfigs: newCloser,
        };
        saveLeadershipGoalsCloud(goalsWithConfigs); // salva local + cloud
        setLeadershipGoals(newLeadership);
      }
      setSdrConfigs(newSdr);
      setCloserConfigs(newCloser);
      setShowSettings(false);
      setImportRefresh((n) => n + 1);
    },
    []
  );

  // ─── Editing config lookup ────────────────────────────────────
  const editingSDRConfig = editingPerson?.type === 'sdr'
    ? sdrConfigs.find((c) => c.id === editingPerson.id)
    : undefined;
  const editingCloserConfig = editingPerson?.type === 'closer'
    ? closerConfigs.find((c) => c.id === editingPerson.id)
    : undefined;
  const historySDRConfig = historyPerson?.type === 'sdr'
    ? sdrConfigs.find((c) => c.id === historyPerson.id)
    : undefined;
  const historyCloserConfig = historyPerson?.type === 'closer'
    ? closerConfigs.find((c) => c.id === historyPerson.id)
    : undefined;

  const isPeriodView = !isSingleDay;

  // When user clicks EDITAR in range mode → collapse to today
  const handleEditPerson = useCallback((id: string, type: 'sdr' | 'closer') => {
    if (!isSingleDay) {
      const today = todayString();
      setStartDate(today);
      setEndDate(today);
    }
    setEditingPerson({ id, type });
  }, [isSingleDay]);

  return (
    <SyncProvider>
      <div className="app">
        <Header
          startDate={startDate}
          endDate={endDate}
          onRangeChange={handleRangeChange}
          onSettings={() => setShowSettings(true)}
          darkMode={darkMode}
          onDarkModeToggle={() => setDarkMode((d) => !d)}
        />

      {/* Tab Navigation */}
      <div className="tabs-navigation">
        <button
          className={`tab-button ${activeTab === 'pace-time' ? 'active' : ''}`}
          onClick={() => setActiveTab('pace-time')}
        >
          Pace Time
        </button>
        <button
          className={`tab-button ${activeTab === 'ranking' ? 'active' : ''}`}
          onClick={() => setActiveTab('ranking')}
        >
          Ranking Comercial
        </button>
        <button
          className={`tab-button ${activeTab === 'relatorio' ? 'active' : ''}`}
          onClick={() => setActiveTab('relatorio')}
        >
          Relatório
        </button>
        {/* <button
          className={`tab-button ${activeTab === 'api4com' ? 'active' : ''}`}
          onClick={() => setActiveTab('api4com')}
        >
          API4COM
        </button> */}
        <button
          className={`tab-button ${activeTab === 'lideranca' ? 'active' : ''}`}
          onClick={() => setActiveTab('lideranca')}
        >
          Pace Da Liderança
        </button>
      </div>

      {/* PACE TIME Tab Content */}
      {activeTab === 'pace-time' && (
        <>
      <AlertsSection
        sdrData={effectiveSDRData}
        sdrConfigs={periodSDRConfigs}
        closerData={effectiveCloserData}
        closerConfigs={periodCloserConfigs}
        isPeriodView={isPeriodView}
        daysWithAnyData={aggregated?.daysWithAnyData ?? (isPeriodView ? 0 : 1)}
      />

      {/* Banner: preenchimento diário */}
      {isSingleDay && (
        <div className="day-fill-banner">
          <div className="day-fill-left">
            <span className="day-fill-icon">📝</span>
            <div>
              <div className="day-fill-title">
                Preenchendo dados de: <strong>{formatDate(startDate)}</strong>
              </div>
              <div className="day-fill-hint">
                Para registrar outro dia, altere a data no seletor "De" acima e clique em <strong>Meu Pace</strong>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Period info banner */}
      {isPeriodView && periodLabel && (
        <div className="period-banner">
          <span className="period-banner-icon">📅</span>
          <span>
            Período: <strong>{periodLabel}</strong>
            {aggregated && aggregated.daysWithAnyData > 0 && (
              <span className="period-banner-days"> — {aggregated.daysWithAnyData} dia(s) com dados registrados</span>
            )}
          </span>
          {aggregated && aggregated.daysWithAnyData === 0 && (
            <span className="period-banner-warn"> Sem dados nesse intervalo. Preencha diariamente na view "Hoje".</span>
          )}
        </div>
      )}

      {/* Filtro de Pessoa */}
      <div className="person-filter-container">
        <label className="person-filter-label">Visualizar:</label>
        <select
          className="person-filter-select"
          value={selectedPersonId || ''}
          onChange={(e) => setSelectedPersonId(e.target.value || null)}
        >
          <option value="">Todas as Pessoas</option>
          <optgroup label="SDRs">
            {sdrConfigs.map(cfg => (
              <option key={cfg.id} value={cfg.id}>{cfg.nome}</option>
            ))}
          </optgroup>
          <optgroup label="Closers">
            {closerConfigs.map(cfg => (
              <option key={cfg.id} value={cfg.id}>{cfg.nome}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Sync API4com - disabled for now */}

      {/* Performance Overview Section */}
      <section className="performance-overview-section">
        <div className="performance-cards-grid">
          <TotalCard
            type="sdr"
            allData={effectiveSDRData}
            configs={periodSDRConfigs}
            periodLabel={periodLabel}
            periodDays={days}
            startDate={startDate}
            endDate={endDate}
          />
          <TotalCard
            type="closer"
            allData={effectiveCloserData}
            configs={periodCloserConfigs}
            periodLabel={periodLabel}
            periodDays={days}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </section>

      {/* SDR Section */}
      <section className="sdr-section">
        <div className="section-title">
          Equipe SDR
          <span className="section-label">{filteredSDRConfigs.length} pessoa{filteredSDRConfigs.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="sdr-grid">
          {filteredSDRConfigs.map((cfg, i) => (
            <PersonCard
                key={cfg.id}
                type="sdr"
                config={cfg}
                monthlyConfig={sdrConfigs.find(c => c.id === cfg.id)!}
                data={filteredSDRData[i]}
                isPeriodView={isPeriodView}
                daysWithData={aggregated?.sdrs[cfg.id]?.daysWithData}
                onEdit={() => handleEditPerson(cfg.id, 'sdr')}
                onHistory={() => setHistoryPerson({ id: cfg.id, type: 'sdr' })}
              />
          ))}
        </div>
      </section>

      {/* Closer Section */}
      <section className="closer-section">
        <div className="section-title">
          Equipe Closer
          <span className="section-label">{filteredCloserConfigs.length} pessoa{filteredCloserConfigs.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="closer-grid">
          {filteredCloserConfigs.map((cfg, i) => (
            <PersonCard
                key={cfg.id}
                type="closer"
                config={cfg}
                monthlyConfig={closerConfigs.find(c => c.id === cfg.id)!}
                data={filteredCloserData[i]}
                isPeriodView={isPeriodView}
                daysWithData={aggregated?.closers[cfg.id]?.daysWithData}
                onEdit={() => handleEditPerson(cfg.id, 'closer')}
                onHistory={() => setHistoryPerson({ id: cfg.id, type: 'closer' })}
              />
          ))}
        </div>
      </section>
        </>
      )}

      {/* RANKING COMERCIAL Tab Content */}
      {activeTab === 'ranking' && (
        <div className="tab-content">
          <RankingTab
            sdrConfigs={sdrConfigs}
            closerConfigs={closerConfigs}
            sdrDataArray={effectiveSDRData}
            closerDataArray={effectiveCloserData}
          />
        </div>
      )}

      {/* RELATÓRIO Tab Content */}
      {activeTab === 'relatorio' && (
        <div className="tab-content">
          <RelatorioTab
            sdrConfigs={sdrConfigs}
            closerConfigs={closerConfigs}
            sdrDataArray={effectiveSDRData}
            closerDataArray={effectiveCloserData}
            periodSDRConfigs={periodSDRConfigs}
            periodCloserConfigs={periodCloserConfigs}
            leadershipGoals={leadershipGoals}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      )}

      {/* API4COM Tab Content */}
      {/* {activeTab === 'api4com' && (
        <div className="tab-content">
          <API4ComTab />
        </div>
      )} */}

      {/* PACE DA LIDERANÇA Tab Content */}
      {activeTab === 'lideranca' && (
        <div className="tab-content">
          <PaceLiderancaTab
            sdrData={effectiveSDRData}
            closerData={effectiveCloserData}
            leadershipGoals={leadershipGoals}
          />
        </div>
      )}

      {/* Edit Modal — SDR */}
      {editingPerson?.type === 'sdr' && editingSDRConfig && (
        <EditModal
          type="sdr"
          config={editingSDRConfig}
          data={dayData.sdrs[editingPerson.id] ?? null}
          date={startDate}
          onSave={handleSaveSDR}
          onClose={() => setEditingPerson(null)}
          onDelete={() => handleDeleteSDR(editingPerson.id)}
        />
      )}

      {/* Edit Modal — Closer */}
      {editingPerson?.type === 'closer' && editingCloserConfig && (
        <EditModal
          type="closer"
          config={editingCloserConfig}
          data={dayData.closers[editingPerson.id] ?? null}
          date={startDate}
          onSave={handleSaveCloser}
          onClose={() => setEditingPerson(null)}
          onDelete={() => handleDeleteCloser(editingPerson.id)}
        />
      )}

      {/* Audit History Modal — SDR */}
      {historyPerson?.type === 'sdr' && historySDRConfig && (
        <AuditHistoryModal
          personId={historyPerson.id}
          personName={historySDRConfig.nome}
          onClose={() => setHistoryPerson(null)}
        />
      )}

      {/* Audit History Modal — Closer */}
      {historyPerson?.type === 'closer' && historyCloserConfig && (
        <AuditHistoryModal
          personId={historyPerson.id}
          personName={historyCloserConfig.nome}
          onClose={() => setHistoryPerson(null)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          sdrConfigs={sdrConfigs}
          closerConfigs={closerConfigs}
          leadershipGoals={leadershipGoals}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
          onExportCSV={handleExportCSV}
          onImportConfirm={handleImportConfirm}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </div>
    </SyncProvider>
  );
}
