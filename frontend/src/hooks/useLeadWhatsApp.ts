/**
 * React Query hooks for Lead WhatsApp messaging.
 * Connects to the Django backend API for YCloud WhatsApp integration with leads.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, withApiError } from '@/lib/api'

export interface LeadWhatsAppMessage {
  id: string
  lead: string
  direction: 'outbound' | 'inbound'
  message_type: 'text' | 'template' | 'image' | 'document'
  content: string
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  ycloud_message_id: string
  error_message: string
  from_number: string
  to_number: string
  template_name: string | null
  button_payload: string | null
  created_at: string
  sent_at: string | null
  delivered_at: string | null
}

export interface LeadMessagesResponse {
  lead_id: string
  lead_name: string
  lead_phone: string
  messages: LeadWhatsAppMessage[]
  count: number
}

export interface SendLeadMessageResponse {
  success: boolean
  message: LeadWhatsAppMessage
  error?: string
  ycloud_response?: Record<string, unknown>
}

/**
 * Hook for fetching WhatsApp messages for a specific lead.
 */
export function useLeadWhatsAppMessages(leadId: string | null) {
  return useQuery({
    queryKey: ['lead-whatsapp-messages', leadId],
    queryFn: async (): Promise<LeadMessagesResponse> => {
      return await api.get<LeadMessagesResponse>(`/leads/${leadId}/messages/`)
    },
    enabled: !!leadId,
    refetchInterval: 30000, // Refetch every 30 seconds for new messages
  })
}

/**
 * Hook for sending a WhatsApp message to a lead.
 */
export function useSendLeadWhatsAppMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ leadId, message }: { leadId: string; message: string }) =>
      withApiError(
        () => api.post<SendLeadMessageResponse>(`/leads/${leadId}/messages/send/`, { message }),
        'Failed to send message',
      ),
    onSuccess: (_data, variables) => {
      // Invalidate the messages query to refetch
      queryClient.refetchQueries({ queryKey: ['lead-whatsapp-messages', variables.leadId] })
    },
  })
}
