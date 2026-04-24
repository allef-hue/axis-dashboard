import { useState, useRef } from 'react';
import { parseImportCSV, generateCSVTemplate, ImportRow, ImportPreview } from '../storage';
import { formatDate } from '../utils';
import { SDR_CONFIGS, CLOSER_CONFIGS } from '../config';

interface ImportModalProps {
  onClose: () => void;
  onConfirm: (rows: ImportRow[]) => void;
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

export default function ImportModal({ onClose, onConfirm }: ImportModalProps) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [tab, setTab] = useState<'upload' | 'ids'>('upload');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setPreview(parseImportCSV(text));
    };
    reader.readAsText(file, 'utf-8');
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  const canConfirm = preview && preview.rows.length > 0 && preview.errors.length === 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Importar Dados — CSV</div>
            <div className="modal-subtitle">
              Importe dados de múltiplos dias de uma vez
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="import-tabs">
          <button
            className={`import-tab ${tab === 'upload' ? 'active' : ''}`}
            onClick={() => setTab('upload')}
          >
            Upload CSV
          </button>
          <button
            className={`import-tab ${tab === 'ids' ? 'active' : ''}`}
            onClick={() => setTab('ids')}
          >
            IDs do Time
          </button>
        </div>

        {tab === 'ids' && (
          <div className="import-ids-section">
            <p className="import-ids-desc">
              Use estes IDs no campo <code>pessoa_id</code> do CSV:
            </p>
            <div className="import-ids-grid">
              <div>
                <div className="import-ids-group-label">SDRs</div>
                {SDR_CONFIGS.map((c) => (
                  <div key={c.id} className="import-id-row">
                    <span className="import-id-code">{c.id}</span>
                    <span className="import-id-name">{c.nome}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="import-ids-group-label">Closers</div>
                {CLOSER_CONFIGS.map((c) => (
                  <div key={c.id} className="import-id-row">
                    <span className="import-id-code">{c.id}</span>
                    <span className="import-id-name">{c.nome}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="import-format-box">
              <div className="import-format-title">Formato do CSV</div>
              <code className="import-format-code">
                data,tipo,pessoa_id,v1,v2,v3{'\n'}
                2026-04-21,sdr,joao_silva,44,3,2{'\n'}
                2026-04-21,closer,eliel,3,1,2375
              </code>
              <div className="import-format-legend">
                <div><strong>SDR:</strong> v1=leads, v2=agendamentos, v3=acontecidas</div>
                <div><strong>Closer:</strong> v1=reunioes, v2=contratos, v3=receita</div>
                <div><strong>Data:</strong> formato YYYY-MM-DD</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'upload' && (
          <>
            {/* Drop zone */}
            <div
              className={`drop-zone ${dragging ? 'dragging' : ''} ${preview ? 'has-file' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                style={{ display: 'none' }}
                onChange={handleInputChange}
              />
              {preview ? (
                <div className="drop-zone-loaded">
                  <span className="drop-zone-icon">✓</span>
                  <span className="drop-zone-filename">{fileName}</span>
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
            {preview && preview.errors.length > 0 && (
              <div className="import-errors">
                <div className="import-errors-title">⚠ Erros encontrados ({preview.errors.length})</div>
                {preview.errors.map((err, i) => (
                  <div key={i} className="import-error-row">{err}</div>
                ))}
              </div>
            )}

            {/* Preview */}
            {preview && preview.rows.length > 0 && (
              <div className="import-preview">
                <div className="import-preview-header">
                  <span className="import-preview-title">
                    Preview — {preview.rows.length} linha(s) válida(s)
                  </span>
                  <span className="import-preview-meta">
                    {preview.datesAffected.length} data(s) · {preview.personsAffected.length} pessoa(s)
                  </span>
                </div>
                <div className="import-preview-dates">
                  Datas:{' '}
                  {preview.datesAffected.map((d) => (
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
                      {preview.rows.slice(0, 30).map((row, i) => (
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
                      {preview.rows.length > 30 && (
                        <tr>
                          <td colSpan={6} className="import-table-more">
                            ... e mais {preview.rows.length - 30} linha(s)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {preview && preview.rows.length === 0 && preview.errors.length === 0 && (
              <div className="import-empty-warn">Nenhuma linha de dados encontrada no arquivo.</div>
            )}
          </>
        )}

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          {canConfirm && (
            <button
              className="btn-save"
              onClick={() => onConfirm(preview.rows)}
            >
              Importar {preview.rows.length} registro(s)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
