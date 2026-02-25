/**
 * React Query hooks for Message Templates API.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'

export interface MessageTemplate {
  id: string
  name: string
  category: 'system' | 'general'
  category_display: string
  content: string
  is_active: boolean
  // System template fields
  trigger_type: 'case_stage' | 'client_status' | 'referrer_update' | null
  trigger_type_display: string | null
  trigger_value: string
  ycloud_template_name: string
  variable_mapping: Record<string, string>
  // Meta
  created_by: string | null
  created_by_name: string | null
  created_at: string
  updated_at: string
}

export interface TemplateCategory {
  value: string
  label: string
}

export interface TemplateVariable {
  name: string
  description: string
}

export interface MessageTemplatesResponse {
  count: number
  next: string | null
  previous: string | null
  results: MessageTemplate[]
}

interface CreateTemplateData {
  name: string
  category: 'system' | 'general'
  content: string
  is_active?: boolean
  trigger_type?: 'case_stage' | 'client_status' | 'referrer_update' | null
  trigger_value?: string
  ycloud_template_name?: string
  variable_mapping?: Record<string, string>
}

interface UpdateTemplateData {
  name?: string
  category?: 'system' | 'general'
  content?: string
  is_active?: boolean
  trigger_type?: 'case_stage' | 'client_status' | 'referrer_update' | null
  trigger_value?: string
  ycloud_template_name?: string
  variable_mapping?: Record<string, string>
}

export interface TriggerOption {
  value: string
  label: string
}

export interface TriggerOptions {
  case_stage: TriggerOption[]
  client_status: TriggerOption[]
}

export interface YCloudTemplate {
  name: string
  language: string
  category: string
  status: string
  components: Array<{
    type: string
    text?: string
    example?: { body_text?: string[][] }
  }>
}

/**
 * Hook for fetching all message templates.
 */
export function useMessageTemplates(params?: { search?: string; category?: string }) {
  const queryParams = new URLSearchParams()
  if (params?.search) queryParams.set('search', params.search)
  if (params?.category) queryParams.set('category', params.category)

  const queryString = queryParams.toString()
  const url = `/message-templates/${queryString ? `?${queryString}` : ''}`

  return useQuery({
    queryKey: ['message-templates', params?.search, params?.category],
    queryFn: async (): Promise<MessageTemplate[]> => {
      const response = await api.get<MessageTemplatesResponse>(url)
      return response.results
    },
  })
}

/**
 * Hook for fetching a single message template.
 */
export function useMessageTemplate(id: string | null) {
  return useQuery({
    queryKey: ['message-template', id],
    queryFn: async (): Promise<MessageTemplate> => {
      return await api.get<MessageTemplate>(`/message-templates/${id}/`)
    },
    enabled: !!id,
  })
}

/**
 * Hook for fetching template categories.
 */
export function useTemplateCategories() {
  return useQuery({
    queryKey: ['template-categories'],
    queryFn: async (): Promise<TemplateCategory[]> => {
      return await api.get<TemplateCategory[]>('/message-templates/categories/')
    },
    staleTime: Infinity,
  })
}

/**
 * Hook for fetching available template variables.
 */
export function useTemplateVariables() {
  return useQuery({
    queryKey: ['template-variables'],
    queryFn: async (): Promise<TemplateVariable[]> => {
      return await api.get<TemplateVariable[]>('/message-templates/variables/')
    },
    staleTime: Infinity,
  })
}

/**
 * Hook for fetching trigger options (case stages + client statuses).
 */
export function useTriggerOptions() {
  return useQuery({
    queryKey: ['template-trigger-options'],
    queryFn: async (): Promise<TriggerOptions> => {
      return await api.get<TriggerOptions>('/message-templates/trigger_options/')
    },
    staleTime: Infinity,
  })
}

/**
 * Hook for fetching approved YCloud templates.
 */
export function useYCloudTemplates() {
  return useQuery({
    queryKey: ['ycloud-templates'],
    queryFn: async (): Promise<YCloudTemplate[]> => {
      return await api.get<YCloudTemplate[]>('/message-templates/ycloud_templates/')
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for creating a new message template.
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      try {
        return await api.post<MessageTemplate>('/message-templates/', data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { detail?: string })?.detail || 'Failed to create template')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['message-templates'] })
    },
  })
}

/**
 * Hook for updating a message template.
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTemplateData }) => {
      try {
        return await api.patch<MessageTemplate>(`/message-templates/${id}/`, data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { detail?: string })?.detail || 'Failed to update template')
        }
        throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.refetchQueries({ queryKey: ['message-templates'] })
      queryClient.refetchQueries({ queryKey: ['message-template', variables.id] })
    },
  })
}

/**
 * Hook for deleting a message template.
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.delete(`/message-templates/${id}/`)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { detail?: string })?.detail || 'Failed to delete template')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['message-templates'] })
    },
  })
}
