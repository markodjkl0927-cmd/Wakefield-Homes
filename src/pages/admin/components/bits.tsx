import { useId, type ReactNode } from 'react'
import { Eye, Globe, UserX } from 'lucide-react'
import type { Role, User, UserStatus } from '@/types'
import { roleLabels } from '@/data/labels'
import { cn } from '@/lib/cn'
import { Avatar, Badge, Button, StatusBadge } from '@/components/ui'
import { activityKinds, GUEST_ACTOR, roleMeta, userStatusLabels, type ActivityKind } from './meta'

export function RoleBadge({ role, size, className }: { role: Role; size?: 'sm' | 'md'; className?: string }) {
  const meta = roleMeta[role]
  const Icon = meta.icon
  return (
    <Badge tone={meta.tone} size={size} className={className} icon={<Icon className="size-3" aria-hidden />}>
      {roleLabels[role]}
    </Badge>
  )
}

export function UserStatusBadge({ status, size }: { status: UserStatus; size?: 'sm' | 'md' }) {
  return <StatusBadge def={userStatusLabels[status]} size={size} />
}

export function KindBadge({ kind }: { kind: ActivityKind }) {
  const meta = activityKinds[kind]
  const Icon = meta.icon
  return (
    <Badge tone={meta.tone} icon={<Icon className="size-3" aria-hidden />}>
      {meta.label}
    </Badge>
  )
}

const avatarSizes = { xs: 'size-6 [&>svg]:size-3', sm: 'size-8 [&>svg]:size-4', md: 'size-10 [&>svg]:size-5' }

/** Avatar for an activity actor: the user's initials, a globe for website visitors, or a placeholder for removed accounts. */
export function ActorAvatar({ actorId, user, size = 'sm' }: { actorId: string; user: User | undefined; size?: 'xs' | 'sm' | 'md' }) {
  if (user) return <Avatar name={user.name} size={size} />
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500 ring-1 ring-ink-200', avatarSizes[size])} aria-hidden>
      {actorId === GUEST_ACTOR ? <Globe /> : <UserX />}
    </span>
  )
}

/**
 * "(viewing as Daniel Ellis)" after a Super Admin's name in the activity log: the change was made while
 * they were using "View as". Amber, like the "Viewing as" bar they saw at the time.
 */
export function ViewingAsNote({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn('font-medium wrap-anywhere text-amber-800', className)}>
      <Eye className="mr-1 -mt-0.5 inline size-3.5" aria-hidden />
      (viewing as {name})
    </span>
  )
}

/**
 * Small CSS tooltip shown on hover and on keyboard focus within. The render prop receives the
 * tooltip id so a focusable child can reference it with aria-describedby.
 */
export function Tooltip({
  content,
  children,
  className,
  align = 'center',
}: {
  content: ReactNode
  children: (tooltipId: string) => ReactNode
  className?: string
  align?: 'center' | 'end'
}) {
  const id = useId()
  return (
    <span className={cn('group/tooltip relative inline-flex', className)}>
      {children(id)}
      <span
        id={id}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute bottom-full z-30 mb-2 w-max max-w-60 rounded-lg bg-ink-900 px-2.5 py-1.5 text-left text-xs font-medium normal-case tracking-normal text-white opacity-0 shadow-pop transition-opacity duration-150 group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100',
          align === 'center' ? 'left-1/2 -translate-x-1/2' : 'right-0',
        )}
      >
        {content}
      </span>
    </span>
  )
}

/** Label/value pair for detail panels. */
export function DetailItem({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-xs font-medium tracking-wide text-ink-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm wrap-anywhere text-ink-900">{children}</dd>
    </div>
  )
}

/** Section heading used inside cards and drawers. */
export function SubHeading({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h3 className="text-sm font-semibold text-ink-900">{children}</h3>
      {action}
    </div>
  )
}

/** Footer for a settings form: dirty indicator on the left, Discard + Save on the right. */
export function FormFooter({ dirty, onDiscard, saveLabel = 'Save changes' }: { dirty: boolean; onDiscard: () => void; saveLabel?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-ink-100 bg-ink-25 px-5 py-3 sm:px-6">
      <p className="text-sm" aria-live="polite">
        {dirty ? (
          <span className="inline-flex items-center gap-2 font-medium text-amber-800">
            <span className="size-2 rounded-full bg-amber-500" aria-hidden />
            Unsaved changes
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-ink-500">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
            All changes saved
          </span>
        )}
      </p>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" onClick={onDiscard} disabled={!dirty}>
          Discard
        </Button>
        <Button type="submit" disabled={!dirty}>
          {saveLabel}
        </Button>
      </div>
    </div>
  )
}
