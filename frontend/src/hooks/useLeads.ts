/**
 * React Query hooks for Lead management.
 * Connects to the Django backend API with pagination support.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type {
  LeadData,
  LeadListItem,
  UpdateLeadData,
  LeadsQueryParams,
  LeadStatus,
  PaginatedResponse,
  ClientData,
} from '@/types/mortgage'

/**
 * Hook for fetching paginated leads.
 */
export function useLeads(params: LeadsQueryParams = {}) {
  const { page = 1, page_size = 10, search = '', status = 'all', source_id, channel_id, campaign_status = 'all' } = params

  return useQuery({
    queryKey: ['leads', { page, page_size, search, status, source_id, channel_id, campaign_status }],
    queryFn: async (): Promise<PaginatedResponse<LeadListItem>> => {
      return await api.get<PaginatedResponse<LeadListItem>>('/leads/', {
        page,
        page_size,
        search: search || undefined,
        status: status !== 'all' ? status : undefined,
        source_id: source_id || undefined,
        channel_id: channel_id || undefined,
        campaign_status: campaign_status !== 'all' ? campaign_status : undefined,
      })
    },
  })
}

/**
 * Hook for fetching a single lead with full details and SLA timer.
 */
export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      return await api.get<LeadData>(`/leads/${id}/`)
    },
    enabled: !!id,
  })
}

/**
 * Hook for updating a lead.
 */
export function useUpdateLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLeadData }) => {
      try {
        return await api.patch<LeadData>(`/leads/${id}/`, data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to update lead')
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: ['leads'] })
      queryClient.refetchQueries({ queryKey: ['leads', variables.id] })
    },
  })
}

/**
 * Hook for changing lead status.
 * Valid transitions: active -> converted/declined/not_proceeding
 */
export function useChangeLeadStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      try {
        return await api.post<LeadData>(`/leads/${id}/change_status/`, { status })
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(
            (error.data as { error?: string })?.error || 'Failed to change lead status'
          )
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: ['leads'] })
      queryClient.refetchQueries({ queryKey: ['leads', variables.id] })
    },
  })
}

/**
 * Hook for converting a lead to a client.
 * Creates a new Client from the Lead data and updates Lead status to 'converted'.
 */
export function useConvertLeadToClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        return await api.post<ClientData>(`/leads/${id}/convert_to_client/`)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(
            (error.data as { error?: string })?.error || 'Failed to convert lead to client'
          )
        }
        throw error
      }
    },
    onSuccess: (_data, leadId) => {
      queryClient.refetchQueries({ queryKey: ['leads'] })
      queryClient.refetchQueries({ queryKey: ['leads', leadId] })
      queryClient.refetchQueries({ queryKey: ['clients'] })
    },
  })
}

/**
 * Format SLA timer display.
 * Returns formatted string like "9 min left" or "Overdue 1 hr"
 */
export function formatSlaTimer(minutesRemaining: number | null): {
  text: string
  isOverdue: boolean
} {
  if (minutesRemaining === null) {
    return { text: 'No SLA', isOverdue: false }
  }

  const isOverdue = minutesRemaining < 0
  const absMinutes = Math.abs(minutesRemaining)

  if (absMinutes < 60) {
    const text = isOverdue ? `Overdue ${absMinutes} min` : `${absMinutes} min left`
    return { text, isOverdue }
  }

  const hours = Math.floor(absMinutes / 60)
  const mins = absMinutes % 60

  if (hours < 24) {
    const hourText = hours === 1 ? '1 hr' : `${hours} hrs`
    const minText = mins > 0 ? ` ${mins} min` : ''
    const text = isOverdue ? `Overdue ${hourText}${minText}` : `${hourText}${minText} left`
    return { text, isOverdue }
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  const dayText = days === 1 ? '1 day' : `${days} days`
  const hourText = remainingHours > 0 ? ` ${remainingHours} hr` : ''
  const text = isOverdue ? `Overdue ${dayText}${hourText}` : `${dayText}${hourText} left`
  return { text, isOverdue }
}
