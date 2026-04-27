import { useState, useRef, useEffect } from 'react';
import { SDRConfig, CloserConfig, LeadershipGoals } from '../types';
import { generateUniqueId } from '../configStorage';
import { parseImportCSV, generateCSVTemplate, ImportRow, ImportPreview } from '../storage';
import { formatDate } from '../utils';

interface SettingsModalProps {
  sdrConfigs: SDRConfig[];
  closerConfigs: CloserConfig[];
  leadershipGoals: LeadershipGoals;
  onSave: (sdr: SDRConfig[], closer: CloserConfig[], leadership?: LeadershipGoals) => void;
  onClose: () => void;
  onExportCSV?: () => void;
  onImportConfirm?: (rows: ImportRow[]) => void;
  startDate?: string;
  endDate?: string;
}

type Tab = 'sdr' | 'closer' | 'lideranca' | 'administrativo' | 'import-export';

const NEW_PREFIX = '_new_';

function cloneSdr(configs: SDRConfig[]): SDRConfig[] {
  return configs.map((c) => ({ ...c, metas: { ...c.metas } }));
}
function cloneCloser(configs: CloserConfig[]): CloserConfig[] {
  return configs.map((c) => ({ ...c, metas: { ...c.metas } }));
}

export default function SettingsModal({
  sdrConfigs,
  closerConfigs,
  leadershipGoals,
  onSave,
  onClose,
  onExportCSV,
  onImportConfirm,
  startDate,
  endDate,
}: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>('sdr');
  const [localSdr, setLocalSdr] = useState<SDRConfig[]>(() => cloneSdr(sdrConfigs));
  const [localCloser, setLocalCloser] = useState<CloserConfig[]>(() => cloneCloser(closerConfigs));
  const [localLeadership, setLocalLeadership] = useState<LeadershipGoals>(() => ({
    sdr: { ...leadershipGoals.sdr },
    closer: { ...leadershipGoals.closer },
  }));
  const [error, setError] = useState('');

  // Access code
  const [accessCode, setAccessCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isCodeValidated, setIsCodeValidated] = useState(false);

  // Import/Export UI state
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importDragging, setImportDragging] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importTab, setImportTab] = useState<'export' | 'upload'>('export');
  const fileRef = useRef<HTMLInputElement>(null);

  // Load access code from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('axis-access-code');
    setAccessCode(saved || '');
  }, []);

  // ─── SDR handlers ─────────────────────────────────────────────
  const updateSdrName = (i: number, nome: string) =>
    setLocalSdr((prev) => prev.map((c, idx) => (idx === i ? { ...c, nome } : c)));

  const updateSdrEmail = (i: number, email: string) =>
    setLocalSdr((prev) => prev.map((c, idx) => (idx === i ? { ...c, email } : c)));

  const updateSdrMeta = (i: number, key: keyof SDRConfig['metas'], value: string) =>
    setLocalSdr((prev) =>
      prev.map((c, idx) =>
        idx === i ? { ...c, metas: { ...c.metas, [key]: parseFloat(value) || 0 } } : c
      )
    );

  const removeSdr = (i: number) =>
    setLocalSdr((prev) => prev.filter((_, idx) => idx !== i));

  const addSdr = () => {
    const baseMetas = localSdr[0]?.metas ?? { leads: 44, agendamentos: 3, acontecidas: 2, receita: 950.33, ligacoes_whatsapp: 200, tempo_em_linha: 3000, rqa: 10 };
    const diasUteis = localSdr[0]?.diasUteis ?? 22;
    setLocalSdr((prev) => [
      ...prev,
      { id: `${NEW_PREFIX}${Date.now()}`, nome: '', diasUteis, metas: { ...baseMetas } },
    ]);
  };

  // ─── Closer handlers ──────────────────────────────────────────
  const updateCloserName = (i: number, nome: string) =>
    setLocalCloser((prev) => prev.map((c, idx) => (idx === i ? { ...c, nome } : c)));

  const updateCloserEmail = (i: number, email: string) =>
    setLocalCloser((prev) => prev.map((c, idx) => (idx === i ? { ...c, email } : c)));

  const updateCloserMeta = (i: number, key: keyof CloserConfig['metas'], value: string) =>
    setLocalCloser((prev) =>
      prev.map((c, idx) =>
        idx === i ? { ...c, metas: { ...c.metas, [key]: parseFloat(value) || 0 } } : c
      )
    );

  const removeCloser = (i: number) =>
    setLocalCloser((prev) => prev.filter((_, idx) => idx !== i));

  const addCloser = () => {
    const baseMetas = localCloser[0]?.metas ?? { reunioes: 3.5, proposta: 1.5, contratos: 0.58, receita: 1583.88, mrr: 0, arr: 0 };
    const diasUteis = localCloser[0]?.diasUteis ?? 22;
    setLocalCloser((prev) => [
      ...prev,
      { id: `${NEW_PREFIX}${Date.now()}`, nome: '', diasUteis, metas: { ...baseMetas } },
    ]);
  };

  // ─── Access Code handlers ─────────────────────────────────────
  const handleValidateCode = () => {
    setCodeError('');
    if (!codeInput.trim()) {
      setCodeError('Digite um código para continuar.');
      return;
    }
    if (accessCode && codeInput !== accessCode) {
      setCodeError('Código de acesso inválido.');
      return;
    }
    setIsCodeValidated(true);
  };

  const handleSetNewCode = () => {
    setCodeError('');
    if (!codeInput.trim()) {
      setCodeError('Digite um código para definir.');
      return;
    }
    localStorage.setItem('axis-access-code', codeInput);
    setAccessCode(codeInput);
    setIsCodeValidated(true);
    setCodeInput('');
  };

  // ─── Import/Export handlers ───────────────────────────────────
  function handleImportFile(file: File) {
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setImportPreview(parseImportCSV(text));
    };
    reader.readAsText(file, 'utf-8');
  }

  function handleImportDrop(e: React.DragEvent) {
    e.preventDefault();
    setImportDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImportFile(file);
  }

  function handleImportInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImportFile(file);
  }

  function downloadTemplate() {
    const csv = generateCSVTemplate();
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'axis-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImportConfirmClick() {
    if (importPreview && importPreview.rows.length > 0 && onImportConfirm) {
      onImportConfirm(importPreview.rows);
      setImportPreview(null);
      setImportFileName('');
      setTab('sdr');
    }
  }

  function handleExportClick() {
    if (onExportCSV) {
      onExportCSV();
    }
  }

  // ─── Save ─────────────────────────────────────────────────────
  const handleSave = () => {
    setError('');
    const allValid = [...localSdr, ...localCloser].every((c) => c.nome.trim().length > 0);
    if (!allValid) {
      setError('Todos os vendedores precisam ter um nome preenchido.');
      return;
    }

    // Resolve temp IDs for new entries (generate from final name)
    const resolveSdr = (): SDRConfig[] => {
      const stableIds = localSdr.filter((c) => !c.id.startsWith(NEW_PREFIX)).map((c) => c.id);
      const allIds = [...stableIds];
      return localSdr.map((c) => {
        if (!c.id.startsWith(NEW_PREFIX)) return c;
        const id = generateUniqueId(c.nome, allIds);
        allIds.push(id);
        return { ...c, id, diasUteis: c.diasUteis ?? 22 };
      });
    };

    const resolveCloser = (): CloserConfig[] => {
      const stableIds = localCloser.filter((c) => !c.id.startsWith(NEW_PREFIX)).map((c) => c.id);
      const allIds = [...stableIds];
      return localCloser.map((c) => {
        if (!c.id.startsWith(NEW_PREFIX)) return c;
        const id = generateUniqueId(c.nome, allIds);
        allIds.push(id);
        return { ...c, id, diasUteis: c.diasUteis ?? 22 };
      });
    };

    onSave(resolveSdr(), resolveCloser(), localLeadership);
  };

  // Check if we need to show access code form
  const needsAccessCode = !isCodeValidated && accessCode === '';
  const needsAccessValidation = !isCodeValidated && accessCode !== '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-title">⚙️ Configurações da Equipe</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Access Code Section */}
        {!isCodeValidated && (
          <div className="access-code-section">
            {needsAccessCode && (
              <div className="access-code-form">
                <div className="access-code-title">Definir Código de Acesso</div>
                <p className="access-code-desc">
                  Este código protege o acesso à importação e exportação de dados.
                </p>
                <div className="access-code-input-group">
                  <input
                    type="password"
                    className="access-code-input"
                    placeholder="Digite um código de acesso"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSetNewCode()}
                  />
                  <button className="btn-set-code" onClick={handleSetNewCode}>
                    Definir Código
                  </button>
                </div>
                {codeError && <div className="access-code-error">{codeError}</div>}
              </div>
            )}

            {needsAccessValidation && (
              <div className="access-code-form">
                <div className="access-code-title">Validar Código de Acesso</div>
                <p className="access-code-desc">
                  Digite o código para acessar Importar/Exportar.
                </p>
                <div className="access-code-input-group">
                  <input
                    type="password"
                    className="access-code-input"
                    placeholder="Digite o código"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleValidateCode()}
                  />
                  <button className="btn-validate-code" onClick={handleValidateCode}>
                    Validar
                  </button>
                </div>
                {codeError && <div className="access-code-error">{codeError}</div>}
              </div>
            )}
          </div>
        )}

        {/* Settings Tabs & Body — Only show after code validation */}
        {isCodeValidated && (
          <>
            <div className="settings-tabs">
              <button
                className={`settings-tab ${tab === 'sdr' ? 'active' : ''}`}
                onClick={() => setTab('sdr')}
              >
                Equipe SDR
                <span className="settings-tab-count">{localSdr.length}</span>
              </button>
              <button
                className={`settings-tab ${tab === 'closer' ? 'active' : ''}`}
                onClick={() => setTab('closer')}
              >
                Equipe Closer
                <span className="settings-tab-count">{localCloser.length}</span>
              </button>
              <button
                className={`settings-tab ${tab === 'lideranca' ? 'active' : ''}`}
                onClick={() => setTab('lideranca')}
              >
                Metas Gerais
              </button>
              <button
                className={`settings-tab ${tab === 'administrativo' ? 'active' : ''}`}
                onClick={() => setTab('administrativo')}
              >
                👤 Administrativo
              </button>
              <button
                className={`settings-tab ${tab === 'import-export' ? 'active' : ''}`}
                onClick={() => setTab('import-export')}
              >
                Importar/Exportar
              </button>
            </div>

            <div className="settings-body">

          {tab === 'sdr' && (
            <>
              <div className="settings-hint">
                Metas mensais por SDR. Alterações afetam o dashboard imediatamente após salvar.
              </div>
              <div className="settings-dias-uteis">
                <label>Dias Úteis/Mês:</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={localSdr[0]?.diasUteis ?? 22}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 22;
                    setLocalSdr(prev => prev.map(c => ({ ...c, diasUteis: val })));
                  }}
                  className="st-input"
                  style={{ width: '80px' }}
                />
              </div>

              <div className="settings-table">
                <div className="settings-table-head">
                  <span className="st-col-name">Nome</span>
                  <span className="st-col-name" style={{ fontSize: '0.85rem' }}>Email</span>
                  <span className="st-col-meta">Leads</span>
                  <span className="st-col-meta">Agend.</span>
                  <span className="st-col-meta">Acont.</span>
                  <span className="st-col-meta">RQA</span>
                  <span className="st-col-meta">Pago</span>
                  <span className="st-col-meta">Lig. WA</span>
                  <span className="st-col-meta">Tempo</span>
                  <span className="st-col-action" />
                </div>
                {localSdr.map((cfg, i) => (
                  <div key={cfg.id} className="settings-table-row">
                    <input
                      className="st-input st-col-name"
                      value={cfg.nome}
                      placeholder="Nome do vendedor"
                      onChange={(e) => updateSdrName(i, e.target.value)}
                      autoFocus={cfg.id.startsWith(NEW_PREFIX)}
                    />
                    <input
                      className="st-input st-col-name"
                      value={cfg.email ?? ''}
                      placeholder="email@grupovorp.com"
                      onChange={(e) => updateSdrEmail(i, e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                    <input
                      className="st-input st-col-meta"
                      type="number"
                      min={0}
                      step={1}
                      value={cfg.metas.leads}
                      onChange={(e) => updateSdrMeta(i, 'leads', e.target.value)}
                    />
                    <input
                      className="st-input st-col-meta"
                      type="number"
                      min={0}
                      step={1}
                      value={cfg.metas.agendamentos}
                      onChange={(e) => updateSdrMeta(i, 'agendamentos', e.target.value)}
                    />
                    <input
                      className="st-input st-col-meta"
                      type="number"
                      min={0}
                      step={1}
                      value={cfg.metas.acontecidas}
                      onChange={(e) => updateSdrMeta(i, 'acontecidas', e.target.value)}
                    />
                    <input
                      className="st-input st-col-meta"
                      type="number"
                      min={0}
                      step={0.1}
                      value={cfg.metas.rqa ?? 10}
                      onChange={(e) => updateSdrMeta(i, 'rqa', e.target.value)}
                      title="RQA - Requisição de Qualificação do Agendamento"
                    />
                    <input
                      className="st-input st-col-meta"
                      type="number"
                      min={0}
                      step={0.01}
                      value={cfg.metas.receita}
                      onChange={(e) => updateSdrMeta(i, 'receita', e.target.value)}
                    />
                    <input
                      className="st-input st-col-meta"
                      type="number"
                      min={0}
                      step={1}
                      value={cfg.metas.ligacoes_whatsapp}
                      onChange={(e) => updateSdrMeta(i, 'ligacoes_whatsapp', e.target.value)}
                      title="Ligações WhatsApp"
                    />
                    <input
                      className="st-input st-col-meta"
                      type="number"
                      min={0}
                      step={1}
                      value={cfg.metas.tempo_em_linha}
                      onChange={(e) => updateSdrMeta(i, 'tempo_em_linha', e.target.value)}
                      title="Tempo em Linha (minutos)"
                    />
                    <button
                      className="st-remove-btn"
                      onClick={() => removeSdr(i)}
                      title="Remover vendedor"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
              <button className="settings-add-btn" onClick={addSdr}>
                + Adicionar SDR
              </button>
            </>
          )}

          {tab === 'closer' && (
            <>
              <div className="settings-hint">
                Metas mensais por Closer. Alterações afetam o dashboard imediatamente após salvar.
              </div>
              <div className="settings-dias-uteis">
                <label>Dias Úteis/Mês:</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={localCloser[0]?.diasUteis ?? 22}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 22;
                    setLocalCloser(prev => prev.map(c => ({ ...c, diasUteis: val })));
                  }}
                  className="st-input"
                  style={{ width: '80px' }}
                />
              </div>

              <div className="settings-table">
                <div className="settings-table-head">
                  <span className="st-col-name">Nome</span>
                  <span className="st-col-name" style={{ fontSize: '0.85rem' }}>Email</span>
                  <span className="st-col-meta">Reuniões</span>
                  <span className="st-col-meta">Proposta</span>
                  <span className="st-col-meta">Contratos</span>
                  <span className="st-col-meta">MRR</span>
                  <span className="st-col-meta">ARR</span>
                  <span className="st-col-action" />
                </div>
                {localCloser.map((cfg, i) => (
                  <div key={cfg.id} className="settings-table-row">
                    <input
                      className="st-input st-col-name"
                      value={cfg.nome}
                      placeholder="Nome do closer"
                      onChange={(e) => updateCloserName(i, e.target.value)}
                      autoFocus={cfg.id.startsWith(NEW_PREFIX)}
                    />
                    <input
                      className="st-input st-col-name"
                      value={cfg.email ?? ''}
                      placeholder="email@grupovorp.com"
                      onChange={(e) => updateCloserEmail(i, e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                    <input
                      className="st-input st-col-meta"
                      type="number"
                      min={0}
                      step={0.5}
                      value={cfg.metas.reunioes}
                      onChange={(e) => updateCloserMeta(i, 'reunioes', e.target.value)}
                    />
                    <input
                      className="st-input st-col-meta"
                      type="number"
                      min={0}
                      step={0.1}
                      value={cfg.metas.proposta ?? 1.5}
                      onChange={(e) => updateCloserMeta(i, 'proposta', e.target.value)}
                      title="Propostas enviadas"
                    />
                    <input
                      className="st-input st-col-meta"
                      type="number"
                      min={0}
                      step={0.01}
                      value={cfg.metas.contratos}
                      onChange={(e) => updateCloserMeta(i, 'contratos', e.target.value)}
                    />
                    <input
                      className="st-input st-col-meta"
                      type="number"
                      min={0}
                      step={0.01}
                      value={cfg.metas.mrr ?? 0}
                      onChange={(e) => updateCloserMeta(i, 'mrr', e.target.value)}
                      title="MRR - Monthly Recurring Revenue"
                    />
                    <input
                      className="st-input st-col-meta"
                      type="number"
                      min={0}
                      step={0.01}
                      value={cfg.metas.arr ?? 0}
                      onChange={(e) => updateCloserMeta(i, 'arr', e.target.value)}
                      title="ARR - Annual Recurring Revenue"
                    />
                    <button
                      className="st-remove-btn"
                      onClick={() => removeCloser(i)}
                      title="Remover closer"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
              <button className="settings-add-btn" onClick={addCloser}>
                + Adicionar Closer
              </button>
            </>
          )}

          {tab === 'lideranca' && (
            <>
              <div className="settings-hint">
                Metas gerais da liderança. Esses valores serão comparados com os dados realizados na aba "Pace Da Liderança".
              </div>

              <div className="leadership-settings-section">
                <h3 className="leadership-section-title">Metas SDR</h3>
                <div className="leadership-grid">
                  <div className="leadership-field">
                    <label>Leads</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={localLeadership.sdr.leads}
                      onChange={(e) =>
                        setLocalLeadership({
                          ...localLeadership,
                          sdr: { ...localLeadership.sdr, leads: parseFloat(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div className="leadership-field">
                    <label>Agendamentos</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={localLeadership.sdr.agendamentos}
                      onChange={(e) =>
                        setLocalLeadership({
                          ...localLeadership,
                          sdr: { ...localLeadership.sdr, agendamentos: parseFloat(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div className="leadership-field">
                    <label>Acontecidas</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={localLeadership.sdr.acontecidas}
                      onChange={(e) =>
                        setLocalLeadership({
                          ...localLeadership,
                          sdr: { ...localLeadership.sdr, acontecidas: parseFloat(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div className="leadership-field">
                    <label>Receita</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={localLeadership.sdr.receita}
                      onChange={(e) =>
                        setLocalLeadership({
                          ...localLeadership,
                          sdr: { ...localLeadership.sdr, receita: parseFloat(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div className="leadership-field">
                    <label>Ligações WhatsApp</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={localLeadership.sdr.ligacoes_whatsapp}
                      onChange={(e) =>
                        setLocalLeadership({
                          ...localLeadership,
                          sdr: { ...localLeadership.sdr, ligacoes_whatsapp: parseFloat(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div className="leadership-field">
                    <label>Tempo em Linha (min)</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={localLeadership.sdr.tempo_em_linha}
                      onChange={(e) =>
                        setLocalLeadership({
                          ...localLeadership,
                          sdr: { ...localLeadership.sdr, tempo_em_linha: parseFloat(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="leadership-settings-section">
                <h3 className="leadership-section-title">Metas Closer</h3>
                <div className="leadership-grid">
                  <div className="leadership-field">
                    <label>Reuniões</label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={localLeadership.closer.reunioes}
                      onChange={(e) =>
                        setLocalLeadership({
                          ...localLeadership,
                          closer: { ...localLeadership.closer, reunioes: parseFloat(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div className="leadership-field">
                    <label>Contratos</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={localLeadership.closer.contratos}
                      onChange={(e) =>
                        setLocalLeadership({
                          ...localLeadership,
                          closer: { ...localLeadership.closer, contratos: parseFloat(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div className="leadership-field">
                    <label>Receita</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={localLeadership.closer.receita}
                      onChange={(e) =>
                        setLocalLeadership({
                          ...localLeadership,
                          closer: { ...localLeadership.closer, receita: parseFloat(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div className="leadership-field">
                    <label>Vendas (Qtd)</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={localLeadership.closer.vendas}
                      onChange={(e) =>
                        setLocalLeadership({
                          ...localLeadership,
                          closer: { ...localLeadership.closer, vendas: parseFloat(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div className="leadership-field">
                    <label>ARR</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={localLeadership.closer.arr}
                      onChange={(e) =>
                        setLocalLeadership({
                          ...localLeadership,
                          closer: { ...localLeadership.closer, arr: parseFloat(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div className="leadership-field">
                    <label>MRR</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={localLeadership.closer.mrr}
                      onChange={(e) =>
                        setLocalLeadership({
                          ...localLeadership,
                          closer: { ...localLeadership.closer, mrr: parseFloat(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div className="leadership-field">
                    <label>Valor Recebido</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={localLeadership.closer.valor_recebido}
                      onChange={(e) =>
                        setLocalLeadership({
                          ...localLeadership,
                          closer: { ...localLeadership.closer, valor_recebido: parseFloat(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'administrativo' && (
            <>
              <div className="settings-hint">
                Gerenciar admins e usuários autorizados.
              </div>

              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text)' }}>
                  👤 Admins Autorizados
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Emails que podem acessar Configurações e gerenciar usuários:
                </p>
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '12px',
                  minHeight: '60px'
                }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                    <div style={{ fontWeight: '500', marginBottom: '8px' }}>
                      ✓ allef@grupovorp.com (Você - Admin)
                    </div>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    💡 Futura expansão: Adicionar/remover admins graficamente
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text)' }}>
                  📋 Mapeamento de Emails
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Cada pessoa tem um email para login:
                </p>
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '0.8rem',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {localSdr.map((cfg) => (
                    <div key={cfg.id} style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text)' }}>{cfg.nome}:</span>
                      <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>
                        {cfg.email || '(não configurado)'}
                      </span>
                    </div>
                  ))}
                  {localCloser.map((cfg) => (
                    <div key={cfg.id} style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text)' }}>{cfg.nome}:</span>
                      <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>
                        {cfg.email || '(não configurado)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                background: 'rgba(0, 150, 255, 0.05)',
                border: '1px solid rgba(0, 150, 255, 0.15)',
                borderRadius: '6px',
                padding: '12px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ fontWeight: '500', marginBottom: '8px', color: 'var(--text)' }}>
                  ℹ️ Como Funciona:
                </div>
                <ul style={{ margin: '0 0 0 16px', padding: 0, lineHeight: '1.6' }}>
                  <li>👤 Apenas admins acessam Configurações</li>
                  <li>✏️ Admin edita emails de cada pessoa na aba Equipe SDR/Closer</li>
                  <li>🔒 Usuário só edita seu próprio card (matched by email)</li>
                  <li>👁️ Usuário vê todos os cards mas não pode editar outros</li>
                </ul>
              </div>
            </>
          )}

          {tab === 'import-export' && (
            <>
              <div className="settings-hint">
                Importar e exportar dados em formato CSV.
              </div>

              <div className="import-export-tabs">
                <button
                  className={`import-export-tab ${importTab === 'export' ? 'active' : ''}`}
                  onClick={() => setImportTab('export')}
                >
                  💾 Exportar
                </button>
                <button
                  className={`import-export-tab ${importTab === 'upload' ? 'active' : ''}`}
                  onClick={() => setImportTab('upload')}
                >
                  📂 Importar
                </button>
              </div>

              {importTab === 'export' && (
                <div className="import-export-content">
                  <div className="export-description">
                    <p>Exporte os dados de desempenho do período selecionado como arquivo CSV.</p>
                    {startDate && endDate && (
                      <p>Período: <strong>{formatDate(startDate)} → {formatDate(endDate)}</strong></p>
                    )}
                  </div>
                  <button className="btn-export-now" onClick={handleExportClick}>
                    ↓ Exportar CSV
                  </button>
                </div>
              )}

              {importTab === 'upload' && (
                <div className="import-export-content">
                  {/* Drop zone */}
                  <div
                    className={`drop-zone ${importDragging ? 'dragging' : ''} ${importPreview ? 'has-file' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setImportDragging(true); }}
                    onDragLeave={() => setImportDragging(false)}
                    onDrop={handleImportDrop}
                    onClick={() => fileRef.current?.click()}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,.txt"
                      style={{ display: 'none' }}
                      onChange={handleImportInputChange}
                    />
                    {importPreview ? (
                      <div className="drop-zone-loaded">
                        <span className="drop-zone-icon">✓</span>
                        <span className="drop-zone-filename">{importFileName}</span>
                        <span className="drop-zone-hint">Clique para trocar o arquivo</span>
                      </div>
                    ) : (
                      <div className="drop-zone-empty">
                        <span className="drop-zone-icon">📂</span>
                        <span className="drop-zone-text">Arraste o CSV aqui ou clique para selecionar</span>
                        <span className="drop-zone-hint">Arquivos .csv ou .txt</span>
                      </div>
                    )}
                  </div>

                  <div className="import-actions-row">
                    <button className="btn-template" onClick={downloadTemplate}>
                      ↓ Baixar Template CSV
                    </button>
                  </div>

                  {/* Errors */}
                  {importPreview && importPreview.errors.length > 0 && (
                    <div className="import-errors">
                      <div className="import-errors-title">⚠ Erros encontrados ({importPreview.errors.length})</div>
                      {importPreview.errors.map((err, i) => (
                        <div key={i} className="import-error-row">{err}</div>
                      ))}
                    </div>
                  )}

                  {/* Preview */}
                  {importPreview && importPreview.rows.length > 0 && (
                    <div className="import-preview">
                      <div className="import-preview-header">
                        <span className="import-preview-title">
                          Preview — {importPreview.rows.length} linha(s) válida(s)
                        </span>
                        <span className="import-preview-meta">
                          {importPreview.datesAffected.length} data(s) · {importPreview.personsAffected.length} pessoa(s)
                        </span>
                      </div>
                      <div className="import-preview-dates">
                        Datas:{' '}
                        {importPreview.datesAffected.map((d) => (
                          <span key={d} className="import-date-chip">{formatDate(d)}</span>
                        ))}
                      </div>
                      <div className="import-table-wrap">
                        <table className="import-table">
                          <thead>
                            <tr>
                              <th>Data</th>
                              <th>Tipo</th>
                              <th>Pessoa</th>
                              <th>V1</th>
                              <th>V2</th>
                              <th>V3</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.rows.slice(0, 30).map((row, i) => (
                              <tr key={i}>
                                <td>{formatDate(row.date)}</td>
                                <td>
                                  <span className={`import-type-badge ${row.type}`}>
                                    {row.type.toUpperCase()}
                                  </span>
                                </td>
                                <td>{row.personId}</td>
                                <td>{row.values[0]}</td>
                                <td>{row.values[1]}</td>
                                <td>{row.values[2]}</td>
                              </tr>
                            ))}
                            {importPreview.rows.length > 30 && (
                              <tr>
                                <td colSpan={6} className="import-table-more">
                                  ... e mais {importPreview.rows.length - 30} linha(s)
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {importPreview && importPreview.rows.length === 0 && importPreview.errors.length === 0 && (
                    <div className="import-empty-warn">Nenhuma linha de dados encontrada no arquivo.</div>
                  )}
                </div>
              )}
            </>
          )}

          {error && <div className="settings-error">{error}</div>}
            </div>
          </>
        )}

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          {isCodeValidated && tab !== 'import-export' && (
            <button className="btn-save" style={{ flex: 'unset', padding: '10px 28px' }} onClick={handleSave}>
              💾 Salvar Configurações
            </button>
          )}
          {isCodeValidated && tab === 'import-export' && importTab === 'upload' && importPreview && importPreview.rows.length > 0 && importPreview.errors.length === 0 && (
            <button className="btn-save" onClick={handleImportConfirmClick}>
              ✓ Importar {importPreview.rows.length} registro(s)
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
