/**
 * ActivityTimeline - Displays grouped activity entries for a record.
 * Used in Client, Case, and Lead side panels.
 */

import { useState } from 'react'
import { Plus, AlertCircle } from 'lucide-react'
import { ActivityTabSkeleton } from '@/components/ui/Skeleton'
import { useActivityTimeline } from '@/hooks/useAudit'
import { useAuth } from '@/contexts/AuthContext'
import { ActivityTimelineGroup } from './ActivityTimelineGroup'
import { NoteForm } from './NoteForm'
import type { NotableType } from '@/types/audit'

interface ActivityTimelineProps {
  recordType: NotableType
  recordId: string
  readOnly?: boolean
}

export function ActivityTimeline({ recordType, recordId, readOnly: readOnlyProp }: ActivityTimelineProps) {
  const { can } = useAuth()
  // Check update permission on the parent resource (leads, clients, cases)
  const resourceMap = { lead: 'leads', client: 'clients', case: 'cases' } as const
  const resource = resourceMap[recordType]
  const isReadOnly = readOnlyProp || !can('update', resource)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const { data: groups, isLoading, error, refetch } = useActivityTimeline(recordType, recordId)

  const handleNoteCreated = () => {
    setShowNoteForm(false)
    refetch()
  }

  if (isLoading) {
    return <ActivityTabSkeleton />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span className="text-sm">Failed to load activity</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add Note Button - hidden for read-only roles */}
      {!isReadOnly && (
        <button
          onClick={() => setShowNoteForm(!showNoteForm)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1e3a5f] hover:bg-[#1e3a5f]/10 rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Note
        </button>
      )}

      {/* Inline Note Form */}
      {!isReadOnly && showNoteForm && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <NoteForm
            recordType={recordType}
            recordId={recordId}
            onSuccess={handleNoteCreated}
            onCancel={() => setShowNoteForm(false)}
          />
        </div>
      )}

      {/* Timeline Groups */}
      {groups && groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <ActivityTimelineGroup
              key={group.date}
              dateDisplay={group.date_display}
              entries={group.entries}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No activity yet</p>
        </div>
      )}
    </div>
  )
}
