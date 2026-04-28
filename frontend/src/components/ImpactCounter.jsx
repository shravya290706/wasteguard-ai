import { useState, useEffect, useRef } from 'react'

function AnimatedNumber({ value, decimals = 0 }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    const start = prev.current
    const end = value
    const duration = 600
    const startTime = performance.now()

    const tick = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const current = start + (end - start) * progress
      setDisplay(decimals ? current.toFixed(decimals) : Math.floor(current))
      if (progress < 1) requestAnimationFrame(tick)
      else prev.current = end
    }
    requestAnimationFrame(tick)
  }, [value, decimals])

  return <span>{typeof display === 'number' ? display.toLocaleString() : display}</span>
}

export default function ImpactCounter({ stores = [] }) {
  const [kgSaved, setKgSaved] = useState(1247)
  const storesProtected = stores.filter(s =>
    s.items.every(i => i.expiry_days > 3)
  ).length

  useEffect(() => {
    const interval = setInterval(() => {
      setKgSaved(prev => prev + (Math.random() * 0.4 + 0.1))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const meals = Math.floor(kgSaved * 4)
  const co2 = (kgSaved * 2.5).toFixed(1)

  const stats = [
    { icon: '🌾', label: 'Total Kg Saved', value: kgSaved, decimals: 1, unit: 'kg' },
    { icon: '🍽️', label: 'Meals Saved', value: meals, unit: '' },
    { icon: '🌿', label: 'CO₂ Prevented', value: parseFloat(co2), decimals: 1, unit: 'kg' },
    { icon: '🏪', label: 'Stores Protected', value: storesProtected, unit: '' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map(({ icon, label, value, decimals, unit }) => (
        <div key={label} className="bg-gradient-to-br from-green-800 to-green-900 text-white rounded-xl p-4 text-center shadow-lg border border-green-700">
          <div className="text-3xl mb-2">{icon}</div>
          <div className="text-2xl font-bold text-white">
            <AnimatedNumber value={value} decimals={decimals} />{unit}
          </div>
          <div className="text-xs text-green-300 mt-1 font-medium">{label}</div>
        </div>
      ))}
    </div>
  )
}
