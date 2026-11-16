import { type DragEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRightLeft, ChevronDown } from 'lucide-react'
import type { MaintenanceRequest, RequestStatus, User } from '@/types'
import { requestFlow, requestStatus } from '@/data/labels'
import { cn } from '@/lib/cn'
import { useAppStore } from '@/store'
import type { HomeRef, PersonRef } from '@/store/hooks'
import { toast } from '@/store/ui'
import { MenuItem, Popover } from '@/components/ui'
import { Age, AssigneeAvatar, CategoryChip, PriorityBadge } from './common'

/** Dot color per request status (matches the StatusBadge tones). */
export const requestStatusDot: Record<RequestStatus, string> = {
  submitted: 'bg-amber-500',
  assigned: 'bg-sky-500',
  scheduled: 'bg-lavender-500',
  'in-progress': 'bg-brand-600',
  resolved: 'bg-emerald-500',
  closed: 'bg-ink-400',
}

/** Top accent per board column. */
export const requestColumnAccent: Record<RequestStatus, string> = {
  submitted: 'before:bg-amber-400',
  assigned: 'before:bg-sky-400',
  scheduled: 'before:bg-lavender-400',
  'in-progress': 'before:bg-brand-500',
  resolved: 'before:bg-emerald-400',
  closed: 'before:bg-ink-300',
}

export const DRAG_TYPE = 'application/x-wakefield-request'

/**
 * Moves a request to another status (board drag & drop and the "Move" menu). The store keeps status and
 * assignee consistent: moving unassigned work forward assigns it to you, moving it back to Submitted
 * returns it to the queue. The toast says so.
 */
export function useMoveRequest() {
  const setRequestStatus = useAppStore((s) => s.setRequestStatus)
  return (r: MaintenanceRequest, status: RequestStatus) => {
    if (r.status === status) return
    setRequestStatus(r.id, status)
    const s = useAppStore.getState()
    const after = s.requests.find((x) => x.id === r.id)
    const tookIt = !r.assignedToId && !!after?.assignedToId && after.assignedToId === s.sessionUserId
    const released = !!r.assignedToId && !after?.assignedToId
    const extra = tookIt ? 'Assigned to you. ' : released ? 'Back in the queue, unassigned. ' : ''
    toast.success(`#${r.number} moved to ${requestStatus[status].label}`, `${extra}The Home Owner has been notified.`)
  }
}

/** Accessible alternative to drag & drop: pick the new status from a menu. */
export function MoveToMenu({ request, className }: { request: MaintenanceRequest; className?: string }) {
  const move = useMoveRequest()
  return (
    <Popover
      align="right"
      // Lift the open menu above neighboring cards' Move buttons (each wrapper is its own z-10 layer).
      className={cn('relative z-10 has-[[aria-expanded=true]]:z-30', className)}
      panelClassName="w-52"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={`Move request #${request.number} to another status`}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-ink-600 ring-1 ring-ink-200 ring-inset hover:bg-ink-50 hover:text-ink-900 max-sm:h-10 max-sm:px-3"
        >
          <ArrowRightLeft className="size-3.5" aria-hidden />
          Move
          <ChevronDown className="size-3.5" aria-hidden />
        </button>
      )}
    >
      {({ close }) => (
        <div>
          <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-ink-500 uppercase">Move #{request.number} to…</p>
          {requestFlow
            .filter((s) => s !== request.status)
            .map((s) => (
              <MenuItem
                key={s}
                icon={<span className={cn('block size-2 rounded-full', requestStatusDot[s])} />}
                onClick={() => {
                  close()
                  move(request, s)
                }}
              >
                {requestStatus[s].label}
              </MenuItem>
            ))}
        </div>
      )}
    </Popover>
  )
}

/**
 * Card for a maintenance request (board columns and the phone list). Draggable on desktop; "Move" menu for
 * keyboard and touch. The whole card opens the request. `footer` adds a row inside the card (e.g. status
 * and last update in the phone list).
 */
export function RequestCard({
  request,
  owner,
  home,
  assignee,
  footer,
  draggable = true,
}: {
  request: MaintenanceRequest
  owner?: PersonRef
  home?: HomeRef
  assignee?: User
  footer?: ReactNode
  draggable?: boolean
}) {
  const onDragStart = (e: DragEvent<HTMLElement>) => {
    e.dataTransfer.setData(DRAG_TYPE, request.id)
    e.dataTransfer.effectAllowed = 'move'
  }
  return (
    <article
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      className="group relative rounded-xl bg-white p-3.5 shadow-card ring-1 ring-ink-200/70 transition-shadow hover:shadow-lift hover:ring-brand-200 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink-500 tabular-nums">#{request.number}</p>
        <MoveToMenu request={request} />
      </div>
      <h3 className="mt-1.5 min-w-0 text-sm leading-snug font-semibold text-ink-900 wrap-anywhere">
        <Link to={`/staff/requests/${request.id}`} draggable={false} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none">
          {request.title}
        </Link>
      </h3>
      <p className="mt-1 truncate text-xs text-ink-500">
        {owner?.label ?? 'Home Owner'}
        {home ? ` · ${home.title}` : ''}
      </p>
      {/* Wraps instead of overlapping in narrow board columns; age and assignee stay together on the right. */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <CategoryChip category={request.category} />
        <PriorityBadge priority={request.priority} />
        <span className="ml-auto flex shrink-0 items-center gap-2 pl-1 text-xs text-ink-500">
          <Age iso={request.createdAt} />
          <AssigneeAvatar user={assignee} />
        </span>
      </div>
      {footer && <div className="mt-3 border-t border-ink-100 pt-2.5">{footer}</div>}
    </article>
  )
}
