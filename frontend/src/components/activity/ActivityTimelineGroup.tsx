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
      <div className="pb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {dateDisplay}
        </span>
      </div>

      {/* Entries with left border connector */}
      <div className="border-l-2 border-gray-100 ml-[18px] space-y-0.5">
        {entries.map((entry) => (
          <ActivityTimelineItem key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}