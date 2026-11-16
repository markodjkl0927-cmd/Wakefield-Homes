import { useMemo, type ReactNode } from 'react'
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInWeeks, parseISO } from 'date-fns'
import { Flag, Search, UserRound } from 'lucide-react'
import type { Home, Permission, RequestCategory, RequestPriority, User, UserStatus } from '@/types'
import { requestCategories, requestPriority, type LabelDef } from '@/data/labels'
import { cn } from '@/lib/cn'
import { formatDateTime, formatRelative } from '@/lib/format'
import { toIsoDate } from '@/lib/utils'
import { useAppStore } from '@/store'
import { useCanAny } from '@/store/hooks'
import { Avatar, Badge, Card, Field, Input, Select } from '@/components/ui'
import { RequirePermission } from '@/components/portal/guards'
import { PageHeader } from '@/components/portal/PageHeader'

/* ------------------------------------------------------------------ */
/* Permission guard that keeps exactly one <h1> on the page             */
/* ------------------------------------------------------------------ */

/**
 * Wraps a staff page body in <RequirePermission>; when access is denied the page still gets its title.
 * Pass a list to allow any one of several permissions (e.g. ['homes.edit', 'homes.3d']).
 */
export function StaffGuard({ permission, title, children }: { permission: Permission | Permission[]; title: string; children: ReactNode }) {
  const allowed = useCanAny(Array.isArray(permission) ? permission : [permission])
  if (!allowed) {
    return (
      <>
        <PageHeader title={title} />
        <Card>
          <RequirePermission permission={permission}>{null}</RequirePermission>
        </Card>
      </>
    )
  }
  return <RequirePermission permission={permission}>{children}</RequirePermission>
}

/* ------------------------------------------------------------------ */
/* Request categories & priority                                        */
/* ------------------------------------------------------------------ */

/** Category tints. Chart colors were checked with the data-viz palette validator (CVD-safe adjacent pairs). */
export const categoryStyles: Record<RequestCategory, { chip: string; color: string }> = {
  gardening: { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100', color: '#1baf7a' },
  'road-fixing': { chip: 'bg-amber-50 text-amber-700 ring-amber-100', color: '#eda100' },
  report: { chip: 'bg-rose-50 text-rose-700 ring-rose-100', color: '#e34948' },
  'house-fix': { chip: 'bg-brand-50 text-brand-800 ring-brand-100', color: '#4462ae' },
}

export const categoryOrder: RequestCategory[] = ['gardening', 'road-fixing', 'report', 'house-fix']
export const priorityOrder: RequestPriority[] = ['urgent', 'high', 'normal', 'low']

export function CategoryIcon({ category, size = 'md', className }: { category: RequestCategory; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const Icon = requestCategories[category].icon
  const s = { sm: 'size-7 rounded-md [&>svg]:size-3.5', md: 'size-9 rounded-lg [&>svg]:size-[18px]', lg: 'size-11 rounded-xl [&>svg]:size-5' }[size]
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center ring-1 ring-inset', s, categoryStyles[category].chip, className)} aria-hidden>
      <Icon />
    </span>
  )
}

/** Category as a small labelled chip (icon + name), so staff never have to decode the icon. */
export function CategoryChip({ category, className }: { category: RequestCategory; className?: string }) {
  const def = requestCategories[category]
  const Icon = def.icon
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', categoryStyles[category].chip, className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {def.label}
    </span>
  )
}

export function PriorityBadge({ priority, className }: { priority: RequestPriority; className?: string }) {
  const def = requestPriority[priority]
  return (
    <Badge tone={def.tone} className={className} icon={<Flag className="size-3" aria-hidden />}>
      {def.label}
      <span className="sr-only"> priority</span>
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/* People                                                               */
/* ------------------------------------------------------------------ */

export const userStatusLabels: Record<UserStatus, LabelDef> = {
  active: { label: 'Active', tone: 'success' },
  invited: { label: 'Invited', tone: 'warning' },
  disabled: { label: 'Disabled', tone: 'neutral' },
}

/** Avatar + name (+ optional second line). */
export function Person({ name, sub, size = 'sm', className }: { name: string; sub?: ReactNode; size?: 'xs' | 'sm' | 'md'; className?: string }) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <Avatar name={name} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink-900">{name}</span>
        {sub && <span className="block truncate text-xs text-ink-500">{sub}</span>}
      </span>
    </span>
  )
}

/** "Daniel Ellis" → "Daniel" */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

/**
 * Home Owner picker for staff forms (phone-ins, agreements). Owners are sorted by name; disabled accounts
 * are listed but can't be chosen, and invited ones are marked.
 */
export function HomeOwnerSelect({
  id,
  value,
  onChange,
  owners,
  invalid,
  describedBy,
  autoFocus,
}: {
  id: string
  value: string
  onChange: (id: string) => void
  owners: User[]
  invalid?: boolean
  describedBy?: string
  autoFocus?: boolean
}) {
  const sorted = useMemo(() => [...owners].sort((a, b) => a.name.localeCompare(b.name)), [owners])
  return (
    <Select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      data-autofocus={autoFocus || undefined}
    >
      {!value && <option value="">Choose a Home Owner…</option>}
      {sorted.map((u) => (
        <option key={u.id} value={u.id} disabled={u.status === 'disabled'}>
          {u.name}
          {u.status === 'invited' ? ' (invited)' : u.status === 'disabled' ? ' (account disabled)' : ''}
        </option>
      ))}
    </Select>
  )
}

/** Tiny assignee avatar, or a dashed placeholder when nobody is assigned. */
export function AssigneeAvatar({ user, className }: { user?: User | null; className?: string }) {
  if (!user) {
    return (
      <span className={cn('inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-ink-300 text-ink-400', className)} title="Unassigned">
        <UserRound className="size-3.5" aria-hidden />
        <span className="sr-only">Unassigned</span>
      </span>
    )
  }
  return (
    <span className={cn('inline-flex shrink-0', className)} title={`Assigned to ${user.name}`}>
      <Avatar name={user.name} size="xs" />
      <span className="sr-only">Assigned to {user.name}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Time                                                                 */
/* ------------------------------------------------------------------ */

/** Compact age: "just now", "12m", "5h", "3d", "2w". */
export function ageLabel(iso: string, now = new Date()): string {
  const d = parseISO(iso)
  const mins = differenceInMinutes(now, d)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = differenceInHours(now, d)
  if (hrs < 24) return `${hrs}h`
  const days = differenceInDays(now, d)
  if (days < 14) return `${days}d`
  return `${differenceInWeeks(now, d)}w`
}

/**
 * Visible compact age with a full, screen-reader friendly equivalent. The suffix (e.g. " ago") is left
 * out for "just now", so it never reads "now ago".
 */
export function Age({ iso, className, suffix }: { iso: string; className?: string; suffix?: string }) {
  const label = ageLabel(iso)
  return (
    // `relative` keeps the sr-only text inside truncated (overflow-hidden) parents, so it can't widen the page.
    <time dateTime={iso} title={formatDateTime(iso)} className={cn('relative tabular-nums', className)}>
      <span aria-hidden>
        {label}
        {label === 'just now' ? '' : suffix}
      </span>
      <span className="sr-only">{formatRelative(iso)}</span>
    </time>
  )
}

export function todayIso() {
  return toIsoDate(new Date())
}

/** "14:00" + 90 → "15:30" */
export function addMinutesToTime(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/* ------------------------------------------------------------------ */
/* Filter controls (visible labels, compact)                           */
/* ------------------------------------------------------------------ */

const filterLabel = '[&>label]:text-xs [&>label]:font-medium [&>label]:text-ink-600'

export function SearchField({
  value,
  onChange,
  label = 'Search',
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  label?: string
  placeholder?: string
  className?: string
}) {
  return (
    <Field label={label} className={cn(filterLabel, className)}>
      {(id) => (
        <Input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          leftIcon={<Search className="size-4" aria-hidden />}
          autoComplete="off"
        />
      )}
    </Field>
  )
}

export interface SelectOption {
  value: string
  label: string
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  className?: string
}) {
  return (
    <Field label={label} className={cn(filterLabel, className)}>
      {(id) => (
        <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  )
}

/** Toolbar row: segmented filter on the left, labelled controls on the right; stacks on mobile. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-5 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between', className)}>{children}</div>
}

/* ------------------------------------------------------------------ */
/* Small layout helpers                                                 */
/* ------------------------------------------------------------------ */

/** Definition-list row for side panels. */
export function InfoRow({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-2.5 text-sm', className)}>
      <dt className="shrink-0 text-ink-500">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-ink-900">{children}</dd>
    </div>
  )
}

/**
 * The shared Field renders its "Optional" tag in ink-400 (2.5:1 on white). Until that is fixed centrally,
 * containers holding forms add this class to lift it to ink-500 (AA).
 */
export const optionalTagAA = '[&_label>span+span]:text-ink-500'

/** Larger tap targets on phones for compact buttons. */
export const tapSm = 'max-sm:h-10 max-sm:px-3.5'
export const tapIcon = 'max-sm:size-10'

/* ------------------------------------------------------------------ */
/* Lookups                                                              */
/* ------------------------------------------------------------------ */

export function useHomesById(): Record<string, Home> {
  const homes = useAppStore((s) => s.homes)
  return useMemo(() => Object.fromEntries(homes.map((h) => [h.id, h])), [homes])
}

/** Parse the first number out of strings such as "4–5" or "5 full, 2 half". */
export function leadingNumber(value: string, fallback = 0): number {
  const m = value.match(/\d+(\.\d+)?/)
  return m ? Number(m[0]) : fallback
}

/** "exteriorWhiteFarmhouse" → "Exterior white farmhouse" */
export function humanizeKey(key: string): string {
  const words = key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .toLowerCase()
    .trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
