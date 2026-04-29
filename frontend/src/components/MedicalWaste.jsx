import { useState, useCallback, useRef } from 'react'
import { CyclicSelect, CyclicList } from '../utils/cyclicScroll.jsx'
import { BENGALURU_CENTER, getNearestCenters } from '../utils/disposalCenters'
import NearestCenterMap from './NearestCenterMap'
const API_BASE = import.meta.env.VITE_API_URL || "";

const UNITS = ['units', 'tablets', 'capsules', 'ml', 'mg', 'vials', 'strips', 'bottles']
const DEMO  = { medicine_name: 'Amoxicillin 500mg', expiry_date: '2025-12-01', quantity: '30', unit: 'capsules' }

const BULK_DEMO = [
  { medicine_name: 'Insulin Glargine',  expiry_date: '2025-06-15', quantity: '5',  unit: 'vials'   },
  { medicine_name: 'Paracetamol 500mg', expiry_date: '2026-03-01', quantity: '100',unit: 'tablets' },
  { medicine_name: 'Vitamin C 1000mg',  expiry_date: '2025-08-01', quantity: '60', unit: 'tablets' },
]

const RISK_CONFIG = {
  High:   { bg: 'bg-red-50 dark:bg-red-950',    border: 'border-red-300',    badge: 'bg-red-600 text-white',    icon: '🔴', label: 'HIGH RISK'   },
  Medium: { bg: 'bg-yellow-50 dark:bg-yellow-950',border:'border-yellow-300', badge: 'bg-yellow-500 text-white', icon: '🟡', label: 'MEDIUM RISK' },
  Low:    { bg: 'bg-green-50 dark:bg-green-950', border: 'border-green-300',  badge: 'bg-green-600 text-white',  icon: '🟢', label: 'LOW RISK'    },
}

const HISTORY_KEY = 'wg_medical_history'
const loadHistory  = () => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] } }
const saveHistory  = (entry) => {
  const prev = loadHistory().slice(0, 49)
  localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...prev]))
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCSV(rows) {
  const headers = ['Medicine Name','Expiry Date','Quantity','Unit','Risk Level','Analyzed At']
  const lines   = [headers.join(','), ...rows.map(r =>
    [r.medicine_name, r.expiry_date, r.quantity, r.unit, r.risk_level, r.analyzed_at].map(v => `"${v}"`).join(',')
  )]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'medical_waste_report.csv' })
  a.click()
  URL.revokeObjectURL(url)
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

// ── Single result card ────────────────────────────────────────────────────────
function ResultCard({ result, form }) {
  const risk = RISK_CONFIG[result.risk_level] || RISK_CONFIG.Medium
  const nearest = getNearestCenters(BENGALURU_CENTER, 3)

  return (
    <div className={`rounded-xl border ${risk.border} ${risk.bg} p-5 space-y-3`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Risk Assessment</p>
          <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full ${risk.badge}`}>
            {risk.icon} {risk.label}
          </span>
        </div>
        <div className="text-right text-xs text-gray-500 dark:text-gray-400">
          <p className="font-semibold text-gray-700 dark:text-gray-200">{form.medicine_name}</p>
          <p>{form.quantity} {form.unit} · Exp: {form.expiry_date}</p>
        </div>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-gray-800/70 rounded-lg px-3 py-2 border border-white dark:border-gray-700">
        {result.risk_reason}
      </p>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">♻️ Disposal Method</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{result.disposal_method}</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">📋 Disposal Steps</p>
        <ol className="space-y-1.5">
          {result.disposal_steps?.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">📍 Nearest Disposal Centers</p>
        <div className="space-y-2 mb-3">
          {nearest.map((c, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2 text-xs">
              <span className="text-lg shrink-0">{c.type === 'Hospital' ? '🏥' : '♻️'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {i === 0 && <span className="text-yellow-500 mr-1">⭐</span>}{c.name}
                </p>
                <p className="text-gray-500 dark:text-gray-400 truncate">{c.address}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-blue-600 dark:text-blue-400">{c.distKm} km</p>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${c.coords[0]},${c.coords[1]}`}
                   target="_blank" rel="noopener noreferrer"
                   className="text-green-600 dark:text-green-400 hover:underline font-semibold">Directions →</a>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <NearestCenterMap fromCoords={BENGALURU_CENTER} />
        </div>
      </div>

      <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 flex items-start gap-2">
        <span className="text-lg shrink-0">⚠️</span>
        <div>
          <p className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Precautions</p>
          <p className="text-sm text-orange-800 dark:text-orange-300 mt-0.5">{result.precautions}</p>
        </div>
      </div>

      {result.suggestions?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">💡 AI Suggestions</p>
          <ul className="space-y-1">
            {result.suggestions.map((s, i) => (
              <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.regulatory_note && (
        <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
          <span className="shrink-0">🏛️</span>
          <span>{result.regulatory_note}</span>
        </div>
      )}
    </div>
  )
}

// ── Single analyzer tab ───────────────────────────────────────────────────────
function SingleTab() {
  const [form, setForm]       = useState({ medicine_name: '', expiry_date: '', quantity: '', unit: 'tablets' })
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [history, setHistory] = useState(loadHistory)

  const setField   = useCallback((e) => { const { name, value } = e.target; setForm(f => ({ ...f, [name]: value })) }, [])
  const fillDemo   = useCallback(() => setForm(DEMO), [])

  const analyze = useCallback(async (e) => {
    e.preventDefault()
    setError(''); setResult(null); setLoading(true)
    try {
      const res  = await fetch(`${API_BASE}/api/medical-analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setResult(data)
      const entry = { ...form, risk_level: data.risk_level, analyzed_at: new Date().toLocaleString() }
      saveHistory(entry)
      setHistory(loadHistory())
    } catch { setError('Analysis failed. Please check the backend is running.') }
    finally  { setLoading(false) }
  }, [form])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Medicine Details</h3>
            <button type="button" onClick={fillDemo}
              className="text-xs bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-semibold px-3 py-1.5 rounded-lg transition-colors">
              ▶ Load Demo
            </button>
          </div>
          <form onSubmit={analyze} className="space-y-3">
            {[
              { name: 'medicine_name', label: 'Medicine Name *', type: 'text', placeholder: 'e.g. Amoxicillin 500mg, Insulin Glargine', required: true },
              { name: 'expiry_date',   label: 'Expiry Date *',   type: 'date', required: true },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{f.label}</label>
                <input name={f.name} type={f.type} required={f.required} value={form[f.name]}
                  onChange={setField} placeholder={f.placeholder}
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Quantity *</label>
                <input name="quantity" type="number" min="1" required value={form.quantity} onChange={setField} placeholder="e.g. 30"
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Unit</label>
                <CyclicSelect
                  name="unit"
                  value={form.unit}
                  onChange={setField}
                  options={UNITS.map(u => ({ value: u, label: u }))}
                  title="Scroll up on first element to cycle to last"
                  className="w-full dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg px-3 py-2">⚠️ {error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
              {loading ? <><Spinner /> Analyzing with AI...</> : '🔬 Analyze Waste'}
            </button>
          </form>
        </div>

        {/* Result */}
        <div>
          {!result && !loading && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 h-full flex flex-col items-center justify-center py-16 text-center px-6">
              <span className="text-5xl mb-3">🏥</span>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Analysis results will appear here</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Fill in medicine details and click Analyze</p>
            </div>
          )}
          {result && <ResultCard result={result} form={form} />}
          {/* History */}
          {history.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Recent Analyses ({history.length}) - Sorted by Quantity</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => exportCSV(history)}
                    className="text-xs bg-green-50 hover:bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 font-semibold px-3 py-1 rounded-lg transition-colors">
                    ⬇ Export CSV
                  </button>
                  <button onClick={() => { localStorage.removeItem(HISTORY_KEY); setHistory([]) }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                    Clear
                  </button>
                </div>
              </div>
              <CyclicList className="divide-y divide-gray-50 dark:divide-gray-700 max-h-64">
                {[...history]
                  .sort((a, b) => parseInt(a.quantity) - parseInt(b.quantity))
                  .map((h, i) => {
                    const cfg = RISK_CONFIG[h.risk_level] || RISK_CONFIG.Medium
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <span className={`font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{h.risk_level}</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">{h.medicine_name}</span>
                        <span className="text-gray-500 dark:text-gray-400 font-semibold">{h.quantity} {h.unit}</span>
                        <span className="text-gray-400 dark:text-gray-500">Exp: {h.expiry_date}</span>
                        <span className="text-gray-400 dark:text-gray-500 hidden sm:block">{h.analyzed_at}</span>
                      </div>
                    )
                  })}
              </CyclicList>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Bulk scanner tab ──────────────────────────────────────────────────────────
function BulkTab() {
  const EMPTY_ROW = { medicine_name: '', expiry_date: '', quantity: '', unit: 'tablets' }
  const [rows, setRows]       = useState([{ ...EMPTY_ROW }])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileRef = useRef(null)

  const updateRow = useCallback((i, field, value) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }, [])

  const addRow    = useCallback(() => setRows(prev => [...prev, { ...EMPTY_ROW }]), [])
  const removeRow = useCallback((i) => setRows(prev => prev.filter((_, idx) => idx !== i)), [])
  const loadDemo  = useCallback(() => setRows(BULK_DEMO.map(r => ({ ...r }))), [])

  const analyzeAll = useCallback(async () => {
    const valid = rows.filter(r => r.medicine_name && r.expiry_date && r.quantity)
    if (!valid.length) return
    setResults([]); setLoading(true); setProgress(0)
    const out = []
    for (let i = 0; i < valid.length; i++) {
      try {
        const res  = await fetch(`${API_BASE}/api/medical-analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valid[i]) })
        const data = await res.json()
        out.push({ form: valid[i], result: data })
        const entry = { ...valid[i], risk_level: data.risk_level, analyzed_at: new Date().toLocaleString() }
        saveHistory(entry)
      } catch {
        out.push({ form: valid[i], result: { risk_level: 'Medium', risk_reason: 'Analysis failed', disposal_method: 'Contact local pharmacy', disposal_steps: [], precautions: 'Handle with care', suggestions: [], regulatory_note: '' } })
      }
      setProgress(Math.round(((i + 1) / valid.length) * 100))
    }
    setResults(out); setLoading(false)
  }, [rows])

  const exportBulkCSV = useCallback(() => {
    exportCSV(results.map(r => ({ ...r.form, risk_level: r.result.risk_level, analyzed_at: new Date().toLocaleString() })))
  }, [results])

  // CSV file import
  const handleFileImport = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').slice(1).filter(Boolean)
      const parsed = lines.map(line => {
        const [medicine_name, expiry_date, quantity, unit] = line.split(',').map(v => v.replace(/"/g, '').trim())
        return { medicine_name: medicine_name || '', expiry_date: expiry_date || '', quantity: quantity || '', unit: unit || 'tablets' }
      }).filter(r => r.medicine_name)
      if (parsed.length) setRows(parsed)
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={loadDemo}
          className="text-xs bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-semibold px-3 py-1.5 rounded-lg transition-colors">
          ▶ Load Demo (3 items)
        </button>
        <button onClick={() => fileRef.current?.click()}
          className="text-xs bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold px-3 py-1.5 rounded-lg transition-colors">
          📂 Import CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
        <button onClick={addRow}
          className="text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold px-3 py-1.5 rounded-lg transition-colors">
          + Add Row
        </button>
        <button onClick={analyzeAll} disabled={loading}
          className="ml-auto bg-blue-700 hover:bg-blue-800 text-white font-semibold px-5 py-1.5 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2 text-sm">
          {loading ? <><Spinner /> Analyzing {progress}%</> : `🔬 Analyze All (${rows.filter(r => r.medicine_name).length})`}
        </button>
        {results.length > 0 && (
          <button onClick={exportBulkCSV}
            className="text-xs bg-green-50 hover:bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 font-semibold px-3 py-1.5 rounded-lg transition-colors">
            ⬇ Export CSV
          </button>
        )}
      </div>

      {/* Progress bar */}
      {loading && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Input table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                {['#', 'Medicine Name', 'Expiry Date', 'Qty', 'Unit', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-3 py-2 text-gray-400 font-bold">{i + 1}</td>
                  <td className="px-2 py-1.5">
                    <input value={row.medicine_name} onChange={e => updateRow(i, 'medicine_name', e.target.value)}
                      placeholder="Medicine name" className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[160px]" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="date" value={row.expiry_date} onChange={e => updateRow(i, 'expiry_date', e.target.value)}
                      className="border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min="1" value={row.quantity} onChange={e => updateRow(i, 'quantity', e.target.value)}
                      placeholder="Qty" className="w-16 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-2 py-1.5">
                    <CyclicSelect
                      value={row.unit}
                      onChange={(e) => updateRow(i, 'unit', e.target.value)}
                      options={UNITS.map(u => ({ value: u, label: u }))}
                      className="border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => removeRow(i)} disabled={rows.length === 1}
                      className="text-gray-300 hover:text-red-500 disabled:opacity-30 transition-colors text-base leading-none">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk results - Sorted by Quantity */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800 dark:text-white text-sm">
            Bulk Results — {results.length} medicines analyzed (Sorted by Quantity)
          </h3>
          {[...results]
            .sort(({ form: a }, { form: b }) => parseInt(a.quantity) - parseInt(b.quantity))
            .map(({ form, result }, i) => (
              <ResultCard key={i} result={result} form={form} />
            ))}
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function MedicalWaste() {
  const [tab, setTab] = useState('single')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
            🏥 Medical Waste Analyzer
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            AI-powered safe disposal guidance for expired medicines
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-xs px-2.5 py-1 rounded-full">
          🇮🇳 Bio-Medical Waste Rules 2016
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {[
          { id: 'single', label: '🔬 Single Analyzer' },
          { id: 'bulk',   label: '📋 Bulk Scanner'    },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'single' ? <SingleTab /> : <BulkTab />}
    </div>
  )
}
