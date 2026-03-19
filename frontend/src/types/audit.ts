/**
 * TypeScript types for Audit, Notes, and Reminders.
 * These types correspond to the backend Django models and API responses.
 */

// Enums

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

export type ReminderStatus = 'pending' | 'completed' | 'dismissed'

export type NotableType = 'client' | 'case' | 'lead'

// User Summary

export interface UserSummary {
  id: string
  name: string
  email: string
}

// Reminder Types

export interface ReminderData {
  id: string
  reminder_date: string
  reminder_time: string | null
  status: ReminderStatus
  completed_at: string | null
  is_overdue: boolean
  is_due_today: boolean
  created_at: string
  updated_at: string
}

// Note Types

export interface NoteData {
  id: string
  text: string
  notable_type: NotableType
  notable_id: string
  author: UserSummary | null
  reminder: ReminderData | null
  is_editable: boolean
  created_at: string
  updated_at: string
}

export interface CreateNoteData {
  text: string
  reminder_date?: string | null
  reminder_time?: string | null
}

export interface UpdateNoteData {
  text?: string
  reminder_date?: string | null
  reminder_time?: string | null
}

// Field Change for detailed display
export interface FieldChange {
  field: string
  field_display: string
  old_value: unknown
  new_value: unknown
  old_display: string
  new_display: string
}

// Activity Timeline Types

export interface ActivityTimelineEntry {
  id: string
  timestamp: string
  time_display: string
  user_name: string
  action_summary: string
  action_type: string
  entry_type: AuditAction
  record_type: string | null
  record_id: string | null
  changes: FieldChange[] | null
}

export interface ActivityTimelineGroup {
  date: string
  date_display: string
  entries: ActivityTimelineEntry[]
}

// Audit Log Types (Admin view)

export interface ChangeDisplayUpdate {
  old: unknown
  new: unknown
  old_display: string
  new_display: string
  field_display: string
}

export interface ChangeDisplaySingle {
  value: unknown
  display: string
  field_display: string
}

export type ChangeDisplay = ChangeDisplayUpdate | ChangeDisplaySingle

export interface AuditLogEntry {
  id: string
  table_name: string
  record_id: string
  action: AuditAction
  user_id: string | null
  user_name: string
  timestamp: string
  changes: Record<string, unknown>
  changes_display: Record<string, ChangeDisplay>
  metadata: Record<string, unknown>
}

export interface AuditLogExportParams {
  format: 'csv' | 'json'
  reason: string
  date_from?: string
  date_to?: string
  table_name?: string
  action?: AuditAction
  user_id?: string
}

// Dashboard Reminder Types

export interface DashboardReminder {
  id: string
  note_id: string
  note_text: string
  notable_type: NotableType
  notable_id: string
  notable_name: string
  client_name: string | null
  case_bank: string | null
  reminder_date: string
  reminder_time: string | null
  status: ReminderStatus
  is_overdue: boolean
  is_due_today: boolean
  author_name: string
  created_at: string
}

// Query Params

export interface AuditLogQueryParams {
  page?: number
  page_size?: number
  date_from?: string
  date_to?: string
  table_name?: string
  action?: AuditAction
  user_id?: string
  record_id?: string
}

// Paginated Response (reuse from mortgage types or define here)

export interface PaginatedAuditLogs {
  items: AuditLogEntry[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// Display labels

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
}

export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  dismissed: 'Dismissed',
}

export const TABLE_NAME_LABELS: Record<string, string> = {
  clients: 'Clients',
  cases: 'Cases',
  leads: 'Leads',
  notes: 'Notes',
  reminders: 'Reminders',
  client_documents: 'Client Documents',
  case_documents: 'Case Documents',
  channels: 'Channels',
  sources: 'Sources',
  users: 'Users',
}
