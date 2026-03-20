import { useState, useEffect } from 'react'
import { Plus, Trash2, X, Loader2, Key, Eye, EyeOff, Check } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  useUsers,
  useDeleteUser,
  type UserData,
} from '@/hooks/useUsers'
import type { UserRole } from '@/types/auth'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { UserSidePanel } from '@/components/UserSidePanel'
import { Pagination } from '@/components/Pagination'
import { TablePageLayout, TableCard, TableContainer, PageError, StatusErrorToast, SearchInput, StatusTabs } from '@/components/ui/TablePageLayout'
import { TableRowsSkeleton } from '@/components/ui/Skeleton'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const STATUS_TABS: { value: 'all' | 'active' | 'inactive'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const roleColors: Record<string, string> = {
  admin: 'bg-[#e8f0f5] text-[#1e3a5f]',
  channel_owner: 'bg-[#e8f0f5] text-[#1e3a5f]',
  team_leader: 'bg-[#e8eef5] text-[#2a4a6b]',
  mortgage_specialist: 'bg-[#e8f5f0] text-[#2d6a4f]',
  process_owner: 'bg-[#f0e8f5] text-[#6b4c8a]',
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  channel_owner: 'Channel Owner',
  team_leader: 'Team Leader',
  mortgage_specialist: 'Mortgage Specialist',
  process_owner: 'Process Owner',
}

const avatarColors = [
  'bg-[#e07a5f]',
  'bg-[#4a9079]',
  'bg-[#7c7c8a]',
  'bg-[#3d8b8b]',
  'bg-[#6b4c8a]',
  'bg-[#c17f59]',
]

function getAvatarColor(id: string): string {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return avatarColors[hash % avatarColors.length]
}

const PAGE_SIZE = 10

export function UsersPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showSystemPasswordModal, setShowSystemPasswordModal] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<UserData | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, error } = useUsers({
    page: 1,
    page_size: 100, // Get more users for client-side filtering
    search: searchQuery,
    status: statusFilter,
  })

  // Apply role filter client-side
  const filteredUsers = (data?.items || []).filter(user =>
    roleFilter === 'all' || user.role === roleFilter
  )

  // Client-side pagination after role filter
  const totalItems = filteredUsers.length
  const totalPages = Math.ceil(totalItems / PAGE_SIZE)
  const users = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const deleteMutation = useDeleteUser()

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMutation.mutateAsync(pendingDelete.id)
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setPendingDelete(null)
    }
  }

  if (error) return <PageError entityName="users" message={error.message} />

  return (
    <TablePageLayout>
      {/* Page Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Users & Roles</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage system users and their permissions</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSystemPasswordModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-xs"
            >
              <Key className="h-3.5 w-3.5" />
              System Password
            </button>
            <button
              onClick={() => setSelectedUserId('new')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#0f2744] rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New User
            </button>
          </div>
        </div>

        {/* Search, Status Tabs and Role Filter */}
        <div className="flex items-center gap-4 mt-4">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search users..."
          />
          <StatusTabs
            tabs={STATUS_TABS}
            value={statusFilter}
            onChange={(val) => { setStatusFilter(val); setCurrentPage(1) }}
          />
          <div className="w-48">
            <SearchableSelect
              value={roleFilter}
              onChange={(val) => { setRoleFilter(val as typeof roleFilter); setCurrentPage(1) }}
              options={[
                { value: 'all', label: 'All Roles' },
                { value: 'admin', label: 'Admin' },
                { value: 'channel_owner', label: 'Channel Owner' },
                { value: 'mortgage_specialist', label: 'Mortgage Specialist' },
                { value: 'process_owner', label: 'Process Owner' },
              ]}
              size="sm"
              hideSearch
            />
          </div>
        </div>
      </div>

      {statusError && (
        <StatusErrorToast message={statusError} onClose={() => setStatusError(null)} />
      )}

      {/* Users Table Card */}
      <TableCard>
        <TableContainer isEmpty={!isLoading && users.length === 0} emptyMessage="No users found">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left pb-3 pl-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Username</th>
                <th className="text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                <th className="text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="w-44 text-right pb-3 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <TableRowsSkeleton rows={8} columns={5} /> : users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white ${getAvatarColor(user.id)}`}>
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pl-6">
                    <span className="text-xs text-gray-600">{user.username}</span>
                  </td>
                  <td className="py-3">
                    <span className={cn('px-2 py-0.5 text-xs font-medium rounded', roleColors[user.role])}>
                      {roleLabels[user.role] || user.role}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
                      user.is_active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    )}>
                      <span className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        user.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                      )} />
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 text-right pr-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setPendingDelete(user)
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          itemLabel="users"
        />
      </TableCard>

      {/* System Password Modal */}
      {showSystemPasswordModal && (
        <SystemPasswordModal onClose={() => setShowSystemPasswordModal(false)} />
      )}

      {/* User Side Panel */}
      {selectedUserId && (
        <UserSidePanel
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete User"
        message={`Are you sure you want to permanently delete ${pendingDelete?.name}?`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </TablePageLayout>
  )
}

function SystemPasswordModal({ onClose }: { onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      await api.post('/auth/reset-all-passwords', { new_password: newPassword })
      setSuccess(true)
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset passwords')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] bg-white z-50 shadow-xl rounded-xl">
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">System Password</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">
          {success ? (
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">Password Updated</p>
              <p className="text-xs text-gray-500 mt-0.5">System password changed for all users</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                <p className="text-xs text-amber-700">This password is shared by all users.</p>
              </div>

              {error && (
                <div className="p-2 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs">{error}</div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full h-8 px-3 pr-9 text-xs border border-gray-200 rounded-lg focus:outline-none"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full h-8 px-3 pr-9 text-xs border border-gray-200 rounded-lg focus:outline-none"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 text-xs bg-[#1e3a5f] text-white rounded-lg hover:bg-[#0f2744] transition-colors font-medium disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Updating...
                  </span>
                ) : (
                  'Update System Password'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
