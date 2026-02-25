/**
 * Template list page for team operators (TL, MS, PO).
 */

import { useState, useEffect } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/utils'
import { Pagination } from '@/components/Pagination'
import { TablePageLayout, TableCard, TableContainer, PageLoading, PageError, StatusErrorToast } from '@/components/ui/TablePageLayout'
import {
  useMessageTemplates,
  useDeleteTemplate,
  type MessageTemplate,
} from '@/hooks/useMessageTemplates'
import { TemplateForm } from './TemplateForm'

const STATUS_TABS: { value: 'all' | 'active' | 'inactive'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const TYPE_TABS: { value: '' | 'system' | 'general'; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'system', label: 'System' },
  { value: 'general', label: 'General' },
]

const PAGE_SIZE = 10

export function TemplateList() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [categoryFilter, setCategoryFilter] = useState<'' | 'system' | 'general'>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState<MessageTemplate | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: templates, isLoading, error, refetch } = useMessageTemplates({
    search: searchQuery || undefined,
    category: categoryFilter || undefined,
  })
  const deleteMutation = useDeleteTemplate()

  const filteredTemplates = (templates || []).filter(template => {
    if (statusFilter === 'active') return template.is_active
    if (statusFilter === 'inactive') return !template.is_active
    return true
  })

  const totalItems = filteredTemplates.length
  const totalPages = Math.ceil(totalItems / PAGE_SIZE)
  const paginatedTemplates = filteredTemplates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMutation.mutateAsync(pendingDelete.id)
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to delete template')
    } finally {
      setPendingDelete(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const getTriggerLabel = (template: MessageTemplate) => {
    if (template.category !== 'system') return null
    if (template.trigger_type === 'referrer_update') return 'Referrer Update'
    if (!template.trigger_value) return null
    const prefix = template.trigger_type === 'case_stage' ? 'Stage' : 'Status'
    // Convert snake_case to Title Case
    const value = template.trigger_value
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    return `${prefix}: ${value}`
  }

  if (isLoading) return <PageLoading />
  if (error) return <PageError entityName="templates" message={(error as Error).message} />

  return (
    <TablePageLayout>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Message Templates</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage WhatsApp message templates</p>
          </div>
          <button
            onClick={() => setSelectedTemplateId('new')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#0f2744] rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Template
          </button>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 border-b border-gray-200">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); setCurrentPage(1) }}
                className={cn(
                  'px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
                  statusFilter === tab.value
                    ? 'border-[#1e3a5f] text-[#1e3a5f]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value as '' | 'system' | 'general'); setCurrentPage(1) }}
            className="h-8 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white"
          >
            {TYPE_TABS.map((tab) => (
              <option key={tab.value} value={tab.value}>{tab.label}</option>
            ))}
          </select>
        </div>
      </div>

      {statusError && (
        <StatusErrorToast message={statusError} onClose={() => setStatusError(null)} />
      )}

      <TableCard>
        <TableContainer isEmpty={paginatedTemplates.length === 0} emptyMessage="No templates found">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-[30%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="w-[12%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                <th className="w-[22%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Trigger</th>
                <th className="w-[14%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Updated</th>
                <th className="w-[10%] text-right pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTemplates.map((template) => {
                const triggerLabel = getTriggerLabel(template)
                return (
                  <tr
                    key={template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3">
                      <div>
                        <span className="text-xs font-medium text-gray-900 block">{template.name}</span>
                        <span className="text-[10px] text-gray-500 truncate block max-w-xs">
                          {template.content.slice(0, 50)}{template.content.length > 50 ? '...' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded inline-flex items-center gap-1',
                        template.category === 'system'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      )}>
                        {template.category_display}
                      </span>
                    </td>
                    <td className="py-3">
                      {triggerLabel ? (
                        <span className="text-xs text-gray-600">{triggerLabel}</span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-gray-500">{formatDate(template.updated_at)}</span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setPendingDelete(template)
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableContainer>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          itemLabel="templates"
        />
      </TableCard>

      {selectedTemplateId && (
        <TemplateForm
          template={selectedTemplateId === 'new' ? null : templates?.find(t => t.id === selectedTemplateId)}
          onClose={() => setSelectedTemplateId(null)}
          onSuccess={() => refetch()}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete Template"
        message={`Are you sure you want to delete "${pendingDelete?.name}"?`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </TablePageLayout>
  )
}
