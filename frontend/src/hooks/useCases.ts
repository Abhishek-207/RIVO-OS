/**
 * React Query hooks for Case management.
 * Connects to the Django backend API with pagination support.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type {
  CaseData,
  CaseListItem,
  CreateCaseData,
  UpdateCaseData,
  CasesQueryParams,
  CaseStage,
  PaginatedResponse,
} from '@/types/mortgage'
import {
  ACTIVE_STAGES,
  QUERY_STAGES,
  HOLD_STAGES,
  TERMINAL_STAGES,
  CASE_STAGE_LABELS,
} from '@/types/mortgage'

/**
 * Case stages grouped by category for dropdowns and filters.
 */
export const CASE_STAGES = {
  active: ACTIVE_STAGES.map((stage) => ({
    value: stage,
    label: CASE_STAGE_LABELS[stage],
  })),
  query: QUERY_STAGES.map((stage) => ({
    value: stage,
    label: CASE_STAGE_LABELS[stage],
  })),
  hold: HOLD_STAGES.map((stage) => ({
    value: stage,
    label: CASE_STAGE_LABELS[stage],
  })),
  terminal: TERMINAL_STAGES.map((stage) => ({
    value: stage,
    label: CASE_STAGE_LABELS[stage],
  })),
} as const

/**
 * Get stage category for styling.
 */
export function getStageCategory(stage: CaseStage): 'active' | 'hold' | 'terminal' {
  if (HOLD_STAGES.includes(stage)) return 'hold'
  if (TERMINAL_STAGES.includes(stage)) return 'terminal'
  return 'active'
}

/**
 * Get stage label from value.
 */
export function getStageLabel(stage: CaseStage): string {
  return CASE_STAGE_LABELS[stage] || stage
}

/**
 * Check if stage is terminal.
 */
export function isTerminalStage(stage: CaseStage): boolean {
  return TERMINAL_STAGES.includes(stage)
}

/**
 * Hook for fetching paginated cases.
 */
export function useCases(params: CasesQueryParams = {}) {
  const { page = 1, page_size = 10, search = '', stage = 'all', bank, sla_status, channel, source } = params

  return useQuery({
    queryKey: ['cases', { page, page_size, search, stage, bank, sla_status, channel, source }],
    queryFn: async (): Promise<PaginatedResponse<CaseListItem>> => {
      return await api.get<PaginatedResponse<CaseListItem>>('/cases/', {
        page,
        page_size,
        search: search || undefined,
        stage: stage !== 'all' ? stage : undefined,
        bank: bank || undefined,
        sla_status: sla_status || undefined,
        channel: channel || undefined,
        source: source || undefined,
      })
    },
  })
}

/**
 * Hook for fetching a single case with full details.
 */
export function useCase(id: string | null) {
  return useQuery({
    queryKey: ['cases', id],
    queryFn: async (): Promise<CaseData> => {
      return await api.get<CaseData>(`/cases/${id}/`)
    },
    enabled: !!id && id !== 'new',
  })
}

/**
 * Hook for creating a new case.
 * Validates client.can_create_case before creating.
 */
export function useCreateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCaseData) => {
      try {
        return await api.post<CaseData>('/cases/', data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to create case')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['cases'] })
      queryClient.refetchQueries({ queryKey: ['clients'] })
    },
  })
}

/**
 * Hook for updating a case.
 * Prevents changes to terminal cases.
 */
export function useUpdateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCaseData }) => {
      try {
        return await api.patch<CaseData>(`/cases/${id}/`, data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to update case')
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: ['cases'] })
      queryClient.refetchQueries({ queryKey: ['cases', variables.id] })
    },
  })
}

/**
 * Hook for changing case stage.
 * Enforces stage transition rules:
 * - Cannot move from terminal stages
 * - Tracks stage_changed_at on each transition
 */
export function useChangeCaseStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: CaseStage }) => {
      try {
        return await api.post<CaseData>(`/cases/${id}/change_stage/`, { stage })
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(
            (error.data as { error?: string })?.error || 'Failed to change case stage'
          )
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: ['cases'] })
      queryClient.refetchQueries({ queryKey: ['cases', variables.id] })
    },
  })
}

/**
 * Bank type for bank selection dropdown.
 */
export interface Bank {
  id: string
  name: string
  icon: string
}

/**
 * Bank product type for rate selection.
 */
export interface BankProduct {
  id: string
  bank_id: string
  name: string
  rate_type: 'fixed' | 'variable'
  min_rate: string
  max_rate: string
  min_ltv: number
  max_ltv: number
  min_tenure: number
  max_tenure: number
  is_active: boolean
}

/**
 * Hook for deleting a case.
 */
export function useDeleteCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.delete(`/cases/${id}/`)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to delete case')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['cases'] })
    },
  })
}

/**
 * Hook for fetching banks for dropdown selection.
 */
export function useBanks() {
  return useQuery({
    queryKey: ['banks'],
    queryFn: async (): Promise<Bank[]> => {
      return await api.get<Bank[]>('/cases/banks/')
    },
  })
}

/**
 * Hook for fetching bank products.
 */
export function useBankProducts(bankId: string | null) {
  return useQuery({
    queryKey: ['bank-products', bankId],
    queryFn: async (): Promise<BankProduct[]> => {
      return await api.get<BankProduct[]>(`/banks/${bankId}/products/`)
    },
    enabled: !!bankId,
  })
}

