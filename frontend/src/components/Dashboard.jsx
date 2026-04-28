import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import AutoComms from './AutoComms'
import Tooltip from './Tooltip'
import { getRisk, getProgressBarColor, getExpiryProgress, calculateTotalRiskPercentage } from '../utils/riskCalculations'

const riskStyle = {
  HIGH: 'bg-red-100 text-red-700 border-red-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-green-100 text-green-700 border-green-200',
}

const cardBorder = {
  HIGH: 'border-l-4 border-l-red-500',
  MEDIUM: 'border-l-4 border-l-yellow-400',
  LOW: 'border-l-4 border-l-green-500',
}

function storeRisk(store) {
  const levels = store.items.map(i => getRisk(i.expiry_days))
  if (levels.includes('HIGH')) return 'HIGH'
  if (levels.includes('MEDIUM')) return 'MEDIUM'
  return 'LOW'
}

const SUGGESTED_ACTIONS = [
  { icon: '🚚', text: 'Route 400kg Rice from Yelahanka → Akshaya Patra (2.3km away)' },
  { icon: '📲', text: 'Send WhatsApp alert to Robin Hood Army for Rajajinagar wheat surplus' },
  { icon: '📋', text: 'Schedule inspection at Store #7 — 12 citizen complaints pending' },
  { icon: '🔄', text: 'Transfer Hebbal Dal overstock (110kg) to No Food Waste NGO' },
]

export default function Dashboard({ stores = [], ngos = [] }) {
  const [modal, setModal] = useState(null)
  const [qrStore, setQrStore] = useState(null)

  const highRiskItems = stores.flatMap(s =>
    s.items.filter(i => getRisk(i.expiry_days) === 'HIGH').map(item => ({ item, store: s }))
  )
  const totalKgAtRisk = highRiskItems.reduce((sum, { item }) => sum + item.quantity_kg, 0)
  const redistributionAlerts = stores.filter(s => storeRisk(s) === 'HIGH').length
  const totalWasteRiskPercent = calculateTotalRiskPercentage(stores)

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Shops Monitored', value: stores.length, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'HIGH Risk Items', value: highRiskItems.length, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Waste Risk %', value: `${totalWasteRiskPercent}%`, color: totalWasteRiskPercent >= 30 ? 'text-red-600' : totalWasteRiskPercent >= 15 ? 'text-yellow-600' : 'text-green-700', bg: totalWasteRiskPercent >= 30 ? 'bg-red-50' : totalWasteRiskPercent >= 15 ? 'bg-yellow-50' : 'bg-green-50' },
          { label: 'Active Alerts', value: redistributionAlerts, color: 'text-yellow-700', bg: 'bg-yellow-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 border border-gray-100 text-center`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* High Risk Items section */}
      {highRiskItems.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-200">
            <span className="text-red-600 text-lg">🔴</span>
            <h2 className="font-bold text-red-800 text-sm">High Risk Items — Sorted by Quantity (Increasing)</h2>
            <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {highRiskItems.length} items
            </span>
          </div>
          <div className="divide-y divide-red-50">
            {highRiskItems
              .sort(({ item: a }, { item: b }) => a.quantity_kg - b.quantity_kg)
              .map(({ item, store }) => (
                <div key={`${store.id}-${item.name}`} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500">{store.name} · {store.zone}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-700">{item.quantity_kg}kg</p>
                      <p className="text-xs text-red-500">Expires in {item.expiry_days}d</p>
                    </div>
                    <button
                      onClick={() => setModal({ item, store })}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Generate Alert
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Suggested Actions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-b border-blue-100">
          <span className="text-lg">💡</span>
          <h2 className="font-bold text-blue-800 text-sm">Suggested Actions</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {SUGGESTED_ACTIONS.map((action, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Tooltip text={`Action: ${action.text.split(' ').slice(0, 3).join(' ')}...`}>
                <span className="text-xl shrink-0 cursor-help">{action.icon}</span>
              </Tooltip>
              <p className="text-sm text-gray-700">{action.text}</p>
              <button className="ml-auto text-xs text-green-700 hover:text-green-900 font-semibold whitespace-nowrap border border-green-200 hover:bg-green-50 px-2.5 py-1 rounded-lg transition-colors">
                Take Action
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* All Store cards */}
      <div>
        <h2 className="font-bold text-gray-700 text-sm mb-3">All Stores — Inventory Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stores.map(store => {
            const risk = storeRisk(store)
            return (
              <div key={store.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 ${cardBorder[risk]} p-4`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">{store.name}</h3>
                    <p className="text-xs text-gray-400">{store.zone} · {store.complaints} complaint{store.complaints !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${riskStyle[risk]}`}>{risk}</span>
                    <Tooltip text="Generate QR code for this store">
                      <button onClick={() => setQrStore(store)}
                        className="text-gray-400 hover:text-blue-600 transition-colors text-base">
                        ▦
                      </button>
                    </Tooltip>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {store.items.map(item => {
                    const itemRisk = getRisk(item.expiry_days)
                    const isOverstock = item.quantity_kg > item.max_capacity_kg * 0.9
                    const progress = getExpiryProgress(item.expiry_days)
                    const progressBarColor = getProgressBarColor(item.expiry_days)
                    return (
                      <div key={item.name} className={`rounded-lg px-3 py-2.5 text-xs ${
                        itemRisk === 'HIGH' ? 'bg-red-50' : itemRisk === 'MEDIUM' ? 'bg-yellow-50' : 'bg-green-50'
                      }`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">{item.name}</span>
                            <span className="text-gray-500">{item.quantity_kg}kg</span>
                            {isOverstock && (
                              <span className="bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded font-semibold">OVERSTOCK</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">{item.expiry_days}d left</span>
                            <span className={`px-1.5 py-0.5 rounded font-semibold border ${riskStyle[itemRisk]}`}>{itemRisk}</span>
                            {itemRisk === 'HIGH' && (
                            <Tooltip text="Generate NGO alert message">
                              <button
                                onClick={() => setModal({ item, store })}
                                className="bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded font-semibold transition-colors"
                              >
                                Alert
                              </button>
                            </Tooltip>
                            )}
                          </div>
                        </div>
                        {/* Expiry Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${progressBarColor}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {modal && (
        <AutoComms item={modal.item} store={modal.store} ngos={ngos} onClose={() => setModal(null)} />
      )}

      {qrStore && (() => {
        const risk = storeRisk(qrStore)
        const qrData = JSON.stringify({
          store: qrStore.name, zone: qrStore.zone, risk,
          items: qrStore.items.map(i => ({ name: i.name, qty: i.quantity_kg, expiry: i.expiry_days })),
          complaints: qrStore.complaints, generated: new Date().toLocaleString()
        })
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setQrStore(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 dark:text-white text-sm">📱 QR Code — {qrStore.name}</h3>
                <button onClick={() => setQrStore(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <QRCodeSVG value={qrData} size={180} level="M" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800 dark:text-white text-sm">{qrStore.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{qrStore.zone} · Risk: <span className={risk === 'HIGH' ? 'text-red-600' : risk === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'}>{risk}</span></p>
                  <p className="text-xs text-gray-400 mt-1">Scan to view live inventory status</p>
                </div>
                <div className="w-full space-y-1">
                  {qrStore.items.map(item => (
                    <div key={item.name} className="flex justify-between text-xs px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                      <span className="font-semibold text-gray-600 dark:text-gray-400">{item.quantity_kg}kg · {item.expiry_days}d</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
