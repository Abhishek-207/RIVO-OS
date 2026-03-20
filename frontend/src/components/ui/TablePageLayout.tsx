/**
 * TablePageLayout - Reusable layout for paginated table pages.
 * Ensures consistent height that fills the available space.
 */

import type { ReactNode } from 'react'
import { Loader2, AlertCircle, X, Search, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Full-page loading spinner (for non-table pages like Dashboard).
 */
export function PageLoading() {
  return (
    <div className="h-full bg-white flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  )
}

interface PageErrorProps {
  message?: string
  entityName?: string
}

/**
 * Full-page error state for table pages.
 */
export function PageError({ message, entityName = 'data' }: PageErrorProps) {
  return (
    <div className="h-full bg-white flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600">Failed to load {entityName}</p>
        {message && <p className="text-sm text-gray-400 mt-1">{message}</p>}
      </div>
    </div>
  )
}

interface StatusErrorToastProps {
  message: string
  onClose: () => void
}

/**
 * Dismissible error toast for status/action errors.
 */
export function StatusErrorToast({ message, onClose }: StatusErrorToastProps) {
  return (
    <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs flex items-center gap-2">
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
      {message}
      <button
        onClick={onClose}
        className="ml-auto text-red-400 hover:text-red-600"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface TablePageLayoutProps {
  children: ReactNode
}

/**
 * Wrapper for page content that fills available height.
 * Use this as the root element of paginated table pages.
 */
export function TablePageLayout({ children }: TablePageLayoutProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {children}
    </div>
  )
}

interface TableCardProps {
  children: ReactNode
  className?: string
}

/**
 * Card container for tables that fills remaining height.
 * Contains the table and pagination.
 */
export function TableCard({ children, className = '' }: TableCardProps) {
  return (
    <div className={`mx-6 mb-6 flex-1 flex flex-col min-h-0 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      <div className="px-4 pt-4 flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

interface TableContainerProps {
  children: ReactNode
  isEmpty?: boolean
  emptyMessage?: string
}

/**
 * Container for the table that fills available space.
 * Shows empty message when no data.
 */
export function TableContainer({ children, isEmpty = false, emptyMessage = 'No items found' }: TableContainerProps) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
      {children}
      {isEmpty && (
        <div className="flex-1 flex items-center justify-center py-16">
          <p className="text-xs text-gray-500">{emptyMessage}</p>
        </div>
      )}
    </div>
  )
}

interface PageHeaderProps {
  title: string
  subtitle: string
  actionLabel?: string
  onAction?: () => void
  hideAction?: boolean
}

/**
 * Consistent page header with title, subtitle, and optional action button.
 */
export function PageHeader({ title, subtitle, actionLabel, onAction, hideAction }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-sm font-semibold text-gray-900">{title}</h1>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      {!hideAction && actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#0f2744] rounded-lg transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
      )}
    </div>
  )
}

interface StatusTab<T extends string> {
  value: T
  label: string
}

interface StatusTabsProps<T extends string> {
  tabs: StatusTab<T>[]
  value: T
  onChange: (value: T) => void
}

/**
 * Reusable status filter tabs component.
 * Pill-style tabs: gray container with white active pill + shadow.
 */
export function StatusTabs<T extends string>({ tabs, value, onChange }: StatusTabsProps<T>) {
  return (
    <div className="inline-flex items-center rounded-lg bg-gray-100 p-1 gap-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
            value === tab.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * Reusable search input component.
 * Styled with focus ring matching the brand color.
 */
export function SearchInput({ value, onChange, placeholder = 'Search...', className }: SearchInputProps) {
  return (
    <div className={cn('relative w-48', className)}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1e3a5f] transition-colors placeholder:text-gray-400"
      />
    </div>
  )
}
