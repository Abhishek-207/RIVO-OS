/**
 * Skeleton - Shimmer loading placeholder.
 *
 * Renders a pulsing gray block that indicates content is loading.
 * Use for individual elements or compose into table/card skeletons.
 */

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200/60',
        className,
      )}
      style={style}
    />
  )
}

/**
 * SidePanelSkeleton - Content-only shimmer for side panel loading states.
 * Does NOT include header or tabs — those are rendered by the panel itself.
 */
export function SidePanelSkeleton({ variant = 'default' }: { variant?: 'lead' | 'client' | 'case' | 'user' | 'channel' | 'default' }) {
  return (
    <div className="animate-pulse px-4 pb-4 pt-6 space-y-4">
      {variant === 'lead' && <LeadSkeleton />}
      {variant === 'client' && <ClientSkeleton />}
      {variant === 'case' && <CaseSkeleton />}
      {variant === 'user' && <UserSkeleton />}
      {variant === 'channel' && <ChannelSkeleton />}
      {variant === 'default' && <DefaultSkeleton />}
    </div>
  )
}

function FieldPairSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[0, 1].map(i => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
    </div>
  )
}

function SectionSkeleton({ title, rows = 2 }: { title?: boolean; rows?: number }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
      {title && <Skeleton className="h-3 w-28 mb-3" />}
      {Array.from({ length: rows }).map((_, i) => (
        <FieldPairSkeleton key={i} />
      ))}
    </div>
  )
}

function LeadSkeleton() {
  return (
    <>
      <SectionSkeleton rows={2} />
      {/* Intent textarea */}
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
      {/* Source */}
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-4 w-32" />
      </div>
    </>
  )
}

function ClientSkeleton() {
  return (
    <>
      {/* Personal Information */}
      <SectionSkeleton rows={4} />
      {/* Application Type */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <div className="flex gap-6">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      {/* Income & Liabilities */}
      <SectionSkeleton rows={1} />
      {/* Property Details */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
      {/* Eligibility */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </>
  )
}

function CaseSkeleton() {
  return (
    <>
      {/* Deal Information */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
        <FieldPairSkeleton />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
        </div>
      </div>
      {/* Bank Product */}
      <SectionSkeleton rows={3} />
    </>
  )
}

function UserSkeleton() {
  return (
    <>
      {[0, 1, 2].map(i => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-12" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>
    </>
  )
}

function ChannelSkeleton() {
  return (
    <>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
    </>
  )
}

function DefaultSkeleton() {
  return (
    <>
      <SectionSkeleton title rows={2} />
      <SectionSkeleton title rows={2} />
    </>
  )
}

/**
 * DocumentTabSkeleton - Shimmer for the Documents tab in side panels.
 * Mimics a document checklist with rows of doc type name + status indicator.
 */
export function DocumentTabSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {/* Title */}
      <Skeleton className="h-3 w-20" />
      {/* Checklist items */}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className={cn('h-3.5', i % 2 === 0 ? 'w-32' : 'w-24')} />
            </div>
            <Skeleton className="h-6 w-16 rounded" />
          </div>
        ))}
      </div>
      {/* Add button */}
      <Skeleton className="h-4 w-28" />
    </div>
  )
}

/**
 * ActivityTabSkeleton - Shimmer for the Activity tab in side panels.
 * Mimics the timeline with date groups and activity entries.
 */
export function ActivityTabSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Add Note button */}
      <Skeleton className="h-7 w-24 rounded-lg" />
      {/* Timeline groups */}
      <div className="space-y-6">
        {[0, 1].map(groupIdx => (
          <div key={groupIdx} className="space-y-1">
            {/* Date header */}
            <Skeleton className="h-3.5 w-20 mb-2" />
            {/* Entries */}
            {Array.from({ length: groupIdx === 0 ? 3 : 2 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <Skeleton className="h-6 w-6 rounded-full flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className={cn('h-3.5', i % 2 === 0 ? 'w-3/4' : 'w-1/2')} />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * WhatsAppTabSkeleton - Shimmer for the WhatsApp tab in side panels.
 * Mimics the chat interface with message bubbles and input area.
 */
export function WhatsAppTabSkeleton() {
  return (
    <div className="animate-pulse flex flex-col h-full min-h-[400px]">
      {/* Messages area */}
      <div className="flex-1 p-3 bg-[#EFEAE2] rounded-lg min-h-[300px] space-y-3">
        {/* Inbound message */}
        <div className="flex justify-start">
          <div className="max-w-[70%] space-y-1.5">
            <Skeleton className="h-10 w-48 rounded-lg bg-white/80" />
            <Skeleton className="h-2.5 w-12 bg-white/60" />
          </div>
        </div>
        {/* Outbound message */}
        <div className="flex justify-end">
          <div className="max-w-[70%] space-y-1.5">
            <Skeleton className="h-14 w-56 rounded-lg bg-[#D9FDD3]/60" />
            <Skeleton className="h-2.5 w-16 ml-auto bg-[#D9FDD3]/50" />
          </div>
        </div>
        {/* Inbound message */}
        <div className="flex justify-start">
          <div className="max-w-[70%] space-y-1.5">
            <Skeleton className="h-8 w-36 rounded-lg bg-white/80" />
            <Skeleton className="h-2.5 w-12 bg-white/60" />
          </div>
        </div>
        {/* Outbound message */}
        <div className="flex justify-end">
          <div className="max-w-[70%] space-y-1.5">
            <Skeleton className="h-10 w-44 rounded-lg bg-[#D9FDD3]/60" />
            <Skeleton className="h-2.5 w-16 ml-auto bg-[#D9FDD3]/50" />
          </div>
        </div>
      </div>
      {/* Input area */}
      <div className="pt-3 flex gap-2">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-16 rounded-lg" />
      </div>
    </div>
  )
}

interface TableRowsSkeletonProps {
  /** Number of shimmer rows */
  rows?: number
  /** Number of columns per row */
  columns?: number
}

/**
 * TableRowsSkeleton - Shimmer <tr> rows to place inside a real <tbody>.
 *
 * The table keeps its real <thead> and structure; only the data rows shimmer.
 */
export function TableRowsSkeleton({ rows = 8, columns = 5 }: TableRowsSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-gray-50">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="py-3">
              <Skeleton
                className={cn(
                  'h-3.5',
                  colIdx === 0 ? 'w-3/4' :
                  colIdx === columns - 1 ? 'w-8' :
                  'w-2/3',
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
