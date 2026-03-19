/**
 * Template variable substitution utilities.
 *
 * Used to fill Rivo message templates with actual client/lead data.
 */

import type { ClientData } from '@/types/mortgage'
import { formatDate } from '@/lib/dateUtils'

/**
 * Format a number as currency (AED).
 */
function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return ''
  return new Intl.NumberFormat('en-AE', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

/**
 * Extract first name from full name.
 */
function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/)
  return parts[0] || ''
}

/**
 * Build a map of all available template variables from client/lead data.
 * Optionally includes case data for case-related variables.
 */
export function buildVariableMap(
  data: Partial<ClientData>,
  caseData?: { bank?: string; loan_amount?: string; property_value?: string; rate?: string; stage?: string }
): Record<string, string> {
  const today = new Date()
  const signByDate = new Date(today)
  signByDate.setDate(signByDate.getDate() + 7)

  return {
    // Basic contact info (available for both leads and clients)
    first_name: getFirstName(data.name),
    name: data.name || '',
    phone: data.phone || '',
    email: data.email || '',

    // Client financial info
    salary: formatCurrency(data.monthly_salary),
    max_loan: formatCurrency(data.max_loan_amount),
    dbr: data.dbr_percentage ? `${parseFloat(data.dbr_percentage).toFixed(1)}%` : '',

    // Client profile
    nationality: data.nationality || '',
    company: data.company_name || '',

    // Date
    today: formatDate(today),

    // Case variables
    bank_name: caseData?.bank || '',
    loan_amount: formatCurrency(caseData?.loan_amount),
    property_value: formatCurrency(caseData?.property_value),
    rate: caseData?.rate ? `${caseData.rate}%` : '',
    stage: caseData?.stage || '',
    sign_by_date: formatDate(signByDate),
  }
}

/**
 * Fill template content with actual client/lead data.
 *
 * Replaces {variable_name} placeholders with actual values.
 * Unknown variables are left as-is.
 */
export function fillTemplateVariables(
  content: string,
  data?: Partial<ClientData> | { name?: string; phone?: string; email?: string }
): string {
  if (!data) return content
  const variables = buildVariableMap(data)

  return content.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key]
    return value !== undefined && value !== '' ? value : match
  })
}

/**
 * Preview template with sample data (for admin preview).
 */
export function previewTemplateWithSampleData(content: string): string {
  const sampleData: Partial<ClientData> = {
    name: 'Ahmed Khan',
    phone: '+971501234567',
    email: 'ahmed.khan@email.com',
    nationality: 'Pakistani',
    company_name: 'Emirates Group',
    monthly_salary: '25000',
    max_loan_amount: '1700000',
    dbr_percentage: '30',
  }

  const sampleCaseData = {
    bank: 'ADCB',
    loan_amount: '1500000',
    property_value: '2000000',
    rate: '3.99',
    stage: 'Preapproved',
  }

  const variables = buildVariableMap(sampleData, sampleCaseData)
  return content.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key]
    return value !== undefined && value !== '' ? value : match
  })
}

/**
 * List of available template variables for display in admin.
 */
export const TEMPLATE_VARIABLES = [
  // Client variables
  { name: 'first_name', description: 'First name', example: 'Ahmed' },
  { name: 'name', description: 'Full name', example: 'Ahmed Khan' },
  { name: 'phone', description: 'Phone number', example: '+971501234567' },
  { name: 'email', description: 'Email address', example: 'ahmed@email.com' },
  { name: 'salary', description: 'Monthly salary', example: '25,000' },
  { name: 'max_loan', description: 'Max loan amount', example: '1,700,000' },
  { name: 'dbr', description: 'DBR available', example: '9,000' },
  { name: 'nationality', description: 'Nationality', example: 'Pakistani' },
  { name: 'company', description: 'Company name', example: 'Emirates Group' },
  { name: 'today', description: "Today's date", example: '22 Jan 2026' },
  // Case variables
  { name: 'bank_name', description: 'Bank name', example: 'ADCB' },
  { name: 'loan_amount', description: 'Loan amount', example: '1,500,000' },
  { name: 'property_value', description: 'Property value', example: '2,000,000' },
  { name: 'rate', description: 'Interest rate', example: '3.99%' },
  { name: 'stage', description: 'Current case stage', example: 'Preapproved' },
  { name: 'sign_by_date', description: 'Sign by date (7 days)', example: '17 Feb 2026' },
]
