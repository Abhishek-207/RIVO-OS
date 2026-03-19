/**
 * NoteItem - Displays a single note in the timeline with edit/delete actions.
 */

import { useState } from 'react'
import { Edit2, Trash2, Bell, Loader2 } from 'lucide-react'
import { useDeleteNote } from '@/hooks/useAudit'
import { NoteForm } from './NoteForm'
import type { NoteData } from '@/types/audit'
import { cn } from '@/lib/utils'
import { formatTime, formatShortDate } from '@/lib/dateUtils'

interface NoteItemProps {
  note: NoteData
  canEdit: boolean
  canDelete: boolean
  onUpdate: () => void
}

export function NoteItem({ note, canEdit, canDelete, onUpdate }: NoteItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const deleteMutation = useDeleteNote()

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(note.id)
      onUpdate()
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  if (isEditing) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <NoteForm
          recordType={note.notable_type}
          recordId={note.notable_id}
          note={note}
          onSuccess={() => {
            setIsEditing(false)
            onUpdate()
          }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="relative group bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{note.author?.name || 'Unknown'}</span>
          <span>-</span>
          <span>{formatTime(note.created_at)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Edit note"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
              title="Delete note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.text}</p>

      {/* Reminder Badge */}
      {note.reminder && note.reminder.status === 'pending' && (
        <div
          className={cn(
            'mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium',
            note.reminder.is_overdue
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
          )}
        >
          <Bell className="w-3 h-3" />
          <span>
            Reminder: {formatShortDate(note.reminder.reminder_date)}
            {note.reminder.reminder_time && ` at ${formatTime(note.reminder.reminder_time)}`}
          </span>
          {note.reminder.is_overdue && <span className="font-bold">- Overdue</span>}
        </div>
      )}

      {/* Edit indicator */}
      {!note.is_editable && canEdit && (
        <p className="mt-2 text-xs text-gray-400">
          Edit window has expired (24 hours)
        </p>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white/95 rounded-lg flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-sm text-gray-700 mb-3">Delete this note?</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
