import { useState, useMemo } from 'react'
import { getRisk } from '../utils/riskCalculations'
import Tooltip from './Tooltip'
import { CyclicSelect } from '../utils/cyclicScroll.jsx'

const TYPE_STYLES = {
  expiry: 'bg-red-50 border-l-2 border-l-red-400',
  redistribution: 'bg-blue-50 border-l-2 border-l-blue-400',
  citizen: 'bg-purple-50 border-l-2 border-l-purple-400',
}

const ANIMATION_CLASS = 'animate-pulse'

export default function AlertPanel({ stores = [] }) {
  const [filter, setFilter] = useState('all')

  // Generate alerts dynamically from store data
  const generatedAlerts = useMemo(() => {
    const alerts = []
    let id = 1

    stores.forEach(store => {
      store.items.forEach(item => {
        const risk = getRisk(item.expiry_days)

        // Expiry alerts
        if (item.expiry_days <= 7) {
          alerts.push({
            id: id++,
            type: 'expiry',
            icon: risk === 'HIGH' ? '🔴' : '🟡',
            store: store.name,
            message: `${item.name} (${item.quantity_kg}kg) expiring in ${item.expiry_days} day${item.expiry_days !== 1 ? 's' : ''}`,
            time: 'just now',
            isAnimated: risk === 'HIGH',
            severity: risk,
          })
        }

        // Redistribution alerts for high-risk items
        if (risk === 'HIGH') {
          alerts.push({
            id: id++,
            type: 'redistribution',
            icon: '📦',
            store: store.name,
            message: `Immediate redistribution needed - ${item.quantity_kg}kg of ${item.name} at critical risk`,
            time: 'just now',
            isAnimated: true,
            severity: 'HIGH',
          })
        }
      })

      // Citizen complaint alerts
      if (store.complaints > 0) {
        alerts.push({
          id: id++,
          type: 'citizen',
          icon: '📱',
          store: store.name,
          message: `${store.complaints} citizen complaint${store.complaints !== 1 ? 's' : ''} pending review`,
          time: 'pending',
          isAnimated: store.complaints > 5,
          severity: store.complaints > 5 ? 'HIGH' : 'MEDIUM',
        })
      }
    })

    // Sort by severity and type
    return alerts.sort((a, b) => {
      const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
      return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2)
    })
  }, [stores])

  const resolve = (id) => {
    // In a real app, this would update backend state
    // For now, just visual feedback
  }

  const filtered = filter === 'all' ? generatedAlerts : generatedAlerts.filter(a => a.type === filter)

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Live Alerts</h2>
        <div className="flex items-center gap-2">
          <CyclicSelect
            name="filter"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'expiry', label: 'Expiry' },
              { value: 'redistribution', label: 'Redistribution' },
              { value: 'citizen', label: 'Citizen' },
            ]}
            className="text-xs !px-2 !py-1 !rounded-lg !text-xs"
          />
          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {filtered.length} active
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto scrollbar-thin">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">All clear! No active alerts.</p>
        )}
        {filtered.map(alert => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 px-4 py-3 hover:opacity-90 transition-opacity ${TYPE_STYLES[alert.type] || ''} ${
              alert.isAnimated ? ANIMATION_CLASS : ''
            }`}
          >
            <Tooltip text={alert.type === 'expiry' ? 'Expiry Alert' : alert.type === 'redistribution' ? 'Redistribution Alert' : 'Citizen Report'} position="right">
              <span className={`text-lg mt-0.5 shrink-0 cursor-help ${alert.isAnimated ? 'animate-bounce' : ''}`}>
                {alert.icon}
              </span>
            </Tooltip>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 truncate">{alert.store}</p>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{alert.message}</p>
              <p className="text-xs text-gray-400 mt-1">{alert.time}</p>
            </div>
            <button
              onClick={() => resolve(alert.id)}
              className="text-xs text-green-700 hover:text-green-900 font-semibold whitespace-nowrap mt-0.5 border border-green-200 hover:bg-green-50 px-2 py-0.5 rounded transition-colors"
            >
              Resolve
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
