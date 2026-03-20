/**
 * Read-only template list for Mortgage Specialists (Toolbox > Templates).
 * Shows active templates that can be used in WhatsApp chats.
 */

import { useState, useCallback } from 'react'
import { Copy, X } from 'lucide-react'
import { formatRelativeDate } from '@/lib/dateUtils'
import { Pagination } from '@/components/Pagination'
import {
  TablePageLayout,
  TableCard,
  TableContainer,
  PageError,
  PageHeader,
  SearchInput,
} from '@/components/ui/TablePageLayout'
import { TableRowsSkeleton } from '@/components/ui/Skeleton'
import {
  useMessageTemplates,
  type MessageTemplate,
} from '@/hooks/useMessageTemplates'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'

const PAGE_SIZE = 10

export function TemplateListReadOnly() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null)

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }, [])

  const { inputValue, setInputValue } = useDebouncedSearch({
    initialValue: '',
    onSearch: handleSearchChange,
  })

  const { data: templates, isLoading, error } = useMessageTemplates({
    search: searchQuery || undefined,
    category: 'general',
  })

  // Client-side pagination
  const totalItems = templates?.length || 0
  const totalPages = Math.ceil(totalItems / PAGE_SIZE)
  const paginatedTemplates = (templates || []).slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch {
      // Copy failed silently
    }
  }


  if (error) return <PageError entityName="templates" message={(error as Error).message} />

  return (
    <TablePageLayout>
      <div className="px-6 py-4">
        <PageHeader
          title="Message Templates"
          subtitle="Browse templates to use in WhatsApp chats"
          hideAction
        />

        {/* Filters */}
        <div className="flex items-center gap-4 mt-4">
          <SearchInput
            value={inputValue}
            onChange={setInputValue}
            placeholder="Search templates..."
          />
        </div>
      </div>

      {/* Templates Table */}
      <TableCard>
        <TableContainer isEmpty={!isLoading && paginatedTemplates.length === 0} emptyMessage="No templates found">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-[40%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="w-[20%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
                <th className="w-[20%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                <th className="w-[20%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Updated</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <TableRowsSkeleton rows={8} columns={4} /> : paginatedTemplates.map((template) => (
                <tr
                  key={template.id}
                  onClick={() => setPreviewTemplate(template)}
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
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
                      {template.category_display}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-gray-500">{formatRelativeDate(template.created_at)}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-gray-500">{formatRelativeDate(template.updated_at)}</span>
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
          itemLabel="templates"
        />
      </TableCard>

      {/* Preview Side Panel */}
      {previewTemplate && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setPreviewTemplate(null)} />
          <div className="fixed right-0 top-0 h-full w-1/2 min-w-[480px] max-w-[800px] bg-white shadow-xl z-50 flex flex-col">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">{previewTemplate.name}</h2>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
                  {previewTemplate.category_display}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-[10px] text-gray-500 mb-1.5">Template Content:</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{previewTemplate.content}</p>
              </div>

              <p className="text-xs text-gray-500">
                Variables like {'{first_name}'} will be automatically replaced with client data when you use this template in chat.
              </p>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white px-6 py-4">
              <button
                onClick={() => {
                  handleCopy(previewTemplate.content)
                  setPreviewTemplate(null)
                }}
                className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a6f] transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Template
              </button>
            </div>
          </div>
        </>
      )}
    </TablePageLayout>
  )
}
