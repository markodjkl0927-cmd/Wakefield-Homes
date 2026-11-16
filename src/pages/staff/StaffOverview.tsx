import { useId, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { format } from 'date-fns'
import { ArrowRight, Box, CalendarCheck, CalendarClock, CalendarPlus, Check, ChevronDown, ClipboardPlus, FileSignature, Globe, HardHat, Home as HomeIcon, Inbox, Plus, Star, Wrench } from 'lucide-react'
import type { ActivityEntry, Appointment, HomeStatus, MaintenanceRequest, User } from '@/types'
import { appointmentLocations, appointmentStatus, appointmentTypes, homeStatus, requestCategories, requestStatus } from '@/data/labels'
import { cn } from '@/lib/cn'
import { formatDayLabel, formatRelative, formatTime, pluralize } from '@/lib/format'
import { useDocumentTitle } from '@/lib/utils'
import { useAppStore } from '@/store'
import { useCan, useCanAny, useCurrentUser, useHomeLookup, usePersonLookup, useStaffUsers, useUsersById } from '@/store/hooks'
import { toast } from '@/store/ui'
import { Avatar, BarChart, Button, Card, CardBody, CardHeader, Donut, EmptyState, MenuItem, Popover, Select, StatCard, StatusBadge } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { ACTIVE_APPOINTMENT_STATUSES, timeRange } from './components/appointments'
import { Age, CategoryIcon, PriorityBadge, categoryOrder, categoryStyles, greeting, priorityOrder, tapSm, todayIso } from './components/common'
import { LogRequestModal } from './components/LogRequestModal'
import { NewAppointmentModal } from './components/NewAppointmentModal'

const OPEN_REQUEST: MaintenanceRequest['status'][] = ['submitted', 'assigned', 'scheduled', 'in-progress']

/** Queue order: urgent first, then untriaged (submitted), then priority, then oldest. */
function queueScore(r: MaintenanceRequest) {
  return [r.priority === 'urgent' ? 0 : 1, r.status === 'submitted' ? 0 : 1, priorityOrder.indexOf(r.priority)]
}

function compareQueue(a: MaintenanceRequest, b: MaintenanceRequest) {
  const sa = queueScore(a)
  const sb = queueScore(b)
  for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sa[i] - sb[i]
  return a.createdAt.localeCompare(b.createdAt)
}

export default function StaffOverview() {
  useDocumentTitle('Staff overview')
  const navigate = useNavigate()
  const me = useCurrentUser()
  const appointments = useAppStore((s) => s.appointments)
  const requests = useAppStore((s) => s.requests)
  const homes = useAppStore((s) => s.homes)
  const agreements = useAppStore((s) => s.agreements)
  const leads = useAppStore((s) => s.leads)
  const activity = useAppStore((s) => s.activity)
  const view3dOn = useAppStore((s) => s.settings.features.view3d)
  const [dialog, setDialog] = useState<'appointment' | 'request' | null>(null)

  const can = {
    appointments: useCan('appointments.manage'),
    requests: useCan('requests.manage'),
    homes: useCan('homes.edit'),
    homesArea: useCanAny(['homes.edit', 'homes.3d']),
    agreements: useCan('agreements.edit'),
    leads: useCan('leads.view'),
  }

  const today = todayIso()
  const stats = useMemo(() => {
    const booking = appointments.filter((a) => a.status === 'requested' || a.status === 'rescheduled')
    const submitted = requests.filter((r) => r.status === 'submitted')
    const urgentOpen = requests.filter((r) => r.priority === 'urgent' && OPEN_REQUEST.includes(r.status))
    const building = homes.filter((h) => h.status === 'under-construction')
    const awaiting = agreements.filter((a) => a.status === 'awaiting-signature')
    const newLeads = leads.filter((l) => l.status === 'new')
    const oldest = (xs: { createdAt: string }[]) => xs.reduce<string | null>((m, x) => (!m || x.createdAt < m ? x.createdAt : m), null)
    return { booking, submitted, urgentOpen, building, awaiting, newLeads, oldestBooking: oldest(booking), latestLead: newLeads.reduce<string | null>((m, x) => (!m || x.createdAt > m ? x.createdAt : m), null) }
  }, [appointments, requests, homes, agreements, leads])

  const firstName = me?.name.split(' ')[0] ?? ''

  const statCards = [
    can.appointments && (
      <StatCard
        key="bookings"
        label="Booking requests"
        value={stats.booking.length}
        icon={<CalendarClock aria-hidden />}
        tone="amber"
        to="/staff/appointments?status=requested"
        hint={stats.oldestBooking ? <>Oldest {formatRelative(stats.oldestBooking)}</> : 'All confirmed'}
      />
    ),
    can.requests && (
      <StatCard
        key="requests"
        label="New requests"
        value={stats.submitted.length}
        icon={<Wrench aria-hidden />}
        tone="rose"
        to="/staff/requests"
        hint={stats.urgentOpen.length ? `${stats.urgentOpen.length} urgent open` : 'Nothing urgent'}
      />
    ),
    can.homesArea && (
      <StatCard
        key="homes"
        label="Under construction"
        value={stats.building.length}
        icon={<HardHat aria-hidden />}
        tone="brand"
        to="/staff/homes?status=under-construction"
        hint={`of ${pluralize(homes.length, 'home')}`}
      />
    ),
    can.agreements && (
      <StatCard
        key="agreements"
        label="Awaiting signature"
        value={stats.awaiting.length}
        icon={<FileSignature aria-hidden />}
        tone="lavender"
        to="/staff/agreements?status=awaiting-signature"
        hint={stats.awaiting.length ? `${stats.awaiting.filter((a) => !a.seenVersion || a.seenVersion < a.version).length} not opened yet` : 'Nothing pending'}
      />
    ),
    can.leads && (
      <StatCard
        key="leads"
        label="New website leads"
        value={stats.newLeads.length}
        icon={<Inbox aria-hidden />}
        tone="emerald"
        to="/staff/leads?status=new"
        hint={stats.latestLead ? <>Latest {formatRelative(stats.latestLead)}</> : 'Inbox zero'}
      />
    ),
  ].filter(Boolean)

  const createItems: { key: string; label: string; icon: ReactNode; run: () => void }[] = [
    ...(can.appointments ? [{ key: 'appointment', label: 'Appointment for a Home Owner', icon: <CalendarPlus />, run: () => setDialog('appointment') }] : []),
    ...(can.requests ? [{ key: 'request', label: 'Request for a Home Owner', icon: <ClipboardPlus />, run: () => setDialog('request') }] : []),
    ...(can.agreements ? [{ key: 'agreement', label: 'Agreement', icon: <FileSignature />, run: () => navigate('/staff/agreements/new') }] : []),
    ...(can.homes ? [{ key: 'home', label: 'Home', icon: <HomeIcon />, run: () => navigate('/staff/homes/new') }] : []),
  ]

  return (
    <>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        description={`${format(new Date(), 'EEEE, MMMM d')} · Here’s what needs your attention today.`}
        actions={
          createItems.length > 0 ? (
            <Popover
              align="right"
              panelClassName="w-72"
              trigger={({ toggle, open }) => (
                <Button onClick={toggle} aria-expanded={open} leftIcon={<Plus className="size-4" aria-hidden />} rightIcon={<ChevronDown className="size-4" aria-hidden />}>
                  New
                </Button>
              )}
            >
              {({ close }) => (
                <div>
                  <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-ink-500 uppercase">Create</p>
                  {createItems.map((item) => (
                    <MenuItem
                      key={item.key}
                      icon={item.icon}
                      onClick={() => {
                        close()
                        item.run()
                      }}
                    >
                      {item.label}
                    </MenuItem>
                  ))}
                </div>
              )}
            </Popover>
          ) : undefined
        }
      />

      <h2 className="sr-only">At a glance</h2>
      <div
        className={cn(
          'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5 [&>*>div:first-child>p]:min-h-10',
          statCards.length % 2 === 1 && '[&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1',
        )}
      >
        {statCards}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {can.appointments && <UpcomingAppointments appointments={appointments} today={today} onNew={() => setDialog('appointment')} />}
          {can.requests && <RequestQueue requests={requests} />}
        </div>
        <div className="min-w-0 space-y-6">
          {can.requests && <OpenRequestsChart requests={requests} />}
          <RecentActivity activity={activity} />
        </div>
      </div>

      {can.homesArea && (
        <Card className="mt-6">
          <CardHeader
            title="Homes by status"
            description="Listings and owned homes across every community."
            icon={<HomeIcon className="size-[18px]" aria-hidden />}
            action={
              <Link to="/staff/homes" className="relative inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap text-brand-800 hover:underline">
                {/* Short labels on phones leave the card title room to breathe. */}
                Manage<span className="max-sm:sr-only"> homes</span> <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <CardBody className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_240px] md:items-center">
            <BarChart
              height={170}
              data={(Object.keys(homeStatus) as HomeStatus[]).map((s) => ({ label: homeStatus[s].label, value: homes.filter((h) => h.status === s).length }))}
            />
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-1" aria-label="Website and 3D at a glance">
              <MiniStat icon={<Globe className="size-4" aria-hidden />} label="On the website" value={homes.filter((h) => h.published).length} />
              <MiniStat icon={<Star className="size-4" aria-hidden />} label="Featured on homepage" value={homes.filter((h) => h.published && h.featured).length} />
              <MiniStat
                icon={<Box className="size-4" aria-hidden />}
                label={view3dOn ? '3D viewing on' : '3D viewing (globally off)'}
                value={homes.filter((h) => h.view3d.enabled).length}
              />
              <MiniStat icon={<HomeIcon className="size-4" aria-hidden />} label="Owned by Home Owners" value={homes.filter((h) => h.ownerId).length} />
            </ul>
          </CardBody>
        </Card>
      )}

      {dialog === 'appointment' && (
        <NewAppointmentModal
          onClose={() => setDialog(null)}
          onBooked={() => {
            setDialog(null)
          }}
        />
      )}
      {dialog === 'request' && <LogRequestModal onClose={() => setDialog(null)} onCreated={(r) => navigate(`/staff/requests/${r.id}`)} />}
    </>
  )
}

function MiniStat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-ink-50 px-3.5 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-800 ring-1 ring-ink-200">{icon}</span>
      <p className="min-w-0">
        <span className="block truncate text-xs text-ink-500">{label}</span>
        <span className="block text-lg leading-tight font-semibold text-ink-900 tabular-nums">{value}</span>
      </p>
    </li>
  )
}

/* ------------------------------------------------------------------ */

function UpcomingAppointments({ appointments, today, onNew }: { appointments: Appointment[]; today: string; onNew: () => void }) {
  const me = useCurrentUser()
  const person = usePersonLookup()
  const homeRef = useHomeLookup()
  const confirmAppointment = useAppStore((s) => s.confirmAppointment)

  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => a.date >= today && ACTIVE_APPOINTMENT_STATUSES.includes(a.status))
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
        .slice(0, 7),
    [appointments, today],
  )
  const groups = useMemo(() => {
    const out: { date: string; items: Appointment[] }[] = []
    for (const a of upcoming) {
      const last = out[out.length - 1]
      if (last?.date === a.date) last.items.push(a)
      else out.push({ date: a.date, items: [a] })
    }
    return out
  }, [upcoming])

  const confirm = (a: Appointment) => {
    confirmAppointment(a.id, me?.id)
    toast.success('Appointment confirmed', `${person(a.homeownerId)?.label ?? 'The Home Owner'} has been notified. You’re the assigned contact.`)
  }

  return (
    <Card>
      <CardHeader
        title="Today & upcoming"
        description="Office meetings, site visits and walkthroughs."
        icon={<CalendarCheck className="size-[18px]" aria-hidden />}
        action={
          <Link to="/staff/appointments" className="relative inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap text-brand-800 hover:underline">
            All<span className="max-sm:sr-only"> appointments</span> <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />
      {groups.length === 0 ? (
        <EmptyState
          compact
          icon={<CalendarCheck className="size-6" aria-hidden />}
          title="No upcoming appointments"
          description="New booking requests from Home Owners appear here."
          action={
            <Button variant="secondary" onClick={onNew} leftIcon={<CalendarPlus className="size-4" aria-hidden />}>
              New appointment
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-ink-100">
          {groups.map((g) => (
            <section key={g.date} aria-label={formatDayLabel(g.date)} className="px-5 py-4 sm:px-6">
              <h3 className={cn('text-xs font-semibold tracking-wider uppercase', g.date === today ? 'text-brand-800' : 'text-ink-500')}>{formatDayLabel(g.date)}</h3>
              <ul className="mt-2 space-y-1">
                {g.items.map((a) => {
                  const type = appointmentTypes[a.type]
                  const owner = person(a.homeownerId)
                  const home = homeRef(a.homeId)
                  const Icon = type.icon
                  const waiting = a.status === 'requested' || a.status === 'rescheduled'
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl py-2 sm:flex-nowrap">
                      <div className="w-[4.5rem] shrink-0">
                        <p className="text-sm font-semibold whitespace-nowrap text-ink-900 tabular-nums">{formatTime(a.time)}</p>
                        <p className="text-xs text-ink-500">{a.durationMins} min</p>
                      </div>
                      <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800 sm:flex" aria-hidden>
                        <Icon className="size-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1 basis-40">
                        <p className="truncate text-sm font-medium text-ink-900">{type.label}</p>
                        <p className="truncate text-xs text-ink-500">
                          {owner?.label ?? 'Home Owner'}
                          {home ? ` · ${home.title}` : ''} · {appointmentLocations[a.location].label}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:pl-[5.5rem] max-[359px]:pl-0">
                        <StatusBadge def={appointmentStatus[a.status]} />
                        {waiting && (
                          <Button
                            size="sm"
                            className={tapSm}
                            onClick={() => confirm(a)}
                            leftIcon={<Check className="size-4" aria-hidden />}
                            aria-label={`Confirm ${type.label} with ${owner?.name ?? 'Home Owner'}, ${formatDayLabel(a.date)} ${timeRange(a)}`}
                          >
                            Confirm
                          </Button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ */

function RequestQueue({ requests }: { requests: MaintenanceRequest[] }) {
  const users = useUsersById()
  const person = usePersonLookup()
  const homeRef = useHomeLookup()
  const staff = useStaffUsers()
  const me = useCurrentUser()
  const assignRequest = useAppStore((s) => s.assignRequest)
  const open = useMemo(() => requests.filter((r) => OPEN_REQUEST.includes(r.status)).sort(compareQueue), [requests])
  const shown = open.slice(0, 6)

  return (
    <Card>
      <CardHeader
        title="Request queue"
        description={open.length ? `${pluralize(open.length, 'open request')} · urgent and untriaged first` : 'Maintenance requests from Home Owners'}
        icon={<Wrench className="size-[18px]" aria-hidden />}
        action={
          <Link to="/staff/requests" className="inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap text-brand-800 hover:underline">
            <span className="max-sm:hidden">Open board</span>
            <span className="sm:hidden">Board</span> <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />
      {shown.length === 0 ? (
        <EmptyState compact icon={<Wrench className="size-6" aria-hidden />} title="No open requests" description="When a Home Owner reports something, it lands here first." />
      ) : (
        <ul className="divide-y divide-ink-100">
          {shown.map((r) => (
            <QueueRow
              key={r.id}
              request={r}
              ownerName={person(r.homeownerId)?.label ?? 'Home Owner'}
              homeTitle={homeRef(r.homeId)?.title}
              staff={staff}
              assignee={r.assignedToId ? users[r.assignedToId] : undefined}
              meId={me?.id}
              onAssign={(staffId) => {
                const result = assignRequest(r.id, staffId)
                if (!result.ok) {
                  toast.error('Couldn’t change the assignee', result.error)
                  return
                }
                toast.success(
                  staffId ? `#${r.number} assigned to ${staffId === me?.id ? 'you' : users[staffId]?.name ?? 'the team member'}` : `#${r.number} is now unassigned`,
                  staffId ? 'The Home Owner has been notified.' : r.status === 'assigned' ? 'It’s back in the queue as Submitted.' : undefined,
                )
              }}
            />
          ))}
        </ul>
      )}
    </Card>
  )
}

function QueueRow({
  request: r,
  ownerName,
  homeTitle,
  staff,
  assignee,
  meId,
  onAssign,
}: {
  request: MaintenanceRequest
  ownerName: string
  homeTitle?: string
  staff: User[]
  assignee?: User
  meId?: string
  onAssign: (staffId: string | undefined) => void
}) {
  const selectId = useId()
  // An assignee whose account was disabled since still shows as the current value.
  const options = assignee && !staff.some((u) => u.id === assignee.id) ? [...staff, assignee] : staff
  return (
    <li className={cn('flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6', r.priority === 'urgent' && 'bg-rose-50/40 shadow-[inset_3px_0_0_var(--color-rose-500)]')}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <CategoryIcon category={r.category} />
        <div className="min-w-0">
          <p className="text-sm wrap-anywhere">
            <Link to={`/staff/requests/${r.id}`} className="font-semibold text-ink-900 hover:text-brand-800 hover:underline">
              <span className="text-ink-500 tabular-nums">#{r.number}</span> {r.title}
            </Link>
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-500">
            {requestCategories[r.category].label} · {ownerName}
            {homeTitle ? ` · ${homeTitle}` : ''} · <Age iso={r.createdAt} suffix=" ago" />
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusBadge def={requestStatus[r.status]} />
            <PriorityBadge priority={r.priority} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:w-56 sm:shrink-0">
        <label htmlFor={selectId} className="shrink-0 text-xs font-medium text-ink-600">
          Assignee
        </label>
        <div className="min-w-0 flex-1">
          <Select id={selectId} value={r.assignedToId ?? ''} onChange={(e) => onAssign(e.target.value || undefined)} className="py-2">
            <option value="">Unassigned</option>
            {options.map((u) => (
              <option key={u.id} value={u.id} disabled={u.status === 'disabled'}>
                {u.name}
                {u.id === meId ? ' (you)' : ''}
                {u.status === 'disabled' ? ' (disabled)' : ''}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </li>
  )
}

/* ------------------------------------------------------------------ */

function OpenRequestsChart({ requests }: { requests: MaintenanceRequest[] }) {
  const open = requests.filter((r) => OPEN_REQUEST.includes(r.status))
  const data = categoryOrder.map((c) => ({ label: requestCategories[c].label, value: open.filter((r) => r.category === c).length, color: categoryStyles[c].color }))
  return (
    <Card>
      <CardHeader title="Open requests by category" description="Gardening, road fixing, reports and house fixes." />
      <CardBody>
        {open.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-500">No open requests right now.</p>
        ) : (
          <Donut data={data} size={150} thickness={20} centerValue={String(open.length)} centerLabel="open" className="sm:flex-row lg:flex-col xl:flex-row" />
        )}
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------------ */

function RecentActivity({ activity }: { activity: ActivityEntry[] }) {
  const person = usePersonLookup()
  // Sign-ins are noise on a work dashboard; the full audit trail lives in the admin activity log.
  const recent = useMemo(() => activity.filter((e) => e.kind !== 'auth').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8), [activity])
  return (
    <Card>
      <CardHeader title="Recent activity" description="What the team and Home Owners did lately." />
      {recent.length === 0 ? (
        <EmptyState compact title="No activity yet" />
      ) : (
        <ol className="space-y-4 px-5 py-5 sm:px-6">
          {recent.map((e) => {
            const actor = person(e.actorId)
            const name = actor?.label ?? 'Former user'
            // A Super Admin acting while "viewing as" someone is named with who they were viewing as.
            const viewingAs = e.viewingAsId ? person(e.viewingAsId)?.label : undefined
            return (
              <li key={e.id} className="flex gap-3">
                <Avatar name={actor?.name ?? '?'} size="sm" />
                <div className="min-w-0 text-sm">
                  <p className="text-ink-600 wrap-anywhere">
                    <span className="font-semibold text-ink-900">{name}</span>
                    {viewingAs && <span className="text-ink-500"> (viewing as {viewingAs})</span>} {e.action}
                    {e.target && <span className="text-ink-800"> {e.target}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">{formatRelative(e.at)}</p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Card>
  )
}
