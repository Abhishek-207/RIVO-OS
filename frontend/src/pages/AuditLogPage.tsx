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
import type { AuditAction, AuditLogQueryParams, AuditLogEntry } from '@/types/audit'
import { AUDIT_ACTION_LABELS, TABLE_NAME_LABELS } from '@/types/audit'

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'empty'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function ChangesDetail({ changes }: { changes: Record<string, unknown> }) {
  if (!changes || Object.keys(changes).length === 0) {
    return <span className="text-xs text-gray-400">&mdash;</span>
  }

  const entries = Object.entries(changes).filter(
    ([key]) => !['updated_at', 'created_at', 'id', 'uuid'].includes(key)
  )

  if (entries.length === 0) {
    return <span className="text-xs text-gray-400">&mdash;</span>
  }

  return (
    <div className="space-y-1">
      {entries.map(([field, data]) => {
        const displayName = field.replace(/_/g, ' ')

        if (typeof data === 'object' && data !== null && 'old' in data && 'new' in data) {
          const change = data as { old: unknown; new: unknown }
          if (change.old === change.new) return null
          return (
            <div key={field} className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-500 capitalize min-w-[90px]">{displayName}</span>
              <span className="text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded line-through truncate max-w-[120px]">
                {formatValue(change.old)}
              </span>
              <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
              <span className="text-gray-700 bg-blue-50 px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]">
                {formatValue(change.new)}
              </span>
            </div>
          )
        }

        return (
          <div key={field} className="text-xs text-gray-500">
            <span className="capitalize">{displayName}</span>: {formatValue(data)}
          </div>
        )
      })}
    </div>
  )
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const changes = entry.changes || {}
  const changeKeys = Object.keys(changes).filter(
    k => !['updated_at', 'created_at', 'id', 'uuid'].includes(k)
  )
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
          <span className="text-xs text-gray-600">{formatTimestamp(entry.timestamp)}</span>
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
            <span className="text-xs text-gray-500">{changeKeys.map(k => k.replace(/_/g, ' ')).join(', ')}</span>
          )}
        </td>
      </tr>
      {expanded && hasChanges && (
        <tr className="bg-gray-50/70">
          <td colSpan={6} className="px-10 py-3">
            <ChangesDetail changes={changes} />
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