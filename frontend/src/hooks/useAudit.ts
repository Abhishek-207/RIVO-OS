/**
 * React Query hooks for Audit, Notes, Activity Timeline, and Reminders.
 * Connects to the Django backend API.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, withApiError } from '@/lib/api'
import { API_BASE_URL } from '@/config/api'
import type {
  ActivityTimelineGroup,
  AuditLogQueryParams,
  AuditLogExportParams,
  NoteData,
  CreateNoteData,
  UpdateNoteData,
  DashboardReminder,
  ReminderData,
  PaginatedAuditLogs,
  NotableType,
} from '@/types/audit'

/**
 * Hook for fetching activity timeline for a record.
 */
export function useActivityTimeline(recordType: NotableType, recordId: string | null) {
  return useQuery({
    queryKey: ['activity', recordType, recordId],
    queryFn: async (): Promise<ActivityTimelineGroup[]> => {
      return await api.get<ActivityTimelineGroup[]>(`/${recordType}s/${recordId}/activity/`)
    },
    enabled: !!recordId,
  })
}

/**
 * Hook for creating a note.
 */
export function useCreateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ recordType, recordId, data }: { recordType: NotableType; recordId: string; data: CreateNoteData }) =>
      withApiError(() => api.post<NoteData>(`/${recordType}s/${recordId}/notes/`, data), 'Failed to create note'),
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: ['activity', variables.recordType, variables.recordId] })
      queryClient.refetchQueries({ queryKey: ['dashboard-reminders'] })
    },
  })
}

/**
 * Hook for updating a note.
 */
export function useUpdateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ noteId, data }: { noteId: string; data: UpdateNoteData }) =>
      withApiError(() => api.patch<NoteData>(`/notes/${noteId}/`, data), 'Failed to update note'),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['activity'] })
      queryClient.refetchQueries({ queryKey: ['dashboard-reminders'] })
    },
  })
}

/**
 * Hook for deleting a note.
 */
export function useDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (noteId: string) =>
      withApiError(() => api.delete(`/notes/${noteId}/`), 'Failed to delete note'),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['activity'] })
      queryClient.refetchQueries({ queryKey: ['dashboard-reminders'] })
    },
  })
}

/**
 * Hook for fetching dashboard reminders (due today or overdue).
 */
export function useDashboardReminders(enabled = true) {
  return useQuery({
    queryKey: ['dashboard-reminders'],
    queryFn: async (): Promise<DashboardReminder[]> => {
      return await api.get<DashboardReminder[]>('/dashboard/reminders/')
    },
    enabled,
  })
}

/**
 * Hook for completing a reminder.
 */
export function useCompleteReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reminderId: string) =>
      withApiError(() => api.post<ReminderData>(`/reminders/${reminderId}/complete/`), 'Failed to complete reminder'),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['dashboard-reminders'] })
      queryClient.refetchQueries({ queryKey: ['activity'] })
    },
  })
}

/**
 * Hook for dismissing a reminder.
 */
export function useDismissReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reminderId: string) =>
      withApiError(() => api.post<ReminderData>(`/reminders/${reminderId}/dismiss/`), 'Failed to dismiss reminder'),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['dashboard-reminders'] })
      queryClient.refetchQueries({ queryKey: ['activity'] })
    },
  })
}

/**
 * Hook for fetching admin audit logs (admin only).
 */
export function useAuditLogs(params: AuditLogQueryParams = {}) {
  const {
    page = 1,
    page_size = 50,
    date_from,
    date_to,
    table_name,
    action,
    user_id,
    record_id,
  } = params

  return useQuery({
    queryKey: ['audit-logs', { page, page_size, date_from, date_to, table_name, action, user_id, record_id }],
    queryFn: async (): Promise<PaginatedAuditLogs> => {
      return await api.get<PaginatedAuditLogs>('/admin/audit-logs/', {
        page,
        page_size,
        date_from,
        date_to,
        table_name,
        action,
        user_id,
        record_id,
      })
    },
  })
}

/**
 * Hook for exporting audit logs.
 */
export function useExportAuditLogs() {
  return useMutation({
    mutationFn: async (params: AuditLogExportParams) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/admin/audit-logs/export/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${getAuthToken()}`,
            },
            body: JSON.stringify(params),
          }
        )

        if (!response.ok) {
          throw new Error('Export failed')
        }

        // Get the blob and trigger download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit_log_export.${params.format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } catch (error) {
        throw new Error('Failed to export audit logs')
      }
    },
  })
}

// Helper to get auth token
function getAuthToken(): string | null {
  const stored = localStorage.getItem('rivo-auth')
  if (stored) {
    try {
      const auth = JSON.parse(stored)
      return auth.access_token
    } catch {
      return null
    }
  }
  return null
}
