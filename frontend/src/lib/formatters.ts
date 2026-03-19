/**
 * Common formatting utilities used across the application.
 */

// Re-export date/time utilities from centralized module
export { formatDate, formatTimeAgo } from './dateUtils'

/**
 * Format a number as AED currency (e.g., "AED 150,000").
 */
export function formatCurrencyAED(value: string | number): string {
  const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(numValue)
}

/**
 * Format DBR (Debt Burden Ratio) as percentage.
 */
export function formatDbr(dbrString: string | null): string {
  if (!dbrString) return '-'
  const dbr = parseFloat(dbrString)
  if (isNaN(dbr)) return '-'
  return `${dbr.toFixed(1)}%`
}

/**
 * Get color class for DBR percentage.
 * Green: < 30% (low DBR, good)
 * Amber: 30-50% (moderate, approaching limit)
 * Red: > 50% (over typical bank limit)
 */
export function getDbrColorClass(dbrString: string | null): string {
  if (!dbrString) return 'text-gray-500'
  const dbr = parseFloat(dbrString)
  if (isNaN(dbr)) return 'text-gray-500'
  if (dbr < 30) return 'text-green-600'
  if (dbr <= 50) return 'text-amber-600'
  return 'text-red-600'
}
