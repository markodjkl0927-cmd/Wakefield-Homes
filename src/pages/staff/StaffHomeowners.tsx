import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { CalendarDays, CalendarPlus, ChevronRight, ClipboardPlus, FileSignature, Home as HomeIcon, Mail, MapPin, Phone, UserCog, Users, Wrench } from 'lucide-react'
import type { User, UserStatus } from '@/types'
import { agreementStatus, agreementTypes, appointmentStatus, appointmentTypes, homeStatus, requestStatus } from '@/data/labels'
import { getModel } from '@/data/models'
import { cn } from '@/lib/cn'
import { formatDate, formatDayLabel, formatPhone, formatRelative, formatTime } from '@/lib/format'
import { matchesQuery, useDocumentTitle } from '@/lib/utils'
import { useAppStore } from '@/store'
import { useCan, useCanAny, useHomeowners } from '@/store/hooks'
import { Avatar, Button, ButtonLink, Card, Drawer, EmptyState, Segmented, SmartImage, StatusBadge, Table, TBody, TD, TH, THead, TR } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { ACTIVE_APPOINTMENT_STATUSES } from './components/appointments'
import { FilterBar, SearchField, StaffGuard, todayIso, userStatusLabels } from './components/common'
import { LogRequestModal } from './components/LogRequestModal'
import { NewAppointmentModal } from './components/NewAppointmentModal'

const OPEN_REQUEST = ['submitted', 'assigned', 'scheduled', 'in-progress']

export default function StaffHomeowners() {
  useDocumentTitle('Home Owners')
  return (
    <StaffGuard permission="homeowners.view" title="Home Owners">
      <HomeownersWorkspace />
    </StaffGuard>
  )
}

interface OwnerStats {
  homes: number
  openRequests: number
  upcoming: number
  toSign: number
}

function HomeownersWorkspace() {
  const [params, setParams] = useSearchParams()
  const owners = useHomeowners()
  const homes = useAppStore((s) => s.homes)
  const requests = useAppStore((s) => s.requests)
  const appointments = useAppStore((s) => s.appointments)
  const agreements = useAppStore((s) => s.agreements)
  const canManage = useCan('users.manage')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<UserStatus | 'all'>('all')
  const today = todayIso()

  const stats = useMemo(() => {
    const m: Record<string, OwnerStats> = {}
    for (const o of owners) m[o.id] = { homes: 0, openRequests: 0, upcoming: 0, toSign: 0 }
    for (const h of homes) if (h.ownerId && m[h.ownerId]) m[h.ownerId].homes++
    for (const r of requests) if (m[r.homeownerId] && OPEN_REQUEST.includes(r.status)) m[r.homeownerId].openRequests++
    for (const a of appointments) if (m[a.homeownerId] && ACTIVE_APPOINTMENT_STATUSES.includes(a.status) && a.date >= today) m[a.homeownerId].upcoming++
    for (const a of agreements) if (m[a.homeownerId] && a.status === 'awaiting-signature') m[a.homeownerId].toSign++
    return m
  }, [owners, homes, requests, appointments, agreements, today])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: owners.length }
    for (const o of owners) c[o.status] = (c[o.status] ?? 0) + 1
    return c
  }, [owners])

  const rows = useMemo(
    () =>
      owners
        .filter((o) => (status === 'all' || o.status === status) && matchesQuery(query, o.name, o.email, o.phone, o.address, ...homes.filter((h) => h.ownerId === o.id).map((h) => h.title)))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [owners, status, query, homes],
  )

  const openId = params.get('owner')
  const openOwner = openId ? owners.find((o) => o.id === openId) : undefined
  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set('owner', id)
    else next.delete('owner')
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="Home Owners"
        description="Everyone with a Home Owner account — their homes, open requests, visits and documents waiting for a signature."
        actions={
          canManage ? (
            <ButtonLink to="/admin/users" variant="secondary" leftIcon={<UserCog className="size-4" aria-hidden />}>
              Manage accounts
            </ButtonLink>
          ) : undefined
        }
      />

      <FilterBar>
        <Segmented
          ariaLabel="Account status"
          value={status}
          onChange={setStatus}
          items={[
            { value: 'all', label: 'All', count: counts.all ?? 0 },
            { value: 'active', label: 'Active', count: counts.active ?? 0 },
            { value: 'invited', label: 'Invited', count: counts.invited ?? 0 },
            { value: 'disabled', label: 'Disabled', count: counts.disabled ?? 0 },
          ]}
        />
        <SearchField value={query} onChange={setQuery} placeholder="Name, email, phone or home" className="lg:w-80" label="Search Home Owners" />
      </FilterBar>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={<Users className="size-6" aria-hidden />} title="No Home Owners match" description="Try a different name, email or home." />
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <Table className="min-w-[760px]">
              <caption className="sr-only">Home Owners and what they are waiting on</caption>
              <THead>
                <tr>
                  <TH>Home Owner</TH>
                  <TH className="text-center">Homes</TH>
                  <TH className="text-center">Open requests</TH>
                  <TH className="text-center">Upcoming visits</TH>
                  <TH className="text-center">To sign</TH>
                  <TH>Account</TH>
                  <TH>
                    <span className="sr-only">Open</span>
                  </TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((o) => {
                  const st = stats[o.id]
                  return (
                    <TR key={o.id} interactive onClick={() => setOpen(o.id)}>
                      <TD>
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar name={o.name} size="sm" />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpen(o.id)
                              }}
                              className="block max-w-[16rem] truncate text-left font-semibold text-ink-900 hover:text-brand-800 hover:underline"
                            >
                              {o.name}
                            </button>
                            <span className="block max-w-[16rem] truncate text-xs text-ink-500">{o.email}</span>
                          </div>
                        </div>
                      </TD>
                      <TD className="text-center">
                        <CountPill value={st.homes} />
                      </TD>
                      <TD className="text-center">
                        <CountPill value={st.openRequests} tone="amber" />
                      </TD>
                      <TD className="text-center">
                        <CountPill value={st.upcoming} tone="brand" />
                      </TD>
                      <TD className="text-center">
                        <CountPill value={st.toSign} tone="lavender" />
                      </TD>
                      <TD>
                        <StatusBadge def={userStatusLabels[o.status]} />
                        <span className="mt-1 block text-xs text-ink-500">{o.lastLoginAt ? `Seen ${formatRelative(o.lastLoginAt)}` : 'Never signed in'}</span>
                      </TD>
                      <TD className="text-right">
                        <ChevronRight className="ml-auto size-4 text-ink-400" aria-hidden />
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </Card>

          <ul className="space-y-3 md:hidden">
            {rows.map((o) => {
              const st = stats[o.id]
              return (
                <li key={o.id}>
                  <button type="button" onClick={() => setOpen(o.id)} className="block w-full rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-ink-200/70">
                    <span className="flex items-center gap-3">
                      <Avatar name={o.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink-900">{o.name}</span>
                        <span className="block truncate text-xs text-ink-500">{o.email}</span>
                      </span>
                      <StatusBadge def={userStatusLabels[o.status]} />
                    </span>
                    <span className="mt-3 grid grid-cols-4 gap-2 border-t border-ink-100 pt-3 text-center">
                      <MiniCount label="Homes" value={st.homes} />
                      <MiniCount label="Requests" value={st.openRequests} />
                      <MiniCount label="Visits" value={st.upcoming} />
                      <MiniCount label="To sign" value={st.toSign} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <Drawer open={!!openOwner} onClose={() => setOpen(null)} width="lg" title={openOwner?.name ?? ''} description={openOwner ? `Home Owner since ${formatDate(openOwner.createdAt)}` : undefined}>
        {openOwner && <OwnerProfile owner={openOwner} />}
      </Drawer>
    </>
  )
}

function CountPill({ value, tone = 'neutral' }: { value: number; tone?: 'neutral' | 'amber' | 'brand' | 'lavender' }) {
  if (!value) return <span className="text-ink-500">0</span>
  const tones = {
    neutral: 'bg-ink-100 text-ink-800',
    amber: 'bg-amber-100 text-amber-900',
    brand: 'bg-brand-100 text-brand-900',
    lavender: 'bg-lavender-100 text-[#3f43a8]',
  }
  return <span className={cn('inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-sm font-semibold tabular-nums', tones[tone])}>{value}</span>
}

function MiniCount({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <span className={cn('block text-base font-semibold tabular-nums', value ? 'text-ink-900' : 'text-ink-500')}>{value}</span>
      <span className="block text-[11px] text-ink-500">{label}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Drawer body                                                          */
/* ------------------------------------------------------------------ */

function OwnerProfile({ owner }: { owner: User }) {
  const navigate = useNavigate()
  const homes = useAppStore((s) => s.homes)
  const requests = useAppStore((s) => s.requests)
  const appointments = useAppStore((s) => s.appointments)
  const agreements = useAppStore((s) => s.agreements)
  const can = {
    homes: useCanAny(['homes.edit', 'homes.3d']),
    requests: useCan('requests.manage'),
    appointments: useCan('appointments.manage'),
    agreements: useCan('agreements.edit'),
    users: useCan('users.manage'),
  }
  const today = todayIso()
  // Phone-ins: book a visit or log a request for this Home Owner without leaving their profile.
  const [dialog, setDialog] = useState<'appointment' | 'request' | null>(null)
  const active = owner.status !== 'disabled'

  const mine = useMemo(() => {
    const ownedHomes = homes.filter((h) => h.ownerId === owner.id)
    const reqs = requests.filter((r) => r.homeownerId === owner.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const appts = appointments.filter((a) => a.homeownerId === owner.id)
    const upcoming = appts.filter((a) => ACTIVE_APPOINTMENT_STATUSES.includes(a.status) && a.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    const past = appts.filter((a) => !upcoming.includes(a)).sort((a, b) => b.date.localeCompare(a.date))
    const docs = agreements.filter((a) => a.homeownerId === owner.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return { ownedHomes, reqs, appts: [...upcoming, ...past].slice(0, 5), upcomingCount: upcoming.length, docs }
  }, [homes, requests, appointments, agreements, owner.id, today])

  return (
    <div className="space-y-7 px-5 py-5">
      <div className="flex items-center gap-4">
        <Avatar name={owner.name} size="lg" />
        <div className="min-w-0">
          <StatusBadge def={userStatusLabels[owner.status]} />
          <p className="mt-1 text-sm text-ink-500">{owner.lastLoginAt ? `Last signed in ${formatRelative(owner.lastLoginAt)}` : 'Hasn’t signed in yet'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {owner.phone && (
          <a href={`tel:${owner.phone}`} className="flex h-11 items-center gap-2.5 rounded-xl bg-white px-3.5 text-sm font-medium text-ink-800 ring-1 ring-ink-200 hover:bg-ink-50">
            <Phone className="size-4 text-brand-700" aria-hidden /> {formatPhone(owner.phone)}
          </a>
        )}
        <a href={`mailto:${owner.email}`} className="flex h-11 min-w-0 items-center gap-2.5 rounded-xl bg-white px-3.5 text-sm font-medium text-ink-800 ring-1 ring-ink-200 hover:bg-ink-50">
          <Mail className="size-4 shrink-0 text-brand-700" aria-hidden /> <span className="truncate">{owner.email}</span>
        </a>
        {owner.address && (
          <p className="flex items-start gap-2.5 px-1 pt-1 text-sm text-ink-600 sm:col-span-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden /> {owner.address}
          </p>
        )}
      </div>

      {active && (can.appointments || can.requests || can.agreements) && (
        <section aria-label={`Act for ${owner.name}`} className="rounded-xl bg-ink-25 p-3 ring-1 ring-ink-200/70 ring-inset">
          <p className="px-1 pb-2 text-xs font-medium text-ink-600">On the phone with {owner.name.split(' ')[0]}?</p>
          <div className="flex flex-wrap gap-2">
            {can.appointments && (
              <Button size="sm" variant="secondary" className="max-sm:h-10" onClick={() => setDialog('appointment')} leftIcon={<CalendarPlus className="size-4" aria-hidden />}>
                Book appointment
              </Button>
            )}
            {can.requests && (
              <Button size="sm" variant="secondary" className="max-sm:h-10" onClick={() => setDialog('request')} leftIcon={<ClipboardPlus className="size-4" aria-hidden />}>
                Log request
              </Button>
            )}
            {can.agreements && (
              <ButtonLink to={`/staff/agreements/new?owner=${owner.id}`} size="sm" variant="secondary" className="max-sm:h-10" leftIcon={<FileSignature className="size-4" aria-hidden />}>
                New agreement
              </ButtonLink>
            )}
          </div>
        </section>
      )}

      <ProfileSection title="Homes" icon={<HomeIcon className="size-4" aria-hidden />} count={mine.ownedHomes.length} empty="No homes assigned yet.">
        {mine.ownedHomes.map((h) => {
          const body = (
            <>
              <SmartImage src={h.images[0] ?? getModel(h.modelId)?.image} alt="" className="aspect-[4/3] w-20 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink-900">{h.title}</span>
                <span className="block truncate text-xs text-ink-500">{h.address}</span>
                <span className="mt-1.5 flex flex-wrap items-center gap-2">
                  <StatusBadge def={homeStatus[h.status]} />
                  {h.construction && h.status === 'under-construction' && <span className="text-xs text-ink-500">{h.construction.progress}% built</span>}
                </span>
              </span>
            </>
          )
          return (
            <li key={h.id}>
              {can.homes ? (
                <Link to={`/staff/homes/${h.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-ink-50">
                  {body}
                  <ChevronRight className="size-4 shrink-0 text-ink-400" aria-hidden />
                </Link>
              ) : (
                <div className="flex items-center gap-3 p-2">{body}</div>
              )}
            </li>
          )
        })}
      </ProfileSection>

      <ProfileSection title="Requests" icon={<Wrench className="size-4" aria-hidden />} count={mine.reqs.length} empty="No maintenance requests.">
        {mine.reqs.slice(0, 5).map((r) => (
          <ProfileRow
            key={r.id}
            to={can.requests ? `/staff/requests/${r.id}` : undefined}
            title={
              <>
                <span className="text-ink-500 tabular-nums">#{r.number}</span> {r.title}
              </>
            }
            sub={`Updated ${formatRelative(r.updatedAt)}`}
            badge={<StatusBadge def={requestStatus[r.status]} />}
          />
        ))}
      </ProfileSection>

      <ProfileSection title="Appointments" icon={<CalendarDays className="size-4" aria-hidden />} count={mine.upcomingCount} countLabel="upcoming" empty="No appointments yet.">
        {mine.appts.map((a) => (
          <ProfileRow
            key={a.id}
            to={can.appointments ? '/staff/appointments' : undefined}
            title={appointmentTypes[a.type].label}
            sub={`${formatDayLabel(a.date)} · ${formatTime(a.time)}`}
            badge={<StatusBadge def={appointmentStatus[a.status]} />}
          />
        ))}
      </ProfileSection>

      <ProfileSection title="Agreements" icon={<FileSignature className="size-4" aria-hidden />} count={mine.docs.length} empty="No agreements yet.">
        {mine.docs.map((d) => (
          <ProfileRow
            key={d.id}
            to={can.agreements ? `/staff/agreements/${d.id}` : undefined}
            title={d.title}
            sub={`${agreementTypes[d.type].label} · ${d.status === 'draft' ? 'private draft' : `v${d.version}`}`}
            badge={<StatusBadge def={agreementStatus[d.status]} />}
          />
        ))}
      </ProfileSection>

      {can.users && (
        <div className="border-t border-ink-100 pt-5">
          <ButtonLink to="/admin/users" variant="secondary" className="w-full" leftIcon={<UserCog className="size-4" aria-hidden />}>
            Manage account in Users & accounts
          </ButtonLink>
        </div>
      )}

      {dialog === 'appointment' && <NewAppointmentModal initialOwnerId={owner.id} onClose={() => setDialog(null)} onBooked={() => setDialog(null)} />}
      {dialog === 'request' && <LogRequestModal initialOwnerId={owner.id} onClose={() => setDialog(null)} onCreated={(r) => navigate(`/staff/requests/${r.id}`)} />}
    </div>
  )
}

function ProfileSection({ title, icon, count, countLabel, empty, children }: { title: string; icon: ReactNode; count: number; countLabel?: string; empty: string; children: ReactNode[] }) {
  return (
    <section aria-label={title}>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
        <span className="text-ink-400" aria-hidden>
          {icon}
        </span>
        {title}
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600 tabular-nums">{countLabel ? `${count} ${countLabel}` : count}</span>
      </h3>
      {children.length > 0 ? <ul className="mt-2 divide-y divide-ink-100">{children}</ul> : <p className="mt-2 text-sm text-ink-500">{empty}</p>}
    </section>
  )
}

function ProfileRow({ to, title, sub, badge }: { to?: string; title: ReactNode; sub: string; badge: ReactNode }) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink-900">{title}</span>
        <span className="block text-xs text-ink-500">{sub}</span>
      </span>
      {badge}
    </>
  )
  return (
    <li>
      {to ? (
        <Link to={to} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-ink-50">
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-3 py-2.5">{body}</div>
      )}
    </li>
  )
}
