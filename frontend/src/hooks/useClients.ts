/**
 * React Query hooks for Client management.
 * Connects to the Django backend API with pagination support.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type {
  ClientData,
  ClientListItem,
  CreateClientData,
  UpdateClientData,
  UpdateCoApplicantData,
  UpdateClientExtraDetailsData,
  ClientExtraDetailsData,
  ClientsQueryParams,
  ClientStatus,
  PaginatedResponse,
  CaseData,
  ResidencyType,
} from '@/types/mortgage'

/**
 * Hook for fetching paginated clients.
 */
export function useClients(params: ClientsQueryParams = {}) {
  const {
    page = 1,
    page_size = 10,
    search = '',
    status = 'all',
    application_type = 'all',
    source_id,
    channel_id,
    sla_status,
    start_date,
    end_date,
  } = params

  return useQuery({
    queryKey: ['clients', { page, page_size, search, status, application_type, source_id, channel_id, sla_status, start_date, end_date }],
    queryFn: async (): Promise<PaginatedResponse<ClientListItem>> => {
      return await api.get<PaginatedResponse<ClientListItem>>('/clients/', {
        page,
        page_size,
        search: search || undefined,
        status: status !== 'all' ? status : undefined,
        application_type: application_type !== 'all' ? application_type : undefined,
        source_id: source_id || undefined,
        channel_id: channel_id || undefined,
        sla_status: sla_status || undefined,
        start_date: start_date || undefined,
        end_date: end_date || undefined,
      })
    },
  })
}

/**
 * Hook for fetching a single client with all calculated fields.
 */
export function useClient(id: string | null) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      return await api.get<ClientData>(`/clients/${id}/`)
    },
    enabled: !!id && id !== 'new',
  })
}

/**
 * Hook for creating a new client.
 * Validates trusted channel or accepts lead_id for conversion.
 */
export function useCreateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateClientData) => {
      try {
        return await api.post<ClientData>('/clients/', data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to create client')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['clients'] })
    },
  })
}

/**
 * Hook for updating a client.
 * Recalculates DBR, LTV, and eligibility on save.
 */
export function useUpdateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateClientData }) => {
      try {
        return await api.patch<ClientData>(`/clients/${id}/`, data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to update client')
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: ['clients'] })
      queryClient.refetchQueries({ queryKey: ['clients', variables.id] })
      // Invalidate documents cache since profile change affects required documents
      queryClient.refetchQueries({ queryKey: ['clientDocuments', variables.id] })
    },
  })
}

/**
 * Hook for changing client status.
 */
export function useChangeClientStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ClientStatus }) => {
      try {
        return await api.post<ClientData>(`/clients/${id}/change_status/`, { status })
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(
            (error.data as { error?: string })?.error || 'Failed to change client status'
          )
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: ['clients'] })
      queryClient.refetchQueries({ queryKey: ['clients', variables.id] })
    },
  })
}

/**
 * Hook for creating or updating a co-applicant for joint applications.
 */
export function useUpdateCoApplicant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clientId, data }: { clientId: string; data: UpdateCoApplicantData }) => {
      try {
        return await api.post<ClientData>(`/clients/${clientId}/update_co_applicant/`, data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(
            (error.data as { error?: string })?.error || 'Failed to update co-applicant'
          )
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: ['clients'] })
      queryClient.refetchQueries({ queryKey: ['clients', variables.clientId] })
    },
  })
}

/**
 * Hook for creating a case from a client.
 * Validates can_create_case before creating.
 */
export function useCreateCaseFromClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (clientId: string) => {
      try {
        return await api.post<CaseData>(`/clients/${clientId}/create_case/`)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to create case')
        }
        throw error
      }
    },
    onSuccess: (_data, clientId) => {
      queryClient.refetchQueries({ queryKey: ['clients'] })
      queryClient.refetchQueries({ queryKey: ['clients', clientId] })
      queryClient.refetchQueries({ queryKey: ['cases'] })
    },
  })
}

/**
 * Hook for deleting a client.
 */
export function useDeleteClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.delete(`/clients/${id}/`)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to delete client')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['clients'] })
    },
  })
}

/**
 * Calculate mortgage eligibility values.
 * This mirrors the backend calculations for real-time preview.
 */
export function calculateEligibility(data: {
  monthly_salary: string | null
  co_applicant_salary?: string | null
  cc_1_limit?: string | null
  cc_2_limit?: string | null
  cc_3_limit?: string | null
  cc_4_limit?: string | null
  cc_5_limit?: string | null
  auto_loan_emi?: string | null
  personal_loan_emi?: string | null
  existing_mortgage_emi?: string | null
  property_value?: string | null
  loan_amount?: string | null
  is_first_property?: boolean
  residency?: ResidencyType | null
  property_type?: 'ready' | 'off_plan' | null
}) {
  // Parse string values to numbers
  const parseDecimal = (value: string | null | undefined): number => {
    if (!value) return 0
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }

  const monthly_salary = parseDecimal(data.monthly_salary)
  const co_applicant_salary = parseDecimal(data.co_applicant_salary)
  const cc_1_limit = parseDecimal(data.cc_1_limit)
  const cc_2_limit = parseDecimal(data.cc_2_limit)
  const cc_3_limit = parseDecimal(data.cc_3_limit)
  const cc_4_limit = parseDecimal(data.cc_4_limit)
  const cc_5_limit = parseDecimal(data.cc_5_limit)
  const auto_loan_emi = parseDecimal(data.auto_loan_emi)
  const personal_loan_emi = parseDecimal(data.personal_loan_emi)
  const existing_mortgage_emi = parseDecimal(data.existing_mortgage_emi)
  const property_value = parseDecimal(data.property_value)
  const loan_amount = parseDecimal(data.loan_amount)
  const residency = data.residency ?? 'uae_resident'
  const property_type = data.property_type ?? 'ready'

  // Auto-detect first property: if they have existing mortgage EMI, it's not their first property
  const is_first_property = existing_mortgage_emi > 0 ? false : (data.is_first_property ?? true)

  // Total income (combined for joint applications)
  const totalIncome = monthly_salary + co_applicant_salary

  // Total CC liability (5% of each CC limit per spec)
  const totalCCLiability =
    cc_1_limit * 0.05 +
    cc_2_limit * 0.05 +
    cc_3_limit * 0.05 +
    cc_4_limit * 0.05 +
    cc_5_limit * 0.05

  // Total loan EMIs
  const totalLoanEMIs = auto_loan_emi + personal_loan_emi + existing_mortgage_emi

  // Total monthly liabilities
  const totalMonthlyLiabilities = totalCCLiability + totalLoanEMIs

  // DBR Available = (Monthly Salary / 2) - Total Liabilities
  const dbrAvailable = totalIncome / 2 - totalMonthlyLiabilities

  // LTV calculation
  const ltvPercentage = property_value > 0 ? (loan_amount / property_value) * 100 : 0

  // LTV limits based on residency, first property, and property type
  let ltvLimit: number
  if (property_type === 'off_plan') {
    ltvLimit = 50 // All off-plan properties: 50%
  } else if (residency === 'non_resident') {
    ltvLimit = 60 // Non-resident: 60%
  } else if (is_first_property) {
    ltvLimit = 80 // UAE Resident - First Property: 80%
  } else {
    ltvLimit = 65 // UAE Resident - Second Property: 65%
  }

  // Max loan amount = Monthly Salary x 68 (combined for joint)
  const maxLoanAmount = totalIncome * 68

  // Eligibility check
  const missingRequirements: string[] = []

  if (!monthly_salary || monthly_salary <= 0) {
    missingRequirements.push('Monthly salary is required')
  }
  if (ltvPercentage > ltvLimit) {
    missingRequirements.push(`LTV ${ltvPercentage.toFixed(1)}% exceeds limit of ${ltvLimit}%`)
  }
  if (loan_amount > maxLoanAmount && maxLoanAmount > 0) {
    missingRequirements.push(
      `Loan amount exceeds maximum of AED ${maxLoanAmount.toLocaleString()}`
    )
  }
  if (!property_value || property_value <= 0) {
    missingRequirements.push('Property value is required')
  }
  if (!loan_amount || loan_amount <= 0) {
    missingRequirements.push('Loan amount is required')
  }

  const canCreateCase = missingRequirements.length === 0

  return {
    totalCCLiability: Math.round(totalCCLiability * 100) / 100,
    totalLoanEMIs: Math.round(totalLoanEMIs * 100) / 100,
    totalMonthlyLiabilities: Math.round(totalMonthlyLiabilities * 100) / 100,
    dbrAvailable: Math.round(dbrAvailable * 100) / 100,
    ltvPercentage: Math.round(ltvPercentage * 100) / 100,
    ltvLimit,
    maxLoanAmount: Math.round(maxLoanAmount * 100) / 100,
    canCreateCase,
    missingRequirements,
  }
}

/**
 * Hook for fetching client extra details.
 */
export function useClientExtraDetails(clientId: string | null) {
  return useQuery({
    queryKey: ['clientExtraDetails', clientId],
    queryFn: async () => {
      const data = await api.get<ClientExtraDetailsData | Record<string, never>>(`/clients/${clientId}/extra_details/`)
      // API returns empty object {} if no extra details exist
      if (!data || Object.keys(data).length === 0) {
        return null
      }
      return data as ClientExtraDetailsData
    },
    enabled: !!clientId && clientId !== 'new',
  })
}

/**
 * Hook for updating client extra details.
 */
export function useUpdateClientExtraDetails() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clientId, data }: { clientId: string; data: UpdateClientExtraDetailsData }) => {
      try {
        return await api.patch<ClientExtraDetailsData>(`/clients/${clientId}/extra_details/`, data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(
            (error.data as { error?: string })?.error || 'Failed to update extra details'
          )
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: ['clientExtraDetails', variables.clientId] })
      queryClient.refetchQueries({ queryKey: ['clients', variables.clientId] })
    },
  })
}
