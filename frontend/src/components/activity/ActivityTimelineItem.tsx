/**
 * ActivityTimelineItem - Displays a single activity entry in the timeline.
 * Shows who changed, when, and what values changed (old → new).
 */

import { User, FileText, StickyNote, ArrowRight, Bell, Trash2, Pencil } from 'lucide-react'
import type { ActivityTimelineEntry, FieldChange } from '@/types/audit'

interface ActivityTimelineItemProps {
  entry: ActivityTimelineEntry
}

const ACTION_ICONS: Record<string, typeof User> = {
  record: Pencil,
  note: StickyNote,
  document: FileText,
  reminder: Bell,
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-600',
  UPDATE: 'bg-blue-100 text-blue-600',
  DELETE: 'bg-red-100 text-red-600',
}

function ChangeRow({ change }: { change: FieldChange }) {
  return (
    <div className="flex items-center gap-2 text-xs py-0.5">
      <span className="text-gray-500 min-w-[80px] capitalize">{change.field_display}</span>
      <span className="text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded line-through">
        {change.old_display || 'empty'}
      </span>
      <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
      <span className="text-gray-700 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
        {change.new_display || 'empty'}
      </span>
    </div>
  )
}

export function ActivityTimelineItem({ entry }: ActivityTimelineItemProps) {
  const Icon = entry.entry_type === 'DELETE' ? Trash2 : (ACTION_ICONS[entry.action_type] || Pencil)
  const iconColor = ACTION_COLORS[entry.entry_type] || 'bg-gray-100 text-gray-500'
  const changes = entry.changes || []
  const isBulk = changes.length > 3

  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      {/* Icon */}
      <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${iconColor}`}>
        <Icon className="w-3 h-3" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Summary line: who + what */}
        <p className="text-sm text-gray-700">
          <span className="font-medium text-gray-900">{entry.user_name}</span>
          {' '}
          <span>{entry.action_summary.replace(entry.user_name, '').trim()}</span>
        </p>

        {/* Value changes (for non-bulk UPDATE entries) */}
        {entry.entry_type === 'UPDATE' && changes.length > 0 && !isBulk && (
          <div className="mt-1.5 pl-0.5 space-y-0.5">
            {changes.map((change) => (
              <ChangeRow key={change.field} change={change} />
            ))}
          </div>
        )}

        {/* Bulk: just show count */}
        {entry.entry_type === 'UPDATE' && isBulk && (
          <p className="mt-1 text-xs text-gray-400">
            {changes.length} fields updated
          </p>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-xs text-gray-400 font-medium pt-0.5 shrink-0">
        {entry.time_display}
      </span>
    </div>
  )
}