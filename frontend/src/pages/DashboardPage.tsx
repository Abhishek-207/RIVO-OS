import { useState } from 'react'
import { Check, Loader2, Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardReminders, useCompleteReminder } from '@/hooks/useAudit'
import { useAnalyticsDashboard } from '@/hooks/useAnalytics'
import { ClientSidePanel } from '@/components/ClientSidePanel'
import { CaseSidePanel } from '@/components/CaseSidePanel'
import { LeadSidePanel } from '@/components/LeadSidePanel'
import {
  TablePageLayout,
  TableCard,
  TableContainer,
  PageLoading,
} from '@/components/ui/TablePageLayout'
import { cn } from '@/lib/utils'
import { formatCurrencyAED } from '@/lib/formatters'
import { formatRelativeDate, formatTime } from '@/lib/dateUtils'
import type { NotableType } from '@/types/audit'
import type { AnalyticsBreakdownRow } from '@/types/analytics'
import type { CaseStage } from '@/types/mortgage'

const stageColors: Record<CaseStage, string> = {
  processing: 'bg-blue-50 text-blue-700',
  submitted_to_bank: 'bg-blue-100 text-blue-700',
  under_review: 'bg-blue-200 text-blue-800',
  submitted_to_credit: 'bg-indigo-100 text-indigo-700',
  preapproved: 'bg-teal-100 text-teal-700',
  valuation_initiated: 'bg-indigo-200 text-indigo-800',
  valuation_report_received: 'bg-violet-100 text-violet-700',
  fol_requested: 'bg-violet-200 text-violet-800',
  fol_received: 'bg-purple-100 text-purple-700',
  fol_signed: 'bg-purple-200 text-purple-800',
  disbursed: 'bg-emerald-100 text-emerald-700',
  final_documents: 'bg-emerald-200 text-emerald-800',
  mc_received: 'bg-green-100 text-green-700',
  sales_queries: 'bg-orange-100 text-orange-700',
  credit_queries: 'bg-orange-100 text-orange-700',
  disbursal_queries: 'bg-orange-100 text-orange-700',
  on_hold: 'bg-amber-100 text-amber-700',
  property_transferred: 'bg-green-200 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  not_proceeding: 'bg-gray-200 text-gray-500',
}

function getDefaultDateRange() {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

/* ── Small components ─────────────────────────────────────────────── */

function KPICard({ label, value, sub, alert, onClick }: {
  label: string
  value: string | number
  sub?: string
  alert?: boolean
  onClick?: () => void
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'bg-white border border-gray-100 rounded-xl p-4 text-left',
        onClick && 'hover:bg-gray-50/50 transition-colors cursor-pointer'
      )}
    >
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={cn('text-lg font-semibold', alert ? 'text-red-600' : 'text-gray-900')}>{value}</div>
      {sub && <div className={cn('text-xs mt-0.5', alert ? 'text-red-400' : 'text-gray-400')}>{sub}</div>}
    </Wrapper>
  )
}

/* ── Table helpers ────────────────────────────────────────────────── */

function TH({ children, align = 'right' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={cn('pb-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider', align === 'left' ? 'text-left' : 'text-right')}>
      {children}
    </th>
  )
}

function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('py-3 px-4 text-xs text-right text-gray-900', className)}>{children}</td>
}

function formatMinutes(mins: number | null | undefined): string {
  if (mins == null) return '\u2014'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function ChannelTable({ rows, onRowClick }: { rows: AnalyticsBreakdownRow[]; onRowClick: (row: AnalyticsBreakdownRow) => void }) {
  if (!rows.length) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <TH align="left">Channel</TH>
            <TH>Leads</TH>
            <TH>Clients</TH>
            <TH>Cases</TH>
            <TH>Spend</TH>
            <TH>Disbursed</TH>
            <TH>CPL</TH>
            <TH>Breaches</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onRowClick(r)} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer">
              <td className="py-3 px-4 text-xs font-medium text-gray-900">{r.name}</td>
              <TD>{r.leads_count}</TD>
              <TD>{r.clients_count}</TD>
              <TD>{r.cases_count}</TD>
              <TD>{r.monthly_spend ? formatCurrencyAED(r.monthly_spend) : '\u2014'}</TD>
              <TD>{formatCurrencyAED(r.total_disbursed)}</TD>
              <TD>{r.monthly_spend && r.leads_count > 0 ? formatCurrencyAED(parseFloat(r.monthly_spend) / r.leads_count) : '\u2014'}</TD>
              <TD>{r.sla_breaches}</TD>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SourceTable({ rows, onRowClick }: { rows: AnalyticsBreakdownRow[]; onRowClick: (row: AnalyticsBreakdownRow) => void }) {
  if (!rows.length) return null

  const hasLeads = rows.some((r) => r.leads_count > 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <TH align="left">Source</TH>
            <TH>Clients</TH>
            <TH>Cases</TH>
            <TH>Disbursed</TH>
            {hasLeads && <TH>Leads</TH>}
            {hasLeads && <TH>Converted</TH>}
            {hasLeads && <TH>Declined</TH>}
            {hasLeads && <TH>Avg Response</TH>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onRowClick(r)} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer">
              <td className="py-3 px-4 text-xs font-medium text-gray-900">{r.name}</td>
              <TD>{r.clients_count}</TD>
              <TD>{r.cases_count}</TD>
              <TD>{formatCurrencyAED(r.total_disbursed)}</TD>
              {hasLeads && <TD>{r.leads_count}</TD>}
              {hasLeads && <TD className="text-green-600">{r.converted_pct ?? 0}%</TD>}
              {hasLeads && <TD className="text-red-500">{r.declined_pct ?? 0}%</TD>}
              {hasLeads && <TD>{formatMinutes(r.avg_response_minutes)}</TD>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Analytics Dashboard ──────────────────────────────────────────── */

function AnalyticsDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState(getDefaultDateRange)

  const { data, isLoading } = useAnalyticsDashboard(dateRange.start, dateRange.end)

  if (isLoading) return <PageLoading />

  const o = data?.overall

  return (
    <TablePageLayout>
      <div className="px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Welcome back, {user?.name?.split(' ')[0] ?? 'Admin'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((r) => ({ ...r, start: e.target.value }))}
              className="h-8 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((r) => ({ ...r, end: e.target.value }))}
              className="h-8 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white"
            />
          </div>
        </div>

        {o && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <KPICard
              label="Disbursed"
              value={formatCurrencyAED(o.total_disbursed)}
              sub={`${o.loans_count} loans`}
              onClick={() => navigate(`/cases?stage=disbursed&start_date=${dateRange.start}&end_date=${dateRange.end}`)}
            />
            <KPICard label="Revenue" value={formatCurrencyAED(o.revenue)} />
            <KPICard
              label="Conversion"
              value={o.total_leads > 0 ? `${((o.loans_count / o.total_leads) * 100).toFixed(1)}%` : '0%'}
              sub={`${o.loans_count} of ${o.total_leads} leads`}
            />
            <KPICard label="SLA Breaches" value={o.sla_breaches} alert={o.sla_breaches > 0} />
            {data.pipeline && (
              <>
                <KPICard label="Active Leads" value={data.pipeline.active_leads} onClick={() => navigate('/leads?status=active')} />
                <KPICard label="Active Clients" value={data.pipeline.active_clients} onClick={() => navigate('/clients?status=active')} />
                <KPICard label="Active Cases" value={data.pipeline.active_cases} onClick={() => navigate('/cases')} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Stage pipeline */}
      {o && data.stage_funnel && data.stage_funnel.length > 0 && (
        <div className="mx-6 mb-4 bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Case Pipeline</span>
            <span className="text-xs text-gray-400">{data.stage_funnel.reduce((sum, s) => sum + s.count, 0)} active</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.stage_funnel.map((s) => (
              <button
                key={s.stage_key}
                onClick={() => navigate(`/cases?stage=${s.stage_key}`)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-80',
                  stageColors[s.stage_key as CaseStage] || 'bg-gray-100 text-gray-700'
                )}
              >
                {s.stage}
                <span className="font-semibold">{s.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Breakdown table */}
      {o && (
        <TableCard>
          <TableContainer isEmpty={data.breakdown.length === 0} emptyMessage="No data for this period">
            {data.breakdown_type === 'source'
              ? <SourceTable rows={data.breakdown} onRowClick={(row) => navigate(`/cases?source=${row.id}&start_date=${dateRange.start}&end_date=${dateRange.end}`)} />
              : <ChannelTable rows={data.breakdown} onRowClick={(row) => navigate(`/cases?channel=${row.id}&start_date=${dateRange.start}&end_date=${dateRange.end}`)} />}
          </TableContainer>
        </TableCard>
      )}
    </TablePageLayout>
  )
}


/* ── Reminders Dashboard (MS role) ────────────────────────────────── */

function RemindersDashboard() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [selectedCase, setSelectedCase] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<string | null>(null)

  const { data: reminders, isLoading } = useDashboardReminders(true)
  const completeMutation = useCompleteReminder()

  const handleNavigate = (type: NotableType, id: string) => {
    if (type === 'client') setSelectedClient(id)
    else if (type === 'case') setSelectedCase(id)
    else if (type === 'lead') setSelectedLead(id)
  }

  const handleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    completeMutation.mutate(id)
  }

  const formatReminderTime = (timeStr: string | null) => {
    if (!timeStr) return ''
    return ` at ${formatTime(timeStr)}`
  }

  if (isLoading) return <PageLoading />

  return (
    <TablePageLayout>
      <div className="px-6 py-4">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Reminders</h1>
          <p className="text-xs text-gray-500 mt-0.5">Your pending follow-ups</p>
        </div>
      </div>

      <TableCard>
        <TableContainer isEmpty={!reminders?.length} emptyMessage="No reminders">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-1/4 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Client</th>
                <th className="w-1/4 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Case</th>
                <th className="w-1/4 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Note</th>
                <th className="w-1/4 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Due</th>
                <th className="w-12 text-left pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {reminders?.map((reminder) => (
                <tr
                  key={reminder.id}
                  onClick={() => handleNavigate(reminder.notable_type, reminder.notable_id)}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <td className="py-3">
                    <span className="text-xs font-medium text-gray-900">{reminder.client_name ?? reminder.notable_name}</span>
                  </td>
                  <td className="py-3">
                    {reminder.case_bank ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                        <Building2 className="h-3 w-3 text-gray-400" />
                        {reminder.case_bank}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">{'\u2014'}</span>
                    )}
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-gray-600 truncate block">{reminder.note_text}</span>
                  </td>
                  <td className="py-3">
                    <span className={cn('text-xs', reminder.is_overdue ? 'text-red-600' : 'text-gray-500')}>
                      {formatRelativeDate(reminder.reminder_date)}{formatReminderTime(reminder.reminder_time)}
                      {reminder.is_overdue && ' \u2022 Overdue'}
                    </span>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={(e) => handleComplete(reminder.id, e)}
                      disabled={completeMutation.isPending && completeMutation.variables === reminder.id}
                      className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    >
                      {completeMutation.isPending && completeMutation.variables === reminder.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>
      </TableCard>

      {selectedClient && (
        <ClientSidePanel clientId={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
      <CaseSidePanel caseId={selectedCase} isOpen={!!selectedCase} onClose={() => setSelectedCase(null)} />
      <LeadSidePanel leadId={selectedLead} onClose={() => setSelectedLead(null)} />
    </TablePageLayout>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const showAnalytics = user?.role === 'admin' || user?.role === 'channel_owner'

  if (showAnalytics) return <AnalyticsDashboard />
  return <RemindersDashboard />
}
