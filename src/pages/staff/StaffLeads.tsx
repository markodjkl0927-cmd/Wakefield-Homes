import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CheckCircle2, Clock, ExternalLink, Inbox, Mail, MousePointerClick, Phone, Trash2 } from 'lucide-react'
import type { Lead, LeadStatus } from '@/types'
import { leadInterest, leadStatus } from '@/data/labels'
import { getModel } from '@/data/models'
import { cn } from '@/lib/cn'
import { formatDateTime, formatPhone, formatRelative } from '@/lib/format'
import { matchesQuery, useDocumentTitle } from '@/lib/utils'
import { useAppStore } from '@/store'
import { useCurrentUser, usePersonLookup, useStaffUsers, useUsersById } from '@/store/hooks'
import { confirmDialog, toast } from '@/store/ui'
import { Avatar, Badge, Button, buttonStyles, Card, Drawer, EmptyState, Field, Segmented, Select, StatusBadge } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { Age, AssigneeAvatar, FilterBar, SearchField, StaffGuard } from './components/common'

type StatusFilter = LeadStatus | 'all'
const filters: { value: StatusFilter; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
]

export default function StaffLeads() {
  useDocumentTitle('Website leads')
  return (
    <StaffGuard permission="leads.view" title="Website leads">
      <LeadsInbox />
    </StaffGuard>
  )
}

function useIsDesktop() {
  const query = '(min-width: 1024px)'
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return match
}

function LeadsInbox() {
  const [params] = useSearchParams()
  const leads = useAppStore((s) => s.leads)
  const users = useUsersById()
  const desktop = useIsDesktop()
  const [status, setStatus] = useState<StatusFilter>(() => {
    const p = params.get('status') as StatusFilter | null
    return p && filters.some((f) => f.value === p) ? p : 'all'
  })
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const searched = useMemo(
    () =>
      leads
        .filter((l) => matchesQuery(query, `${l.firstName} ${l.lastName}`, l.email, l.phone, l.message, leadInterest[l.interest], l.modelSlug && getModel(l.modelSlug)?.name))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [leads, query],
  )
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: searched.length }
    for (const l of searched) c[l.status] = (c[l.status] ?? 0) + 1
    return c
  }, [searched])
  const rows = useMemo(() => searched.filter((l) => status === 'all' || l.status === status), [searched, status])

  // On desktop the detail panel always shows something: keep a valid selection.
  const selected = rows.find((l) => l.id === selectedId) ?? (desktop ? rows[0] : undefined)

  const open = (l: Lead) => {
    setSelectedId(l.id)
    if (!desktop) setDrawerOpen(true)
  }

  const afterDelete = (id: string) => {
    const idx = rows.findIndex((l) => l.id === id)
    const next = rows[idx + 1] ?? rows[idx - 1]
    setSelectedId(next?.id ?? null)
    setDrawerOpen(false)
  }

  return (
    <>
      <PageHeader title="Website leads" description="Inquiries from the contact form and listing pages on the public website. Reply quickly — most buyers contact more than one builder." />

      <FilterBar>
        <Segmented ariaLabel="Lead status" value={status} onChange={setStatus} items={filters.map((f) => ({ ...f, count: counts[f.value] ?? 0 }))} />
        <SearchField value={query} onChange={setQuery} placeholder="Name, email, plan or message" className="lg:w-80" label="Search inquiries" />
      </FilterBar>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Inbox className="size-6" aria-hidden />}
            title={query ? 'No inquiries match your search' : status === 'new' ? 'No new inquiries' : 'Nothing here yet'}
            description={status === 'new' && !query ? 'You’re all caught up. New contact-form submissions appear here instantly.' : 'Try another filter or search term.'}
            action={
              status !== 'all' ? (
                <Button variant="secondary" onClick={() => setStatus('all')}>
                  Show all inquiries
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            <ul className="divide-y divide-ink-100" aria-label="Inquiries">
              {rows.map((l) => {
                const active = selected?.id === l.id
                const assignee = l.assignedToId ? users[l.assignedToId] : undefined
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => open(l)}
                      aria-current={active && desktop ? 'true' : undefined}
                      className={cn(
                        'block w-full px-5 py-4 text-left transition-colors hover:bg-ink-50',
                        active && desktop && 'bg-brand-50/70 shadow-[inset_3px_0_0_var(--color-brand-700)] hover:bg-brand-50',
                      )}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className={cn('flex items-center gap-2 truncate text-sm text-ink-900', l.status === 'new' ? 'font-semibold' : 'font-medium')}>
                            {l.status === 'new' && <span className="size-2 shrink-0 rounded-full bg-brand-600" aria-hidden />}
                            {l.firstName} {l.lastName}
                          </span>
                          <span className="block truncate text-xs text-ink-500">
                            {leadInterest[l.interest]}
                            {l.modelSlug && getModel(l.modelSlug) ? ` · ${getModel(l.modelSlug)?.name}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-ink-500">
                          <Age iso={l.createdAt} />
                        </span>
                      </span>
                      {/* No `block` here: line-clamp needs its own -webkit-box display. */}
                      <span className="mt-2 line-clamp-2 text-sm text-ink-600 wrap-anywhere">{l.message}</span>
                      <span className="mt-2.5 flex items-center justify-between gap-2">
                        <StatusBadge def={leadStatus[l.status]} />
                        <AssigneeAvatar user={assignee} />
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>

          <div className="hidden lg:block">
            {selected ? (
              <Card className="sticky top-24">
                <LeadDetail lead={selected} onDeleted={afterDelete} />
              </Card>
            ) : (
              <Card>
                <EmptyState icon={<MousePointerClick className="size-6" aria-hidden />} title="Select an inquiry" description="Pick someone on the left to see their message and contact details." />
              </Card>
            )}
          </div>
        </div>
      )}

      {!desktop && (
        <Drawer open={drawerOpen && !!selected} onClose={() => setDrawerOpen(false)} title={selected ? `${selected.firstName} ${selected.lastName}` : ''} description={selected ? leadInterest[selected.interest] : undefined} width="lg">
          {selected && <LeadDetail lead={selected} onDeleted={afterDelete} inDrawer />}
        </Drawer>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */

function LeadDetail({ lead: l, onDeleted, inDrawer }: { lead: Lead; onDeleted: (id: string) => void; inDrawer?: boolean }) {
  const staff = useStaffUsers()
  const person = usePersonLookup()
  const me = useCurrentUser()
  const updateLead = useAppStore((s) => s.updateLead)
  const deleteLead = useAppStore((s) => s.deleteLead)
  const name = `${l.firstName} ${l.lastName}`
  const model = l.modelSlug ? getModel(l.modelSlug) : undefined

  const setStatus = (status: LeadStatus) => {
    updateLead(l.id, { status })
    toast.success(`Marked as ${leadStatus[status].label.toLowerCase()}`, name)
  }

  const remove = async () => {
    const ok = await confirmDialog({ title: `Delete ${name}’s inquiry?`, description: 'The message and contact details are removed from the inbox. This can’t be undone.', confirmLabel: 'Delete inquiry', tone: 'danger' })
    if (!ok) return
    deleteLead(l.id)
    toast.success('Inquiry deleted', name)
    onDeleted(l.id)
  }

  // Phone is optional on the community and listing forms: then email is the way to reply.
  const hasPhone = !!l.phone.trim()
  const emailHref = `mailto:${l.email}?subject=${encodeURIComponent(l.homeTitle ? `Your inquiry about ${l.homeTitle}` : 'Your inquiry with Wakefield Homes')}`

  return (
    <div>
      {!inDrawer && (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-100 px-6 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={name} size="lg" />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-ink-900">{name}</h2>
              <p className="text-sm text-ink-500 wrap-anywhere">
                Received {formatRelative(l.createdAt)} · {l.source}
              </p>
            </div>
          </div>
          <StatusBadge def={leadStatus[l.status]} size="md" />
        </div>
      )}

      <div className="space-y-6 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand" size="md">
            {leadInterest[l.interest]}
          </Badge>
          {model && (
            <Link to={`/our-homes/models/${model.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-sm font-medium text-brand-800 ring-1 ring-ink-200 hover:bg-brand-50 hover:underline">
              {model.name}
              <ExternalLink className="size-3.5" aria-hidden />
              <span className="sr-only">(floor plan, opens in a new tab)</span>
            </Link>
          )}
          {l.homeSlug && (
            <Link
              to={`/homes/${l.homeSlug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-sm font-medium text-brand-800 ring-1 ring-ink-200 hover:bg-brand-50 hover:underline"
            >
              <span className="truncate">{l.homeTitle ?? 'Listing'}</span>
              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
              <span className="sr-only">(listing, opens in a new tab)</span>
            </Link>
          )}
          {inDrawer && <StatusBadge def={leadStatus[l.status]} size="md" />}
        </div>

        <blockquote className="text-user rounded-2xl bg-ink-50 px-5 py-4 text-[15px] leading-7 text-ink-800 ring-1 ring-ink-200/60 ring-inset">“{l.message}”</blockquote>

        <div className={cn('grid grid-cols-1 gap-2', hasPhone && 'sm:grid-cols-2')}>
          {hasPhone && (
            <a href={`tel:${l.phone}`} className={buttonStyles('primary', 'md', 'w-full')}>
              <Phone className="size-4" aria-hidden /> Call {formatPhone(l.phone)}
            </a>
          )}
          <a href={emailHref} className={buttonStyles(hasPhone ? 'secondary' : 'primary', 'md', 'w-full min-w-0')}>
            <Mail className="size-4 shrink-0" aria-hidden /> <span className="truncate">Email {l.firstName}</span>
          </a>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl p-4 text-sm ring-1 ring-ink-200 ring-inset sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-ink-500">Email</dt>
            <dd className="mt-0.5 truncate font-medium">
              <a href={`mailto:${l.email}`} className="text-brand-800 hover:underline">
                {l.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-ink-500">Phone</dt>
            <dd className="mt-0.5 font-medium">
              {hasPhone ? (
                <a href={`tel:${l.phone}`} className="text-brand-800 hover:underline">
                  {formatPhone(l.phone)}
                </a>
              ) : (
                <span className="font-normal text-ink-500">Not provided</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-ink-500">
              <Clock className="size-3.5" aria-hidden /> Best time to reach
            </dt>
            <dd className="mt-0.5 font-medium text-ink-900">{l.bestTime ?? 'Any time'}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Received</dt>
            <dd className="mt-0.5 font-medium text-ink-900">{formatDateTime(l.createdAt)}</dd>
          </div>
        </dl>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor={`lead-status-${l.id}`}>
            <Select id={`lead-status-${l.id}`} value={l.status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
              {(Object.keys(leadStatus) as LeadStatus[]).map((s) => (
                <option key={s} value={s}>
                  {leadStatus[s].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assigned to" htmlFor={`lead-owner-${l.id}`}>
            <Select
              id={`lead-owner-${l.id}`}
              value={l.assignedToId ?? ''}
              onChange={(e) => {
                const v = e.target.value || undefined
                updateLead(l.id, { assignedToId: v })
                toast.success(v ? `Assigned to ${staff.find((u) => u.id === v)?.name ?? 'staff'}` : 'Unassigned', name)
              }}
            >
              <option value="">Unassigned</option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.id === me?.id ? ' (you)' : ''}
                </option>
              ))}
              {/* Someone who can't take work any more (disabled account) still shows as the current value. */}
              {l.assignedToId && !staff.some((u) => u.id === l.assignedToId) && (
                <option value={l.assignedToId} disabled>
                  {person(l.assignedToId)?.label ?? 'Former team member'} (inactive)
                </option>
              )}
            </Select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5">
          <Button variant="ghost" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={remove} leftIcon={<Trash2 className="size-4" aria-hidden />}>
            Delete
          </Button>
          {l.status === 'new' && (
            <Button
              variant="soft"
              onClick={() => {
                updateLead(l.id, { status: 'contacted', ...(l.assignedToId ? {} : { assignedToId: me?.id }) })
                toast.success('Marked as contacted', l.assignedToId ? name : `${name} — assigned to you`)
              }}
              leftIcon={<CheckCircle2 className="size-4" aria-hidden />}
            >
              Mark as contacted
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
