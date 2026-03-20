import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { User, AuthContextType, Permissions, Resource, LoginResponse } from '@/types/auth'
import { API_BASE_URL } from '@/config/api'
import { ApiError, extractApiError } from '@/lib/api'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

const AUTH_KEY = 'rivo-auth'

interface StoredAuth {
  access_token: string
  user: User
  permissions: Permissions
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()

  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) {
      try {
        const auth: StoredAuth = JSON.parse(stored)
        return auth.user
      } catch {
        return null
      }
    }
    return null
  })

  const [permissions, setPermissions] = useState<Permissions | null>(() => {
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) {
      try {
        const auth: StoredAuth = JSON.parse(stored)
        return auth.permissions
      } catch {
        return null
      }
    }
    return null
  })

  const [isLoading, setIsLoading] = useState(false)

  const login = useCallback(async (identifier: string, password: string) => {
    setIsLoading(true)
    // Clear all cached data (in-memory + persisted) from previous user session
    queryClient.clear()
    localStorage.removeItem('rivo-query-cache')
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })

      if (!response.ok) {
        let data
        try {
          data = await response.json()
        } catch {
          data = null
        }
        const apiError = new ApiError(response.status, response.statusText, data)
        throw new Error(extractApiError(apiError, 'Invalid username or password'))
      }

      const auth: LoginResponse = await response.json()

      // Store auth data (token + user + permissions)
      const storedAuth: StoredAuth = {
        access_token: auth.access_token,
        user: auth.user,
        permissions: auth.permissions,
      }
      localStorage.setItem(AUTH_KEY, JSON.stringify(storedAuth))
      setUser(auth.user)
      setPermissions(auth.permissions)
    } finally {
      setIsLoading(false)
    }
  }, [queryClient])

  const logout = useCallback(() => {
    setUser(null)
    setPermissions(null)
    localStorage.removeItem(AUTH_KEY)
    // Clear all cached data (in-memory + persisted) to prevent stale data from previous user
    queryClient.clear()
    localStorage.removeItem('rivo-query-cache')
  }, [queryClient])

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem(AUTH_KEY)
    if (!stored) return

    try {
      const auth: StoredAuth = JSON.parse(stored)
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${auth.access_token}` },
      })

      if (response.ok) {
        const userData = await response.json()
        const updatedAuth: StoredAuth = {
          ...auth,
          user: userData,
          permissions: userData.permissions,
        }
        localStorage.setItem(AUTH_KEY, JSON.stringify(updatedAuth))
        setUser(userData)
        setPermissions(userData.permissions)
      }
    } catch {
      // Silently fail - user data will refresh on next login
    }
  }, [])

  // Cross-tab sync: log out this tab when another tab changes the auth session
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== AUTH_KEY) return

      if (!e.newValue) {
        // Another tab logged out — clear this tab too
        setUser(null)
        setPermissions(null)
        queryClient.cancelQueries()
        queryClient.clear()
        return
      }

      try {
        const newAuth: StoredAuth = JSON.parse(e.newValue)
        const currentUserId = user?.id
        if (newAuth.user?.id !== currentUserId) {
          // Different user logged in from another tab — force logout this tab
          // so it redirects to login and doesn't make requests with a mismatched session
          setUser(null)
          setPermissions(null)
          queryClient.cancelQueries()
          queryClient.clear()
        }
      } catch {
        // Corrupted auth data — log out to be safe
        setUser(null)
        setPermissions(null)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [user?.id, queryClient])

  const can = useCallback((action: 'view' | 'create' | 'update' | 'delete', resource: Resource): boolean => {
    if (!permissions) return false
    const resourcePerms = permissions[resource]
    if (!resourcePerms) return false
    return resourcePerms[action] ?? false
  }, [permissions])

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
