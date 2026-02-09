/**
 * ActivityTimelineItem - Displays a single activity entry in the timeline.
 */

import type { ActivityTimelineEntry } from '@/types/audit'

interface ActivityTimelineItemProps {
  entry: ActivityTimelineEntry
}

export function ActivityTimelineItem({ entry }: ActivityTimelineItemProps) {
  return (
    <div className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <p className="text-sm text-gray-600 flex-1">
        <span className="font-medium text-gray-900">{entry.user_name}</span>
        {' '}
        {entry.action_summary.replace(entry.user_name, '').trim()}
      </p>
      <span className="text-xs text-gray-400 font-medium pt-0.5 shrink-0">
        {entry.time_display}
      </span>
    </div>
  )
}