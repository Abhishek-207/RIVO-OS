/**
 * CasesPage - Displays a paginated table of mortgage cases with filtering.
 * Supports URL state for filters to enable deep linking.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Trash2, ChevronDown, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useCases,
  useBanks,
  useDeleteCase,
  CASE_STAGES,
  getStageLabel,
} from '@/hooks/useCases'
import { useUrlFilters } from '@/hooks/useUrlState'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import type { CaseStage, CaseListItem } from '@/types/mortgage'
import { CaseSidePanel } from '@/components/CaseSidePanel'
import { ClientSidePanel } from '@/components/ClientSidePanel'
import { Pagination } from '@/components/Pagination'
import {
  TablePageLayout,
  TableCard,
  TableContainer,
  PageLoading,
  PageError,
  StatusErrorToast,
  PageHeader,
  SearchInput,
} from '@/components/ui/TablePageLayout'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrencyAED, formatDateAE } from '@/lib/formatters'

const stageColors: Record<CaseStage, string> = {
  // Active stages (main flow)
  processing: 'bg-blue-50 text-blue-700',
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

const PAGE_SIZE = 10

const DEFAULT_FILTERS = {
  stage: 'all',
  bank: '',
  search: '',
  page: '1',
  channel: '',
  source: '',
  sla_status: '',
}

function BankFilterDropdown({ value, onChange, banks }: {
  value: string
  onChange: (value: string) => void
  banks: Array<{ id: string; name: string; icon: string }> | undefined
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedBank = banks?.find(b => b.id === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-3 text-xs border border-gray-200 rounded-lg bg-white flex items-center gap-2 min-w-[140px]"
      >
        {selectedBank ? (
          <span className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src={selectedBank.icon} alt="" className="h-3 w-3 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <span className="text-gray-700 truncate max-w-[80px]">{selectedBank.name}</span>
          </span>
        ) : (
          <span className="text-gray-700">All Banks</span>
        )}
        <ChevronDown className={cn('h-3 w-3 text-gray-400 ml-auto transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-30 w-56 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(''); setIsOpen(false) }}
            className={cn('w-full px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors', !value && 'bg-blue-50')}
          >
            <span className="text-gray-700">All Banks</span>
          </button>
          {banks?.map(bank => (
            <button
              key={bank.id}
              type="button"
              onClick={() => { onChange(bank.id); setIsOpen(false) }}
              className={cn('w-full px-3 py-2 text-xs text-left flex items-center gap-2 hover:bg-gray-50 transition-colors', value === bank.id && 'bg-blue-50')}
            >
              <div className="h-5 w-5 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img src={bank.icon} alt="" className="h-4 w-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
              <span className="text-gray-700">{bank.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function CasesPage() {
  const { can } = useAuth()
  const canCreateDirect = can('update', 'cases')  // Only those who can edit can create directly
  const canDelete = can('delete', 'cases')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  const deleteMutation = useDeleteCase()
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS)

  const handleSearchChange = useCallback((value: string) => {
    setFilters({ search: value, page: '1' })
  }, [setFilters])

  const { inputValue, setInputValue } = useDebouncedSearch({
    initialValue: filters.search,
    onSearch: handleSearchChange,
  })

  const currentPage = parseInt(filters.page, 10) || 1
  const stageFilter = filters.stage as CaseStage | 'all'
  const bankFilter = filters.bank

  const { data, isLoading, error } = useCases({
    page: currentPage,
    page_size: PAGE_SIZE,
    search: filters.search,
    stage: stageFilter,
    bank: bankFilter || undefined,
    channel: filters.channel || undefined,
    source: filters.source || undefined,
    sla_status: filters.sla_status || undefined,
  })

  const { data: banks } = useBanks()

  const cases = data?.items || []
  const totalItems = data?.total || 0
  const totalPages = data?.total_pages || 1

  const handleDelete = async (caseItem: CaseListItem) => {
    if (window.confirm(`Are you sure you want to delete this case?`)) {
      try {
        await deleteMutation.mutateAsync(caseItem.id)
      } catch (err) {
        setStatusError(err instanceof Error ? err.message : 'Failed to delete case')
      }
    }
  }

  if (isLoading) return <PageLoading />
  if (error) return <PageError entityName="cases" message={error.message} />

  return (
    <TablePageLayout>
      <div className="px-6 py-4">
        <PageHeader
          title="Cases"
          subtitle="Track and manage mortgage cases"
          actionLabel="New Case"
          onAction={() => { setSelectedCaseId('new'); setSidePanelOpen(true) }}
          hideAction={!canCreateDirect}
        />

        <div className="flex items-center gap-3 mt-4">
          <SearchInput
            value={inputValue}
            onChange={setInputValue}
            placeholder="Search by client name..."
          />
          <BankFilterDropdown value={bankFilter} onChange={(value) => setFilters({ bank: value, page: '1' })} banks={banks} />
          <select
            value={stageFilter}
            onChange={(e) => setFilters({ stage: e.target.value, page: '1' })}
            className="h-8 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white"
          >
            <option value="all">All Stages</option>
            <optgroup label="Active Stages">
              {CASE_STAGES.active.map((stage) => (
                <option key={stage.value} value={stage.value}>{stage.label}</option>
              ))}
            </optgroup>
            <optgroup label="Hold">
              {CASE_STAGES.hold.map((stage) => (
                <option key={stage.value} value={stage.value}>{stage.label}</option>
              ))}
            </optgroup>
            <optgroup label="Terminal">
              {CASE_STAGES.terminal.map((stage) => (
                <option key={stage.value} value={stage.value}>{stage.label}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {statusError && <StatusErrorToast message={statusError} onClose={() => setStatusError(null)} />}

      <TableCard>
        <TableContainer isEmpty={cases.length === 0} emptyMessage="No cases found">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-[16%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Bank</th>
                <th className="w-[20%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Client</th>
                <th className="w-[18%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Stage</th>
                <th className="w-[16%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Loan Amount</th>
                <th className="w-[16%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created At</th>
                <th className="w-[14%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((caseItem) => (
                <tr
                  key={caseItem.id}
                  onClick={() => { setSelectedCaseId(caseItem.id); setSidePanelOpen(true) }}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <td className="py-3">
                    {caseItem.bank ? (
                      <span className="flex items-center gap-2">
                        {(() => {
                          const bankData = banks?.find(b => b.name === caseItem.bank)
                          return bankData?.icon ? (
                            <div className="h-5 w-5 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              <img src={bankData.icon} alt="" className="h-4 w-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            </div>
                          ) : null
                        })()}
                        <span className="text-xs text-gray-600">{caseItem.bank}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div>
                      <span className="text-xs font-medium text-gray-900 block">{caseItem.client.name}</span>
                      {caseItem.stage_sla_status && caseItem.stage_sla_status.status !== 'completed' && (
                        <span className={cn(
                          'text-[10px]',
                          caseItem.stage_sla_status.status === 'overdue' ? 'text-red-600' :
                          caseItem.stage_sla_status.status === 'warning' ? 'text-amber-600' : 'text-gray-500'
                        )}>
                          {caseItem.stage_sla_status.display}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', stageColors[caseItem.stage])}>
                      {getStageLabel(caseItem.stage)}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-gray-600">{formatCurrencyAED(caseItem.loan_amount)}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-gray-500">{formatDateAE(caseItem.created_at)}</span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedClientId(caseItem.client.id) }} className="p-1 text-gray-400 hover:text-[#1e3a5f] hover:bg-gray-100 rounded transition-colors" title="View client">
                        <User className="h-3.5 w-3.5" />
                      </button>
                      {canDelete && (
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(caseItem) }} className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={(page) => setFilters({ page: String(page) })}
          itemLabel="cases"
        />
      </TableCard>

      <CaseSidePanel caseId={selectedCaseId} isOpen={sidePanelOpen} onClose={() => { setSidePanelOpen(false); setSelectedCaseId(null) }} />
      {selectedClientId && <ClientSidePanel clientId={selectedClientId} onClose={() => setSelectedClientId(null)} hideCreateCase />}
    </TablePageLayout>
  )
}
