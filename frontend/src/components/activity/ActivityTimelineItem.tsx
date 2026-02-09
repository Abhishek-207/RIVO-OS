/**
 * ActivityTimelineItem - Displays a single activity entry in the timeline.
 * Clean summary format: who did what, when.
 */

import { FileText, StickyNote, Bell, Trash2, Pencil } from 'lucide-react'
import type { ActivityTimelineEntry } from '@/types/audit'

interface ActivityTimelineItemProps {
  entry: ActivityTimelineEntry
}

const ACTION_ICONS: Record<string, typeof Pencil> = {
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

export function ActivityTimelineItem({ entry }: ActivityTimelineItemProps) {
  const Icon = entry.entry_type === 'DELETE' ? Trash2 : (ACTION_ICONS[entry.action_type] || Pencil)
  const iconColor = ACTION_COLORS[entry.entry_type] || 'bg-gray-100 text-gray-500'

  return (
    <div className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      {/* Icon */}
      <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${iconColor}`}>
        <Icon className="w-3 h-3" />
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-600 flex-1">
        <span className="font-medium text-gray-900">{entry.user_name}</span>
        {' '}
        {entry.action_summary.replace(entry.user_name, '').trim()}
      </p>

      {/* Timestamp */}
      <span className="text-xs text-gray-400 font-medium pt-0.5 shrink-0">
        {entry.time_display}
      </span>
    </div>
  )
}