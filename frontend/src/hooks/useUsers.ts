/**
 * React Query hooks for user management.
 * Connects to the Django backend API with pagination support.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
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
    mutationFn: async (data: CreateUserData) => {
      try {
        return await api.post<UserData>('/users/', data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to create user')
        }
        throw error
      }
    },
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
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserData }) => {
      try {
        return await api.patch<UserData>(`/users/${id}/`, data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to update user')
        }
        throw error
      }
    },
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
    mutationFn: async (id: string) => {
      try {
        return await api.post<UserData>(`/users/${id}/deactivate/`)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to deactivate user')
        }
        throw error
      }
    },
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
    mutationFn: async (id: string) => {
      try {
        return await api.post<UserData>(`/users/${id}/reactivate/`)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to reactivate user')
        }
        throw error
      }
    },
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
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      try {
        return await api.post<{ message: string }>(`/users/${id}/reset_password/`, {
          new_password: newPassword,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to reset password')
        }
        throw error
      }
    },
  })
}

/**
 * Hook for permanently deleting a user.
 */
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.delete(`/users/${id}/`)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to delete user')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['users'] })
    },
  })
}
