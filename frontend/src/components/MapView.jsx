import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { DISPOSAL_CENTERS, haversineKm } from '../utils/disposalCenters'

// Fix default marker icons broken by webpack/vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Static data: Bengaluru coordinates ───────────────────────────────────────
const STORE_COORDS = {
  1:  [12.9352, 77.6245], // Koramangala
  2:  [12.9784, 77.6408], // Indiranagar
  3:  [12.9250, 77.5938], // Jayanagar
  4:  [12.9916, 77.5554], // Rajajinagar
  5:  [12.9698, 77.7499], // Whitefield
  6:  [13.0358, 77.5970], // Hebbal
  7:  [13.1007, 77.5963], // Yelahanka
  8:  [12.8458, 77.6692], // Electronic City
  9:  [12.9255, 77.5468], // Banashankari
  10: [12.9591, 77.6974], // Marathahalli
}

const NGO_DATA = [
  { name: 'Akshaya Patra',       coords: [12.9352, 77.6245], capacity: 500, reliability: 95, available: true  },
  { name: 'Robin Hood Army',     coords: [12.9916, 77.5554], capacity: 300, reliability: 88, available: true  },
  { name: 'No Food Waste',       coords: [12.9784, 77.6408], capacity: 400, reliability: 92, available: true  },
  { name: 'Feeding India',       coords: [12.9250, 77.5938], capacity: 350, reliability: 85, available: false },
  { name: 'Annadaata Trust',     coords: [12.9698, 77.7499], capacity: 250, reliability: 90, available: true  },
  { name: 'Action Against Hunger',coords:[13.0358, 77.5970], capacity: 280, reliability: 87, available: true  },
  { name: 'ISKCON Prasad Kitchen',coords:[13.1007, 77.5963], capacity: 600, reliability: 93, available: true  },
  { name: 'The Banyan',          coords: [12.9255, 77.5468], capacity: 320, reliability: 89, available: true  },
]

// ── Custom SVG icons ──────────────────────────────────────────────────────────
function makeIcon(color, symbol, size = 32) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}" viewBox="0 0 32 40">
      <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2.5"/>
      <text x="16" y="21" text-anchor="middle" font-size="14" font-family="Arial">${symbol}</text>
      <polygon points="10,28 22,28 16,38" fill="${color}"/>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor:[0, -(size + 8)],
  })
}

const ICONS = {
  HIGH:     makeIcon('#ef4444', '📦'),
  MEDIUM:   makeIcon('#f59e0b', '📦'),
  LOW:      makeIcon('#22c55e', '📦'),
  NGO_ON:   makeIcon('#3b82f6', '🤝'),
  NGO_OFF:  makeIcon('#94a3b8', '🤝'),
  HOSPITAL: makeIcon('#8b5cf6', '🏥'),
  DISPOSAL: makeIcon('#f97316', '♻️'),
  SELECTED: makeIcon('#0ea5e9', '📍'),
}

function getRisk(days) {
  if (days <= 3) return 'HIGH'
  if (days <= 7) return 'MEDIUM'
  return 'LOW'
}

function storeRisk(store) {
  const levels = store.items.map(i => getRisk(i.expiry_days))
  if (levels.includes('HIGH'))   return 'HIGH'
  if (levels.includes('MEDIUM')) return 'MEDIUM'
  return 'LOW'
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend({ mode }) {
  const items = mode === 'medical'
    ? [
        { color: '#8b5cf6', label: 'Hospital' },
        { color: '#f97316', label: 'Disposal Center' },
        { color: '#0ea5e9', label: 'Selected Location' },
      ]
    : [
        { color: '#ef4444', label: 'HIGH Risk Store' },
        { color: '#f59e0b', label: 'MEDIUM Risk Store' },
        { color: '#22c55e', label: 'LOW Risk Store' },
        { color: '#3b82f6', label: 'NGO (Available)' },
        { color: '#94a3b8', label: 'NGO (Unavailable)' },
      ]

  return (
    <div className="absolute bottom-6 left-3 z-[1000] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-xs space-y-1.5">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-gray-700 dark:text-gray-300">{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main MapView ──────────────────────────────────────────────────────────────
export default function MapView({ stores = [] }) {
  const mapRef      = useRef(null)
  const mapInstance = useRef(null)
  const layersRef   = useRef([])
  const lineRef     = useRef(null)

  const [mode, setMode]           = useState('inventory') // 'inventory' | 'medical'
  const [selectedStore, setSelectedStore] = useState(null)
  const [nearestCenter, setNearestCenter] = useState(null)

  // ── Init map once ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapInstance.current) return
    mapInstance.current = L.map(mapRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapInstance.current)
  }, [])

  // ── Clear all layers ────────────────────────────────────────────────────────
  function clearLayers() {
    layersRef.current.forEach(l => mapInstance.current.removeLayer(l))
    layersRef.current = []
    if (lineRef.current) {
      mapInstance.current.removeLayer(lineRef.current)
      lineRef.current = null
    }
  }

  // ── Draw inventory mode ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current || mode !== 'inventory') return
    clearLayers()

    // Store markers
    stores.forEach(store => {
      const coords = STORE_COORDS[store.id]
      if (!coords) return
      const risk    = storeRisk(store)
      const marker  = L.marker(coords, { icon: ICONS[risk] })
      const hiItems = store.items.filter(i => getRisk(i.expiry_days) === 'HIGH')
      const itemRows = store.items.map(i => {
        const r = getRisk(i.expiry_days)
        const dot = r === 'HIGH' ? '🔴' : r === 'MEDIUM' ? '🟡' : '🟢'
        return `<div style="margin:2px 0">${dot} ${i.name}: <b>${i.quantity_kg}kg</b> — ${i.expiry_days}d left</div>`
      }).join('')

      marker.bindPopup(`
        <div style="min-width:200px;font-family:sans-serif">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${store.name}</div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:6px">${store.zone} · ${store.location}</div>
          <div style="background:${risk==='HIGH'?'#fef2f2':risk==='MEDIUM'?'#fffbeb':'#f0fdf4'};border-radius:6px;padding:6px;margin-bottom:6px">
            ${itemRows}
          </div>
          <div style="font-size:11px;color:#6b7280">💬 ${store.complaints} complaint(s)</div>
          ${hiItems.length ? `<div style="margin-top:6px;font-size:11px;color:#dc2626;font-weight:600">⚡ ${hiItems.length} item(s) need immediate redistribution</div>` : ''}
        </div>
      `, { maxWidth: 260 })

      marker.addTo(mapInstance.current)
      layersRef.current.push(marker)
    })

    // NGO markers
    NGO_DATA.forEach(ngo => {
      const icon   = ngo.available ? ICONS.NGO_ON : ICONS.NGO_OFF
      const marker = L.marker(ngo.coords, { icon })
      marker.bindPopup(`
        <div style="min-width:180px;font-family:sans-serif">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">🤝 ${ngo.name}</div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Capacity: ${ngo.capacity}kg</div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Reliability: ${ngo.reliability}%</div>
          <div style="font-size:12px;font-weight:600;color:${ngo.available?'#16a34a':'#dc2626'}">
            ${ngo.available ? '✅ Available' : '⏸️ Unavailable'}
          </div>
        </div>
      `, { maxWidth: 220 })
      marker.addTo(mapInstance.current)
      layersRef.current.push(marker)
    })
  }, [mode, stores])

  // ── Draw medical mode ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current || mode !== 'medical') return
    clearLayers()
    setSelectedStore(null)
    setNearestCenter(null)

    DISPOSAL_CENTERS.forEach(center => {
      const icon   = center.type === 'Hospital' ? ICONS.HOSPITAL : ICONS.DISPOSAL
      const marker = L.marker(center.coords, { icon })
      marker.bindPopup(`
        <div style="min-width:180px;font-family:sans-serif">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${center.name}</div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:2px">📍 ${center.address}</div>
          <div style="font-size:11px;font-weight:600;color:${center.type==='Hospital'?'#7c3aed':'#ea580c'};margin-top:4px">
            ${center.type === 'Hospital' ? '🏥 Hospital' : '♻️ Disposal Center'}
          </div>
        </div>
      `, { maxWidth: 220 })
      marker.addTo(mapInstance.current)
      layersRef.current.push(marker)
    })
  }, [mode])

  // ── Find nearest disposal center ────────────────────────────────────────────
  function findNearest(storeId) {
    const coords = STORE_COORDS[storeId]
    if (!coords) return
    setSelectedStore(storeId)

    // Remove old line + selected marker
    if (lineRef.current) {
      mapInstance.current.removeLayer(lineRef.current)
      lineRef.current = null
    }

    // Find nearest
    let nearest = null, minDist = Infinity
    DISPOSAL_CENTERS.forEach(c => {
      const d = haversineKm(coords, c.coords)
      if (d < minDist) { minDist = d; nearest = c }
    })
    setNearestCenter({ ...nearest, distKm: minDist.toFixed(1) })

    // Draw selected store marker
    const selMarker = L.marker(coords, { icon: ICONS.SELECTED })
    selMarker.bindPopup(`<b>Selected Location</b><br/>Store #${storeId}`).openPopup()
    selMarker.addTo(mapInstance.current)
    layersRef.current.push(selMarker)

    // Draw dashed line to nearest
    const line = L.polyline([coords, nearest.coords], {
      color: '#0ea5e9', weight: 3, dashArray: '8 6', opacity: 0.9,
    })
    line.addTo(mapInstance.current)
    lineRef.current = line

    // Fit bounds
    mapInstance.current.fitBounds(L.latLngBounds([coords, nearest.coords]), { padding: [60, 60] })

    // Open popup on nearest
    const nearMarker = L.marker(nearest.coords, { icon: nearest.type === 'Hospital' ? ICONS.HOSPITAL : ICONS.DISPOSAL })
    nearMarker.bindPopup(`
      <div style="font-family:sans-serif">
        <div style="font-weight:700;font-size:13px">📍 Nearest: ${nearest.name}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px">${nearest.address}</div>
        <div style="font-size:12px;font-weight:600;color:#0ea5e9;margin-top:4px">~${minDist.toFixed(1)} km away</div>
      </div>
    `).addTo(mapInstance.current).openPopup()
    layersRef.current.push(nearMarker)
  }

  const highRiskStores = stores.filter(s => storeRisk(s) === 'HIGH')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white text-lg">🗺️ Live Network Map</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Bengaluru PDS stores, NGO partners & medical disposal centers
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {[
            { id: 'inventory', label: '📦 Inventory Map' },
            { id: 'medical',   label: '🏥 Medical Disposal' },
          ].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                mode === m.id
                  ? 'bg-white dark:bg-gray-700 text-green-700 dark:text-green-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Medical mode — store selector */}
      {mode === 'medical' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">
            🏥 Find nearest hospital / disposal center for your location:
          </p>
          <div className="flex flex-wrap gap-2">
            {stores.map(store => (
              <button key={store.id}
                onClick={() => findNearest(store.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  selectedStore === store.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-400'
                }`}>
                {store.name.replace('Store #', '#')}
              </button>
            ))}
          </div>

          {nearestCenter && (
            <div className="mt-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">{nearestCenter.type === 'Hospital' ? '🏥' : '♻️'}</span>
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">{nearestCenter.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{nearestCenter.address}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{nearestCenter.distKm} km</p>
                <p className="text-xs text-gray-400">{nearestCenter.type}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inventory mode — high risk summary */}
      {mode === 'inventory' && highRiskStores.length > 0 && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5 text-sm">
          <span className="text-red-600 font-bold">🔴 {highRiskStores.length} HIGH risk store(s):</span>
          <span className="text-red-700 dark:text-red-400">
            {highRiskStores.map(s => s.name.replace('Store #', '#')).join(', ')}
          </span>
          <span className="text-xs text-gray-400 ml-auto">Click pins for details</span>
        </div>
      )}

      {/* Map container */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md">
        <div ref={mapRef} style={{ height: '520px', width: '100%' }} />
        <Legend mode={mode} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Stores on Map',      value: stores.length,                                    color: 'text-green-700',  bg: 'bg-green-50'  },
          { label: 'NGO Partners',        value: NGO_DATA.length,                                  color: 'text-blue-700',   bg: 'bg-blue-50'   },
          { label: 'Disposal Centers',    value: DISPOSAL_CENTERS.length,                          color: 'text-purple-700', bg: 'bg-purple-50' },
          { label: 'HIGH Risk Stores',    value: highRiskStores.length,                            color: 'text-red-600',    bg: 'bg-red-50'    },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center`}>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
