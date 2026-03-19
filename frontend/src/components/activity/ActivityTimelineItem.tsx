/**
 * ActivityTimelineItem - Displays a single activity entry in the timeline.
 * Shows expandable field-level changes when available.
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActivityTimelineEntry, FieldChange, AuditAction } from '@/types/audit'

interface ActivityTimelineItemProps {
  entry: ActivityTimelineEntry
}

function FieldChangeRow({ change, action }: { change: FieldChange; action: AuditAction }) {
  const oldVal = change.old_display || 'empty'
  const newVal = change.new_display || 'empty'
  const label = change.field_display || change.field.replace(/_/g, ' ')

  if (action === 'CREATE' || action === 'DELETE') {
    const val = action === 'CREATE' ? newVal : oldVal
    return (
      <div className="flex items-center gap-3 py-1.5">
        <span className="text-xs font-medium text-gray-500 capitalize w-[120px] shrink-0">{label}</span>
        <span className="text-xs text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{val}</span>
      </div>
    )
  }

  if (oldVal === newVal) return null

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs font-medium text-gray-500 capitalize w-[120px] shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="text-xs text-red-600/70 bg-red-50 px-2 py-0.5 rounded border border-red-100 line-through truncate max-w-[180px]"
          title={oldVal}
        >
          {oldVal}
        </span>
        <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
        <span
          className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100 font-medium truncate max-w-[180px]"
          title={newVal}
        >
          {newVal}
        </span>
      </div>
    </div>
  )
}

export function ActivityTimelineItem({ entry }: ActivityTimelineItemProps) {
  const [expanded, setExpanded] = useState(false)
  const hasChanges = entry.changes && entry.changes.length > 0

  return (
    <div>
      <div
        className={cn(
          'flex items-start gap-3 py-2 px-3 rounded-lg transition-colors',
          hasChanges
            ? 'cursor-pointer hover:bg-gray-50'
            : 'hover:bg-gray-50/50'
        )}
        onClick={() => hasChanges && setExpanded(!expanded)}
      >
        {/* Expand icon */}
        <div className="pt-1 w-4 shrink-0">
          {hasChanges && (
            expanded
              ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>

        <p className="text-sm text-gray-600 flex-1">
          <span className="font-medium text-gray-900">{entry.user_name}</span>
          {' '}
          {entry.action_summary.replace(entry.user_name, '').trim()}
        </p>
        <span className="text-xs text-gray-400 font-medium pt-0.5 shrink-0">
          {entry.time_display}
        </span>
      </div>

      {/* Expanded changes detail */}
      {expanded && hasChanges && (
        <div className="ml-10 mr-3 mb-2 rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-medium text-gray-500">
              {entry.entry_type === 'UPDATE' ? 'Field Changes' : entry.entry_type === 'CREATE' ? 'Initial Values' : 'Deleted Values'}
              <span className="ml-2 text-gray-400">
                ({entry.changes!.length} {entry.changes!.length === 1 ? 'field' : 'fields'})
              </span>
            </span>
          </div>
          <div className="px-4 divide-y divide-gray-100">
            {entry.changes!.map((change, i) => (
              <FieldChangeRow key={change.field || i} change={change} action={entry.entry_type} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
