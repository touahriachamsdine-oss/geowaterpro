import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, AlertTriangle, CheckCircle, FileText, ChevronDown } from 'lucide-react';
import { trainAndForecast, getAquiferForecast, SCENARIOS } from '../utils/forecasting';
import type { ForecastResult, AquiferForecastResult } from '../utils/forecasting';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────
interface UploadedWell {
  id: number;
  name: string;
  location: string;
  aquiferId: number;
  aquiferName: string;
  K?: number; b?: number; S?: number;
  history: { month: string; q: number; r?: number; wl: number }[];
}

interface WellResult {
  well: UploadedWell;
  result: ForecastResult;
}

interface AquiferGroup {
  id: number;
  name: string;
  wells: UploadedWell[];
  result: AquiferForecastResult | null;
}

type ParseError = { row: number; message: string };

// ── Required columns ───────────────────────────────────────────────────────
const SIMPLE_COLS = ['well_name', 'location', 'month', 'wl', 'q'];
const ADVANCED_COLS = [...SIMPLE_COLS, 'aquifer_id', 'aquifer_name', 'r', 'K', 'b', 'S'];

// ── Template download ──────────────────────────────────────────────────────
function downloadTemplate(mode: 'simple' | 'advanced') {
  const wb = XLSX.utils.book_new();
  const headers = mode === 'simple'
    ? ['well_name', 'location', 'month', 'wl', 'q']
    : ['well_name', 'location', 'aquifer_id', 'aquifer_name', 'K', 'b', 'S', 'month', 'wl', 'q', 'r'];
  const example = mode === 'simple'
    ? [['Well-A', 'Site 1', '2023/01', 25.4, 1500], ['Well-A', 'Site 1', '2023/02', 25.8, 1520]]
    : [['Well-A', 'Site 1', 1, 'Aquifer Alpha', 10, 50, 0.005, '2023/01', 25.4, 1500, 0.002]];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, `GeoWaterics_${mode}_template.xlsx`);
}

// ── Main Component ─────────────────────────────────────────────────────────
interface Props {
  userRole: 'simple' | 'advanced';
  selectedLanguage: string;
}

export default function UploadAnalyze({ userRole, selectedLanguage: _selectedLanguage }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [uploadedWells, setUploadedWells] = useState<UploadedWell[]>([]);
  const [aquiferGroups, setAquiferGroups] = useState<AquiferGroup[]>([]);
  const [wellResults, setWellResults] = useState<WellResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'simple' | 'advanced'>(userRole === 'advanced' ? 'advanced' : 'simple');
  const [isRunning, setIsRunning] = useState(false);
  const [fileName, setFileName] = useState('');
  const [showBatchSummary, setShowBatchSummary] = useState(false);

  const scenario = SCENARIOS.find(s => s.id === 'normal')!;

  // ── Parse xlsx ──────────────────────────────────────────────────────────
  const handleFile = (file: File) => {
    setFileName(file.name);
    setParseErrors([]);
    setUploadedWells([]);
    setAquiferGroups([]);
    setWellResults([]);
    setSelectedId(null);
    setShowBatchSummary(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target!.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, string | number>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const errors: ParseError[] = [];
        const requiredCols = mode === 'advanced' ? ADVANCED_COLS : SIMPLE_COLS;
        if (rows.length === 0) { errors.push({ row: 0, message: 'File is empty.' }); setParseErrors(errors); return; }

        const missing = requiredCols.filter(c => !(c in rows[0]));
        if (missing.length > 0) {
          errors.push({ row: 1, message: `Missing columns: ${missing.join(', ')}` });
          setParseErrors(errors);
          return;
        }

        // Group by well
        const wellMap = new Map<string, UploadedWell>();
        let wellIdCounter = 1;

        rows.forEach((row, i) => {
          const rowNum = i + 2;
          const name = String(row.well_name || '').trim();
          const location = String(row.location || '').trim();
          const month = String(row.month || '').trim();
          const wl = Number(row.wl);
          const q = Number(row.q);

          if (!name) { errors.push({ row: rowNum, message: 'well_name is empty' }); return; }
          if (!/^\d{4}\/\d{2}$/.test(month)) { errors.push({ row: rowNum, message: `month "${month}" must be YYYY/MM` }); return; }
          if (isNaN(wl) || wl < 0) { errors.push({ row: rowNum, message: `wl invalid at row ${rowNum}` }); return; }
          if (isNaN(q) || q < 0) { errors.push({ row: rowNum, message: `q invalid at row ${rowNum}` }); return; }

          const key = name;
          if (!wellMap.has(key)) {
            const aqId = mode === 'advanced' ? Number(row.aquifer_id) || 1 : 1;
            const aqName = mode === 'advanced' ? String(row.aquifer_name || 'Aquifer 1').trim() : 'Aquifer 1';
            const K = mode === 'advanced' ? Number(row.K) || 10 : undefined;
            const b = mode === 'advanced' ? Number(row.b) || 50 : undefined;
            const S = mode === 'advanced' ? Number(row.S) || 0.005 : undefined;
            wellMap.set(key, { id: wellIdCounter++, name, location, aquiferId: aqId, aquiferName: aqName, K, b, S, history: [] });
          }

          const r = mode === 'advanced' ? Number(row.r) || 0 : undefined;
          wellMap.get(key)!.history.push({ month, q, r, wl });
        });

        if (errors.length > 0) { setParseErrors(errors); return; }

        // Validate min history
        const wells: UploadedWell[] = [];
        wellMap.forEach(w => {
          if (w.history.length < 3) {
            errors.push({ row: 0, message: `Well "${w.name}" has only ${w.history.length} history rows (min 3 required).` });
          } else {
            w.history.sort((a, b) => a.month.localeCompare(b.month));
            wells.push(w);
          }
        });

        if (errors.length > 0) { setParseErrors(errors); return; }
        setUploadedWells(wells);
      } catch (err) {
        setParseErrors([{ row: 0, message: `Failed to read file: ${String(err)}` }]);
      }
    };
    reader.readAsBinaryString(file);
  };

  // ── Run pipeline ────────────────────────────────────────────────────────
  const runAnalysis = () => {
    if (uploadedWells.length === 0) return;
    setIsRunning(true);
    setTimeout(() => {
      try {
        const results: WellResult[] = uploadedWells.map(w => ({
          well: w,
          result: trainAndForecast(w.history, scenario, 6, w.K, w.b, w.S)
        }));
        setWellResults(results);

        if (mode === 'advanced') {
          const aqMap = new Map<number, { wells: UploadedWell[]; name: string }>();
          uploadedWells.forEach(w => {
            if (!aqMap.has(w.aquiferId)) aqMap.set(w.aquiferId, { wells: [], name: w.aquiferName });
            aqMap.get(w.aquiferId)!.wells.push(w);
          });
          const groups: AquiferGroup[] = [];
          aqMap.forEach((val, id) => {
            const firstWell = val.wells[0];
            const aqResult = getAquiferForecast(val.wells, scenario, 6, firstWell.K, firstWell.b, firstWell.S);
            groups.push({ id, name: val.name, wells: val.wells, result: aqResult });
          });
          setAquiferGroups(groups);
          setShowBatchSummary(true);
        } else {
          setShowBatchSummary(true);
        }
        if (results.length > 0) setSelectedId(`well-${results[0].well.id}`);
      } catch (err) {
        setParseErrors([{ row: 0, message: `Analysis error: ${String(err)}` }]);
      }
      setIsRunning(false);
    }, 100);
  };

  // ── Chart data ──────────────────────────────────────────────────────────
  const buildChartData = (result: ForecastResult | AquiferForecastResult) => {
    const history = result.historyFits.map(h => ({ month: h.month.substring(5), actual: h.wl, hybrid: h.wl, ai: h.wlAI, analytical: h.wlAnalytical }));
    const forecast = result.forecastPoints.map(f => ({ month: f.month.substring(5), hybrid: f.wl, ai: f.wlAI, analytical: f.wlAnalytical }));
    return [...history, ...forecast];
  };

  const selectedWellResult = wellResults.find(r => `well-${r.well.id}` === selectedId);
  const selectedAqGroup = aquiferGroups.find(g => `aq-${g.id}` === selectedId);

  const activeResult = selectedWellResult?.result ?? selectedAqGroup?.result;
  const activeLabel = selectedWellResult
    ? `Well: ${selectedWellResult.well.name} — Aquifer: ${selectedWellResult.well.aquiferName}`
    : selectedAqGroup
      ? `Aquifer: ${selectedAqGroup.name} — Averaged across ${selectedAqGroup.wells.length} wells`
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="header-row">
        <div className="page-title">
          <h2>Upload & Analyze</h2>
          <p>Upload your own Excel file to run the full GeoWaterics analytical + AI + hybrid pipeline on custom well data.</p>
        </div>
      </div>

      {/* Mode + Template */}
      <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Analysis Mode</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['simple', 'advanced'] as const).filter(m => userRole === 'advanced' || m === 'simple').map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={mode === m ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '12px', padding: '6px 14px', textTransform: 'capitalize' }}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <button onClick={() => downloadTemplate(mode)} className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <Download size={14} /> Download {mode} template
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className="glass-panel"
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileRef.current?.click()}
        style={{ border: '2px dashed var(--panel-border)', cursor: 'pointer', textAlign: 'center', padding: '40px 20px', transition: 'border-color 0.2s' }}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        <Upload size={36} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
        <p style={{ fontWeight: '600', marginBottom: '4px' }}>{fileName || 'Click or drag an Excel file here'}</p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Supports .xlsx — {mode === 'simple' ? 'columns: well_name, location, month, wl, q' : 'columns: well_name, location, aquifer_id, aquifer_name, K, b, S, month, wl, q, r'}</p>
      </div>

      {/* Errors */}
      {parseErrors.length > 0 && (
        <div className="glass-panel" style={{ borderLeft: '4px solid var(--critical)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <AlertTriangle size={18} color="var(--critical)" />
            <strong>Validation Errors ({parseErrors.length})</strong>
          </div>
          <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {parseErrors.map((e, i) => <li key={i}>{e.row > 0 ? `Row ${e.row}: ` : ''}{e.message}</li>)}
          </ul>
        </div>
      )}

      {/* Wells detected */}
      {uploadedWells.length > 0 && wellResults.length === 0 && (
        <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={20} color="var(--success)" />
            <div>
              <strong>{uploadedWells.length} wells parsed successfully</strong>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                {[...new Set(uploadedWells.map(w => w.aquiferName))].join(', ')}
              </p>
            </div>
          </div>
          <button onClick={runAnalysis} disabled={isRunning} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} />
            {isRunning ? 'Running analysis…' : 'Run Full Analysis'}
          </button>
        </div>
      )}

      {/* Results */}
      {wellResults.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Batch summary */}
          {showBatchSummary && (
            <div className="glass-panel">
              <button onClick={() => setShowBatchSummary(b => !b)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'space-between', marginBottom: showBatchSummary ? '16px' : 0, fontSize: '15px', fontWeight: '600' }}>
                <span>Batch Summary — {uploadedWells.length} Wells / {[...new Set(uploadedWells.map(w => w.aquiferName))].length} Aquifer(s)</span>
                <ChevronDown size={16} />
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                {mode === 'advanced' ? aquiferGroups.map(aq => (
                  <div key={aq.id} onClick={() => setSelectedId(`aq-${aq.id}`)}
                    style={{ padding: '14px', borderRadius: '10px', border: `2px solid ${selectedId === `aq-${aq.id}` ? 'var(--primary)' : 'rgba(255,255,255,0.07)'}`, cursor: 'pointer', background: selectedId === `aq-${aq.id}` ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontWeight: '700', marginBottom: '4px' }}>Aquifer: {aq.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Averaged across {aq.wells.length} wells</div>
                    {aq.result && <div style={{ fontSize: '13px', marginTop: '8px' }}>Hybrid Accuracy: <strong style={{ color: 'var(--primary)' }}>{aq.result.metrics.wl.accuracyPercent}%</strong></div>}
                  </div>
                )) : wellResults.map(wr => (
                  <div key={wr.well.id} onClick={() => setSelectedId(`well-${wr.well.id}`)}
                    style={{ padding: '14px', borderRadius: '10px', border: `2px solid ${selectedId === `well-${wr.well.id}` ? 'var(--primary)' : 'rgba(255,255,255,0.07)'}`, cursor: 'pointer', background: selectedId === `well-${wr.well.id}` ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontWeight: '700', marginBottom: '4px' }}>Well: {wr.well.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{wr.well.location}</div>
                    <div style={{ fontSize: '13px', marginTop: '8px' }}>Hybrid Accuracy: <strong style={{ color: 'var(--primary)' }}>{wr.result.metrics.wl.accuracyPercent}%</strong></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual inspector */}
          {activeResult && activeLabel && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Source breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderRadius: '8px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', fontSize: '13px' }}>
                <CheckCircle size={16} color="var(--primary)" />
                <span><strong>Showing:</strong> {activeLabel}</span>
              </div>

              {/* Selector for individual wells in advanced mode */}
              {mode === 'advanced' && selectedAqGroup && (
                <div className="glass-panel" style={{ padding: '14px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '10px' }}>Inspect individual well:</span>
                  <select onChange={e => setSelectedId(e.target.value)} value={selectedId || ''} className="form-select" style={{ fontSize: '12px', padding: '4px 10px' }}>
                    <option value={`aq-${selectedAqGroup.id}`}>— Aquifer average ({selectedAqGroup.name}) —</option>
                    {selectedAqGroup.wells.map(w => (
                      <option key={w.id} value={`well-${w.id}`}>Well: {w.name} ({w.location})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Metrics */}
              <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                {[
                  { label: 'Hybrid Accuracy', value: `${activeResult.metrics.wl.accuracyPercent}%`, color: 'var(--primary)' },
                  { label: 'AI Accuracy', value: `${activeResult.metrics.wlAI.accuracyPercent}%`, color: 'var(--secondary)' },
                  { label: 'Analytical Accuracy', value: `${activeResult.metrics.wlAnalytical.accuracyPercent}%`, color: 'var(--success)' },
                  { label: 'Hybrid R²', value: activeResult.metrics.wl.rSquared, color: '#fff' },
                  { label: 'Hybrid MAE', value: `${activeResult.metrics.wl.mae} m`, color: '#fff' },
                ].map(m => (
                  <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.label}</span>
                    <strong style={{ fontSize: '20px', color: m.color }}>{m.value}</strong>
                  </div>
                ))}
              </div>

              {/* Forecast chart */}
              <div className="glass-panel">
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>6-Month Water Level Forecast</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>{activeLabel}</p>
                <div style={{ height: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={buildChartData(activeResult)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" stroke="var(--text-secondary)" tick={{ fontSize: 10 }} />
                      <YAxis stroke="var(--text-secondary)" label={{ value: 'WL (m)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="hybrid" stroke="var(--primary)" strokeWidth={2} dot={false} name="Hybrid" isAnimationActive={false} />
                      <Line type="monotone" dataKey="ai" stroke="var(--secondary)" strokeWidth={1.5} dot={false} name="AI" strokeDasharray="4 4" isAnimationActive={false} />
                      <Line type="monotone" dataKey="analytical" stroke="var(--success)" strokeWidth={1.5} dot={false} name="Analytical" strokeDasharray="2 4" isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Forecast table */}
              <div className="glass-panel">
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Forecast Values</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>{activeLabel}</p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        {['Month', 'Hybrid WL (m)', 'AI WL (m)', 'Analytical WL (m)', 'Drawdown (m)', 'Q (m³/mo)'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '11px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeResult.forecastPoints.map((fp, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px 10px', fontWeight: '500' }}>{fp.month}</td>
                          <td style={{ padding: '8px 10px', color: 'var(--primary)', fontWeight: '600' }}>{fp.wl}</td>
                          <td style={{ padding: '8px 10px', color: 'var(--secondary)' }}>{fp.wlAI}</td>
                          <td style={{ padding: '8px 10px', color: 'var(--success)' }}>{fp.wlAnalytical}</td>
                          <td style={{ padding: '8px 10px', color: fp.drawdown > 0 ? 'var(--warning)' : 'var(--success)' }}>{fp.drawdown > 0 ? '+' : ''}{fp.drawdown}</td>
                          <td style={{ padding: '8px 10px' }}>{fp.q.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
