/**
 * ChannelSidePanel - Panel for creating and editing channels.
 */

import { useState, useEffect } from 'react'
import { X, AlertCircle, Loader2 } from 'lucide-react'
import {
  useChannel,
  useCreateChannel,
  useUpdateChannel,
} from '@/hooks/useChannels'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { SidePanelSkeleton } from '@/components/ui/Skeleton'

interface ChannelSidePanelProps {
  channelId: string
  onClose: () => void
}

export function ChannelSidePanel({ channelId, onClose }: ChannelSidePanelProps) {
  const isCreateMode = channelId === 'new'
  const { data: channel, isLoading, error } = useChannel(isCreateMode ? '' : channelId)

  const createMutation = useCreateChannel()
  const updateMutation = useUpdateChannel()

  // Fetch channel owners for dropdown
  const { data: channelOwners = [] } = useQuery({
    queryKey: ['channel-owners'],
    queryFn: async () => {
      const res = await api.get<{ items: { id: string; name: string; role: string }[] }>('/users/', { page_size: 200, status: 'active' })
      return (res.items || []).filter(u => u.role === 'channel_owner')
    },
  })

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isTrusted, setIsTrusted] = useState(false)
  const [slaMinutes, setSlaMinutes] = useState('')
  const [owner, setOwner] = useState('')
  const [monthlySpend, setMonthlySpend] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  // Populate form when channel data loads
  useEffect(() => {
    if (channel) {
      setName(channel.name)
      setDescription(channel.description || '')
      setIsTrusted(channel.is_trusted)
      setSlaMinutes(channel.default_sla_minutes?.toString() || '')
      setOwner(channel.owner || '')
      setMonthlySpend(channel.monthly_spend || '')
    }
  }, [channel])

  const handleSlaChange = (value: string) => {
    // Only allow non-negative numbers
    const num = parseInt(value)
    if (value === '' || (num >= 0 && !isNaN(num))) {
      setSlaMinutes(value)
    }
  }

  const handleSave = async () => {
    setSaveError(null)

    if (!name.trim()) {
      setSaveError('Name is required')
      return
    }

    try {
      if (isCreateMode) {
        await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          is_trusted: isTrusted,
          default_sla_minutes: slaMinutes ? parseInt(slaMinutes) : null,
          owner: owner || null,
          monthly_spend: monthlySpend || null,
        })
      } else {
        await updateMutation.mutateAsync({
          id: channelId,
          data: {
            name: name.trim(),
            description: description.trim(),
            is_trusted: isTrusted,
            default_sla_minutes: slaMinutes ? parseInt(slaMinutes) : null,
            owner: owner || null,
            monthly_spend: monthlySpend || null,
          },
        })
      }
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save channel')
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isLoading && !isCreateMode) {
    return (
      <>
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
        <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-xl z-50 flex flex-col">
          <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">Edit Channel</h2>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <SidePanelSkeleton variant="channel" />
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
            <p className="text-gray-600">Failed to load channel</p>
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
            {isCreateMode ? 'New Channel' : 'Edit Channel'}
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

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]"
              placeholder="Enter channel name"
            />
          </div>

          {/* Owner */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Channel Owner</label>
            <SearchableSelect
              value={owner}
              onChange={setOwner}
              options={channelOwners.map(u => ({ value: u.id, label: u.name }))}
              placeholder="Select..."
              searchPlaceholder="Search owner..."
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <SearchableSelect
              value={isTrusted ? 'trusted' : 'untrusted'}
              onChange={(val) => setIsTrusted(val === 'trusted')}
              options={[
                { value: 'trusted', label: 'Trusted' },
                { value: 'untrusted', label: 'Untrusted' },
              ]}
              hideSearch
            />
          </div>

          {/* SLA */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Default SLA (minutes)</label>
            <input
              type="number"
              value={slaMinutes}
              onChange={(e) => handleSlaChange(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]"
              placeholder="Enter default SLA"
              min="0"
            />
          </div>

          {/* Marketing Spend */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Marketing Spend (AED)</label>
            <input
              type="number"
              value={monthlySpend}
              onChange={(e) => setMonthlySpend(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f]"
              placeholder="Monthly marketing spend"
              min="0"
              step="0.01"
            />
          </div>
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
              {isCreateMode ? 'Create Channel' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
