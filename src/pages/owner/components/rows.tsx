import { Link } from 'react-router'
import { ChevronRight, Sparkles } from 'lucide-react'
import type { Agreement, Home, MaintenanceRequest, User } from '@/types'
import { cn } from '@/lib/cn'
import { formatPrice, formatRelative } from '@/lib/format'
import { agreementStatus, agreementTypes, requestCategories, requestStatus } from '@/data/labels'
import { Badge, StatusBadge } from '@/components/ui'
import { PriorityTag } from './ui'
import { agreementFreshness } from './data'

/** "New" for a document the owner has never opened, "Updated" when there's a version they haven't seen. */
export function FreshnessPill({ kind }: { kind: 'new' | 'updated' }) {
  return (
    <Badge tone="violet" icon={<Sparkles className="size-3" aria-hidden />}>
      {kind === 'new' ? 'New' : 'Updated'}
    </Badge>
  )
}

/** One agreement in a list; the whole row links to the document. */
export function AgreementRow({ agreement, home, usersById, showHome = true }: { agreement: Agreement; home?: Home; usersById: Record<string, User>; showHome?: boolean }) {
  const type = agreementTypes[agreement.type]
  const Icon = type.icon
  const fresh = agreementFreshness(agreement)
  // The latest version entry says who changed the document and when (signing doesn't count as an update).
  const latest = agreement.history[agreement.history.length - 1]
  const updatedBy = usersById[latest?.byUserId ?? agreement.updatedByUserId]
  const updatedAt = latest?.at ?? agreement.updatedAt
  return (
    <li>
      <Link
        to={`/owner/agreements/${agreement.id}`}
        className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-brand-50/40 focus-visible:bg-brand-50/60 focus-visible:outline-offset-[-2px] sm:px-6"
      >
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
            agreement.status === 'awaiting-signature' ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-brand-50 text-brand-800 ring-brand-100',
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 font-semibold wrap-anywhere text-ink-900 group-hover:text-brand-900">{agreement.title}</p>
            {fresh && (
              <span className="hidden sm:inline-flex">
                <FreshnessPill kind={fresh} />
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-ink-600">
            {type.label}
            {showHome && home ? ` · ${home.title}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
            <StatusBadge def={agreementStatus[agreement.status]} />
            {fresh && <FreshnessPill kind={fresh} />}
          </div>
          <p className="mt-2 text-xs leading-5 text-ink-500">
            <span className="whitespace-nowrap tabular-nums">Ref. {agreement.reference}</span> · <span className="whitespace-nowrap">Version {agreement.version}</span>
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline">
              {agreement.version > 1 ? 'Updated' : 'Shared'} by {updatedBy?.name ?? 'Wakefield Homes'} · <span className="whitespace-nowrap">{formatRelative(updatedAt)}</span>
            </span>
          </p>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
          <StatusBadge def={agreementStatus[agreement.status]} />
          {agreement.amount != null && <p className="text-sm font-semibold text-ink-900 tabular-nums">{formatPrice(agreement.amount)}</p>}
        </div>
        <ChevronRight className="mt-3 size-5 shrink-0 text-ink-300 transition-colors group-hover:text-brand-700" aria-hidden />
      </Link>
    </li>
  )
}

/** One maintenance request in a list; the whole row links to the request. */
export function RequestRow({ request, home, compact }: { request: MaintenanceRequest; home?: Home; compact?: boolean }) {
  const category = requestCategories[request.category]
  const Icon = category.icon
  return (
    <li>
      <Link
        to={`/owner/maintenance/${request.id}`}
        className={cn(
          'group flex items-start gap-4 transition-colors hover:bg-brand-50/40 focus-visible:bg-brand-50/60 focus-visible:outline-offset-[-2px]',
          compact ? 'px-5 py-3.5 sm:px-6' : 'px-5 py-4 sm:px-6',
        )}
      >
        <span className={cn('flex shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700', compact ? 'size-10' : 'size-11')}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-ink-500">
            <span className="tabular-nums">#{request.number}</span> · {category.label}
            {home ? ` · ${home.title}` : ''}
          </p>
          <p className="mt-0.5 font-semibold wrap-anywhere text-ink-900 group-hover:text-brand-900">{request.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <StatusBadge def={requestStatus[request.status]} />
            <PriorityTag priority={request.priority} />
            <span className="text-xs text-ink-500">Updated {formatRelative(request.updatedAt)}</span>
          </div>
        </div>
        <ChevronRight className="mt-3 size-5 shrink-0 text-ink-300 transition-colors group-hover:text-brand-700" aria-hidden />
      </Link>
    </li>
  )
}
