/**
 * ReminderCard - Simple reminder display for dashboard.
 */

import { useState } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { useCompleteReminder, useDismissReminder } from '@/hooks/useAudit'
import type { DashboardReminder, NotableType } from '@/types/audit'
import { cn } from '@/lib/utils'
import { formatRelativeDate, formatTime } from '@/lib/dateUtils'

interface ReminderCardProps {
  reminder: DashboardReminder
  onUpdate: () => void
  onNavigate?: (type: NotableType, id: string) => void
}

export function ReminderCard({ reminder, onUpdate, onNavigate }: ReminderCardProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)

  const completeMutation = useCompleteReminder()
  const dismissMutation = useDismissReminder()

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await completeMutation.mutateAsync(reminder.id)
      onUpdate()
    } catch (error) {
      console.error('Failed to complete reminder:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const handleDismiss = async () => {
    setIsDismissing(true)
    try {
      await dismissMutation.mutateAsync(reminder.id)
      onUpdate()
    } catch (error) {
      console.error('Failed to dismiss reminder:', error)
    } finally {
      setIsDismissing(false)
    }
  }

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate(reminder.notable_type, reminder.notable_id)
    }
  }

  const formatReminderTime = (timeStr: string | null) => {
    if (!timeStr) return ''
    return ` at ${formatTime(timeStr)}`
  }

  const isPending = isCompleting || isDismissing

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50',
        reminder.is_overdue ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
      )}
      onClick={handleNavigate}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Client/Lead name */}
          <p className="text-sm font-medium text-gray-900 truncate">
            {reminder.notable_name}
          </p>
          {/* Note text */}
          <p className="text-sm text-gray-600 line-clamp-1 mt-0.5">
            {reminder.note_text}
          </p>
          {/* Date/time and author */}
          <p className={cn(
            'text-xs mt-1',
            reminder.is_overdue ? 'text-red-600' : 'text-gray-400'
          )}>
            {formatRelativeDate(reminder.reminder_date)}{formatReminderTime(reminder.reminder_time)}
            {reminder.is_overdue && ' • Overdue'}
            {' • '}{reminder.author_name}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleComplete}
            disabled={isPending}
            className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
            title="Complete"
          >
            {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
            title="Dismiss"
          >
            {isDismissing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
