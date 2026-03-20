/**
 * CaseSidePanel - Unified panel for creating and editing cases.
 * Same UI pattern as ClientSidePanel for consistency.
 * Includes tabs for Details and Documents in edit mode.
 */

import { useState, useEffect, useRef } from 'react'
import { X, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { SidePanelTabs } from '@/components/ui/SidePanelTabs'
import type { SidePanelTab } from '@/components/ui/SidePanelTabs'
import { caseToast, clientToast } from '@/lib/toastMessages'
import { FormField } from '@/components/ui/FormField'
import { SidePanelWrapper } from '@/components/ui/SidePanelWrapper'
import { SidePanelSkeleton } from '@/components/ui/Skeleton'
import {
  useCase,
  useCreateCase,
  useUpdateCase,
  useChangeCaseStage,
  useBanks,
  CASE_STAGES,
  getStageLabel,
  isTerminalStage,
} from '@/hooks/useCases'
import { useClients, useClient } from '@/hooks/useClients'
import { useAuth } from '@/contexts/AuthContext'
import { ClientSidePanel } from '@/components/ClientSidePanel'
import { CaseDocumentTab } from '@/components/documents'
import { ActivityTimeline } from '@/components/activity'
import { SLACountdown } from '@/components/SLACountdown'
import type {
  CaseData,
  CaseStage,
  PropertyCategory,
  CaseTypeValue,
  MortgageType,
  FixedPeriod,
  SLAStatusValue,
} from '@/types/mortgage'
import {
  APPLICATION_TYPE_LABELS,
  MORTGAGE_TYPE_LABELS,
  FIXED_PERIOD_LABELS,
  CASE_STAGE_LABELS,
} from '@/types/mortgage'

interface CaseSidePanelProps {
  caseId: string | null
  isOpen: boolean
  onClose: () => void
  preselectedClientId?: string | null
}

type CaseTabType = 'details' | 'documents' | 'activity'

const CASE_TABS: SidePanelTab<CaseTabType>[] = [
  { value: 'details', label: 'Details' },
  { value: 'documents', label: 'Bank Forms' },
  { value: 'activity', label: 'Activity' },
]

const stageColors: Record<CaseStage, string> = {
  // Active stages (main flow)
  processing: 'bg-blue-100 text-blue-700',
  submitted_to_bank: 'bg-blue-100 text-blue-700',
  under_review: 'bg-blue-200 text-blue-800',
  submitted_to_credit: 'bg-indigo-100 text-indigo-700',
  preapproved: 'bg-teal-100 text-teal-700',
  valuation_initiated: 'bg-indigo-200 text-indigo-800',
  valuation_report_received: 'bg-violet-100 text-violet-700',
  fol_requested: 'bg-violet-200 text-violet-800',
  fol_received: 'bg-purple-100 text-purple-700',
  fol_signed: 'bg-purple-200 text-purple-800',
  disbursed: 'bg-emerald-100 text-emerald-700',
  final_documents: 'bg-emerald-200 text-emerald-800',
  mc_received: 'bg-green-100 text-green-700',
  // Query stages
  sales_queries: 'bg-orange-100 text-orange-700',
  credit_queries: 'bg-orange-100 text-orange-700',
  disbursal_queries: 'bg-orange-100 text-orange-700',
  // Hold
  on_hold: 'bg-amber-100 text-amber-700',
  // Terminal
  property_transferred: 'bg-green-200 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  not_proceeding: 'bg-gray-200 text-gray-500',
}

export function CaseSidePanel({ caseId, isOpen, onClose, preselectedClientId }: CaseSidePanelProps) {
  const isCreateMode = caseId === 'new'
  const { data: caseData, isLoading, error } = useCase(caseId)

  if (!isOpen) {
    return null
  }

  return (
    <SidePanelWrapper onClose={onClose}>
      {isCreateMode ? (
        <CreateCaseContent onClose={onClose} preselectedClientId={preselectedClientId} />
      ) : isLoading ? (
        <>
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Case</h2>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidePanelSkeleton variant="case" />
          </div>
        </>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <p className="text-gray-600">Failed to load case</p>
        </div>
      ) : caseData ? (
        <EditCaseContent caseData={caseData} onClose={onClose} />
      ) : null}
    </SidePanelWrapper>
  )
}

interface BankDropdownProps {
  value: string
  onChange: (value: string) => void
  banks: Array<{ id: string; name: string; icon: string }> | undefined
  disabled?: boolean
}

function BankDropdown({ value, onChange, banks, disabled }: BankDropdownProps) {
  const bankOptions = (banks || []).map(bank => ({
    value: bank.name,
    label: bank.name,
    icon: bank.icon ? (
      <div className="h-5 w-5 rounded bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
        <img
          src={bank.icon}
          alt=""
          className="h-4 w-4 object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>
    ) : undefined,
  }))

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={bankOptions}
      placeholder="Select a bank"
      searchPlaceholder="Search bank..."
      disabled={disabled}
    />
  )
}

interface CreateCaseContentProps {
  onClose: () => void
  preselectedClientId?: string | null
}

function CreateCaseContent({ onClose, preselectedClientId }: CreateCaseContentProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(preselectedClientId || null)

  // Case type fields
  const [propertyCategory, _setPropertyCategory] = useState<PropertyCategory>('residential')
  const [caseType, setCaseType] = useState<CaseTypeValue>('fully_packaged')

  // Bank fields
  const [bank, setBank] = useState('')
  const [mortgageType, setMortgageType] = useState<MortgageType>('conventional')
  const [rateType, setRateType] = useState<'fixed' | 'variable'>('fixed')
  const [rate, setRate] = useState('')
  const [fixedPeriod, setFixedPeriod] = useState<FixedPeriod | ''>('')

  const [saveError, setSaveError] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (!saveError) return
    const t = setTimeout(() => setSaveError(null), 3000)
    return () => clearTimeout(t)
  }, [saveError])

  const { data: clientsData } = useClients({ page_size: 100, status: 'active' })
  const { data: selectedClientData } = useClient(selectedClientId)
  const { data: banks } = useBanks()
  const createCaseMutation = useCreateCase()

  // Filter to only active clients (eligibility is validated on client side panel)
  const activeClients = (clientsData?.items || []).filter(c => c.status === 'active')

  // Sanitize amount input
  const sanitizeAmount = (value: string): string => {
    const cleaned = value.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('')
    return cleaned
  }

  const handleCreate = async () => {
    setSaveError(null)

    const errors: string[] = []

    // Client validation
    if (!selectedClientId) {
      errors.push('Client is required')
    }

    // Bank validation
    if (!bank.trim()) {
      errors.push('Please select a bank')
    }

    // Rate validation
    if (!rate) {
      errors.push('Interest rate is required')
    } else {
      const rateNum = parseFloat(rate)
      if (isNaN(rateNum) || rateNum <= 0) {
        errors.push('Invalid rate (must be a positive number)')
      } else if (rateNum < 0.1) {
        errors.push('Rate must be at least 0.1%')
      } else if (rateNum > 20) {
        errors.push('Rate cannot exceed 20%')
      }
    }

    // Fixed period validation (only if rate type is fixed)
    if (rateType === 'fixed' && !fixedPeriod) {
      errors.push('Fixed period is required for fixed rate')
    }

    if (errors.length > 0) {
      setSaveError(errors[0])
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    try {
      // Use client's property/loan data for the case
      await createCaseMutation.mutateAsync({
        client_id: selectedClientId!,
        case_type: caseType,
        property_category: selectedClientData?.property_category || propertyCategory,
        property_type: selectedClientData?.property_type || 'ready',
        emirate: selectedClientData?.emirate || 'dubai',
        transaction_type: selectedClientData?.transaction_type || 'primary_purchase',
        property_value: selectedClientData?.property_value || '',
        loan_amount: selectedClientData?.loan_amount || '',
        developer: selectedClientData?.developer || undefined,
        is_first_property: selectedClientData?.is_first_property ?? true,
        tenure_years: selectedClientData?.tenure_years || 20,
        tenure_months: selectedClientData?.tenure_months || 0,
        bank: bank.trim(),
        mortgage_type: mortgageType,
        rate_type: rateType,
        rate: rate,
        fixed_period: fixedPeriod || undefined,
      })
      clientToast.caseCreated()
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to create case')
    }
  }

  const isPending = createCaseMutation.isPending

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">New Case</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        {saveError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {saveError}
          </div>
        )}
      </div>

      {/* Form Content */}
      <div ref={formRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Deal Information */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Deal Information</h3>
          <FormField label="Select Client *">
            <SearchableSelect
              value={selectedClientId || ''}
              onChange={(val) => setSelectedClientId(val || null)}
              options={activeClients.map(client => ({
                value: client.id,
                label: `${client.name} - ${client.phone}`,
              }))}
              placeholder="Select a client"
              searchPlaceholder="Search client..."
              disabled={!!preselectedClientId}
            />
          </FormField>

          {/* Case Type Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCaseType('fully_packaged')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                caseType === 'fully_packaged'
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              Fully Packaged
            </button>
            <button
              type="button"
              onClick={() => setCaseType('assisted')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                caseType === 'assisted'
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              Assisted
            </button>
          </div>
        </div>

        {/* Bank Product */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bank Product</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Bank *">
              <BankDropdown value={bank} onChange={setBank} banks={banks} />
            </FormField>
            <FormField label="Mortgage Type *">
              <SearchableSelect
                value={mortgageType}
                onChange={(val) => setMortgageType(val as MortgageType)}
                options={Object.entries(MORTGAGE_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                hideSearch
              />
            </FormField>
            <FormField label="Rate Type *">
              <SearchableSelect
                value={rateType}
                onChange={(val) => setRateType(val as 'fixed' | 'variable')}
                options={[
                  { value: 'fixed', label: 'Fixed' },
                  { value: 'variable', label: 'Variable' },
                ]}
                hideSearch
              />
            </FormField>
            <FormField label="Rate (%) *">
              <input
                type="text"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(sanitizeAmount(e.target.value))}
                placeholder="e.g., 4.99"
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]"
              />
            </FormField>
            {rateType === 'fixed' && (
              <FormField label="Fixed Period">
                <SearchableSelect
                  value={fixedPeriod}
                  onChange={(val) => setFixedPeriod(val as FixedPeriod | '')}
                  options={[
                    { value: '', label: 'Select period...' },
                    ...Object.entries(FIXED_PERIOD_LABELS).map(([value, label]) => ({ value, label })),
                  ]}
                  hideSearch
                />
              </FormField>
            )}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
        <button
          onClick={handleCreate}
          disabled={isPending}
          className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Creating...</>
          ) : (
            'Create Case'
          )}
        </button>
      </div>
    </>
  )
}

function EditCaseContent({ caseData, onClose }: { caseData: CaseData; onClose: () => void }) {
  const { can } = useAuth()

  // Permission check based on IAM
  const canEdit = can('update', 'cases')

  // Tab state
  const [activeTab, setActiveTab] = useState<CaseTabType>('details')

  // Client side panel state
  const [showClientPanel, setShowClientPanel] = useState(false)

  // Case type fields
  const [caseType, setCaseType] = useState<CaseTypeValue>(caseData.case_type || 'fully_packaged')

  // Bank fields
  const [bank, setBank] = useState(caseData.bank || '')
  const [mortgageType, setMortgageType] = useState<MortgageType>(caseData.mortgage_type || 'conventional')
  const [rateType, setRateType] = useState(caseData.rate_type || 'fixed')
  const [rate, setRate] = useState(caseData.rate || '')
  const [fixedPeriod, setFixedPeriod] = useState<FixedPeriod | ''>(caseData.fixed_period || '')

  const [saveError, setSaveError] = useState<string | null>(null)
  const [_hasChanges, _setHasChanges] = useState(false)

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (!saveError) return
    const t = setTimeout(() => setSaveError(null), 3000)
    return () => clearTimeout(t)
  }, [saveError])

  const { data: banks } = useBanks()
  const updateMutation = useUpdateCase()
  const changeStageMutation = useChangeCaseStage()

  const isTerminal = isTerminalStage(caseData.stage)

  // Get Stage SLA status
  const stageSLA = caseData.stage_sla_status

  // Sanitize amount input
  const sanitizeAmount = (value: string): string => {
    const cleaned = value.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('')
    return cleaned
  }

  // Track changes
  useEffect(() => {
    const changed =
      caseType !== (caseData.case_type || 'fully_packaged') ||
      bank !== (caseData.bank || '') ||
      mortgageType !== (caseData.mortgage_type || 'conventional') ||
      rateType !== (caseData.rate_type || 'fixed') ||
      rate !== (caseData.rate || '') ||
      fixedPeriod !== (caseData.fixed_period || '')
    _setHasChanges(changed)
  }, [caseType, bank, mortgageType, rateType, rate, fixedPeriod, caseData])

  const handleSave = async () => {
    setSaveError(null)

    const errors: string[] = []

    // Bank validation
    if (!bank.trim()) {
      errors.push('Please select a bank')
    }

    // Rate validation
    if (!rate) {
      errors.push('Interest rate is required')
    } else {
      const rateNum = parseFloat(rate)
      if (isNaN(rateNum) || rateNum <= 0) {
        errors.push('Invalid rate (must be a positive number)')
      } else if (rateNum < 0.1) {
        errors.push('Rate must be at least 0.1%')
      } else if (rateNum > 20) {
        errors.push('Rate cannot exceed 20%')
      }
    }

    // Fixed period validation (only if rate type is fixed)
    if (rateType === 'fixed' && !fixedPeriod) {
      errors.push('Fixed period is required for fixed rate')
    }

    if (errors.length > 0) {
      setSaveError(errors[0])
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: caseData.id,
        data: {
          case_type: caseType,
          bank: bank || undefined,
          mortgage_type: mortgageType,
          rate_type: rateType,
          rate: rate || undefined,
          fixed_period: fixedPeriod || undefined,
        },
      })
      // Panel stays open after save so user can continue editing
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save case')
    }
  }

  const handleStageChange = async (newStage: CaseStage) => {
    try {
      await changeStageMutation.mutateAsync({ id: caseData.id, stage: newStage })
      caseToast.stageChanged(newStage)
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to change stage')
    }
  }

  const isPending = updateMutation.isPending

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Case #{caseData.id.slice(0, 8).toUpperCase()}
            </h2>
            {isTerminal || !canEdit ? (
              <span className={cn('px-2 py-0.5 text-xs font-medium rounded', stageColors[caseData.stage])}>
                {getStageLabel(caseData.stage)}
              </span>
            ) : (
              <StageDropdown
                stage={caseData.stage}
                onChange={handleStageChange}
                isLoading={changeStageMutation.isPending}
              />
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stage SLA Countdown - Near top of panel */}
        {stageSLA && stageSLA.status !== 'no_sla' && (
          <div className="mt-3">
            <SLACountdown
              status={stageSLA.status as SLAStatusValue}
              remainingHours={stageSLA.remaining_hours}
              displayText={stageSLA.display}
              label="Stage SLA"
              stageName={stageSLA.stage_name || CASE_STAGE_LABELS[caseData.stage]}
              size="sm"
            />
          </div>
        )}

        {saveError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {saveError}
          </div>
        )}

        {/* Tabs */}
        <div className="mt-4">
          <SidePanelTabs tabs={CASE_TABS} value={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      {/* Details Tab Content */}
      {activeTab === 'details' && (
        <>
          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Deal Information */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Deal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Client">
                  <button onClick={() => setShowClientPanel(true)} className="text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 cursor-pointer rounded px-3 py-1 -mx-3 -my-1 transition-colors">
                    {caseData.client.name}
                  </button>
                </FormField>
                <FormField label="Application Type">
                  <div className="text-sm text-gray-900">{APPLICATION_TYPE_LABELS[caseData.application_type]}</div>
                </FormField>
              </div>

              {/* Case Type Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => !isTerminal && setCaseType('fully_packaged')}
                  disabled={isTerminal}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                    caseType === 'fully_packaged'
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    isTerminal && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  Fully Packaged
                </button>
                <button
                  type="button"
                  onClick={() => !isTerminal && setCaseType('assisted')}
                  disabled={isTerminal}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                    caseType === 'assisted'
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    isTerminal && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  Assisted
                </button>
              </div>
            </div>

            {/* Bank Product */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bank Product</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Bank *">
                  <BankDropdown value={bank} onChange={setBank} banks={banks} disabled={isTerminal} />
                </FormField>
                <FormField label="Mortgage Type *">
                  <SearchableSelect
                    value={mortgageType}
                    onChange={(val) => setMortgageType(val as MortgageType)}
                    options={Object.entries(MORTGAGE_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                    disabled={isTerminal}
                    hideSearch
                  />
                </FormField>
                <FormField label="Rate Type *">
                  <SearchableSelect
                    value={rateType}
                    onChange={(val) => setRateType(val as 'fixed' | 'variable')}
                    options={[
                      { value: 'fixed', label: 'Fixed' },
                      { value: 'variable', label: 'Variable' },
                    ]}
                    disabled={isTerminal}
                    hideSearch
                  />
                </FormField>
                <FormField label="Rate (%) *">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rate}
                    onChange={(e) => setRate(sanitizeAmount(e.target.value))}
                    disabled={isTerminal}
                    placeholder="e.g., 4.99"
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f] disabled:opacity-50"
                  />
                </FormField>
                {rateType === 'fixed' && (
                  <FormField label="Fixed Period">
                    <SearchableSelect
                      value={fixedPeriod}
                      onChange={(val) => setFixedPeriod(val as FixedPeriod | '')}
                      options={[
                        { value: '', label: 'Select period...' },
                        ...Object.entries(FIXED_PERIOD_LABELS).map(([value, label]) => ({ value, label })),
                      ]}
                      disabled={isTerminal}
                      hideSearch
                    />
                  </FormField>
                )}
              </div>
            </div>

          </div>

          {/* Footer */}
          {!isTerminal && canEdit && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Documents Tab Content */}
      {activeTab === 'documents' && (
        <div className="flex-1 overflow-y-auto p-6">
          <CaseDocumentTab caseId={caseData.id} />
        </div>
      )}

      {/* Activity Tab Content */}
      {activeTab === 'activity' && (
        <div className="flex-1 overflow-y-auto p-6">
          <ActivityTimeline recordType="case" recordId={caseData.id} />
        </div>
      )}

      {/* Client Side Panel */}
      {showClientPanel && (
        <ClientSidePanel
          clientId={caseData.client.id}
          onClose={() => setShowClientPanel(false)}
          hideCreateCase
        />
      )}
    </>
  )
}

function StageDropdown({
  stage,
  onChange,
  isLoading,
  disabled
}: {
  stage: CaseStage
  onChange: (stage: CaseStage) => void
  isLoading: boolean
  disabled?: boolean
}) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingStage, setPendingStage] = useState<CaseStage | null>(null)

  const stageOptions = [
    ...CASE_STAGES.active.map(s => ({ value: s.value, label: s.label, group: 'Active Stages' })),
    ...CASE_STAGES.query.map(s => ({ value: s.value, label: s.label, group: 'Queries' })),
    ...CASE_STAGES.hold.map(s => ({ value: s.value, label: s.label, group: 'Hold' })),
    ...CASE_STAGES.terminal.map(s => ({ value: s.value, label: s.label, group: 'Terminal' })),
  ]

  const handleChange = (newStage: string) => {
    const castStage = newStage as CaseStage
    if (isTerminalStage(castStage)) {
      setPendingStage(castStage)
      setShowConfirmation(true)
    } else {
      onChange(castStage)
    }
  }

  const confirmChange = () => {
    if (pendingStage) {
      onChange(pendingStage)
      setShowConfirmation(false)
      setPendingStage(null)
    }
  }

  const cancelChange = () => {
    setShowConfirmation(false)
    setPendingStage(null)
  }

  return (
    <>
      <div className={cn('rounded', stageColors[stage])}>
        <SearchableSelect
          value={stage}
          onChange={handleChange}
          options={stageOptions}
          disabled={isLoading || disabled}
          searchPlaceholder="Search stage..."
          size="sm"
          className={cn('border-0 font-medium', stageColors[stage])}
        />
      </div>

      {/* Terminal Stage Confirmation Modal */}
      {showConfirmation && pendingStage && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60]" onClick={cancelChange} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] bg-white z-[60] shadow-xl rounded-xl">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Confirm Stage Change</h3>
              <p className="text-xs text-gray-500 mt-1">
                You are about to move this case to: <strong>{getStageLabel(pendingStage)}</strong>
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
                onClick={cancelChange}
                className="flex-1 px-4 py-2 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmChange}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? (
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
    </>
  )
}
