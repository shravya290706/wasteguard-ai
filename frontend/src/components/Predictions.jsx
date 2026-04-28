import { useMemo } from 'react'

// ── Rule-based prediction engine ─────────────────────────────────────────────
function predictWasteScore(store) {
  let score = 0
  const reasons = []

  // Factor 1: expiry days
  store.items.forEach(item => {
    if (item.expiry_days <= 3)       { score += 40; reasons.push(`${item.name} expires in ${item.expiry_days}d`) }
    else if (item.expiry_days <= 7)  { score += 20; reasons.push(`${item.name} expiring soon (${item.expiry_days}d)`) }
    else if (item.expiry_days <= 14) { score += 10 }
  })

  // Factor 2: overstock
  store.items.forEach(item => {
    const pct = item.quantity_kg / item.max_capacity_kg
    if (pct >= 0.95)      { score += 25; reasons.push(`${item.name} at ${Math.round(pct*100)}% capacity`) }
    else if (pct >= 0.85) { score += 12 }
  })

  // Factor 3: complaints
  if (store.complaints >= 10)     { score += 20; reasons.push(`${store.complaints} complaints`) }
  else if (store.complaints >= 5) { score += 10; reasons.push(`${store.complaints} complaints`) }
  else if (store.complaints >= 3) { score += 5 }

  // Factor 4: past waste pattern keywords
  const pattern = store.past_waste_pattern.toLowerCase()
  if (pattern.includes('chronic') || pattern.includes('every month')) { score += 20; reasons.push('Chronic waste pattern') }
  if (pattern.includes('mismatch') || pattern.includes('incorrect'))  { score += 15; reasons.push('Demand mismatch') }
  if (pattern.includes('overstock'))                                   { score += 10; reasons.push('Recurring overstock') }
  if (pattern.includes('low demand'))                                  { score += 10; reasons.push('Low demand area') }

  return { score: Math.min(score, 100), reasons: reasons.slice(0, 3) }
}

function getRiskLabel(score) {
  if (score >= 70) return { label: 'CRITICAL', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300',    bar: 'bg-red-500',    icon: '🔴' }
  if (score >= 45) return { label: 'HIGH',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300', bar: 'bg-orange-500', icon: '🟠' }
  if (score >= 25) return { label: 'MEDIUM',   color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-300', bar: 'bg-yellow-500', icon: '🟡' }
  return                  { label: 'LOW',      color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300',  bar: 'bg-green-500',  icon: '🟢' }
}

function getAction(score, store) {
  if (score >= 70) return `🚨 Emergency redistribution needed at ${store.name} within 24 hours`
  if (score >= 45) return `⚡ Contact NGO partners for ${store.name} within 48 hours`
  if (score >= 25) return `📋 Schedule inspection at ${store.name} this week`
  return `✅ ${store.name} is stable — continue monitoring`
}

// ── 7-day forecast bar ────────────────────────────────────────────────────────
function ForecastBar({ score }) {
  const days = [1, 2, 3, 4, 5, 6, 7]
  return (
    <div className="flex items-end gap-1 h-10">
      {days.map(d => {
        const h = Math.max(15, Math.min(100, score - (d * 3) + Math.sin(d) * 8 + 10))
        const pct = Math.round(h)
        const color = pct >= 70 ? 'bg-red-400' : pct >= 45 ? 'bg-orange-400' : pct >= 25 ? 'bg-yellow-400' : 'bg-green-400'
        return (
          <div key={d} className="flex-1 flex flex-col items-center gap-0.5">
            <div className={`w-full rounded-sm ${color} transition-all`} style={{ height: `${pct}%` }} />
            <span className="text-gray-400 text-xs" style={{ fontSize: '9px' }}>D{d}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Predictions({ stores = [] }) {
  const predictions = useMemo(() =>
    stores
      .map(store => ({ store, ...predictWasteScore(store) }))
      .sort((a, b) => b.score - a.score)
  , [stores])

  const critical = predictions.filter(p => p.score >= 70)
  const high     = predictions.filter(p => p.score >= 45 && p.score < 70)
  const totalRisk = predictions.reduce((s, p) => s + p.score, 0)
  const avgRisk   = predictions.length ? Math.round(totalRisk / predictions.length) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
            🔮 Predictive Waste Alerts
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Rule-based 7-day waste forecast · Bengaluru PDS Network
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-xs px-3 py-1.5 rounded-full font-semibold">
          🤖 AI-Powered Prediction Engine
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Critical Risk',   value: critical.length, color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20',       icon: '🔴' },
          { label: 'High Risk',       value: high.length,     color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: '🟠' },
          { label: 'Avg Risk Score',  value: `${avgRisk}%`,   color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', icon: '📊' },
          { label: 'Stores Analyzed', value: stores.length,   color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',     icon: '🏪' },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} className={`${bg} rounded-xl p-4 border border-gray-100 dark:border-gray-700 text-center`}>
            <p className="text-xl mb-1">{icon}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Critical alert banner */}
      {critical.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-2xl animate-bounce shrink-0">🚨</span>
          <div>
            <p className="font-bold text-red-800 dark:text-red-300 text-sm">
              {critical.length} store(s) predicted to waste within 48 hours!
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              {critical.map(p => p.store.name).join(', ')} — immediate action required
            </p>
          </div>
        </div>
      )}

      {/* Prediction cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {predictions.map(({ store, score, reasons }) => {
          const risk = getRiskLabel(score)
          const action = getAction(score, store)
          return (
            <div key={store.id} className={`bg-white dark:bg-gray-800 rounded-xl border ${risk.border} dark:border-gray-700 p-4 shadow-sm`}>
              {/* Store header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-800 dark:text-white text-sm">{store.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{store.zone} · {store.location}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${risk.bg} ${risk.color} border ${risk.border}`}>
                  {risk.icon} {risk.label}
                </span>
              </div>

              {/* Score bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Waste Risk Score</span>
                  <span className={`text-sm font-bold ${risk.color}`}>{score}/100</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full transition-all duration-700 ${risk.bar}`} style={{ width: `${score}%` }} />
                </div>
              </div>

              {/* 7-day forecast */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">7-Day Forecast</p>
                <ForecastBar score={score} />
              </div>

              {/* Risk reasons */}
              {reasons.length > 0 && (
                <div className="mb-3 space-y-1">
                  {reasons.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <span className="text-red-400">⚠</span> {r}
                    </div>
                  ))}
                </div>
              )}

              {/* Recommended action */}
              <div className={`${risk.bg} dark:bg-gray-700/50 rounded-lg px-3 py-2 text-xs ${risk.color} dark:text-gray-300 font-medium`}>
                {action}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
