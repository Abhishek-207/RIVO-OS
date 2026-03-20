/**
 * Leads Page Component.
 * Displays leads in a table with search, status tabs, and side panel for details.
 */

import { useState, useCallback } from 'react'
import { useLeads } from '@/hooks/useLeads'
import { useSourcesForFilter } from '@/hooks/useChannels'
import { useUrlFilters } from '@/hooks/useUrlState'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { LeadSidePanel } from '@/components/LeadSidePanel'
import { Pagination } from '@/components/Pagination'
import {
  TablePageLayout,
  TableCard,
  TableContainer,
  PageError,
  PageHeader,
  StatusTabs,
  SearchInput,
} from '@/components/ui/TablePageLayout'
import { TableRowsSkeleton } from '@/components/ui/Skeleton'
import { formatDate, formatTimeAgo } from '@/lib/formatters'
import type { LeadListItem, LeadStatus } from '@/types/mortgage'
import { cn } from '@/lib/utils'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const PAGE_SIZE = 10

const STATUS_TABS = [
  { value: 'all' as const, label: 'All' },
  { value: 'active' as const, label: 'Active' },
  { value: 'declined' as const, label: 'Declined' },
]

const DEFAULT_FILTERS = {
  status: 'all',
  search: '',
  page: '1',
  source: '',
  channel_id: '',
}

export function LeadsPage() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS)

  const handleSearchChange = useCallback((value: string) => {
    setFilters({ search: value, page: '1' })
  }, [setFilters])

  const { inputValue, setInputValue } = useDebouncedSearch({
    initialValue: filters.search,
    onSearch: handleSearchChange,
  })

  const currentPage = parseInt(filters.page, 10) || 1
  const statusFilter = filters.status as LeadStatus | 'all'
  const sourceFilter = filters.source || ''

  const { data: sources } = useSourcesForFilter('untrusted')

  const { data, isLoading, error } = useLeads({
    page: currentPage,
    page_size: PAGE_SIZE,
    search: filters.search,
    status: statusFilter,
    source_id: sourceFilter || undefined,
    channel_id: filters.channel_id || undefined,
  })

  const leads = data?.items || []
  const totalItems = data?.total || 0
  const totalPages = data?.total_pages || 1

  const getSourceDisplay = (lead: LeadListItem) => {
    if (!lead.source) return '-'
    const { name, channel_name } = lead.source
    return name && channel_name ? `${name} (${channel_name})` : name || channel_name || '-'
  }

  const getSlaDisplay = (slaDisplay: string | null) => {
    if (!slaDisplay) return null
    const lower = slaDisplay.toLowerCase()
    if (lower === 'completed') return null
    if (lower.includes('overdue')) return { text: slaDisplay, status: 'overdue' as const }
    return { text: slaDisplay, status: 'remaining' as const }
  }

  if (error) return <PageError entityName="leads" message={error.message} />

  return (
    <TablePageLayout>
      <div className="px-6 py-4">
        <PageHeader title="Leads" subtitle="Manage and convert incoming leads" />

        <div className="flex items-center gap-4 mt-4">
          <SearchInput
            value={inputValue}
            onChange={setInputValue}
            placeholder="Search leads..."
          />
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

      <TableCard>
        <TableContainer isEmpty={!isLoading && leads.length === 0} emptyMessage="No leads found">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-[28%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="w-[30%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Source</th>
                <th className="w-[21%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                <th className="w-[21%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <TableRowsSkeleton rows={8} columns={4} /> : leads.map((lead) => {
                const sla = getSlaDisplay(lead.sla_display)
                return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3">
                      <div>
                        <span className="text-xs font-medium text-gray-900 block">{lead.name}</span>
                        {sla && (
                          <span className={cn(
                            'text-[10px]',
                            sla.status === 'overdue' ? 'text-red-600' : 'text-gray-500'
                          )}>
                            {sla.text}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-gray-600 truncate block" title={getSourceDisplay(lead)}>
                        {getSourceDisplay(lead)}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-gray-500">{formatDate(lead.created_at)}</span>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-gray-500">{formatTimeAgo(lead.updated_at)}</span>
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
          itemLabel="leads"
        />}
      </TableCard>

      {selectedLeadId && (
        <LeadSidePanel leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      )}
    </TablePageLayout>
  )
}
