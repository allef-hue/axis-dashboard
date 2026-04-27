import { useState, useEffect } from 'react';
import { SDRConfig, CloserConfig, SDRData, CloserData } from '../types';
import { formatCurrency } from '../utils';

interface EditModalSDR {
  type: 'sdr';
  config: SDRConfig;
  data: SDRData | null;
  date: string;
  onSave: (data: SDRData, date: string) => void;
  onClose: () => void;
  onDelete: () => void;
}

interface EditModalCloser {
  type: 'closer';
  config: CloserConfig;
  data: CloserData | null;
  date: string;
  onSave: (data: CloserData, date: string) => void;
  onClose: () => void;
  onDelete: () => void;
}

type EditModalProps = EditModalSDR | EditModalCloser;

function validateNumber(val: string): string | null {
  if (val === '') return 'Campo obrigatório';
  if (isNaN(Number(val.replace(',', '.')))) return 'Deve ser um número';
  if (Number(val.replace(',', '.')) < 0) return 'Não pode ser negativo';
  return null;
}

export default function EditModal(props: EditModalProps) {
  const { type, config, data, date, onClose, onDelete } = props;

  const [fields, setFields] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<string>(date);

  useEffect(() => {
    if (type === 'sdr') {
      const d = data as SDRData | null;
      setFields({
        leads: d ? String(d.leads) : '',
        agendamentos: d ? String(d.agendamentos) : '',
        acontecidas: d ? String(d.acontecidas) : '',
        receita: d ? String(d.receita ?? 0) : '',
        ligacoes_whatsapp: d ? String(d.ligacoes_whatsapp ?? 0) : '',
        tempo_em_linha: d ? String(d.tempo_em_linha ?? 0) : '',
        rqa: d ? String(d.rqa ?? 0) : '',
      });
    } else {
      const d = data as CloserData | null;
      setFields({
        reunioes: d ? String(d.reunioes) : '',
        contratos: d ? String(d.contratos) : '',
        receita: d ? String(d.receita) : '',
      });
    }
    setErrors({});
    setTouched({});
  }, [type, data]);

  const fieldKeys =
    type === 'sdr'
      ? ['leads', 'agendamentos', 'acontecidas', 'receita', 'ligacoes_whatsapp', 'tempo_em_linha', 'rqa']
      : ['reunioes', 'contratos', 'receita'];

  const sdrMetas = type === 'sdr' ? (config as SDRConfig).metas : null;
  const closerMetas = type === 'closer' ? (config as CloserConfig).metas : null;

  const fieldLabels: Record<string, string> = {
    leads: 'Leads Trabalhados',
    agendamentos: 'Agendamentos',
    acontecidas: 'Acontecidas (Show)',
    receita: type === 'sdr' ? 'Receita Originada (R$)' : 'Receita Paga (R$)',
    ligacoes_whatsapp: '☎️ Ligações WhatsApp',
    tempo_em_linha: '⏱️ Tempo em Linha (min)',
    rqa: 'RQA (Qualidade de Atendimento)',
    reunioes: 'Reuniões Recebidas',
    contratos: 'Contratos Assinados',
  };

  const fieldHints: Record<string, string> = {
    leads: `Meta diária: ${sdrMetas?.leads ?? ''} leads`,
    agendamentos: `Meta diária: ${sdrMetas?.agendamentos ?? ''} agendamentos`,
    acontecidas: `Meta diária: ${sdrMetas?.acontecidas ?? ''} acontecidas`,
    receita:
      type === 'sdr'
        ? `Meta diária: ${formatCurrency(sdrMetas?.receita ?? 0)} de receita originada`
        : `Meta diária: ${formatCurrency(closerMetas?.receita ?? 0)} de receita paga`,
    ligacoes_whatsapp: `Meta mensal: ${sdrMetas?.ligacoes_whatsapp ?? ''} ligações`,
    tempo_em_linha: `Meta mensal: ${sdrMetas?.tempo_em_linha ?? ''} minutos`,
    rqa: `Meta mensal: ${sdrMetas?.rqa ?? '10'} de RQA`,
    reunioes: `Meta diária: ${closerMetas?.reunioes ?? ''} reuniões`,
    contratos: `Meta diária: ${closerMetas?.contratos ?? ''} contratos`,
  };

  const fieldPlaceholders: Record<string, string> = {
    leads: '0', agendamentos: '0', acontecidas: '0',
    receita: '0,00', ligacoes_whatsapp: '0', tempo_em_linha: '0', rqa: '0',
    reunioes: '0', contratos: '0',
  };

  const fieldSteps: Record<string, string> = {
    leads: '1', agendamentos: '1', acontecidas: '1',
    receita: '0.01', ligacoes_whatsapp: '1', tempo_em_linha: '1', rqa: '0.1',
    reunioes: '0.5', contratos: '0.01',
  };

  function handleChange(key: string, val: string) {
    setFields((prev) => ({ ...prev, [key]: val }));
    if (touched[key]) {
      const err = validateNumber(val);
      setErrors((prev) => ({ ...prev, [key]: err ?? '' }));
    }
  }

  function handleBlur(key: string) {
    setTouched((prev) => ({ ...prev, [key]: true }));
    const err = validateNumber(fields[key]);
    setErrors((prev) => ({ ...prev, [key]: err ?? '' }));
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};
    let valid = true;
    for (const key of fieldKeys) {
      newTouched[key] = true;
      const err = validateNumber(fields[key]);
      if (err) { newErrors[key] = err; valid = false; }
    }
    setTouched(newTouched);
    setErrors(newErrors);
    return valid;
  }

  function parseVal(v: string): number {
    return Number(v.replace(',', '.')) || 0;
  }

  function handleSave() {
    if (!validate()) return;
    const now = new Date().toISOString();

    if (type === 'sdr') {
      const c = config as SDRConfig;
      (props as EditModalSDR).onSave({
        id: c.id, nome: c.nome,
        leads: parseVal(fields.leads),
        agendamentos: parseVal(fields.agendamentos),
        acontecidas: parseVal(fields.acontecidas),
        receita: parseVal(fields.receita),
        ligacoes_whatsapp: parseVal(fields.ligacoes_whatsapp),
        tempo_em_linha: parseVal(fields.tempo_em_linha),
        rqa: parseVal(fields.rqa),
        updatedAt: now,
      }, selectedDate);
    } else {
      const c = config as CloserConfig;
      (props as EditModalCloser).onSave({
        id: c.id, nome: c.nome,
        reunioes: parseVal(fields.reunioes),
        contratos: parseVal(fields.contratos),
        receita: parseVal(fields.receita),
        updatedAt: now,
      }, selectedDate);
    }
  }

  const hasData = data !== null;
  const isValid = fieldKeys.every((k) => !errors[k] && fields[k] !== '');

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <div className="modal-title">{config.nome}</div>
            <div className="modal-date">
              {type === 'sdr' ? 'SDR' : 'Closer'} · Meu Pace
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn-save"
              onClick={handleSave}
              disabled={!isValid}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              Salvar ✓
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-date-selector">
          <label htmlFor="date-input" className="date-selector-label">Data do Preenchimento:</label>
          <input
            id="date-input"
            type="date"
            className="date-selector-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="modal-body">
          {fieldKeys.map((key) => (
            <div key={key} className={`form-group${key === 'receita' ? ' form-group-receita' : ''}`}>
              <label className="form-label" htmlFor={`input-${key}`}>
                {fieldLabels[key]}
                {key === 'receita' && (
                  <span className="form-label-badge">💰 Financeiro</span>
                )}
              </label>
              <input
                id={`input-${key}`}
                type="number"
                className={`form-input${touched[key] && errors[key] ? ' error' : ''}`}
                value={fields[key]}
                min="0"
                step={fieldSteps[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                onBlur={() => handleBlur(key)}
                placeholder={fieldPlaceholders[key]}
              />
              {touched[key] && errors[key] ? (
                <span className="form-error">{errors[key]}</span>
              ) : (
                <span className="form-hint">{fieldHints[key]}</span>
              )}
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn-save" onClick={handleSave} disabled={!isValid}>
            Salvar
          </button>
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          {hasData && (
            <button className="btn-delete" onClick={onDelete} title="Remover dados do dia">
              Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
