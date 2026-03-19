/**
 * Centralized date/time formatting utilities.
 *
 * All functions use:
 * - Locale: 'en-GB' (DD MMM YYYY format)
 * - Timezone: 'Asia/Dubai' (UAE, GMT+4)
 */

const LOCALE = 'en-GB' as const
const TIMEZONE = 'Asia/Dubai' as const

/**
 * Format a date string to "DD Mon YYYY" (e.g., "15 Jan 2024").
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: TIMEZONE,
  })
}

/**
 * Format a date string to full date + time (e.g., "15 Jan 2024, 3:45 PM").
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: TIMEZONE,
  })
}

/**
 * Format a date or time string to time only (e.g., "3:45 PM").
 *
 * Accepts either a full ISO date string or an "HH:MM" time string.
 */
export function formatTime(value: string): string {
  // Handle "HH:MM" or "HH:MM:SS" time-only strings
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
    const [hours, minutes] = value.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const date = new Date(value)
  return date.toLocaleTimeString(LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: TIMEZONE,
  })
}

/**
 * Format a date as a relative label: "Today", "Yesterday", "3 days ago", etc.
 * Falls back to "DD Mon YYYY" for dates older than 30 days.
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()

  // Compare in UAE timezone by formatting both to date-only strings
  const dateStr = date.toLocaleDateString(LOCALE, { timeZone: TIMEZONE })
  const todayStr = now.toLocaleDateString(LOCALE, { timeZone: TIMEZONE })

  if (dateStr === todayStr) return 'Today'

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toLocaleDateString(LOCALE, { timeZone: TIMEZONE })
  if (dateStr === yesterdayStr) return 'Yesterday'

  // Approximate diff in days
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`

  return formatDate(dateString)
}

/**
 * Format a date as relative time ago: "Just now", "5m ago", "2h ago", "3d ago".
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  if (diffMins > 0) return `${diffMins}m ago`
  return 'Just now'
}

/**
 * Format a short date without year (e.g., "15 Jan").
 */
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
    timeZone: TIMEZONE,
  })
}

/**
 * Get today's date string in YYYY-MM-DD format (UAE timezone).
 */
export function getTodayISO(): string {
  const now = new Date()
  // Build YYYY-MM-DD from parts in UAE timezone
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: TIMEZONE,
  }).format(now)
  return parts // en-CA already gives YYYY-MM-DD
}
