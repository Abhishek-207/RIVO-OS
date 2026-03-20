/**
 * DateInput - Calendar date picker using Radix Popover + react-day-picker.
 *
 * Visually matches SearchableSelect: a trigger button that opens
 * a popover with a navigable calendar grid.
 * Accepts and emits ISO date strings (YYYY-MM-DD).
 */

import { useState } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { DayPicker } from 'react-day-picker'
import { format, parse, isValid, isBefore, isAfter, startOfDay } from 'date-fns'
import { cn } from '@/lib/utils'

interface DateInputProps {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  disabled?: boolean
  className?: string
  placeholder?: string
  /** Compact mode for inline/smaller inputs */
  size?: 'sm' | 'md'
}

function toDate(iso: string): Date | undefined {
  if (!iso) return undefined
  const d = parse(iso, 'yyyy-MM-dd', new Date())
  return isValid(d) ? d : undefined
}

function toISO(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function DateInput({
  value,
  onChange,
  min,
  max,
  disabled = false,
  className,
  placeholder = 'Pick a date',
  size = 'md',
}: DateInputProps) {
  const [open, setOpen] = useState(false)

  const selected = toDate(value)
  const minDate = toDate(min)
  const maxDate = toDate(max)

  const isSm = size === 'sm'

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(toISO(day))
    }
    setOpen(false)
  }

  const disabledMatcher = (day: Date) => {
    const d = startOfDay(day)
    if (minDate && isBefore(d, startOfDay(minDate))) return true
    if (maxDate && isAfter(d, startOfDay(maxDate))) return true
    return false
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'w-full flex items-center gap-2 border border-gray-200 rounded-lg bg-white text-left',
            'focus:outline-none focus:border-[#1e3a5f]',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            isSm ? 'h-8 px-2 text-xs' : 'h-9 px-3 text-sm',
            className,
          )}
        >
          <CalendarIcon className={cn('shrink-0 text-gray-400', isSm ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
          <span className={cn('truncate', !selected && 'text-gray-400')}>
            {selected ? format(selected, 'dd-MM-yyyy') : placeholder}
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 bg-white rounded-lg border border-gray-200 shadow-lg p-3"
          sideOffset={4}
          align="start"
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected || new Date()}
            disabled={disabledMatcher}
            showOutsideDays
            classNames={{
              root: 'text-sm',
              months: 'flex flex-col',
              month_caption: 'flex items-center justify-center py-1 relative',
              caption_label: 'text-sm font-medium text-gray-900',
              nav: 'flex items-center justify-between absolute inset-x-0',
              button_previous: 'p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900',
              button_next: 'p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900',
              weekdays: 'flex',
              weekday: 'w-8 text-center text-xs font-medium text-gray-400 py-1',
              week: 'flex',
              day: 'w-8 h-8 text-center',
              day_button: 'w-8 h-8 rounded-md text-xs hover:bg-gray-100 transition-colors inline-flex items-center justify-center',
              selected: '!bg-[#1e3a5f] !text-white rounded-md hover:!bg-[#2d4a6f]',
              today: 'font-bold text-[#1e3a5f]',
              outside: 'text-gray-300',
              disabled: 'text-gray-200 cursor-not-allowed hover:bg-transparent',
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
