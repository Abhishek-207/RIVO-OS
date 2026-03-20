/**
 * React Query hooks for user management.
 * Connects to the Django backend API with pagination support.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, withApiError } from '@/lib/api'
import type { UserRole } from '@/types/auth'

export interface UserData {
  id: string
  username: string
  email: string
  name: string
  phone: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface UsersQueryParams {
  page?: number
  page_size?: number
  search?: string
  status?: 'all' | 'active' | 'inactive'
}

export interface CreateUserData {
  username?: string
  email: string
  name: string
  phone?: string
  role: string
  password: string
}

export interface UpdateUserData {
  name?: string
  phone?: string
  role?: string
}

/**
 * Hook for fetching paginated users.
 */
export function useUsers(params: UsersQueryParams = {}) {
  const { page = 1, page_size = 10, search = '', status = 'all' } = params

  return useQuery({
    queryKey: ['users', { page, page_size, search, status }],
    queryFn: async (): Promise<PaginatedResponse<UserData>> => {
      return await api.get<PaginatedResponse<UserData>>('/users/', {
        page,
        page_size,
        search: search || undefined,
        status: status !== 'all' ? status : undefined,
      })
    },
  })
}

/**
 * Hook for fetching a single user.
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      return await api.get<UserData>(`/users/${id}/`)
    },
    enabled: !!id,
  })
}

/**
 * Hook for creating a new user.
 */
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUserData) =>
      withApiError(() => api.post<UserData>('/users/', data), 'Failed to create user'),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['users'] })
    },
  })
}

/**
 * Hook for updating a user.
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) =>
      withApiError(() => api.patch<UserData>(`/users/${id}/`, data), 'Failed to update user'),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['users'] })
    },
  })
}

/**
 * Hook for deactivating a user.
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      withApiError(() => api.post<UserData>(`/users/${id}/deactivate/`), 'Failed to deactivate user'),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['users'] })
    },
  })
}

/**
 * Hook for reactivating a user.
 */
export function useReactivateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      withApiError(() => api.post<UserData>(`/users/${id}/reactivate/`), 'Failed to reactivate user'),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['users'] })
    },
  })
}

/**
 * Hook for resetting a user's password (admin only).
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      withApiError(
        () => api.post<{ message: string }>(`/users/${id}/reset_password/`, { new_password: newPassword }),
        'Failed to reset password',
      ),
  })
}

/**
 * Hook for permanently deleting a user.
 */
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      withApiError(() => api.delete(`/users/${id}/`), 'Failed to delete user'),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['users'] })
    },
  })
}
