/**
 * Phone number validation and formatting utilities.
 *
 * Country-specific digit validation for the phone input pattern:
 * user picks a country code from a dropdown, then types digits separately.
 *
 * The complete country list (with flags) comes from countryData.ts.
 * This file keeps validation rules for known countries and a generic fallback.
 */

import { PHONE_CODES, findPhoneCodeByCode } from '@/lib/countryData'

// Re-export the complete phone code list so existing imports keep working
export { PHONE_CODES, findPhoneCodeByCode }

// ---------------------------------------------------------------------------
// Digit validation rules for known country codes
// ---------------------------------------------------------------------------
interface DigitRule {
  digits: number | [number, number]
  example: string
}

const DIGIT_RULES: Record<string, DigitRule> = {
  '+971': { digits: 9,        example: '501234567' },
  '+91':  { digits: 10,       example: '9876543210' },
  '+44':  { digits: 10,       example: '7911123456' },
  '+1':   { digits: 10,       example: '2025551234' },
  '+92':  { digits: 10,       example: '3001234567' },
  '+63':  { digits: 10,       example: '9171234567' },
  '+20':  { digits: 10,       example: '1001234567' },
  '+966': { digits: 9,        example: '501234567' },
  '+965': { digits: 8,        example: '51234567' },
  '+974': { digits: 8,        example: '55123456' },
  '+973': { digits: 8,        example: '36001234' },
  '+968': { digits: 8,        example: '92123456' },
  '+962': { digits: 9,        example: '791234567' },
  '+961': { digits: [7, 8],   example: '71123456' },
  '+86':  { digits: 11,       example: '13812345678' },
  '+49':  { digits: [10, 11], example: '15112345678' },
  '+33':  { digits: 9,        example: '612345678' },
  '+61':  { digits: 9,        example: '412345678' },
  '+27':  { digits: 9,        example: '711234567' },
}

/**
 * Get the expected digit count(s) for a country code.
 */
export function getExpectedDigits(code: string): { min: number; max: number } {
  const rule = DIGIT_RULES[code]
  if (!rule) return { min: 7, max: 12 }
  if (Array.isArray(rule.digits)) {
    return { min: rule.digits[0], max: rule.digits[1] }
  }
  return { min: rule.digits, max: rule.digits }
}

/**
 * Get the example phone number for a country code.
 */
export function getExample(code: string): string {
  return DIGIT_RULES[code]?.example ?? ''
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
  const entry = findPhoneCodeByCode(countryCode)
  const country = entry?.country ?? countryCode

  if (!/^\d+$/.test(normalized)) return 'Phone number must contain only digits'

  if (min === max) {
    if (normalized.length !== min) {
      const example = getExample(countryCode)
      return `${country} numbers must be ${min} digits${example ? ` (e.g. ${example})` : ''}`
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
  const sorted = [...PHONE_CODES].sort((a, b) => b.code.length - a.code.length)
  const match = sorted.find(c => phone.startsWith(c.code))

  if (!match) return phone

  const local = phone.slice(match.code.length)
  const digits = local.replace(/\D/g, '')

  const grouped = groupDigits(digits, match.code)
  return `${match.code} ${grouped}`
}

function groupDigits(digits: string, code: string): string {
  if (code === '+971' && digits.length === 9) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`
  }
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

  const sorted = [...PHONE_CODES].sort((a, b) => b.code.length - a.code.length)
  const match = sorted.find(c => phone.startsWith(c.code))

  if (match) {
    return { countryCode: match.code, digits: phone.slice(match.code.length).trim() }
  }

  return { countryCode: '+971', digits: phone }
}
