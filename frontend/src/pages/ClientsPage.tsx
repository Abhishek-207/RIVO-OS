/**
 * ClientsPage - List and manage mortgage clients.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Trash2, Briefcase } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useClients, useDeleteClient } from '@/hooks/useClients'
import { useBanks } from '@/hooks/useCases'
import { useSourcesForFilter } from '@/hooks/useChannels'
import { useUrlFilters } from '@/hooks/useUrlState'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { useAuth } from '@/contexts/AuthContext'
import type { ClientListItem, ClientStatus, ClientCaseSummary } from '@/types/mortgage'
import { CASE_STAGE_LABELS } from '@/types/mortgage'
import { ClientSidePanel } from '@/components/ClientSidePanel'
import { CaseSidePanel } from '@/components/CaseSidePanel'
import { Pagination } from '@/components/Pagination'
import {
  TablePageLayout,
  TableCard,
  TableContainer,
  PageError,
  StatusErrorToast,
  PageHeader,
  StatusTabs,
  SearchInput,
} from '@/components/ui/TablePageLayout'
import { TableRowsSkeleton } from '@/components/ui/Skeleton'
import { formatDate, formatTimeAgo, formatDbr, getDbrColorClass } from '@/lib/formatters'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

const STATUS_TABS = [
  { value: 'all' as const, label: 'All' },
  { value: 'active' as const, label: 'Active' },
  { value: 'declined' as const, label: 'Declined' },
  { value: 'not_proceeding' as const, label: 'Not Proceeding' },
]

function CaseDropdown({ cases, onSelect, banks }: {
  cases: ClientCaseSummary[]
  onSelect: (caseId: string) => void
  banks: Array<{ id: string; name: string; icon: string }> | undefined
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (cases.length === 1) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(cases[0].id) }}
        className="p-1 text-gray-400 hover:text-[#1e3a5f] hover:bg-gray-100 rounded transition-colors"
        title="View case"
      >
        <Briefcase className="h-3.5 w-3.5" />
      </button>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen) }}
        className="p-1 text-gray-400 hover:text-[#1e3a5f] hover:bg-gray-100 rounded transition-colors"
        title="View cases"
      >
        <Briefcase className="h-3.5 w-3.5" />
      </button>
      {isOpen && (
        <div
          className="fixed z-50 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          style={{
            top: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().bottom + 4 : 0,
            left: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().right - 224 : 0,
          }}
        >
          <div className="py-1 max-h-48 overflow-y-auto">
            {cases.map((c) => {
              const bankData = banks?.find(b => b.name === c.bank)
              return (
                <button
                  key={c.id}
                  onClick={(e) => { e.stopPropagation(); onSelect(c.id); setIsOpen(false) }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  {bankData?.icon && (
                    <div className="h-5 w-5 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img src={bankData.icon} alt="" className="h-4 w-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900">{c.bank}</div>
                    <div className="text-[10px] text-gray-500">
                      {CASE_STAGE_LABELS[c.stage]} • AED {parseFloat(c.loan_amount).toLocaleString()}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const CLIENT_DEFAULT_FILTERS = {
  status: 'all',
  search: '',
  page: '1',
  source: '',
  channel_id: '',
  start_date: '',
  end_date: '',
}

export function ClientsPage() {
  const { can } = useAuth()
  const canCreate = can('create', 'clients')
  const canDelete = can('delete', 'clients')
  const [statusError, setStatusError] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ClientListItem | null>(null)

  const [filters, setFilters] = useUrlFilters(CLIENT_DEFAULT_FILTERS)

  const handleSearchChange = useCallback((value: string) => {
    setFilters({ search: value, page: '1' })
  }, [setFilters])

  const { inputValue, setInputValue } = useDebouncedSearch({
    initialValue: filters.search,
    onSearch: handleSearchChange,
  })

  const currentPage = parseInt(filters.page, 10) || 1
  const statusFilter = filters.status as ClientStatus | 'all'
  const sourceFilter = filters.source || ''

  const { data: banks } = useBanks()
  const { data: sources } = useSourcesForFilter('all')
  const deleteMutation = useDeleteClient()

  const { data, isLoading, error } = useClients({
    page: currentPage,
    page_size: PAGE_SIZE,
    search: filters.search,
    status: statusFilter,
    source_id: sourceFilter || undefined,
    channel_id: filters.channel_id || undefined,
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined,
  })

  const clients = data?.items || []
  const totalItems = data?.total || 0
  const totalPages = data?.total_pages || 1

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMutation.mutateAsync(pendingDelete.id)
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to delete client')
    } finally {
      setPendingDelete(null)
    }
  }

  if (error) return <PageError entityName="clients" message={error.message} />

  return (
    <TablePageLayout>
      <div className="px-6 py-4">
        <PageHeader
          title="Clients"
          subtitle="Manage mortgage applicants and their eligibility"
          actionLabel="New Client"
          onAction={() => setSelectedClientId('new')}
          hideAction={!canCreate}
        />

        <div className="flex items-center gap-4 mt-4">
          <SearchInput value={inputValue} onChange={setInputValue} placeholder="Search clients..." />
          <StatusTabs
            tabs={STATUS_TABS}
            value={statusFilter}
            onChange={(value) => setFilters({ status: value, page: '1' })}
          />
          <div className="min-w-[260px]">
            <SearchableSelect
              value={sourceFilter}
              onChange={(value) => setFilters({ source: value, page: '1' })}
              options={[
                { value: '', label: 'All Sources' },
                ...(sources?.map(s => ({ value: s.id, label: `${s.name} (${s.channelName})` })) || []),
              ]}
              placeholder="All Sources"
              searchPlaceholder="Search source..."
              size="sm"
            />
          </div>
        </div>
      </div>

      {statusError && <StatusErrorToast message={statusError} onClose={() => setStatusError(null)} />}

      <TableCard>
        <TableContainer isEmpty={!isLoading && clients.length === 0} emptyMessage="No clients found">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-[22%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="w-[20%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Source</th>
                <th className="w-[14%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">DBR</th>
                <th className="w-[14%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                <th className="w-[14%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Last Activity</th>
                <th className="w-[16%] text-right pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <TableRowsSkeleton rows={8} columns={6} /> : clients.map((client) => {
                const sla = client.first_contact_sla_status || client.client_to_case_sla_status
                return (
                  <tr
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3">
                      <div>
                        <span className="text-xs font-medium text-gray-900 block">{client.name}</span>
                        {sla && sla.status !== 'completed' && (
                          <span className={cn(
                            'text-[10px]',
                            sla.status === 'overdue' ? 'text-red-600' : 'text-gray-500'
                          )}>
                            {sla.display}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-gray-500 truncate block max-w-[180px]">
                        {client.source ? `${client.source.name} (${client.source.channel_name})` : '-'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={cn('text-xs font-medium', getDbrColorClass(client.dbr_percentage))}>
                        {formatDbr(client.dbr_percentage)}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-gray-500">{formatDate(client.created_at)}</span>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-gray-500">{formatTimeAgo(client.updated_at)}</span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {client.active_case_id && client.active_case_id.length > 0 && (
                          <CaseDropdown cases={client.active_case_id} onSelect={setSelectedCaseId} banks={banks} />
                        )}
                        {canDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setPendingDelete(client) }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableContainer>

        {!isLoading && <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={(page) => setFilters({ page: String(page) })}
          itemLabel="clients"
        />}
      </TableCard>

      {selectedClientId && <ClientSidePanel clientId={selectedClientId} onClose={() => setSelectedClientId(null)} />}
      {selectedCaseId && <CaseSidePanel caseId={selectedCaseId} isOpen={!!selectedCaseId} onClose={() => setSelectedCaseId(null)} />}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete Client"
        message={`Are you sure you want to delete ${pendingDelete?.name}?`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </TablePageLayout>
  )
}
