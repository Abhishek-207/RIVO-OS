/**
 * SidePanelTabs - Tab bar for side panel navigation.
 *
 * Pill-style tabs matching the StatusTabs design language.
 * Supports an optional custom active color per tab (e.g., WhatsApp green).
 */

import { cn } from '@/lib/utils'

export interface SidePanelTab<T extends string> {
  value: T
  label: string
  /** Optional custom active background + text color. Defaults to navy (#1e3a5f). */
  activeColor?: string
}

interface SidePanelTabsProps<T extends string> {
  tabs: SidePanelTab<T>[]
  value: T
  onChange: (value: T) => void
}

export function SidePanelTabs<T extends string>({ tabs, value, onChange }: SidePanelTabsProps<T>) {
  return (
    <div className="inline-flex items-center rounded-lg bg-gray-100 p-1 gap-1">
      {tabs.map((tab) => {
        const isActive = value === tab.value
        const color = tab.activeColor

        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              'px-5 py-1.5 text-xs font-medium rounded-md transition-all',
              isActive
                ? color
                  ? 'text-white shadow-sm'
                  : 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
            style={isActive && color ? { backgroundColor: color } : undefined}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
