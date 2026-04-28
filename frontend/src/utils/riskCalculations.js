/**
 * Dashboard utility functions for risk calculations
 */

export function getRisk(expiryDays) {
  if (expiryDays <= 3) return 'HIGH'
  if (expiryDays <= 7) return 'MEDIUM'
  return 'LOW'
}

export function getRiskColor(risk) {
  const colors = {
    HIGH: 'text-red-700',
    MEDIUM: 'text-yellow-700',
    LOW: 'text-green-700',
  }
  return colors[risk] || 'text-gray-700'
}

export function getRiskBgColor(risk) {
  const colors = {
    HIGH: 'bg-red-100',
    MEDIUM: 'bg-yellow-100',
    LOW: 'bg-green-100',
  }
  return colors[risk] || 'bg-gray-100'
}

export function getRiskIcon(risk) {
  const icons = {
    HIGH: '🔴',
    MEDIUM: '🟡',
    LOW: '🟢',
  }
  return icons[risk] || '⚪'
}

/**
 * Calculate progress bar percentage (0-100)
 * Based on expiry countdown
 * - 0% = expires today
 * - 100% = 30 days or more
 */
export function getExpiryProgress(expiryDays) {
  const maxDays = 30
  const percentage = Math.max(0, Math.min(100, (expiryDays / maxDays) * 100))
  return Math.round(percentage)
}

/**
 * Get progress bar color based on remaining days
 */
export function getProgressBarColor(expiryDays) {
  if (expiryDays <= 1) return 'bg-red-600'
  if (expiryDays <= 3) return 'bg-red-500'
  if (expiryDays <= 7) return 'bg-yellow-500'
  if (expiryDays <= 14) return 'bg-yellow-400'
  return 'bg-green-500'
}

/**
 * Calculate total waste risk percentage
 * Based on ratio of high-risk items to total items
 */
export function calculateTotalRiskPercentage(stores) {
  if (stores.length === 0) return 0

  let totalItems = 0
  let highRiskItems = 0

  stores.forEach(store => {
    store.items.forEach(item => {
      totalItems++
      if (getRisk(item.expiry_days) === 'HIGH') {
        highRiskItems++
      }
    })
  })

  if (totalItems === 0) return 0
  return Math.round((highRiskItems / totalItems) * 100)
}

/**
 * Get detailed risk statistics
 */
export function getRiskStatistics(stores) {
  const stats = {
    high: 0,
    medium: 0,
    low: 0,
    totalKgAtRisk: 0,
    itemsAtRisk: 0,
  }

  stores.forEach(store => {
    store.items.forEach(item => {
      const risk = getRisk(item.expiry_days)
      if (risk === 'HIGH') {
        stats.high++
        stats.totalKgAtRisk += item.quantity_kg
        stats.itemsAtRisk++
      } else if (risk === 'MEDIUM') {
        stats.medium++
      } else {
        stats.low++
      }
    })
  })

  return stats
}
