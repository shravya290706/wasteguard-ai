import { getRisk } from '../utils/riskCalculations'

function extractLocationKeyword(location) {
  // Extract area name from location string like "Koramangala, Bengaluru"
  return location.split(',')[0].trim().toLowerCase()
}

function matchNGOsByLocation(storeLocation, ngos) {
  const storeKeyword = extractLocationKeyword(storeLocation)

  // Sort NGOs by proximity to store location
  return [...ngos].sort((a, b) => {
    const aLocation = a.location.toLowerCase()
    const bLocation = b.location.toLowerCase()

    // Higher priority: NGO in same area
    const aInSameArea = aLocation.includes(storeKeyword)
    const bInSameArea = bLocation.includes(storeKeyword)

    if (aInSameArea && !bInSameArea) return -1
    if (!aInSameArea && bInSameArea) return 1

    // Secondary: closest distance
    return a.distance_km - b.distance_km
  })
}

export default function NGOMatching({ item, store, ngos = [], onSelectNGO = () => {} }) {
  if (getRisk(item.expiry_days) !== 'HIGH') return null

  const matchedNGOs = matchNGOsByLocation(store.location, ngos)
  const availableNGOs = matchedNGOs.filter(ngo => ngo.availability)

  if (availableNGOs.length === 0) return null

  const topNGOs = availableNGOs.slice(0, 3)

  return (
    <div className="mt-3 pt-3 border-t border-red-200">
      <p className="text-xs font-semibold text-gray-600 mb-2">🏢 Suggested NGO Partners</p>
      <div className="space-y-1.5">
        {topNGOs.map((ngo, idx) => (
          <div
            key={ngo.name}
            className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg px-2.5 py-2 text-xs hover:shadow-sm transition-shadow cursor-pointer"
            onClick={() => onSelectNGO(ngo)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-green-800">{ngo.name}</span>
                {idx === 0 && <span className="bg-green-600 text-white text-xs px-1.5 rounded font-bold">BEST MATCH</span>}
              </div>
              <p className="text-gray-500 text-xs mt-0.5">
                📍 {ngo.distance_km}km away • 🏆 {ngo.reliability}% reliable
              </p>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">{ngo.capacity_kg}kg</span>
              <span className="text-green-600 font-bold">✓</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
