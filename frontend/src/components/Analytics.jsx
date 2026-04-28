import { useMemo } from 'react'

// ── Tiny SVG bar chart ────────────────────────────────────────────────────────
function BarChart({ data, color = '#166534', height = 80 }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const w = 100 / data.length
  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const barH = (d.value / max) * (height - 16)
        const x = i * w + w * 0.15
        const barW = w * 0.7
        const y = height - barH - 14
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} rx="2" opacity="0.85" />
            <text x={x + barW / 2} y={height - 2} textAnchor="middle" fontSize="5" fill="#6b7280">
              {d.label}
            </text>
            <text x={x + barW / 2} y={y - 2} textAnchor="middle" fontSize="5" fill={color} fontWeight="bold">
              {d.value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Tiny SVG donut chart ──────────────────────────────────────────────────────
function DonutChart({ segments }) {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1
  let offset = 0
  const r = 30, cx = 40, cy = 40, stroke = 18
  const circumference = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 80 80" className="w-24 h-24">
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circumference
        const gap = circumference - dash
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset * circumference / total}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        )
        offset += seg.value
        return el
      })}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#374151">
        {total}
      </text>
    </svg>
  )
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ values, color = '#166534' }) {
  const max = Math.max(...values, 1)
  const min = Math.min(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100
    const y = 30 - ((v - min) / range) * 28
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox="0 0 100 32" className="w-full h-8" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, trend, sparkValues, color = 'green' }) {
  const colors = {
    green:  { bg: 'bg-green-50',  text: 'text-green-700',  spark: '#166534' },
    red:    { bg: 'bg-red-50',    text: 'text-red-700',    spark: '#dc2626' },
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   spark: '#1d4ed8' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', spark: '#ea580c' },
  }
  const c = colors[color]
  return (
    <div className={`${c.bg} dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-0.5 ${c.text}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      {sparkValues && <Sparkline values={sparkValues} color={c.spark} />}
      {trend !== undefined && (
        <p className={`text-xs mt-1 font-semibold ${trend >= 0 ? 'text-red-500' : 'text-green-600'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs last month
        </p>
      )}
    </div>
  )
}

// ── Main Analytics component ──────────────────────────────────────────────────
export default function Analytics({ stores = [] }) {
  const medHistory = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('wg_medical_history') || '[]') } catch { return [] }
  }, [])

  // Derive food waste stats from stores
  const highRisk  = stores.flatMap(s => s.items.filter(i => i.expiry_days <= 3))
  const medRisk   = stores.flatMap(s => s.items.filter(i => i.expiry_days > 3 && i.expiry_days <= 7))
  const totalKg   = highRisk.reduce((s, i) => s + i.quantity_kg, 0)
  const totalComp = stores.reduce((s, st) => s + st.complaints, 0)

  // Zone breakdown
  const zoneMap = {}
  stores.forEach(s => {
    if (!zoneMap[s.zone]) zoneMap[s.zone] = { high: 0, total: 0 }
    zoneMap[s.zone].total++
    if (s.items.some(i => i.expiry_days <= 3)) zoneMap[s.zone].high++
  })
  const zoneData = Object.entries(zoneMap).map(([z, v]) => ({ label: z, value: v.high }))

  // Monthly waste trend (simulated from store data)
  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan']
  const wasteKgTrend = [980, 1120, 1340, 890, 1050, totalKg || 1265]
  const monthlyData  = months.map((label, i) => ({ label, value: wasteKgTrend[i] }))

  // Complaint trend
  const complaintTrend = [8, 14, 11, 19, 16, totalComp]

  // Medical risk distribution
  const medRiskCounts = { High: 0, Medium: 0, Low: 0 }
  medHistory.forEach(h => { if (medRiskCounts[h.risk_level] !== undefined) medRiskCounts[h.risk_level]++ })
  const medDonut = [
    { label: 'High',   value: medRiskCounts.High   || 3, color: '#dc2626' },
    { label: 'Medium', value: medRiskCounts.Medium  || 5, color: '#f59e0b' },
    { label: 'Low',    value: medRiskCounts.Low     || 4, color: '#16a34a' },
  ]

  // Top wasting stores
  const topStores = [...stores]
    .sort((a, b) => {
      const aKg = a.items.filter(i => i.expiry_days <= 3).reduce((s, i) => s + i.quantity_kg, 0)
      const bKg = b.items.filter(i => i.expiry_days <= 3).reduce((s, i) => s + i.quantity_kg, 0)
      return bKg - aKg
    })
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-bold text-gray-900 dark:text-white text-lg">📊 Analytics Dashboard</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Waste trends, risk distribution, and network health — Bengaluru PDS
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🔴" label="High-Risk Kg Today"  value={`${totalKg}kg`}
          sub={`${highRisk.length} items`} trend={12} sparkValues={wasteKgTrend} color="red" />
        <StatCard icon="🟡" label="Medium-Risk Items"   value={medRisk.length}
          sub="expiring 4–7 days" trend={-8} sparkValues={[4,6,5,8,7,medRisk.length]} color="orange" />
        <StatCard icon="💬" label="Total Complaints"    value={totalComp}
          sub="across all stores" trend={5} sparkValues={complaintTrend} color="blue" />
        <StatCard icon="🏥" label="Medical Analyses"    value={medHistory.length || 12}
          sub="this session" sparkValues={[2,4,3,6,5,medHistory.length||12]} color="green" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Monthly waste kg */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Monthly Food Waste at Risk (kg)
          </p>
          <BarChart data={monthlyData} color="#166534" height={90} />
        </div>

        {/* Zone risk */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            High-Risk Stores by Zone
          </p>
          <BarChart data={zoneData} color="#dc2626" height={90} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Medical risk donut */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Medical Waste Risk Distribution
          </p>
          <div className="flex items-center gap-4">
            <DonutChart segments={medDonut} />
            <div className="space-y-2">
              {medDonut.map(s => (
                <div key={s.label} className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-gray-600 dark:text-gray-300">{s.label}</span>
                  <span className="font-bold text-gray-800 dark:text-white ml-auto">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top wasting stores */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Top Stores by Waste Risk
          </p>
          <div className="space-y-2">
            {topStores.map((store, i) => {
              const kg = store.items.filter(i => i.expiry_days <= 3).reduce((s, it) => s + it.quantity_kg, 0)
              const maxKg = topStores[0]
                ? topStores[0].items.filter(i => i.expiry_days <= 3).reduce((s, it) => s + it.quantity_kg, 0) || 1
                : 1
              const pct = Math.round((kg / maxKg) * 100)
              return (
                <div key={store.id} className="flex items-center gap-3 text-xs">
                  <span className="w-4 font-bold text-gray-400">{i + 1}</span>
                  <span className="w-36 truncate font-medium text-gray-700 dark:text-gray-200">
                    {store.name.replace('Store #', '#')}
                  </span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-14 text-right font-bold text-red-600">{kg}kg</span>
                  <span className="text-gray-400">{store.complaints}⚠</span>
                </div>
              )
            })}
            {topStores.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No store data loaded</p>
            )}
          </div>
        </div>
      </div>

      {/* NGO activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          NGO Redistribution Activity (Simulated)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { name: 'Akshaya Patra',  pickups: 24, kg: 1840, reliability: 95 },
            { name: 'Robin Hood Army',pickups: 18, kg: 920,  reliability: 88 },
            { name: 'No Food Waste',  pickups: 21, kg: 1340, reliability: 92 },
            { name: 'Feeding India',  pickups: 12, kg: 680,  reliability: 85 },
            { name: 'Annadaata Trust',pickups: 9,  kg: 420,  reliability: 90 },
          ].map(ngo => (
            <div key={ngo.name} className="bg-green-50 dark:bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-tight mb-2">{ngo.name}</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-400">{ngo.kg}kg</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{ngo.pickups} pickups</p>
              <div className="mt-2 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${ngo.reliability}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{ngo.reliability}% reliable</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
