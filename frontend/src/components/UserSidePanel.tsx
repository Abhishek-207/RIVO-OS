/**
 * UserSidePanel - Panel for creating and editing users.
 *
 * Create mode: Admin enters name, email, role. System generates username and sends invite.
 * Edit mode: Admin can update name, role, and status.
 */

import { useState, useEffect } from 'react'
import { X, AlertCircle, Loader2, Mail, Check } from 'lucide-react'
import {
  useUser,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
  useReactivateUser,
  useResendInvite,
} from '@/hooks/useUsers'
import type { UserRole } from '@/types/auth'
import { cn } from '@/lib/utils'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { SidePanelSkeleton } from '@/components/ui/Skeleton'

interface UserSidePanelProps {
  userId: string
  onClose: () => void
}

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'channel_owner', label: 'Channel Owner' },
  { value: 'mortgage_specialist', label: 'Mortgage Specialist' },
  { value: 'process_owner', label: 'Process Owner' },
]

export function UserSidePanel({ userId, onClose }: UserSidePanelProps) {
  const isCreateMode = userId === 'new'
  const { data: user, isLoading, error } = useUser(isCreateMode ? '' : userId)

  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const deactivateMutation = useDeactivateUser()
  const reactivateMutation = useReactivateUser()
  const resendInviteMutation = useResendInvite()

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('mortgage_specialist')
  const [isActive, setIsActive] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(false)

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setRole(user.role)
      setIsActive(user.is_active)
    }
  }, [user])

  const handleSave = async () => {
    setSaveError(null)

    if (!name.trim()) {
      setSaveError('Name is required')
      return
    }

    if (isCreateMode && !email.trim()) {
      setSaveError('Email is required')
      return
    }

    try {
      if (isCreateMode) {
        await createMutation.mutateAsync({ name, email, role })
        setInviteSent(true)
        // Auto-close after showing success
        setTimeout(() => onClose(), 2000)
        return
      }

      // Update user details
      await updateMutation.mutateAsync({
        id: userId,
        data: { name, role },
      })

      // Handle status change
      if (user && user.is_active !== isActive) {
        if (isActive) {
          await reactivateMutation.mutateAsync(userId)
        } else {
          await deactivateMutation.mutateAsync(userId)
        }
      }
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save user')
    }
  }

  const handleResendInvite = async () => {
    if (!user) return
    setSaveError(null)
    try {
      await resendInviteMutation.mutateAsync(user.id)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to resend invite')
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending ||
    deactivateMutation.isPending || reactivateMutation.isPending

  if (isLoading && !isCreateMode) {
    return (
      <>
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
        <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-xl z-50 flex flex-col">
          <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">Edit User</h2>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <SidePanelSkeleton variant="user" />
        </div>
      </>
    )
  }

  if (error && !isCreateMode) {
    return (
      <>
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
        <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-xl z-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-600">Failed to load user</p>
          </div>
        </div>
      </>
    )
  }

  // Success state after creating user
  if (inviteSent) {
    return (
      <>
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
        <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-xl z-50 flex flex-col">
          <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">New User</h2>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">User Created</p>
              <p className="text-xs text-gray-500">
                An invitation email has been sent to <strong>{email}</strong>.
                They will need to set their password before logging in.
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">
            {isCreateMode ? 'New User' : 'Edit User'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Save Error */}
          {saveError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {saveError}
            </div>
          )}

          {/* Invite info for unverified users in edit mode */}
          {!isCreateMode && user && !user.is_verified && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs text-amber-700 mb-2">
                This user has not set their password yet.
              </p>
              <button
                onClick={handleResendInvite}
                disabled={resendInviteMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50"
              >
                {resendInviteMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : resendInviteMutation.isSuccess ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Mail className="h-3 w-3" />
                )}
                {resendInviteMutation.isSuccess ? 'Invite Sent' : 'Resend Invite'}
              </button>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]"
              placeholder="Enter full name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email {isCreateMode && <span className="text-red-500">*</span>}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isCreateMode}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f] disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="user@example.com"
            />
            {isCreateMode && (
              <p className="text-xs text-gray-400 mt-1">
                An invitation email will be sent to set their password
              </p>
            )}
          </div>

          {/* Username (read-only in edit mode) */}
          {!isCreateMode && user && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={user.username}
                disabled
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Auto-generated, cannot be changed
              </p>
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <SearchableSelect
              value={role}
              onChange={(val) => setRole(val as UserRole)}
              options={roleOptions}
              hideSearch
            />
          </div>

          {/* Status (only for edit mode) */}
          {!isCreateMode && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                    isActive
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive(false)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                    !isActive
                      ? 'bg-gray-200 text-gray-600 border-gray-300'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  Inactive
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 px-4 py-2 text-xs bg-[#1e3a5f] text-white rounded-lg hover:bg-[#0f2744] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              {isCreateMode ? 'Create & Send Invite' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
