/**
 * API client for backend communication.
 */

import { API_BASE_URL } from '@/config/api'

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>
}

class ApiError extends Error {
  status: number
  statusText: string
  data?: unknown

  constructor(status: number, statusText: string, data?: unknown) {
    super(`${status} ${statusText}`)
    this.name = 'ApiError'
    this.status = status
    this.statusText = statusText
    this.data = data
  }
}

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

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options

  // Build URL with query params
  let url = `${API_BASE_URL}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      url += `?${queryString}`
    }
  }

  // Add auth header
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Merge existing headers
  if (fetchOptions.headers) {
    const existingHeaders = fetchOptions.headers as Record<string, string>
    Object.assign(headers, existingHeaders)
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    let data
    try {
      data = await response.json()
    } catch {
      data = null
    }
    // Auto-logout on 401 to prevent stale token loops
    if (response.status === 401) {
      localStorage.removeItem('rivo-auth')
      localStorage.setItem('rivo-session-expired', '1')
      window.location.href = '/login'
    }
    throw new ApiError(response.status, response.statusText, data)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

async function uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, string>): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  const token = getAuthToken()

  const formData = new FormData()
  formData.append('file', file)

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value)
    })
  }

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    let data
    try {
      data = await response.json()
    } catch {
      data = null
    }
    // Auto-logout on 401 for file uploads too
    if (response.status === 401) {
      localStorage.removeItem('rivo-auth')
      localStorage.setItem('rivo-session-expired', '1')
      window.location.href = '/login'
    }
    throw new ApiError(response.status, response.statusText, data)
  }

  return response.json()
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | undefined>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  upload: <T>(endpoint: string, file: File, additionalData?: Record<string, string>) =>
    uploadFile<T>(endpoint, file, additionalData),
}

/**
 * Extract a user-friendly error message from an ApiError.
 *
 * Handles all backend response formats:
 * - { error: "message" }              — custom error responses
 * - { detail: "message" }             — DRF authentication errors
 * - { field: ["error", ...], ... }    — DRF serializer validation errors
 * - { errors: { field: "msg", ... } } — lead ingest validation
 * - { error: "msg", reasons: [...] }  — case creation with reasons
 * - Network/timeout errors
 */
function extractApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const data = error.data as Record<string, unknown> | null

    if (!data) {
      // No response body — use status-based messages
      if (error.status === 0 || error.status >= 500) {
        return 'Server is temporarily unavailable. Please try again later.'
      }
      if (error.status === 403) {
        return 'You do not have permission to perform this action.'
      }
      if (error.status === 404) {
        return 'The requested resource was not found.'
      }
      return fallback
    }

    // Format: { error: "message" }
    if (typeof data.error === 'string') {
      // Append reasons if present: { error: "msg", reasons: ["reason1", ...] }
      if (Array.isArray(data.reasons) && data.reasons.length > 0) {
        return `${data.error} ${(data.reasons as string[]).join('. ')}.`
      }
      return data.error
    }

    // Format: { detail: "message" } (DRF standard)
    if (typeof data.detail === 'string') {
      return data.detail
    }

    // Format: { errors: { field: "msg", ... } } (lead ingest)
    if (data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
      const messages = Object.values(data.errors as Record<string, string>)
      if (messages.length > 0) {
        return messages.join('. ') + '.'
      }
    }

    // Format: { field: ["error1", ...], ... } (DRF serializer validation)
    // Detect by checking if values are arrays of strings
    const fieldErrors: string[] = []
    for (const [key, value] of Object.entries(data)) {
      if (key === 'error' || key === 'detail' || key === 'errors' || key === 'reasons') continue
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        for (const msg of value as string[]) {
          // Strip trailing punctuation, capitalize first letter
          const cleaned = msg.replace(/[.\s]+$/, '')
          fieldErrors.push(cleaned.charAt(0).toUpperCase() + cleaned.slice(1))
        }
      }
    }
    if (fieldErrors.length > 0) {
      return fieldErrors.join('. ') + '.'
    }

    return fallback
  }

  // Network errors (fetch failures, timeouts)
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Network error. Please check your connection and try again.'
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

/**
 * Wrap an API call in a mutation-friendly error handler.
 * Catches ApiError and re-throws as a plain Error with a user-friendly message.
 */
async function withApiError<T>(fn: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    throw new Error(extractApiError(error, fallback))
  }
}

export { ApiError, extractApiError, withApiError }
