export type UserRole = 'admin' | 'channel_owner' | 'team_leader' | 'mortgage_specialist' | 'process_owner'

export type Resource = 'leads' | 'clients' | 'cases' | 'users' | 'channels' | 'templates' | 'bank_products' | 'audit_logs'

export interface ResourcePermissions {
  view: boolean
  create: boolean
  update: boolean
  delete: boolean
}

export type Permissions = Record<Resource, ResourcePermissions>

export interface User {
  id: string
  username: string
  email: string
  name: string
  phone?: string
  role: UserRole
  is_active?: boolean
}

export interface AuthState {
  user: User | null
  permissions: Permissions | null
}

export interface AuthContextType {
  user: User | null
  permissions: Permissions | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (identifier: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  can: (action: 'view' | 'create' | 'update' | 'delete', resource: Resource) => boolean
}

export interface LoginResponse {
  access_token: string
  refresh_token?: string
  user: User
  permissions: Permissions
}
