/**
 * ClientSidePanel - Unified panel for creating and editing clients.
 * Same UI for both create and edit modes.
 * Includes tabs for Details, Documents, and Activity.
 */

import { useState, useEffect } from 'react'
import { X, AlertCircle, Loader2, Briefcase } from 'lucide-react'
import { getTodayISO } from '@/lib/dateUtils'
import {
  useClient,
  useCreateClient,
  useUpdateClient,
  useUpdateCoApplicant,
  useChangeClientStatus,
} from '@/hooks/useClients'
import { useSourcesForFilter } from '@/hooks/useChannels'
import { clientToast } from '@/lib/toastMessages'
import { FormField } from '@/components/ui/FormField'
import { SidePanelWrapper } from '@/components/ui/SidePanelWrapper'
import { CaseSidePanel } from '@/components/CaseSidePanel'
import { ClientDocumentTab } from '@/components/documents'
import { ClientExtraDetailsTab } from '@/components/ClientExtraDetailsTab'
import { ActivityTimeline } from '@/components/activity'
import { ClientWhatsAppTab } from '@/components/whatsapp/ClientWhatsAppTab'
import { SLACountdown } from '@/components/SLACountdown'
import { SidePanelSkeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/contexts/AuthContext'
import type {
  ResidencyType,
  EmploymentType,
  ClientStatus,
  SLAStatusValue,
  PropertyCategory,
  PropertyType,
  Emirate,
  TransactionType,
} from '@/types/mortgage'
import { cn } from '@/lib/utils'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { DateInput } from '@/components/ui/DateInput'
import { SidePanelTabs } from '@/components/ui/SidePanelTabs'
import type { SidePanelTab } from '@/components/ui/SidePanelTabs'
import type { SearchableSelectOption } from '@/components/ui/SearchableSelect'


interface ClientSidePanelProps {
  clientId: string
  onClose: () => void
  hideCreateCase?: boolean
  viewOnly?: boolean
}

type TabType = 'details' | 'extra_details' | 'documents' | 'activity' | 'whatsapp'

const CLIENT_TABS: SidePanelTab<TabType>[] = [
  { value: 'details', label: 'Details' },
  { value: 'documents', label: 'Documents' },
  { value: 'whatsapp', label: 'WhatsApp', activeColor: '#00A884' },
  { value: 'activity', label: 'Activity' },
]

const statusColors: Record<ClientStatus, string> = {
  active: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  not_proceeding: 'bg-gray-200 text-gray-500',
}

const residencyOptions: { value: ResidencyType; label: string }[] = [
  { value: 'uae_national', label: 'UAE National' },
  { value: 'uae_resident', label: 'UAE Resident' },
  { value: 'non_resident', label: 'Non-Resident' },
]

const employmentOptions: { value: EmploymentType; label: string }[] = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'self_employed', label: 'Self Employed' },
]

const propertyCategoryOptions: { value: PropertyCategory; label: string }[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
]

const propertyTypeOptions: { value: PropertyType; label: string }[] = [
  { value: 'ready', label: 'Ready' },
  { value: 'off_plan', label: 'Off-Plan' },
]

const emirateOptions: { value: Emirate; label: string }[] = [
  { value: 'dubai', label: 'Dubai' },
  { value: 'abu_dhabi', label: 'Abu Dhabi' },
  { value: 'sharjah', label: 'Sharjah' },
  { value: 'ajman', label: 'Ajman' },
  { value: 'ras_al_khaimah', label: 'Ras Al Khaimah' },
  { value: 'fujairah', label: 'Fujairah' },
  { value: 'umm_al_quwain', label: 'Umm Al Quwain' },
]

const transactionTypeOptions: { value: TransactionType; label: string }[] = [
  { value: 'primary_purchase', label: 'Primary Purchase' },
  { value: 'resale', label: 'Resale' },
  { value: 'buyout_equity', label: 'Buyout + Equity' },
  { value: 'buyout', label: 'Buyout' },
  { value: 'equity', label: 'Equity' },
]

const UAE_BANKS = [
  'ADCB', 'ADIB', 'CBD', 'CBI', 'DIB', 'Emirates NBD', 'FAB',
  'Mashreq', 'RAKBANK', 'Standard Chartered', 'HSBC', 'Citibank', 'Other',
]

// Phone country codes and validation imported from shared utility
import {
  PHONE_CODES,
  validatePhoneDigits,
  assemblePhone,
  parsePhone,
  getExpectedDigits,
  getExample,
} from '@/lib/phoneUtils'
import { NATIONALITIES } from '@/lib/countryData'
import { CountryFlag } from '@/components/ui/CountryFlag'

export function ClientSidePanel({ clientId, onClose, hideCreateCase, viewOnly: viewOnlyProp }: ClientSidePanelProps) {
  const { can } = useAuth()
  const isCreateMode = clientId === 'new'
  const { data: client, isLoading, error } = useClient(clientId)

  // Check permissions from IAM
  const viewOnly = viewOnlyProp || !can('update', 'clients')

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('details')

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('+971')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [nationality, setNationality] = useState('')
  const [residency, setResidency] = useState<ResidencyType>('uae_resident')
  const [employmentType, setEmploymentType] = useState<EmploymentType>('salaried')
  const [sourceId, setSourceId] = useState('')
  const [applicationType, setApplicationType] = useState<'single' | 'joint'>('single')
  const [monthlySalary, setMonthlySalary] = useState('')
  const [totalAddbacks, setTotalAddbacks] = useState('')

  // Co-borrower fields
  const [coBorrowerFirstName, setCoBorrowerFirstName] = useState('')
  const [coBorrowerLastName, setCoBorrowerLastName] = useState('')
  const [coBorrowerPhoneCountryCode, setCoBorrowerPhoneCountryCode] = useState('+971')
  const [coBorrowerPhone, setCoBorrowerPhone] = useState('')
  const [coBorrowerEmail, setCoBorrowerEmail] = useState('')
  const [coBorrowerSalary, setCoBorrowerSalary] = useState('')

  // Liabilities
  const [liabilities, setLiabilities] = useState<{ type: string; amount: string; bankName?: string }[]>([])

  // Property fields
  const [propertyCategory, setPropertyCategory] = useState<PropertyCategory>('residential')
  const [propertyType, setPropertyType] = useState<PropertyType>('ready')
  const [emirate, setEmirate] = useState<Emirate>('dubai')
  const [transactionType, setTransactionType] = useState<TransactionType>('primary_purchase')
  const [propertyValue, setPropertyValue] = useState('')
  const [isFirstProperty, setIsFirstProperty] = useState(true)
  // Loan fields
  const [loanAmount, setLoanAmount] = useState('')
  const [tenureYears, setTenureYears] = useState('20')
  const [tenureMonths, setTenureMonths] = useState('0')

  const [saveError, setSaveError] = useState<string | null>(null)
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null)

  // Auto-dismiss errors after 5 seconds
  useEffect(() => {
    if (!saveError) return
    const t = setTimeout(() => setSaveError(null), 3000)
    return () => clearTimeout(t)
  }, [saveError])

  useEffect(() => {
    if (!whatsAppError) return
    const t = setTimeout(() => setWhatsAppError(null), 3000)
    return () => clearTimeout(t)
  }, [whatsAppError])
  const [showCaseCreation, setShowCaseCreation] = useState(false)
  const [_hasChanges, _setHasChanges] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  // Status confirmation modal state
  const [showStatusConfirmation, setShowStatusConfirmation] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<ClientStatus | null>(null)

  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()
  const updateCoApplicantMutation = useUpdateCoApplicant()
  const changeStatusMutation = useChangeClientStatus()

  // Initialize form with client data for edit mode
  useEffect(() => {
    if (client) {
      const nameParts = client.name.split(' ')
      setFirstName(nameParts[0] || '')
      setLastName(nameParts.slice(1).join(' ') || '')
      setEmail(client.email || '')
      // Parse phone to extract country code
      const parsed = parsePhone(client.phone || '')
      setPhoneCountryCode(parsed.countryCode)
      setPhone(parsed.digits)
      setDob(client.date_of_birth || '')
      setNationality(client.nationality || '')
      setResidency(client.residency || 'uae_resident')
      setEmploymentType(client.employment_type || 'salaried')
      setApplicationType(client.application_type || 'single')
      setMonthlySalary(client.monthly_salary || '')
      setTotalAddbacks(client.total_addbacks || '')
      setSourceId(client.source?.id || '')

      // Build liabilities from client data
      const clientLiabilities: { type: string; amount: string; bankName?: string }[] = []
      if (client.cc_1_limit) clientLiabilities.push({ type: 'cc', amount: client.cc_1_limit, bankName: '' })
      if (client.cc_2_limit) clientLiabilities.push({ type: 'cc', amount: client.cc_2_limit, bankName: '' })
      if (client.cc_3_limit) clientLiabilities.push({ type: 'cc', amount: client.cc_3_limit, bankName: '' })
      if (client.cc_4_limit) clientLiabilities.push({ type: 'cc', amount: client.cc_4_limit, bankName: '' })
      if (client.cc_5_limit) clientLiabilities.push({ type: 'cc', amount: client.cc_5_limit, bankName: '' })
      if (client.auto_loan_emi) clientLiabilities.push({ type: 'auto', amount: client.auto_loan_emi })
      if (client.personal_loan_emi) clientLiabilities.push({ type: 'personal', amount: client.personal_loan_emi })
      if (client.existing_mortgage_emi) clientLiabilities.push({ type: 'mortgage', amount: client.existing_mortgage_emi })
      setLiabilities(clientLiabilities)

      // Co-applicant
      if (client.co_applicant) {
        const coNameParts = client.co_applicant.name.split(' ')
        setCoBorrowerFirstName(coNameParts[0] || '')
        setCoBorrowerLastName(coNameParts.slice(1).join(' ') || '')
        // Parse co-borrower phone
        const coParsed = parsePhone(client.co_applicant.phone || '')
        setCoBorrowerPhoneCountryCode(coParsed.countryCode)
        setCoBorrowerPhone(coParsed.digits)
        setCoBorrowerEmail(client.co_applicant.email || '')
        setCoBorrowerSalary(client.co_applicant.monthly_salary || '')
      }

      // Property fields
      setPropertyCategory(client.property_category || 'residential')
      setPropertyType(client.property_type || 'ready')
      setEmirate(client.emirate || 'dubai')
      setTransactionType(client.transaction_type || 'primary_purchase')
      setPropertyValue(client.property_value || '')
      setIsFirstProperty(client.is_first_property ?? true)

      // Loan fields
      setLoanAmount(client.loan_amount || '')
      setTenureYears(String(client.tenure_years ?? 20))
      setTenureMonths(String(client.tenure_months ?? 0))

      // Mark initial load as done (with slight delay to avoid immediate change detection)
      setTimeout(() => setInitialLoadDone(true), 100)
    }
  }, [client])

  // Track changes for edit mode
  useEffect(() => {
    if (initialLoadDone && !isCreateMode) {
      _setHasChanges(true)
    }
  }, [firstName, lastName, email, phone, phoneCountryCode, dob, nationality, residency, employmentType, applicationType, monthlySalary, totalAddbacks, liabilities, coBorrowerFirstName, coBorrowerLastName, coBorrowerPhone, coBorrowerPhoneCountryCode, coBorrowerEmail, coBorrowerSalary, initialLoadDone, isCreateMode])

  // Sanitize amount input
  const sanitizeAmount = (value: string): string => {
    const cleaned = value.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('')
    return cleaned
  }

  const addLiability = () => {
    if (liabilities.length < 10) {
      setLiabilities([...liabilities, { type: 'cc', amount: '', bankName: '' }])
    }
  }

  const removeLiability = (index: number) => {
    setLiabilities(liabilities.filter((_, i) => i !== index))
  }

  const updateLiability = (index: number, field: 'type' | 'amount' | 'bankName', value: string) => {
    const updated = [...liabilities]
    if (field === 'bankName') {
      updated[index].bankName = value
    } else {
      updated[index][field] = value
    }
    setLiabilities(updated)
  }

  // Calculations - DBR and Max Loan Amount (recomputed each render)
  const salary = parseFloat(monthlySalary) || 0
  const addbacks = parseFloat(totalAddbacks) || 0
  const coSalary = applicationType === 'joint' ? (parseFloat(coBorrowerSalary) || 0) : 0
  const totalIncome = salary + addbacks + coSalary

  const ccLiability = liabilities
    .filter(l => l.type === 'cc')
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0) * 0.05, 0)

  const loanEMIs = liabilities
    .filter(l => l.type !== 'cc')
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0)

  const totalLiab = ccLiability + loanEMIs
  const dbrPercentage = totalIncome > 0 ? (totalLiab / totalIncome) * 100 : 0
  const maxLoanAmount = totalIncome * 68

  const calculations = {
    totalLiabilities: Math.round(totalLiab * 100) / 100,
    dbrPercentage: Math.round(dbrPercentage * 100) / 100,
    maxLoanAmount: Math.round(maxLoanAmount * 100) / 100,
  }

  // LTV Calculation
  const loan = parseFloat(loanAmount) || 0
  const property = parseFloat(propertyValue) || 0
  const ltvLimit = propertyType === 'off_plan' ? 50 : (isFirstProperty ? 80 : 65)

  const ltvCalculation = (property <= 0 || loan <= 0)
    ? { ltv: 0, ltvLimit, withinLimit: true }
    : {
        ltv: Math.round((loan / property) * 100 * 100) / 100,
        ltvLimit,
        withinLimit: (loan / property) * 100 <= ltvLimit,
      }

  const handleSave = async () => {
    const errors: string[] = []

    // Personal Information
    if (!firstName.trim()) errors.push('First Name is required')
    if (!lastName.trim()) errors.push('Last Name is required')
    const phoneError = validatePhoneDigits(phone, phoneCountryCode)
    if (phoneError) errors.push(phoneError)
    if (!email.trim()) errors.push('Email is required')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.push('Invalid email format')
    if (!dob) errors.push('Date of Birth is required')
    if (!nationality) errors.push('Nationality is required')
    if (!residency) errors.push('Residency is required')
    if (!employmentType) errors.push('Employment is required')
    if (!sourceId && isCreateMode) errors.push('Source is required')

    // Income
    if (!monthlySalary) errors.push('Monthly Salary is required')

    // Property & Loan (required for case creation)
    if (!propertyValue) errors.push('Property Value is required')
    if (!loanAmount) errors.push('Loan Amount is required')

    // Co-borrower (if joint)
    if (applicationType === 'joint') {
      if (!coBorrowerFirstName.trim()) errors.push('Co-borrower First Name is required')
      if (!coBorrowerLastName.trim()) errors.push('Co-borrower Last Name is required')
      const coPhoneError = validatePhoneDigits(coBorrowerPhone, coBorrowerPhoneCountryCode)
      if (coPhoneError) errors.push(`Co-borrower: ${coPhoneError}`)
      if (!coBorrowerEmail.trim()) errors.push('Co-borrower Email is required')
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(coBorrowerEmail.trim())) errors.push('Invalid co-borrower email format')
      if (!coBorrowerSalary) errors.push('Co-borrower Monthly Salary is required')
    }

    if (errors.length > 0) {
      setSaveError(errors[0])
      return
    }

    const fullName = lastName.trim() ? `${firstName.trim()} ${lastName.trim()}` : firstName.trim()
    const fullPhone = assemblePhone(phoneCountryCode, phone)
    const ccLimits = liabilities.filter(l => l.type === 'cc').map(l => l.amount)
    const autoLoan = liabilities.find(l => l.type === 'auto')?.amount
    const personalLoan = liabilities.find(l => l.type === 'personal')?.amount
    const mortgageEmi = liabilities.find(l => l.type === 'mortgage')?.amount

    const data: Record<string, any> = {
      name: fullName,
      phone: fullPhone,
      email: email.trim() || undefined,
      date_of_birth: dob || undefined,
      nationality: nationality || undefined,
      residency,
      employment_type: employmentType,
      application_type: applicationType,
      monthly_salary: monthlySalary || undefined,
      total_addbacks: totalAddbacks || undefined,
      cc_1_limit: ccLimits[0] || undefined,
      cc_2_limit: ccLimits[1] || undefined,
      cc_3_limit: ccLimits[2] || undefined,
      cc_4_limit: ccLimits[3] || undefined,
      cc_5_limit: ccLimits[4] || undefined,
      auto_loan_emi: autoLoan || undefined,
      personal_loan_emi: personalLoan || undefined,
      existing_mortgage_emi: mortgageEmi || undefined,
      // Property fields
      property_category: propertyCategory,
      property_type: propertyType,
      emirate: emirate,
      transaction_type: transactionType,
      property_value: propertyValue || undefined,
      is_first_property: isFirstProperty,
      // Loan fields
      loan_amount: loanAmount || undefined,
      tenure_years: parseInt(tenureYears) || 20,
      tenure_months: parseInt(tenureMonths) || 0,
    }

    // Only include source_id for create mode (not for updates, especially converted clients)
    if (isCreateMode) {
      data.source_id = sourceId || undefined
    }

    try {
      let savedClientId = clientId

      if (isCreateMode) {
        const newClient = await createMutation.mutateAsync(data as any)
        savedClientId = newClient.id
      } else {
        await updateMutation.mutateAsync({ id: clientId, data })
      }

      // Save co-applicant data via separate endpoint for joint applications
      if (applicationType === 'joint' && savedClientId && savedClientId !== 'new') {
        const coFullName = coBorrowerLastName.trim()
          ? `${coBorrowerFirstName.trim()} ${coBorrowerLastName.trim()}`
          : coBorrowerFirstName.trim()
        const coFullPhone = assemblePhone(coBorrowerPhoneCountryCode, coBorrowerPhone)

        await updateCoApplicantMutation.mutateAsync({
          clientId: savedClientId,
          data: {
            name: coFullName,
            phone: coFullPhone,
            email: coBorrowerEmail.trim() || undefined,
            monthly_salary: coBorrowerSalary || undefined,
          },
        })
      }
      // Close panel after creating new client, stay open for updates
      if (isCreateMode) {
        onClose()
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save client')
    }
  }

  const handleStatusChange = (newStatus: ClientStatus) => {
    if (!client) return
    // Show confirmation for terminal statuses
    if (newStatus === 'declined' || newStatus === 'not_proceeding') {
      setPendingStatus(newStatus)
      setShowStatusConfirmation(true)
    } else {
      confirmStatusChange(newStatus)
    }
  }

  const confirmStatusChange = async (status: ClientStatus) => {
    try {
      await changeStatusMutation.mutateAsync({ id: clientId, status })
      clientToast.statusChanged(status)
      setShowStatusConfirmation(false)
      setPendingStatus(null)
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to change status')
    }
  }

  const cancelStatusChange = () => {
    setShowStatusConfirmation(false)
    setPendingStatus(null)
  }

  const handleConvertToCase = () => {
    // Check API validation (saved data)
    if (client?.can_create_case && !client.can_create_case.valid) {
      setSaveError('Cannot create case: Required fields are empty')
      return
    }
    setShowCaseCreation(true)
  }

  const handleCasePanelClose = () => {
    setShowCaseCreation(false)
    // After case is created, close the client panel too
    onClose()
  }

  if (!isCreateMode && isLoading) {
    return (
      <SidePanelWrapper onClose={onClose}>
        <div className="px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Client</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidePanelSkeleton variant="client" />
        </div>
      </SidePanelWrapper>
    )
  }

  if (!isCreateMode && error) {
    return (
      <SidePanelWrapper onClose={onClose}>
        <div className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <p className="text-gray-600">Failed to load client</p>
        </div>
      </SidePanelWrapper>
    )
  }

  const isPending = createMutation.isPending || updateMutation.isPending || updateCoApplicantMutation.isPending

  // Check if we should show SLA countdown (only in edit mode with client data)
  // Each client has only one SLA: First Contact (converted from lead) or Client to Case (direct)
  const showSLACountdown = !isCreateMode && client
  const clientSLA = client?.first_contact_sla_status || client?.client_to_case_sla_status
  const slaLabel = client?.first_contact_sla_status ? 'First Contact SLA' : 'Client to Case SLA'

  return (
    <SidePanelWrapper onClose={onClose}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {isCreateMode ? 'New Client' : (client?.name || 'Edit Client')}
            </h2>
            {!isCreateMode && client && (
              // Show badge (not editable) if client has cases or is in terminal status
              client.cases && client.cases.length > 0 ? (
                <span className={cn('px-2 py-0.5 text-xs font-medium rounded', statusColors[client.status])}>
                  {client.status === 'active' ? 'Active' : client.status === 'declined' ? 'Declined' : 'Not Proceeding'}
                </span>
              ) : client.status === 'declined' ? (
                <span className={cn('px-2 py-0.5 text-xs font-medium rounded', statusColors[client.status])}>
                  Declined
                </span>
              ) : client.status === 'not_proceeding' ? (
                <span className={cn('px-2 py-0.5 text-xs font-medium rounded', statusColors[client.status])}>
                  Not Proceeding
                </span>
              ) : (
                <SearchableSelect
                    value={client.status}
                    onChange={(val) => handleStatusChange(val as ClientStatus)}
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'declined', label: 'Declined' },
                      { value: 'not_proceeding', label: 'Not Proceeding' },
                    ]}
                    disabled={changeStatusMutation.isPending || viewOnly}
                    size="sm"
                    hideSearch
                    className={cn('border-0 font-medium w-auto', statusColors[client.status])}
                  />
              )
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* SLA Countdown Section - Near top of panel */}
        {showSLACountdown && clientSLA && (
          <div className="mt-3">
            <SLACountdown
              status={clientSLA.status as SLAStatusValue}
              remainingHours={clientSLA.remaining_hours}
              displayText={clientSLA.display}
              label={slaLabel}
              size="sm"
            />
          </div>
        )}

        {saveError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {saveError}
            <button onClick={() => setSaveError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {whatsAppError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {whatsAppError}
            <button onClick={() => setWhatsAppError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Tabs - Only show for edit mode */}
        {!isCreateMode && (
          <div className="mt-4">
            <SidePanelTabs tabs={CLIENT_TABS} value={activeTab} onChange={setActiveTab} />
          </div>
        )}
      </div>

      {/* Content */}
      {(isCreateMode || activeTab === 'details') && (
        <>
          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Personal Information */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="First Name *">
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]" />
                </FormField>
                <FormField label="Last Name *">
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]" />
                </FormField>
                <FormField label="Phone *">
                  <div className="flex gap-1">
                    <div className="w-[7.5rem] shrink-0">
                      <SearchableSelect
                        value={phoneCountryCode}
                        onChange={setPhoneCountryCode}
                        options={PHONE_CODES.map(c => ({ value: c.code, label: c.label, icon: <CountryFlag iso={c.iso} size={18} /> }))}
                        displayValue={(opt) => opt.value}
                        placeholder="+971"
                        searchPlaceholder="Search country..."
                        disabled={!isCreateMode}
                        popoverMinWidth={240}
                      />
                    </div>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder={getExample(phoneCountryCode)}
                      maxLength={getExpectedDigits(phoneCountryCode).max + 1}
                      disabled={!isCreateMode}
                      className="flex-1 min-w-0 h-9 px-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f] disabled:bg-gray-50 disabled:text-gray-500" />
                  </div>
                  {phone && validatePhoneDigits(phone, phoneCountryCode) && (
                    <p className="text-xs text-amber-600 mt-1">{validatePhoneDigits(phone, phoneCountryCode)}</p>
                  )}
                </FormField>
                <FormField label="Email *">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]" />
                </FormField>
                <FormField label="Date of Birth *">
                  <DateInput value={dob} onChange={setDob} max={getTodayISO()} />
                </FormField>
                <FormField label="Nationality *">
                  <SearchableSelect
                    value={nationality}
                    onChange={setNationality}
                    options={NATIONALITIES.map(n => ({ value: n.value, label: n.label, icon: <CountryFlag iso={n.iso} size={18} /> }))}
                    placeholder="Select..."
                    searchPlaceholder="Search nationality..."
                  />
                </FormField>
                <FormField label="Residency *">
                  <SearchableSelect
                    value={residency}
                    onChange={(val) => setResidency(val as ResidencyType)}
                    options={residencyOptions}
                    hideSearch
                  />
                </FormField>
                <FormField label="Employment *">
                  <SearchableSelect
                    value={employmentType}
                    onChange={(val) => setEmploymentType(val as EmploymentType)}
                    options={employmentOptions}
                    hideSearch
                  />
                </FormField>
                <FormField label="Source *" className="col-span-2">
                  <TrustedSourceSelector
                    value={sourceId}
                    onChange={setSourceId}
                    currentSource={client?.source}
                    disabled={!isCreateMode}
                  />
                </FormField>
              </div>
            </div>

            {/* Application Type */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Application Type</h3>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={applicationType === 'single'} onChange={() => setApplicationType('single')}
                    className="w-4 h-4 text-[#1e3a5f]" />
                  <span className="text-sm text-gray-700">Individual</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={applicationType === 'joint'} onChange={() => setApplicationType('joint')}
                    className="w-4 h-4 text-[#1e3a5f]" />
                  <span className="text-sm text-gray-700">Co-borrower</span>
                </label>
              </div>

              {applicationType === 'joint' && (
                <div className="pt-4 space-y-4">
                  <h4 className="text-xs font-medium text-gray-500">Co-borrower Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="First Name *">
                      <input type="text" value={coBorrowerFirstName} onChange={(e) => setCoBorrowerFirstName(e.target.value)}
                        className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]" />
                    </FormField>
                    <FormField label="Last Name *">
                      <input type="text" value={coBorrowerLastName} onChange={(e) => setCoBorrowerLastName(e.target.value)}
                        className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]" />
                    </FormField>
                    <FormField label="Phone *">
                      <div className="flex gap-2">
                        <div className="w-[7.5rem] shrink-0">
                          <SearchableSelect
                            value={coBorrowerPhoneCountryCode}
                            onChange={setCoBorrowerPhoneCountryCode}
                            options={PHONE_CODES.map(c => ({ value: c.code, label: c.label, icon: <CountryFlag iso={c.iso} size={16} /> }))}
                            displayValue={(opt) => opt.value}
                            placeholder="+971"
                            searchPlaceholder="Search country..."
                            size="sm"
                            popoverMinWidth={240}
                          />
                        </div>
                        <input type="tel" value={coBorrowerPhone} onChange={(e) => setCoBorrowerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder={getExample(coBorrowerPhoneCountryCode)}
                          maxLength={getExpectedDigits(coBorrowerPhoneCountryCode).max + 1}
                          className="flex-1 h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]" />
                      </div>
                      {coBorrowerPhone && validatePhoneDigits(coBorrowerPhone, coBorrowerPhoneCountryCode) && (
                        <p className="text-xs text-amber-600 mt-1">{validatePhoneDigits(coBorrowerPhone, coBorrowerPhoneCountryCode)}</p>
                      )}
                    </FormField>
                    <FormField label="Email *">
                      <input type="email" value={coBorrowerEmail} onChange={(e) => setCoBorrowerEmail(e.target.value)}
                        className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]" />
                    </FormField>
                    <FormField label="Monthly Salary (AED) *" className="col-span-2">
                      <input type="text" inputMode="numeric" value={coBorrowerSalary} onChange={(e) => setCoBorrowerSalary(sanitizeAmount(e.target.value))}
                        className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]" />
                    </FormField>
                  </div>
                </div>
              )}
            </div>

            {/* Income & Liabilities */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Income & Liabilities</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Monthly Salary (AED) *">
                  <input type="text" inputMode="numeric" value={monthlySalary} onChange={(e) => setMonthlySalary(sanitizeAmount(e.target.value))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]" />
                </FormField>
                <FormField label="Total Addbacks (AED)">
                  <input type="text" inputMode="numeric" value={totalAddbacks} onChange={(e) => setTotalAddbacks(sanitizeAmount(e.target.value))}
                    placeholder="Rental income, bonuses, etc."
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]" />
                </FormField>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500">Liabilities</span>
                  {liabilities.length < 10 && (
                    <button type="button" onClick={addLiability} className="text-xs font-medium text-[#1e3a5f] hover:underline">+ Add</button>
                  )}
                </div>
                {liabilities.length > 0 && (
                  <div className="space-y-2">
                    {liabilities.map((liability, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <div className="w-32 shrink-0">
                          <SearchableSelect
                            value={liability.type}
                            onChange={(val) => updateLiability(index, 'type', val)}
                            options={[
                              { value: 'cc', label: 'Credit Card' },
                              { value: 'auto', label: 'Auto Loan' },
                              { value: 'personal', label: 'Personal Loan' },
                              { value: 'mortgage', label: 'Mortgage' },
                            ]}
                            size="sm"
                            hideSearch
                          />
                        </div>
                        {liability.type === 'cc' && (
                          <div className="w-32 shrink-0">
                            <SearchableSelect
                              value={liability.bankName || ''}
                              onChange={(val) => updateLiability(index, 'bankName', val)}
                              options={UAE_BANKS.map(bank => ({ value: bank, label: bank }))}
                              placeholder="Bank"
                              searchPlaceholder="Search bank..."
                              size="sm"
                              popoverMinWidth={180}
                            />
                          </div>
                        )}
                        <input type="text" inputMode="numeric" value={liability.amount}
                          onChange={(e) => updateLiability(index, 'amount', sanitizeAmount(e.target.value))}
                          placeholder={liability.type === 'cc' ? 'Limit' : 'EMI'}
                          className="flex-1 h-8 px-2 text-xs border border-gray-200 rounded-md focus:outline-none bg-white" />
                        {liability.type === 'cc' && liability.amount && (
                          <span className="text-xs font-semibold text-[#1e3a5f] whitespace-nowrap px-2 py-1 bg-blue-50 rounded">
                            5%: {((parseFloat(liability.amount) || 0) * 0.05).toLocaleString()}
                          </span>
                        )}
                        <button type="button" onClick={() => removeLiability(index)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors shrink-0">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {liabilities.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm">
                    <span className="text-gray-500">Total Liabilities</span>
                    <span className="font-semibold text-gray-900">AED {calculations.totalLiabilities.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Property Details */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Property Details</h3>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Category">
                  <SearchableSelect
                    value={propertyCategory}
                    onChange={(val) => setPropertyCategory(val as PropertyCategory)}
                    options={propertyCategoryOptions}
                    hideSearch
                  />
                </FormField>
                <FormField label="Type">
                  <SearchableSelect
                    value={propertyType}
                    onChange={(val) => setPropertyType(val as PropertyType)}
                    options={propertyTypeOptions}
                    hideSearch
                  />
                </FormField>
                <FormField label="Emirate">
                  <SearchableSelect
                    value={emirate}
                    onChange={(val) => setEmirate(val as Emirate)}
                    options={emirateOptions}
                    hideSearch
                  />
                </FormField>
                <FormField label="Transaction">
                  <SearchableSelect
                    value={transactionType}
                    onChange={(val) => setTransactionType(val as TransactionType)}
                    options={transactionTypeOptions}
                    hideSearch
                  />
                </FormField>
                <FormField label="Property Value (AED) *">
                  <input type="text" inputMode="numeric" value={propertyValue} onChange={(e) => setPropertyValue(sanitizeAmount(e.target.value))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]" />
                </FormField>
                <FormField label="First Property?">
                  <div className="flex items-center gap-4 h-9">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={isFirstProperty} onChange={() => setIsFirstProperty(true)}
                        className="w-4 h-4 text-[#1e3a5f]" />
                      <span className="text-sm text-gray-700">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={!isFirstProperty} onChange={() => setIsFirstProperty(false)}
                        className="w-4 h-4 text-[#1e3a5f]" />
                      <span className="text-sm text-gray-700">No</span>
                    </label>
                  </div>
                </FormField>
              </div>
            </div>

            {/* Loan Details */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Loan Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Loan Amount (AED) *">
                  <input type="text" inputMode="numeric" value={loanAmount} onChange={(e) => setLoanAmount(sanitizeAmount(e.target.value))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]" />
                </FormField>
                <FormField label="Tenure">
                  <div className="flex items-center gap-2">
                    <div className="w-16">
                      <SearchableSelect
                        value={tenureYears}
                        onChange={setTenureYears}
                        options={Array.from({ length: 25 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                        size="sm"
                        popoverMinWidth={30}
                        hideSearch
                      />
                    </div>
                    <span className="text-xs text-gray-500">yrs</span>
                    <div className="w-16">
                      <SearchableSelect
                        value={tenureMonths}
                        onChange={setTenureMonths}
                        options={Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: String(i) }))}
                        size="sm"
                        popoverMinWidth={30}
                        hideSearch
                      />
                    </div>
                    <span className="text-xs text-gray-500">mo</span>
                  </div>
                </FormField>
              </div>
            </div>

            {/* Eligibility Calculations */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Eligibility</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-[10px] font-medium text-gray-400 uppercase block mb-1">DBR (50% max)</span>
                  <span className={`text-sm font-bold ${calculations.dbrPercentage < 30 ? 'text-green-600' : calculations.dbrPercentage <= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {calculations.dbrPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-[10px] font-medium text-gray-400 uppercase block mb-1">Max Loan</span>
                  <span className="text-sm font-bold text-gray-900">AED {calculations.maxLoanAmount.toLocaleString()}</span>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-[10px] font-medium text-gray-400 uppercase block mb-1">LTV ({ltvCalculation.ltvLimit}% max)</span>
                  <span className={`text-sm font-bold ${ltvCalculation.withinLimit ? 'text-green-600' : 'text-red-600'}`}>
                    {ltvCalculation.ltv > 0 ? `${ltvCalculation.ltv}%` : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - only for create mode or active clients */}
          {!viewOnly && (isCreateMode || (client && client.status === 'active')) && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 space-y-2">
              <button onClick={handleSave} disabled={isPending}
                className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{isCreateMode ? 'Creating...' : 'Saving...'}</>
                ) : (
                  isCreateMode ? 'Create Client' : 'Save Changes'
                )}
              </button>
              {!isCreateMode && !hideCreateCase && client && (
                <button onClick={handleConvertToCase}
                  className="w-full py-2.5 border border-[#1e3a5f] text-[#1e3a5f] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Create Case
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Extra Details Tab Content */}
      {!isCreateMode && activeTab === 'extra_details' && client && (
        <div className="flex-1 overflow-y-auto p-6">
          <ClientExtraDetailsTab
            clientId={clientId}
            employmentType={client.employment_type}
            viewOnly={viewOnly}
          />
        </div>
      )}

      {/* Documents Tab Content */}
      {!isCreateMode && activeTab === 'documents' && (
        <div className="flex-1 overflow-y-auto p-6">
          <ClientDocumentTab clientId={clientId} />
        </div>
      )}

      {/* Activity Tab Content */}
      {!isCreateMode && activeTab === 'activity' && (
        <div className="flex-1 overflow-y-auto p-6">
          <ActivityTimeline recordType="client" recordId={clientId} />
        </div>
      )}

      {/* WhatsApp Tab Content */}
      {!isCreateMode && activeTab === 'whatsapp' && (
        <div className="flex-1 overflow-hidden px-4 py-2">
          <ClientWhatsAppTab clientId={clientId} clientPhone={client?.phone} client={client} onError={setWhatsAppError} />
        </div>
      )}

      {/* Case Creation Panel */}
      {showCaseCreation && (
        <CaseSidePanel
          caseId="new"
          isOpen={showCaseCreation}
          onClose={handleCasePanelClose}
          preselectedClientId={clientId}
        />
      )}

      {/* Status Confirmation Modal */}
      {showStatusConfirmation && pendingStatus && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60]" onClick={cancelStatusChange} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] bg-white z-[60] shadow-xl rounded-xl">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Confirm Status Change</h3>
              <p className="text-xs text-gray-500 mt-1">
                You are about to change status to: <strong>{pendingStatus === 'declined' ? 'Declined' : 'Not Proceeding'}</strong>
              </p>
            </div>
            <div className="p-4">
              <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                <p className="text-xs text-amber-700">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 p-4 pt-0">
              <button
                onClick={cancelStatusChange}
                className="flex-1 px-4 py-2 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => pendingStatus && confirmStatusChange(pendingStatus)}
                disabled={changeStatusMutation.isPending}
                className="flex-1 px-4 py-2 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {changeStatusMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Updating...
                  </span>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </SidePanelWrapper>
  )
}

interface TrustedSourceSelectorProps {
  value: string
  onChange: (id: string) => void
  currentSource?: {
    id: string
    name: string
    channel_name: string
  } | null
  disabled?: boolean
}

function TrustedSourceSelector({ value, onChange, currentSource, disabled }: TrustedSourceSelectorProps) {
  const { data: sources, isLoading } = useSourcesForFilter('trusted')

  if (isLoading) {
    return (
      <SearchableSelect
        value=""
        onChange={() => {}}
        options={currentSource ? [{ value: currentSource.id, label: `${currentSource.name} (${currentSource.channel_name})` }] : []}
        placeholder={currentSource ? `${currentSource.name} (${currentSource.channel_name})` : 'Loading...'}
        disabled
      />
    )
  }

  const hasCurrentSource = currentSource && sources?.some(s => s.id === currentSource.id)

  const options: SearchableSelectOption[] = [
    ...(currentSource && !hasCurrentSource
      ? [{ value: currentSource.id, label: `${currentSource.name} (${currentSource.channel_name})` }]
      : []),
    ...(sources?.map(opt => ({ value: opt.id, label: `${opt.name} (${opt.channelName})` })) || []),
  ]

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Select source..."
      searchPlaceholder="Search source..."
      disabled={disabled}
    />
  )
}
