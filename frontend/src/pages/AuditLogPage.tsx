import { useState } from 'react'
import { Loader2, AlertCircle, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react'
import { useAuditLogs } from '@/hooks/useAudit'
import { Pagination } from '@/components/Pagination'
import {
  TablePageLayout,
  TableCard,
  TableContainer,
} from '@/components/ui/TablePageLayout'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/dateUtils'
import type { AuditAction, AuditLogQueryParams, AuditLogEntry, ChangeDisplay, ChangeDisplaySingle } from '@/types/audit'
import { AUDIT_ACTION_LABELS, TABLE_NAME_LABELS } from '@/types/audit'

function isUpdateChange(change: ChangeDisplay): change is ChangeDisplay & { old_display: string; new_display: string } {
  return 'old_display' in change && 'new_display' in change
}

function ChangesDetail({ changesDisplay, action }: { changesDisplay: Record<string, ChangeDisplay>; action: AuditAction }) {
  if (!changesDisplay || Object.keys(changesDisplay).length === 0) {
    return <span className="text-xs text-gray-400">&mdash;</span>
  }

  const entries = Object.entries(changesDisplay)

  if (entries.length === 0) {
    return <span className="text-xs text-gray-400">&mdash;</span>
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-medium text-gray-500">
          {action === 'UPDATE' ? 'Field Changes' : action === 'CREATE' ? 'Initial Values' : 'Deleted Values'}
          <span className="ml-2 text-gray-400">({entries.length} {entries.length === 1 ? 'field' : 'fields'})</span>
        </span>
      </div>

      {/* Change rows */}
      <div className="divide-y divide-gray-100">
        {entries.map(([field, change]) => {
          const fieldLabel = change.field_display || field.replace(/_/g, ' ')

          if (isUpdateChange(change)) {
            const oldDisplay = change.old_display ?? 'empty'
            const newDisplay = change.new_display ?? 'empty'
            if (oldDisplay === newDisplay) return null
            return (
              <div key={field} className="px-4 py-2.5 flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500 capitalize w-[140px] shrink-0">{fieldLabel}</span>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="text-xs text-red-600/70 bg-red-50 px-2 py-1 rounded border border-red-100 line-through truncate max-w-[220px]"
                    title={oldDisplay}
                  >
                    {oldDisplay}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  <span
                    className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100 font-medium truncate max-w-[220px]"
                    title={newDisplay}
                  >
                    {newDisplay}
                  </span>
                </div>
              </div>
            )
          }

          // CREATE/DELETE: single value
          const displayVal = (change as ChangeDisplaySingle).display ?? 'empty'
          return (
            <div key={field} className="px-4 py-2.5 flex items-center gap-3">
              <span className="text-xs font-medium text-gray-500 capitalize w-[140px] shrink-0">{fieldLabel}</span>
              <span className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                {displayVal}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const changesDisplay = entry.changes_display || {}
  const changeKeys = Object.keys(changesDisplay)
  const hasChanges = changeKeys.length > 0
  const isBulk = changeKeys.length > 3

  return (
    <>
      <tr
        className={cn(
          'border-b border-gray-50 transition-colors',
          hasChanges ? 'cursor-pointer hover:bg-gray-50/50' : ''
        )}
        onClick={() => hasChanges && setExpanded(!expanded)}
      >
        <td className="py-3 pl-3">
          {hasChanges ? (
            expanded
              ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 inline" />
              : <ChevronRight className="w-3.5 h-3.5 text-gray-400 inline" />
          ) : <span className="w-3.5 inline-block" />}
        </td>
        <td className="py-3">
          <span className="text-xs text-gray-600">{formatDateTime(entry.timestamp)}</span>
        </td>
        <td className="py-3">
          <span className="text-xs font-medium text-gray-900">{entry.user_name}</span>
        </td>
        <td className="py-3">
          <span className={cn(
            'px-2 py-0.5 text-[10px] font-medium rounded',
            entry.action === 'CREATE' ? 'bg-green-100 text-green-700' :
            entry.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
            'bg-red-100 text-red-700'
          )}>
            {AUDIT_ACTION_LABELS[entry.action]}
          </span>
        </td>
        <td className="py-3">
          <span className="text-xs text-gray-600">{TABLE_NAME_LABELS[entry.table_name] || entry.table_name}</span>
        </td>
        <td className="py-3">
          {!hasChanges ? (
            <span className="text-xs text-gray-400">&mdash;</span>
          ) : isBulk ? (
            <span className="text-xs text-gray-500">{changeKeys.length} fields changed</span>
          ) : (
            <span className="text-xs text-gray-500">
              {changeKeys.map(k => changesDisplay[k]?.field_display || k.replace(/_/g, ' ')).join(', ')}
            </span>
          )}
        </td>
      </tr>
      {expanded && hasChanges && (
        <tr className="bg-gray-50/50">
          <td colSpan={6} className="pl-10 pr-6 py-4">
            <ChangesDetail changesDisplay={changesDisplay} action={entry.action} />
          </td>
        </tr>
      )}
    </>
  )
}

export function AuditLogPage() {
  const [tableName, setTableName] = useState('')
  const [action, setAction] = useState<AuditAction | ''>('')
  const [filters, setFilters] = useState<AuditLogQueryParams>({ page: 1, page_size: 20 })

  const { data, isLoading, error } = useAuditLogs(filters)

  const handleFilterChange = (newTable: string, newAction: string) => {
    setFilters({
      ...filters,
      page: 1,
      table_name: newTable || undefined,
      action: (newAction as AuditAction) || undefined,
    })
  }

  return (
    <TablePageLayout>
      <div className="px-6 py-4">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Audit Log</h1>
          <p className="text-xs text-gray-500 mt-0.5">Track all changes across the system</p>
        </div>
      </div>

      <div className="px-6 pb-3 flex items-center gap-3">
        <select
          value={tableName}
          onChange={e => { setTableName(e.target.value); handleFilterChange(e.target.value, action) }}
          className="h-8 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white"
        >
          <option value="">All Tables</option>
          {Object.entries(TABLE_NAME_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={action}
          onChange={e => { setAction(e.target.value as AuditAction | ''); handleFilterChange(tableName, e.target.value) }}
          className="h-8 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white"
        >
          <option value="">All Actions</option>
          {Object.entries(AUDIT_ACTION_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      <TableCard>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-red-600">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span className="text-xs">Failed to load audit logs</span>
          </div>
        ) : (
          <>
            <TableContainer isEmpty={!data?.items.length} emptyMessage="No audit logs">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="w-8 pb-3" />
                    <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">When</th>
                    <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Who</th>
                    <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                    <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Table</th>
                    <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map(entry => (
                    <AuditRow key={entry.id} entry={entry} />
                  ))}
                </tbody>
              </table>
            </TableContainer>

            {data && data.total_pages > 1 && (
              <Pagination
                currentPage={data.page}
                totalPages={data.total_pages}
                totalItems={data.total}
                onPageChange={p => setFilters({ ...filters, page: p })}
                itemLabel="entries"
              />
            )}
          </>
        )}
      </TableCard>
    </TablePageLayout>
  )
}
