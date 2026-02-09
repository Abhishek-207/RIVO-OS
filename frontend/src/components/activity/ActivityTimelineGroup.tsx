/**
 * ActivityTimelineGroup - Displays a group of activity entries for a single day.
 */

import { ActivityTimelineItem } from './ActivityTimelineItem'
import type { ActivityTimelineEntry } from '@/types/audit'

interface ActivityTimelineGroupProps {
  dateDisplay: string
  entries: ActivityTimelineEntry[]
}

export function ActivityTimelineGroup({ dateDisplay, entries }: ActivityTimelineGroupProps) {
  return (
    <div>
      {/* Day Header */}
      <div className="pb-3">
        <span className="text-xs font-medium text-gray-400">
          {dateDisplay}
        </span>
      </div>

      {/* Entries */}
      <div className="space-y-1">
        {entries.map((entry) => (
          <ActivityTimelineItem key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}