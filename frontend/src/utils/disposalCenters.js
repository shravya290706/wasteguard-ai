export const DISPOSAL_CENTERS = [
  { name: 'Manipal Hospital',            coords: [12.9591, 77.6474], type: 'Hospital',        address: 'HAL Airport Rd, Kodihalli' },
  { name: 'Fortis Hospital',             coords: [12.9010, 77.6490], type: 'Hospital',        address: 'Bannerghatta Rd, Bangalore' },
  { name: 'Apollo Hospital',             coords: [12.9698, 77.6099], type: 'Hospital',        address: 'Bannerghatta Rd, Bangalore' },
  { name: 'BBMP Biomedical Waste Unit',  coords: [12.9716, 77.5946], type: 'Disposal Center', address: 'BBMP Office, Rajajinagar' },
  { name: 'Ramaiah Medical College',     coords: [13.0200, 77.5600], type: 'Hospital',        address: 'MSR Nagar, Mathikere' },
  { name: 'Narayana Health City',        coords: [12.8942, 77.6400], type: 'Hospital',        address: 'Bommasandra, Electronic City' },
  { name: 'Vikram Hospital',             coords: [12.9716, 77.5700], type: 'Hospital',        address: 'Millers Rd, Vasanth Nagar' },
  { name: 'SciChem Waste Solutions',     coords: [13.0450, 77.6200], type: 'Disposal Center', address: 'Hebbal Industrial Area' },
]

export function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Default coords used when no store is selected (centre of Bengaluru)
export const BENGALURU_CENTER = [12.9716, 77.5946]

export function getNearestCenters(fromCoords, count = 3) {
  return [...DISPOSAL_CENTERS]
    .map(c => ({ ...c, distKm: haversineKm(fromCoords, c.coords).toFixed(1) }))
    .sort((a, b) => parseFloat(a.distKm) - parseFloat(b.distKm))
    .slice(0, count)
}
