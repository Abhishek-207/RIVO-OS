/**
 * NoteForm - Form for creating or editing notes with optional reminders.
 */

import { useState } from 'react'
import { Loader2, X, Calendar } from 'lucide-react'
import { DateInput } from '@/components/ui/DateInput'
import { TimeInput } from '@/components/ui/TimeInput'
import { useCreateNote, useUpdateNote } from '@/hooks/useAudit'
import { getTodayISO } from '@/lib/dateUtils'
import type { NotableType, NoteData } from '@/types/audit'

interface NoteFormProps {
  recordType: NotableType
  recordId: string
  note?: NoteData // If provided, we're editing
  onSuccess: () => void
  onCancel: () => void
}

export function NoteForm({ recordType, recordId, note, onSuccess, onCancel }: NoteFormProps) {
  const isEditing = !!note
  const [text, setText] = useState(note?.text || '')
  const [reminderDate, setReminderDate] = useState(note?.reminder?.reminder_date || '')
  const [reminderTime, setReminderTime] = useState(note?.reminder?.reminder_time || '')
  const [showReminder, setShowReminder] = useState(!!note?.reminder)
  const [error, setError] = useState<string | null>(null)

  const createMutation = useCreateNote()
  const updateMutation = useUpdateNote()

  const charCount = text.length
  const maxChars = 2000
  const isOverLimit = charCount > maxChars

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!text.trim()) {
      setError('Note text is required')
      return
    }

    if (isOverLimit) {
      setError('Note exceeds maximum character limit')
      return
    }

    if (showReminder && reminderDate && !reminderTime) {
      setError('Please select a time for the reminder')
      return
    }

    if (showReminder && reminderTime && !reminderDate) {
      setError('Please select a date for the reminder')
      return
    }

    try {
      if (isEditing && note) {
        await updateMutation.mutateAsync({
          noteId: note.id,
          data: {
            text: text.trim(),
            reminder_date: showReminder ? reminderDate || null : null,
            reminder_time: showReminder ? reminderTime || null : null,
          },
        })
      } else {
        await createMutation.mutateAsync({
          recordType,
          recordId,
          data: {
            text: text.trim(),
            reminder_date: showReminder ? reminderDate || null : null,
            reminder_time: showReminder ? reminderTime || null : null,
          },
        })
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note')
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Text Area */}
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a note..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1e3a5f] resize-none"
          disabled={isPending}
          autoFocus
        />
        <div className="flex justify-between items-center mt-1">
          <span className={`text-xs ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
            {charCount} / {maxChars}
          </span>
        </div>
      </div>

      {/* Reminder Toggle */}
      <div>
        {!showReminder ? (
          <button
            type="button"
            onClick={() => setShowReminder(true)}
            className="flex items-center gap-1.5 text-sm text-[#1e3a5f] hover:text-[#2d4a6f]"
          >
            <Calendar className="w-4 h-4" />
            Add reminder
          </button>
        ) : (
          <div className="space-y-3 p-3 bg-[#1e3a5f]/5 rounded-lg border border-[#1e3a5f]/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#1e3a5f]">Reminder</span>
              <button
                type="button"
                onClick={() => {
                  setShowReminder(false)
                  setReminderDate('')
                  setReminderTime('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <DateInput
                  value={reminderDate}
                  onChange={setReminderDate}
                  min={getTodayISO()}
                  disabled={isPending}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Time</label>
                <TimeInput
                  value={reminderTime}
                  onChange={setReminderTime}
                  disabled={isPending}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !text.trim() || isOverLimit}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#2d4a6f]"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEditing ? 'Save Changes' : showReminder ? 'Add Note & Reminder' : 'Add Note'}
        </button>
      </div>
    </form>
  )
}
