/**
 * Lead Side Panel Component.
 * Slide-in panel for viewing/editing lead details with WhatsApp tab.
 */

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle, UserPlus } from 'lucide-react'
import { useLead, useUpdateLead, useConvertLeadToClient, useChangeLeadStatus } from '@/hooks/useLeads'
import { useAuth } from '@/contexts/AuthContext'
import { leadToast } from '@/lib/toastMessages'
import { SLACountdown } from '@/components/SLACountdown'
import { FormField } from '@/components/ui/FormField'
import { SidePanelWrapper } from '@/components/ui/SidePanelWrapper'
import { SidePanelSkeleton } from '@/components/ui/Skeleton'
import { LeadWhatsAppTab } from '@/components/whatsapp/LeadWhatsAppTab'
import type { LeadStatus } from '@/types/mortgage'
import { cn } from '@/lib/utils'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { SidePanelTabs } from '@/components/ui/SidePanelTabs'
import type { SidePanelTab } from '@/components/ui/SidePanelTabs'

type TabType = 'details' | 'whatsapp'

const LEAD_TABS: SidePanelTab<TabType>[] = [
  { value: 'details', label: 'Details' },
  { value: 'whatsapp', label: 'WhatsApp', activeColor: '#00A884' },
]

const statusColors: Record<LeadStatus, string> = {
  active: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
}

interface LeadSidePanelProps {
  leadId: string | null
  onClose: () => void
}

export function LeadSidePanel({ leadId, onClose }: LeadSidePanelProps) {
  const { can } = useAuth()
  const { data: lead, isLoading, error } = useLead(leadId || '')
  const updateMutation = useUpdateLead()
  const convertMutation = useConvertLeadToClient()
  const changeStatusMutation = useChangeLeadStatus()

  const isReadOnly = !can('update', 'leads')
  const [activeTab, setActiveTab] = useState<TabType>('details')

  // Local form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [intent, setIntent] = useState('')
  const [status, setStatus] = useState<LeadStatus>('active')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null)

  // Auto-dismiss errors after 3 seconds
  useEffect(() => {
    if (!saveError) return
    const t = setTimeout(() => setSaveError(null), 3000)
    return () => clearTimeout(t)
  }, [saveError])

  useEffect(() => {
    if (!whatsAppError) return
    const t = setTimeout(() => setWhatsAppError(null), 3000)
    return () => clearTimeout(t)
  }, [whatsAppError])

  // Sync form state when lead data changes
  useEffect(() => {
    if (lead) {
      setName(lead.name)
      setPhone(lead.phone)
      setEmail(lead.email || '')
      setIntent(lead.intent || '')
      setStatus(lead.status)
    }
  }, [lead])

  const handleSave = async () => {
    if (!leadId) return

    try {
      await updateMutation.mutateAsync({
        id: leadId,
        data: { name, phone, email: email || undefined, intent: intent || undefined },
      })
      setSaveError(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!leadId || !lead) return

    setStatus(newStatus)

    try {
      await changeStatusMutation.mutateAsync({ id: leadId, status: newStatus })
      setSaveError(null)
      leadToast.statusChanged(newStatus)
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update status')
      setStatus(lead.status)
    }
  }

  const handleConvert = async () => {
    if (!leadId) return

    try {
      await convertMutation.mutateAsync(leadId)
      setSaveError(null)
      leadToast.converted()
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to convert lead')
    }
  }

  const getSourceDisplay = () => {
    if (!lead?.source) return '-'
    const { name, channel_name } = lead.source
    return name && channel_name ? `${name} (${channel_name})` : name || channel_name || '-'
  }

  if (!leadId) return null

  return (
    <SidePanelWrapper onClose={onClose}>
      {/* Header */}
      <div className="px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {lead?.name || 'Lead Details'}
            </h2>
            {lead && (
              lead.converted_client ? (
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-100 text-emerald-700">
                  Converted
                </span>
              ) : lead.status === 'declined' ? (
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700">
                  Declined
                </span>
              ) : isReadOnly ? (
                <span className={cn('px-2 py-0.5 text-xs font-medium rounded', statusColors[status])}>
                  {status === 'active' ? 'Active' : 'Declined'}
                </span>
              ) : (
                <SearchableSelect
                  value={status}
                  onChange={(val) => handleStatusChange(val as LeadStatus)}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'declined', label: 'Declined' },
                  ]}
                  hideSearch
                  disabled={changeStatusMutation.isPending}
                  size="sm"
                  className={cn('border-0 font-medium w-auto', statusColors[status])}
                />
              )
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* SLA */}
        {lead && lead.sla_timer && lead.sla_timer.display && lead.sla_timer.display !== 'Completed' && (
          <div className="mt-3">
            <SLACountdown
              status={lead.sla_timer.is_overdue ? 'overdue' : 'ok'}
              remainingHours={lead.sla_timer.remaining_minutes != null ? lead.sla_timer.remaining_minutes / 60 : null}
              displayText={lead.sla_timer.display}
              label="Lead SLA"
              size="sm"
            />
          </div>
        )}

        {/* WhatsApp Error */}
        {whatsAppError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {whatsAppError}
            <button onClick={() => setWhatsAppError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Tabs */}
        {lead && (
          <div className="mt-4">
            <SidePanelTabs tabs={LEAD_TABS} value={activeTab} onChange={setActiveTab} />
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'details' && (
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <SidePanelSkeleton variant="lead" />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
              <p className="text-sm text-gray-600">Failed to load lead</p>
            </div>
          ) : lead ? (
            <div className="space-y-4">
              {saveError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  {saveError}
                  <button onClick={() => setSaveError(null)} className="ml-auto text-red-400 hover:text-red-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Name *">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isReadOnly}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f] disabled:bg-gray-50"
                  />
                </FormField>
                <FormField label="Phone *">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isReadOnly}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f] disabled:bg-gray-50"
                  />
                </FormField>
                <FormField label="Email" className="col-span-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Optional"
                    disabled={isReadOnly}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f] disabled:bg-gray-50"
                  />
                </FormField>
              </div>

              <FormField label="Intent">
                <textarea
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  placeholder="Lead's interest or requirements..."
                  rows={3}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f] resize-none disabled:bg-gray-50"
                />
              </FormField>

              <FormField label="Source">
                <p className="text-sm text-gray-600">{getSourceDisplay()}</p>
              </FormField>
            </div>
          ) : null}
        </div>
      )}

      {/* WhatsApp Tab */}
      {activeTab === 'whatsapp' && lead && (
        <div className="flex-1 overflow-hidden px-4 py-2">
          <LeadWhatsAppTab leadId={leadId!} leadInfo={{ name: lead.name, phone: lead.phone, email: lead.email || undefined }} onError={setWhatsAppError} />
        </div>
      )}

      {/* Footer */}
      {activeTab === 'details' && lead && lead.status === 'active' && !lead.converted_client && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 space-y-2">
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          )}
          {can('create', 'clients') && (
            <button
              onClick={handleConvert}
              disabled={convertMutation.isPending}
              className="w-full py-2.5 border border-[#1e3a5f] text-[#1e3a5f] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {convertMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Convert to Client
                </>
              )}
            </button>
          )}
        </div>
      )}
    </SidePanelWrapper>
  )
}
