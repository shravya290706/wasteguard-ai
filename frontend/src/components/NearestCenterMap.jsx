import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { DISPOSAL_CENTERS, haversineKm } from '../utils/disposalCenters'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function makeIcon(color, emoji, size = 28) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}" viewBox="0 0 32 40">
    <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2.5"/>
    <text x="16" y="21" text-anchor="middle" font-size="13" font-family="Arial">${emoji}</text>
    <polygon points="10,28 22,28 16,38" fill="${color}"/>
  </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [size, size + 8], iconAnchor: [size / 2, size + 8], popupAnchor: [0, -(size + 8)] })
}

const ICON_HOSPITAL = makeIcon('#8b5cf6', '🏥')
const ICON_DISPOSAL = makeIcon('#f97316', '♻️')
const ICON_HERE     = makeIcon('#0ea5e9', '📍')

// Default: centre of Bengaluru
const DEFAULT_COORDS = [12.9716, 77.5946]

export default function NearestCenterMap({ fromCoords = DEFAULT_COORDS }) {
  const mapRef      = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    if (mapInstance.current) {
      mapInstance.current.remove()
      mapInstance.current = null
    }

    const map = L.map(mapRef.current, { center: fromCoords, zoom: 12, zoomControl: true })
    mapInstance.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    // "You are here" marker
    L.marker(fromCoords, { icon: ICON_HERE })
      .bindPopup('<b>📍 Your Location</b>')
      .addTo(map)

    // Sort all centers by distance
    const sorted = [...DISPOSAL_CENTERS]
      .map(c => ({ ...c, dist: haversineKm(fromCoords, c.coords) }))
      .sort((a, b) => a.dist - b.dist)

    const nearest = sorted[0]

    // Add all center markers
    sorted.forEach((c, i) => {
      const icon = c.type === 'Hospital' ? ICON_HOSPITAL : ICON_DISPOSAL
      const marker = L.marker(c.coords, { icon })
      marker.bindPopup(`
        <div style="font-family:sans-serif;min-width:160px">
          <div style="font-weight:700;font-size:12px">${i === 0 ? '⭐ NEAREST — ' : ''}${c.name}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">📍 ${c.address}</div>
          <div style="font-size:11px;font-weight:600;color:${c.type === 'Hospital' ? '#7c3aed' : '#ea580c'};margin-top:3px">
            ${c.type === 'Hospital' ? '🏥 Hospital' : '♻️ Disposal Center'}
          </div>
          <div style="font-size:12px;font-weight:700;color:#0ea5e9;margin-top:3px">~${c.dist.toFixed(1)} km away</div>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${c.coords[0]},${c.coords[1]}"
             target="_blank" rel="noopener noreferrer"
             style="display:inline-block;margin-top:6px;background:#16a34a;color:white;font-size:11px;font-weight:600;padding:3px 10px;border-radius:6px;text-decoration:none">
            🗺️ Get Directions
          </a>
        </div>
      `, { maxWidth: 220 })
      marker.addTo(map)
    })

    // Dashed line from user to nearest
    if (nearest) {
      L.polyline([fromCoords, nearest.coords], {
        color: '#0ea5e9', weight: 2.5, dashArray: '7 5', opacity: 0.85,
      }).addTo(map)

      // Fit map to show both points
      map.fitBounds(L.latLngBounds([fromCoords, nearest.coords]), { padding: [40, 40] })
    }

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [fromCoords[0], fromCoords[1]])

  return <div ref={mapRef} style={{ height: '280px', width: '100%' }} />
}
