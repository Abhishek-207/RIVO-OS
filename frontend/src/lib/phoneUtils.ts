/**
 * Phone number validation and formatting utilities.
 *
 * Country-specific digit validation for the phone input pattern:
 * user picks a country code from a dropdown, then types digits separately.
 */

export interface CountryCodeEntry {
  code: string
  label: string
  country: string
  /** Expected number of digits AFTER the country code (excluding leading 0). */
  digits: number | [number, number]
  /** Example local number (digits only). */
  example: string
}

export const COUNTRY_CODES: CountryCodeEntry[] = [
  { code: '+971', label: 'UAE (+971)',          country: 'UAE',          digits: 9,       example: '501234567' },
  { code: '+91',  label: 'India (+91)',         country: 'India',        digits: 10,      example: '9876543210' },
  { code: '+44',  label: 'UK (+44)',            country: 'UK',           digits: 10,      example: '7911123456' },
  { code: '+1',   label: 'USA (+1)',            country: 'USA',          digits: 10,      example: '2025551234' },
  { code: '+92',  label: 'Pakistan (+92)',      country: 'Pakistan',     digits: 10,      example: '3001234567' },
  { code: '+63',  label: 'Philippines (+63)',   country: 'Philippines',  digits: 10,      example: '9171234567' },
  { code: '+20',  label: 'Egypt (+20)',         country: 'Egypt',        digits: 10,      example: '1001234567' },
  { code: '+966', label: 'Saudi (+966)',        country: 'Saudi',        digits: 9,       example: '501234567' },
  { code: '+965', label: 'Kuwait (+965)',       country: 'Kuwait',       digits: 8,       example: '51234567' },
  { code: '+974', label: 'Qatar (+974)',        country: 'Qatar',        digits: 8,       example: '55123456' },
  { code: '+973', label: 'Bahrain (+973)',      country: 'Bahrain',      digits: 8,       example: '36001234' },
  { code: '+968', label: 'Oman (+968)',         country: 'Oman',         digits: 8,       example: '92123456' },
  { code: '+962', label: 'Jordan (+962)',       country: 'Jordan',       digits: 9,       example: '791234567' },
  { code: '+961', label: 'Lebanon (+961)',      country: 'Lebanon',      digits: [7, 8],  example: '71123456' },
  { code: '+86',  label: 'China (+86)',         country: 'China',        digits: 11,      example: '13812345678' },
  { code: '+49',  label: 'Germany (+49)',       country: 'Germany',      digits: [10, 11],example: '15112345678' },
  { code: '+33',  label: 'France (+33)',        country: 'France',       digits: 9,       example: '612345678' },
  { code: '+61',  label: 'Australia (+61)',     country: 'Australia',    digits: 9,       example: '412345678' },
  { code: '+27',  label: 'South Africa (+27)',  country: 'South Africa', digits: 9,       example: '711234567' },
]

/**
 * Find a country code entry by its code string.
 */
export function findCountryCode(code: string): CountryCodeEntry | undefined {
  return COUNTRY_CODES.find(c => c.code === code)
}

/**
 * Get the expected digit count(s) for a country code.
 */
export function getExpectedDigits(code: string): { min: number; max: number } {
  const entry = findCountryCode(code)
  if (!entry) return { min: 7, max: 12 }
  if (Array.isArray(entry.digits)) {
    return { min: entry.digits[0], max: entry.digits[1] }
  }
  return { min: entry.digits, max: entry.digits }
}

/**
 * Validate phone digits against the selected country code.
 * Returns null if valid, or an error message string if invalid.
 */
export function validatePhoneDigits(digits: string, countryCode: string): string | null {
  const cleaned = digits.replace(/[\s-]/g, '')
  if (!cleaned) return 'Phone number is required'

  // Strip leading zero — some users type "050..." instead of "50..."
  const normalized = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned

  const { min, max } = getExpectedDigits(countryCode)
  const entry = findCountryCode(countryCode)
  const country = entry?.country ?? countryCode

  if (!/^\d+$/.test(normalized)) return 'Phone number must contain only digits'

  if (min === max) {
    if (normalized.length !== min) {
      return `${country} numbers must be ${min} digits (e.g. ${entry?.example ?? ''})`
    }
  } else {
    if (normalized.length < min || normalized.length > max) {
      return `${country} numbers must be ${min}-${max} digits`
    }
  }

  return null
}

/**
 * Format a full phone string for display (e.g., "+971 50 123 4567").
 * Uses country-specific grouping patterns.
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return ''

  // Find matching country code (longest match first)
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)
  const match = sorted.find(c => phone.startsWith(c.code))

  if (!match) return phone

  const local = phone.slice(match.code.length)
  const digits = local.replace(/\D/g, '')

  // Group digits based on country patterns
  const grouped = groupDigits(digits, match.code)
  return `${match.code} ${grouped}`
}

function groupDigits(digits: string, code: string): string {
  // UAE: XX XXX XXXX (9 digits)
  if (code === '+971' && digits.length === 9) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  }
  // India/UK/US/Pakistan/Philippines/Egypt: generic 3-3-4 or 2-4-4
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  // Saudi/France/Australia/SA/Jordan: XX XXX XXXX (9 digits)
  if (digits.length === 9) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  }
  // Kuwait/Qatar/Bahrain/Oman: XXXX XXXX (8 digits)
  if (digits.length === 8) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`
  }
  // China: XXX XXXX XXXX (11 digits)
  if (digits.length === 11) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`
  }
  // Fallback: groups of 3
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim()
}

/**
 * Normalize digits before assembling the full phone.
 * Strips leading zero if present (e.g. "050..." → "50...").
 */
export function normalizeDigits(digits: string): string {
  const cleaned = digits.replace(/[\s-]/g, '')
  return cleaned.startsWith('0') ? cleaned.slice(1) : cleaned
}

/**
 * Assemble a full phone number from country code + digits.
 */
export function assemblePhone(countryCode: string, digits: string): string {
  return `${countryCode}${normalizeDigits(digits)}`
}

/**
 * Parse a stored full phone string into { countryCode, digits }.
 */
export function parsePhone(phone: string): { countryCode: string; digits: string } {
  if (!phone) return { countryCode: '+971', digits: '' }

  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)
  const match = sorted.find(c => phone.startsWith(c.code))

  if (match) {
    return { countryCode: match.code, digits: phone.slice(match.code.length).trim() }
  }

  return { countryCode: '+971', digits: phone }
}
