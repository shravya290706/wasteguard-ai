import { useState } from 'react'

function getRisk(days) {
  if (days <= 3) return 'HIGH'
  if (days <= 7) return 'MEDIUM'
  return 'LOW'
}

function storeRisk(store) {
  const levels = store.items.map(i => getRisk(i.expiry_days))
  if (levels.includes('HIGH')) return 'HIGH'
  if (levels.includes('MEDIUM')) return 'MEDIUM'
  return 'LOW'
}

function highestRiskItem(store) {
  return store.items.reduce((worst, item) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    return order[getRisk(item.expiry_days)] < order[getRisk(worst.expiry_days)] ? item : worst
  })
}

const cardColors = {
  HIGH: 'bg-red-50 border-red-300',
  MEDIUM: 'bg-yellow-50 border-yellow-300',
  LOW: 'bg-green-50 border-green-300',
}

const badgeColors = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-green-100 text-green-700',
}

export default function OfficerDashboard({ stores = [] }) {
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)

  const generateReport = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/city-report`, { method: 'POST' })
      const data = await res.json()
      setReport(data.report)
    } catch {
      setReport('Failed to generate report. Please check backend connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-gray-800 text-lg">District Officer View — Bengaluru PDS Network</h2>
          <p className="text-sm text-gray-500">{stores.length} stores monitored across 5 zones</p>
        </div>
        <button
          onClick={generateReport}
          disabled={loading}
          className="bg-green-700 hover:bg-green-800 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm"
        >
          {loading ? '⏳ Generating...' : '📊 Generate City Report'}
        </button>
      </div>

      {/* Store grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {stores.map(store => {
          const risk = storeRisk(store)
          const topItem = highestRiskItem(store)
          return (
            <div key={store.id} className={`rounded-xl border p-3 ${cardColors[risk]}`}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-bold text-gray-800 leading-tight">{store.name.replace('Store #', '#')}</p>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${badgeColors[risk]}`}>{risk}</span>
              </div>
              <p className="text-xs text-gray-500 mb-1">{store.zone}</p>
              <p className="text-xs text-gray-700">
                ⚠️ {topItem.name} — {topItem.expiry_days}d
              </p>
              <p className="text-xs text-gray-500 mt-1">
                💬 {store.complaints} complaint{store.complaints !== 1 ? 's' : ''}
              </p>
            </div>
          )
        })}
      </div>

      {/* City report */}
      {report && (
        <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span>📋</span> AI-Generated District Report
          </h3>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{report}</pre>
        </div>
      )}
    </div>
  )
}
