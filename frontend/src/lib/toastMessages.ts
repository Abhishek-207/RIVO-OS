/**
 * Unified toast messages for status/stage changes, conversions, and errors.
 * Used across Lead, Client, and Case side panels.
 */

import { toast } from 'sonner'
import { CASE_STAGE_LABELS } from '@/types/mortgage'

// Error toast — displays mutation/action errors consistently
export const errorToast = {
  show: (message: string) => toast.error(message),
}

// Lead toast messages
export const leadToast = {
  statusChanged: (status: string) => {
    const statusLabel = status === 'declined' ? 'Declined' : 'Active'
    toast.success(`Lead marked as ${statusLabel}`)
  },
  converted: () => {
    toast.success('Lead converted to client')
  },
  saved: () => {
    toast.success('Lead saved')
  },
}

// Client toast messages
export const clientToast = {
  statusChanged: (status: string) => {
    const labels: Record<string, string> = {
      active: 'Active',
      declined: 'Declined',
      not_proceeding: 'Not Proceeding',
    }
    toast.success(`Client marked as ${labels[status] || status}`)
  },
  caseCreated: () => {
    toast.success('Case created')
  },
  saved: () => {
    toast.success('Client saved')
  },
}

// Case toast messages
export const caseToast = {
  stageChanged: (stage: string) => {
    const label = CASE_STAGE_LABELS[stage as keyof typeof CASE_STAGE_LABELS] || stage
    toast.success(`Case moved to ${label}`)
  },
  saved: () => {
    toast.success('Case saved')
  },
}
