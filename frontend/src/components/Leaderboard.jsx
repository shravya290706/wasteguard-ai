import { useMemo } from 'react'

function getRisk(days) {
  if (days <= 3) return 'HIGH'
  if (days <= 7) return 'MEDIUM'
  return 'LOW'
}

export default function Leaderboard({ stores = [] }) {
  const ranked = useMemo(() => {
    return [...stores].map(store => {
      const totalKg    = store.items.reduce((s, i) => s + i.quantity_kg, 0)
      const safeKg     = store.items.filter(i => getRisk(i.expiry_days) === 'LOW').reduce((s, i) => s + i.quantity_kg, 0)
      const score      = totalKg > 0 ? Math.round((safeKg / totalKg) * 100) : 0
      const penalty    = store.complaints * 3
      const finalScore = Math.max(0, score - penalty)
      return { store, score: finalScore, safeKg, totalKg }
    }).sort((a, b) => b.score - a.score)
  }, [stores])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-gray-700 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2">
            🏆 Store Performance Leaderboard
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Ranked by waste reduction score</p>
        </div>
        <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700 px-2.5 py-1 rounded-full font-semibold">
          This Month
        </span>
      </div>

      <div className="divide-y divide-gray-50 dark:divide-gray-700">
        {ranked.map(({ store, score, safeKg, totalKg }, i) => (
          <div key={store.id} className={`flex items-center gap-3 px-4 py-3 ${i === 0 ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>
            <span className="text-xl w-8 text-center shrink-0">
              {medals[i] || <span className="text-sm font-bold text-gray-400">#{i + 1}</span>}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                {store.name.replace('Store #', '#')}
                {i === 0 && <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded font-semibold">⭐ Best</span>}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-700 ${score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{safeKg}kg safe</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-lg font-bold ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                {score}
              </p>
              <p className="text-xs text-gray-400">pts</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
