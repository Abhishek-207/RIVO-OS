/**
 * SearchableSelect - Dropdown with built-in search/filter.
 *
 * Built on Radix Popover + cmdk for keyboard navigation,
 * type-ahead filtering, and accessible combobox behavior.
 */

import { useState, useRef, useEffect } from 'react'
import { Command } from 'cmdk'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchableSelectOption {
  value: string
  label: string
  /** Optional group/category for grouped rendering */
  group?: string
  /** Optional icon element (e.g., bank logo, flag) */
  icon?: React.ReactNode
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  /** Compact mode for inline/smaller selects */
  size?: 'sm' | 'md'
  /** Empty state message when no options match */
  emptyMessage?: string
  /** Minimum width for the popover dropdown (useful when the trigger is narrow) */
  popoverMinWidth?: number
  /** Custom display text for the trigger (when you want to show a shorter label than the option label) */
  displayValue?: (option: SearchableSelectOption) => string
  /** Hide the search input (useful for small option lists) */
  hideSearch?: boolean
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  disabled = false,
  className,
  size = 'md',
  emptyMessage = 'No results found.',
  popoverMinWidth,
  displayValue,
  hideSearch = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find(o => o.value === value)

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure the popover is rendered
      const t = setTimeout(() => inputRef.current?.focus(), 0)
      return () => clearTimeout(t)
    } else {
      setSearch('')
    }
  }, [open])

  // Check if options have groups
  const hasGroups = options.some(o => o.group)

  // Group options if needed
  const groupedOptions = hasGroups
    ? options.reduce<Record<string, SearchableSelectOption[]>>((acc, opt) => {
        const group = opt.group || ''
        if (!acc[group]) acc[group] = []
        acc[group].push(opt)
        return acc
      }, {})
    : null

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setOpen(false)
  }

  const isSm = size === 'sm'

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-between border border-gray-200 rounded-lg bg-white text-left',
            'focus:outline-none focus:border-[#1e3a5f]',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            isSm ? 'h-8 px-2 text-xs' : 'h-9 px-3 text-sm',
            className
          )}
        >
          <span className={cn('truncate', !selectedOption && 'text-gray-400')}>
            {selectedOption ? (
              <span className="flex items-center gap-2">
                {selectedOption.icon}
                <span className="truncate">{displayValue ? displayValue(selectedOption) : selectedOption.label}</span>
              </span>
            ) : (
              placeholder
            )}
          </span>
          <ChevronDown className={cn('shrink-0 opacity-50', isSm ? 'h-3 w-3 ml-1' : 'h-4 w-4 ml-2')} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
          style={{
            width: popoverMinWidth ? `${popoverMinWidth}px` : undefined,
            minWidth: popoverMinWidth
              ? undefined
              : hideSearch
                ? 'var(--radix-popover-trigger-width)'
                : 'max(var(--radix-popover-trigger-width), 260px)',
          }}
          sideOffset={4}
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={true} className="flex flex-col">
            {/* Search input */}
            {!hideSearch && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <Command.Input
                  ref={inputRef}
                  value={search}
                  onValueChange={setSearch}
                  placeholder={searchPlaceholder}
                  className="flex-1 text-sm outline-none placeholder:text-gray-400 bg-transparent"
                />
              </div>
            )}

            <Command.List className="max-h-60 overflow-y-auto p-1">
              <Command.Empty className="py-4 text-center text-xs text-gray-500">
                {emptyMessage}
              </Command.Empty>

              {groupedOptions
                ? Object.entries(groupedOptions).map(([group, groupOpts]) => (
                    <Command.Group
                      key={group}
                      heading={group}
                      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                    >
                      {groupOpts.map(option => (
                        <OptionItem
                          key={option.value}
                          option={option}
                          isSelected={value === option.value}
                          onSelect={handleSelect}
                          size={size}
                        />
                      ))}
                    </Command.Group>
                  ))
                : options.map(option => (
                    <OptionItem
                      key={option.value}
                      option={option}
                      isSelected={value === option.value}
                      onSelect={handleSelect}
                      size={size}
                    />
                  ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function OptionItem({
  option,
  isSelected,
  onSelect,
  size,
}: {
  option: SearchableSelectOption
  isSelected: boolean
  onSelect: (value: string) => void
  size: 'sm' | 'md'
}) {
  const isSm = size === 'sm'
  return (
    <Command.Item
      value={option.label}
      onSelect={() => onSelect(option.value)}
      className={cn(
        'flex items-center gap-2 rounded-md cursor-pointer',
        'data-[selected=true]:bg-gray-100',
        isSm ? 'px-2 py-1.5 text-xs' : 'px-2 py-2 text-sm',
        isSelected && 'bg-blue-50'
      )}
    >
      {option.icon && <span className="shrink-0">{option.icon}</span>}
      <span className="flex-1">{option.label}</span>
      {isSelected && <Check className={cn('shrink-0 text-[#1e3a5f]', isSm ? 'h-3 w-3' : 'h-4 w-4')} />}
    </Command.Item>
  )
}
