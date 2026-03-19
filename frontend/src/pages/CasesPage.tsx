/**
 * CasesPage - Displays a paginated table of mortgage cases with filtering.
 * Supports URL state for filters to enable deep linking.
 */

import { useState, useCallback } from 'react'
import { Trash2, User } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
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
import { SearchableSelect } from '@/components/ui/SearchableSelect'
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
import { formatCurrencyAED } from '@/lib/formatters'
import { formatDate } from '@/lib/dateUtils'

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
  start_date: '',
  end_date: '',
}

function BankFilterDropdown({ value, onChange, banks }: {
  value: string
  onChange: (value: string) => void
  banks: Array<{ id: string; name: string; icon: string }> | undefined
}) {
  const bankOptions = [
    { value: '', label: 'All Banks' },
    ...(banks || []).map(bank => ({
      value: bank.id,
      label: bank.name,
      icon: bank.icon ? (
        <div className="h-4 w-4 rounded bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
          <img src={bank.icon} alt="" className="h-3 w-3 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      ) : undefined,
    })),
  ]

  return (
    <div className="min-w-[150px]">
      <SearchableSelect
        value={value}
        onChange={onChange}
        options={bankOptions}
        placeholder="All Banks"
        searchPlaceholder="Search bank..."
        size="sm"
      />
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
  const [pendingDelete, setPendingDelete] = useState<CaseListItem | null>(null)

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
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined,
  })

  const { data: banks } = useBanks()

  const cases = data?.items || []
  const totalItems = data?.total || 0
  const totalPages = data?.total_pages || 1

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMutation.mutateAsync(pendingDelete.id)
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to delete case')
    } finally {
      setPendingDelete(null)
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
          <div className="min-w-[160px]">
            <SearchableSelect
              value={stageFilter}
              onChange={(value) => setFilters({ stage: value, page: '1' })}
              options={[
                { value: 'all', label: 'All Stages' },
                ...CASE_STAGES.active.map(s => ({ value: s.value, label: s.label, group: 'Active Stages' })),
                ...CASE_STAGES.hold.map(s => ({ value: s.value, label: s.label, group: 'Hold' })),
                ...CASE_STAGES.terminal.map(s => ({ value: s.value, label: s.label, group: 'Terminal' })),
              ]}
              placeholder="All Stages"
              searchPlaceholder="Search stage..."
              size="sm"
            />
          </div>
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
                    <span className="text-xs text-gray-500">{formatDate(caseItem.created_at)}</span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedClientId(caseItem.client.id) }} className="p-1 text-gray-400 hover:text-[#1e3a5f] hover:bg-gray-100 rounded transition-colors" title="View client">
                        <User className="h-3.5 w-3.5" />
                      </button>
                      {canDelete && (
                        <button onClick={(e) => { e.stopPropagation(); setPendingDelete(caseItem) }} className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors">
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

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete Case"
        message={`Are you sure you want to delete this case for ${pendingDelete?.client.name}?`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </TablePageLayout>
  )
}
