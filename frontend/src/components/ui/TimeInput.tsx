/**
 * TimeInput - Styled time picker using Radix Popover with hour/minute grid + AM/PM toggle.
 *
 * Replaces native <input type="time"> with a popover-based selector
 * matching the DateInput visual language.
 * Accepts and emits HH:mm strings (24-hour format internally).
 */

import { useState } from 'react'
import { Clock } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'

interface TimeInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  size?: 'sm' | 'md'
}

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function to24(h12: number, period: 'AM' | 'PM'): number {
  if (h12 === 12) return period === 'AM' ? 0 : 12
  return period === 'AM' ? h12 : h12 + 12
}

function to12(h24: number): { h12: number; period: 'AM' | 'PM' } {
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24
  return { h12, period }
}

function formatDisplay(value: string): string {
  if (!value) return ''
  const [h, m] = value.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return value
  const { h12, period } = to12(h)
  return `${h12}:${pad(m)} ${period}`
}

export function TimeInput({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = 'Pick a time',
  size = 'md',
}: TimeInputProps) {
  const [open, setOpen] = useState(false)

  const isSm = size === 'sm'

  const [selectedHour24, selectedMinute] = value
    ? value.split(':').map(Number)
    : [NaN, NaN]

  const { h12: selectedH12, period: selectedPeriod } = isNaN(selectedHour24)
    ? { h12: NaN, period: 'AM' as const }
    : to12(selectedHour24)

  const [period, setPeriod] = useState<'AM' | 'PM'>(
    isNaN(selectedHour24) ? 'AM' : selectedPeriod
  )

  const handleHourSelect = (h12: number) => {
    const h24 = to24(h12, period)
    const min = isNaN(selectedMinute) ? 0 : selectedMinute
    onChange(`${pad(h24)}:${pad(min)}`)
  }

  const handleMinuteSelect = (m: number) => {
    const h24 = isNaN(selectedHour24) ? to24(9, period) : selectedHour24
    onChange(`${pad(h24)}:${pad(m)}`)
  }

  const handlePeriodToggle = (newPeriod: 'AM' | 'PM') => {
    setPeriod(newPeriod)
    if (!isNaN(selectedHour24)) {
      const h24 = to24(selectedH12, newPeriod)
      onChange(`${pad(h24)}:${pad(isNaN(selectedMinute) ? 0 : selectedMinute)}`)
    }
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
          <Clock className={cn('shrink-0 text-gray-400', isSm ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
          <span className={cn('truncate', !value && 'text-gray-400')}>
            {value ? formatDisplay(value) : placeholder}
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 bg-white rounded-lg border border-gray-200 shadow-lg p-2 w-[200px]"
          sideOffset={4}
          align="start"
        >
          {/* AM/PM toggle */}
          <div className="flex mb-2 bg-gray-100 rounded-md p-0.5">
            {(['AM', 'PM'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodToggle(p)}
                className={cn(
                  'flex-1 py-1 text-xs font-medium rounded transition-colors',
                  period === p
                    ? 'bg-[#1e3a5f] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex gap-2 max-h-48 overflow-hidden">
            {/* Hours column */}
            <div className="flex-1 overflow-y-auto">
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1 text-center">Hour</div>
              <div className="space-y-0.5">
                {HOURS_12.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleHourSelect(h)}
                    className={cn(
                      'w-full px-2 py-1 text-xs rounded transition-colors text-center',
                      h === selectedH12 && period === selectedPeriod
                        ? 'bg-[#1e3a5f] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes column */}
            <div className="flex-1 overflow-y-auto">
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1 text-center">Min</div>
              <div className="space-y-0.5">
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMinuteSelect(m)}
                    className={cn(
                      'w-full px-2 py-1 text-xs rounded transition-colors text-center',
                      m === selectedMinute
                        ? 'bg-[#1e3a5f] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    :{pad(m)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
