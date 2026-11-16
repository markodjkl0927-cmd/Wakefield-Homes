import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { addDays, addWeeks, format, isSameDay, isSameMonth, parseISO, startOfWeek } from 'date-fns'
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Clock, List, PhoneCall, UserRound } from 'lucide-react'
import type { Appointment, AppointmentType } from '@/types'
import { appointmentLocations, appointmentStatus, appointmentTypes } from '@/data/labels'
import { cn } from '@/lib/cn'
import { formatDayLabel, pluralize } from '@/lib/format'
import { fromIsoDate, matchesQuery, toIsoDate, useDocumentTitle } from '@/lib/utils'
import { useAppStore } from '@/store'
import { useHomeLookup, usePersonLookup } from '@/store/hooks'
import { Avatar, Button, Card, Drawer, EmptyState, Segmented, StatusBadge, smoothBehavior } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import {
  ACTIVE_APPOINTMENT_STATUSES,
  AppointmentActionButtons,
  AppointmentDetails,
  AppointmentRowActions,
  appointmentStatusStyles,
  timeRange,
  useAppointmentActions,
  type AppointmentActionsApi,
} from './components/appointments'
import { FilterBar, SearchField, SelectField, StaffGuard, todayIso } from './components/common'
import { NewAppointmentModal } from './components/NewAppointmentModal'

type StatusFilter = 'requested' | 'upcoming' | 'past' | 'all'
type View = 'list' | 'week'

const statusFilters: StatusFilter[] = ['requested', 'upcoming', 'past', 'all']
const filterLabels: Record<StatusFilter, string> = { requested: 'Requested', upcoming: 'Upcoming', past: 'Past', all: 'All' }

export default function StaffAppointments() {
  useDocumentTitle('Appointments')
  return (
    <StaffGuard permission="appointments.manage" title="Appointments">
      <AppointmentsWorkspace />
    </StaffGuard>
  )
}

function bucketOf(a: Appointment, today: string): Exclude<StatusFilter, 'all'> {
  if (a.status === 'requested' || a.status === 'rescheduled') return 'requested'
  if (ACTIVE_APPOINTMENT_STATUSES.includes(a.status) && a.date >= today) return 'upcoming'
  return 'past'
}

const byDateAsc = (a: Appointment, b: Appointment) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
const mondayOf = (d: Date) => startOfWeek(d, { weekStartsOn: 1 })

function AppointmentsWorkspace() {
  const [params] = useSearchParams()
  const appointments = useAppStore((s) => s.appointments)
  const person = usePersonLookup()
  const homeRef = useHomeLookup()
  const today = todayIso()
  const api = useAppointmentActions()

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { requested: 0, upcoming: 0, past: 0, all: appointments.length }
    for (const a of appointments) c[bucketOf(a, today)]++
    return c
  }, [appointments, today])

  const [status, setStatus] = useState<StatusFilter>(() => {
    const p = params.get('status') as StatusFilter | null
    if (p && statusFilters.includes(p)) return p
    return counts.requested > 0 ? 'requested' : 'upcoming'
  })
  const [view, setView] = useState<View>(params.get('view') === 'week' ? 'week' : 'list')
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [type, setType] = useState<AppointmentType | 'all'>('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  /** Type + search apply to both views; the status filter applies to the list. */
  const matching = useMemo(
    () =>
      appointments.filter((a) => {
        if (type !== 'all' && a.type !== type) return false
        const owner = person(a.homeownerId)
        const home = homeRef(a.homeId)
        return matchesQuery(query, owner?.name, owner?.user?.email, home?.title, home?.address, appointmentTypes[a.type].label)
      }),
    [appointments, type, query, person, homeRef],
  )

  const listed = useMemo(() => {
    const order: Exclude<StatusFilter, 'all'>[] = ['requested', 'upcoming', 'past']
    const pick = (b: Exclude<StatusFilter, 'all'>) => {
      const xs = matching.filter((a) => bucketOf(a, today) === b).sort(byDateAsc)
      return b === 'past' ? xs.reverse() : xs
    }
    return status === 'all' ? order.flatMap(pick) : pick(status)
  }, [matching, status, today])

  const openAppt = openId ? appointments.find((a) => a.id === openId) ?? null : null

  // A booking just made: bring it into view and mark it for a moment.
  useEffect(() => {
    if (!highlightId) return
    const frame = requestAnimationFrame(() => document.getElementById(`appt-${highlightId}`)?.scrollIntoView({ behavior: smoothBehavior(), block: 'center' }))
    const t = window.setTimeout(() => setHighlightId(null), 4000)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(t)
    }
  }, [highlightId])

  const onBooked = (a: Appointment) => {
    setNewOpen(false)
    setType((t) => (t === 'all' || t === a.type ? t : 'all'))
    setQuery('')
    if (view === 'list' && status !== 'all') setStatus('upcoming')
    setWeekStart(mondayOf(fromIsoDate(a.date)))
    setHighlightId(a.id)
  }

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Confirm booking requests from Home Owners, book visits for Home Owners who call, and keep the office calendar current."
        actions={
          <>
            <Button onClick={() => setNewOpen(true)} leftIcon={<CalendarPlus className="size-4" aria-hidden />}>
              New appointment
            </Button>
            <Segmented
              ariaLabel="View"
              value={view}
              onChange={setView}
              items={[
                { value: 'list', label: 'List', icon: <List className="size-4" aria-hidden /> },
                { value: 'week', label: 'Week', icon: <CalendarDays className="size-4" aria-hidden /> },
              ]}
            />
          </>
        }
      />

      <FilterBar>
        {view === 'list' ? (
          <Segmented
            ariaLabel="Appointment status"
            value={status}
            onChange={setStatus}
            items={statusFilters.map((s) => ({ value: s, label: filterLabels[s], count: counts[s] }))}
          />
        ) : (
          <StatusLegend />
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[34rem]">
          <SelectField
            label="Type"
            value={type}
            onChange={(v) => setType(v as AppointmentType | 'all')}
            options={[{ value: 'all', label: 'All types' }, ...(Object.keys(appointmentTypes) as AppointmentType[]).map((t) => ({ value: t, label: appointmentTypes[t].label }))]}
          />
          <SearchField label="Search Home Owners" value={query} onChange={setQuery} placeholder="Name, email or home" />
        </div>
      </FilterBar>

      {view === 'list' ? (
        <Card>
          {listed.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="size-6" aria-hidden />}
              title={query || type !== 'all' ? 'No appointments match your filters' : status === 'requested' ? 'No booking requests waiting' : 'No appointments here yet'}
              description={
                status === 'requested' && !query && type === 'all'
                  ? 'New requests from the Home Owner portal show up here for confirmation.'
                  : query || type !== 'all'
                    ? 'Try another filter or search term.'
                    : 'Book a visit for a Home Owner who calls the office.'
              }
              action={
                status !== 'upcoming' && counts.upcoming > 0 ? (
                  <Button variant="secondary" onClick={() => setStatus('upcoming')}>
                    View upcoming
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => setNewOpen(true)} leftIcon={<CalendarPlus className="size-4" aria-hidden />}>
                    New appointment
                  </Button>
                )
              }
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {listed.map((a) => (
                <AppointmentListRow key={a.id} appt={a} api={api} onOpen={() => setOpenId(a.id)} highlight={a.id === highlightId} />
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <WeekView appointments={matching} weekStart={weekStart} onWeekChange={setWeekStart} onOpen={(a) => setOpenId(a.id)} highlightId={highlightId} />
      )}

      <Drawer
        open={!!openAppt}
        onClose={() => setOpenId(null)}
        width="lg"
        title={openAppt ? appointmentTypes[openAppt.type].label : ''}
        description={openAppt ? `${formatDayLabel(openAppt.date)} · ${timeRange(openAppt)}` : undefined}
        footer={openAppt ? <AppointmentActionButtons appt={openAppt} api={api} onAction={() => setOpenId(null)} /> : undefined}
      >
        {openAppt && <AppointmentDetails appt={openAppt} />}
      </Drawer>

      {newOpen && <NewAppointmentModal onClose={() => setNewOpen(false)} onBooked={onBooked} />}
      {api.dialogs}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* List row                                                             */
/* ------------------------------------------------------------------ */

function AppointmentListRow({ appt: a, api, onOpen, highlight }: { appt: Appointment; api: AppointmentActionsApi; onOpen: () => void; highlight?: boolean }) {
  const person = usePersonLookup()
  const homeRef = useHomeLookup()
  const owner = person(a.homeownerId)
  const staff = a.staffId ? person(a.staffId) : undefined
  const home = homeRef(a.homeId)
  const bookedByOffice = !!a.bookedById && a.bookedById !== a.homeownerId
  const type = appointmentTypes[a.type]
  const loc = appointmentLocations[a.location]
  const TypeIcon = type.icon
  const LocIcon = loc.icon
  const date = parseISO(a.date)
  const isToday = a.date === todayIso()
  const muted = a.status === 'cancelled' || a.status === 'declined'

  return (
    <li
      id={`appt-${a.id}`}
      className={cn(
        'grid grid-cols-1 gap-4 px-5 py-5 transition-colors duration-700 sm:px-6 md:grid-cols-[4.5rem_minmax(0,1fr)_auto] md:gap-6',
        highlight && 'bg-brand-50/70 shadow-[inset_3px_0_0_var(--color-brand-700)]',
      )}
    >
      {/* Date tile (vertical on desktop, inline on phones) */}
      <div
        className={cn(
          'flex items-center gap-2 md:flex-col md:justify-center md:gap-0 md:self-start md:rounded-xl md:py-2 md:ring-1',
          isToday ? 'text-brand-900 md:bg-brand-50 md:ring-brand-200' : 'text-ink-900 md:bg-ink-50 md:ring-ink-200/70',
          muted && 'opacity-60',
        )}
      >
        <span className="text-xs font-semibold max-md:order-2 max-md:text-sm md:tracking-wider md:uppercase">{format(date, 'MMM')}</span>
        <span className="text-xl leading-tight font-semibold tabular-nums max-md:order-3 max-md:text-sm">{format(date, 'd')}</span>
        <span className="text-xs text-ink-500 max-md:order-1 max-md:text-sm max-md:font-semibold max-md:text-ink-900">{isToday ? 'Today' : format(date, 'EEE')}</span>
      </div>

      <div className="min-w-0 space-y-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <TypeIcon className="size-[18px] shrink-0 text-brand-700" aria-hidden />
          <button type="button" onClick={onOpen} className={cn('text-left font-semibold text-ink-900 hover:text-brand-800 hover:underline', muted && 'text-ink-600')}>
            {type.label}
          </button>
          <StatusBadge def={appointmentStatus[a.status]} />
          {highlight && <span className="text-xs font-semibold text-brand-800">Just booked</span>}
        </div>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4 text-ink-400" aria-hidden /> {timeRange(a)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LocIcon className="size-4 text-ink-400" aria-hidden /> {loc.label}
          </span>
          {bookedByOffice && (
            <span className="inline-flex items-center gap-1.5">
              <PhoneCall className="size-4 text-ink-400" aria-hidden /> Booked by {person(a.bookedById)?.name ?? 'the office'}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2.5">
          <Avatar name={owner?.name ?? '?'} size="sm" />
          <p className="min-w-0 text-sm">
            <span className="font-medium text-ink-900">{owner?.label ?? 'Home Owner'}</span>
            {home && (
              <>
                <span className="hidden text-ink-500 sm:inline"> · </span>
                <span className="block truncate text-ink-500 sm:inline">{home.title}</span>
              </>
            )}
          </p>
        </div>
        {a.notes && <p className="line-clamp-2 text-sm text-ink-600 wrap-anywhere">“{a.notes}”</p>}
        {a.staffNote && (
          <p className="text-user rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">
            <span className="font-medium text-ink-800">Note to Home Owner:</span> {a.staffNote}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 md:items-end">
        <p className="flex items-center gap-2 text-sm text-ink-600">
          {staff ? (
            <>
              <Avatar name={staff.name} size="xs" />
              <span>
                <span className="sr-only">Assigned to </span>
                {staff.label}
              </span>
            </>
          ) : (
            <>
              <UserRound className="size-4 text-ink-400" aria-hidden /> Unassigned
            </>
          )}
        </p>
        <AppointmentRowActions appt={a} api={api} label={`${type.label} with ${owner?.name ?? 'Home Owner'}`} />
      </div>
    </li>
  )
}

/* ------------------------------------------------------------------ */
/* Week view                                                            */
/* ------------------------------------------------------------------ */

function StatusLegend() {
  const items: Appointment['status'][] = ['requested', 'confirmed', 'completed', 'declined', 'cancelled']
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-600" aria-label="Status colors">
      {items.map((s) => (
        <li key={s} className="inline-flex items-center gap-1.5">
          <span className={cn('h-3 w-1.5 rounded-sm border-l-4', appointmentStatusStyles[s])} aria-hidden />
          {appointmentStatus[s].label}
        </li>
      ))}
    </ul>
  )
}

function WeekView({
  appointments,
  weekStart,
  onWeekChange,
  onOpen,
  highlightId,
}: {
  appointments: Appointment[]
  weekStart: Date
  onWeekChange: (d: Date) => void
  onOpen: (a: Appointment) => void
  highlightId: string | null
}) {
  const person = usePersonLookup()
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const weekEnd = days[6]
  const thisWeek = isSameDay(weekStart, mondayOf(new Date()))

  const byDay = useMemo(() => {
    const m: Record<string, Appointment[]> = {}
    for (const d of days) m[toIsoDate(d)] = []
    for (const a of appointments) if (m[a.date]) m[a.date].push(a)
    for (const k of Object.keys(m)) m[k].sort(byDateAsc)
    return m
  }, [appointments, days])

  const total = Object.values(byDay).reduce((n, xs) => n + xs.length, 0)
  const waiting = Object.values(byDay).reduce((n, xs) => n + xs.filter((a) => a.status === 'requested' || a.status === 'rescheduled').length, 0)
  const rangeLabel = isSameMonth(weekStart, weekEnd) ? `${format(weekStart, 'MMMM d')} – ${format(weekEnd, 'd, yyyy')}` : `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-ink-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-ink-900" aria-live="polite">
            {rangeLabel}
          </h2>
          <p className="text-sm text-ink-500">
            {pluralize(total, 'appointment')}
            {waiting > 0 && ` · ${waiting} awaiting confirmation`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" onClick={() => onWeekChange(addWeeks(weekStart, -1))} aria-label="Previous week">
            <ChevronLeft className="size-5" aria-hidden />
          </Button>
          <Button variant="secondary" onClick={() => onWeekChange(mondayOf(new Date()))} disabled={thisWeek}>
            This week
          </Button>
          <Button variant="secondary" size="icon" onClick={() => onWeekChange(addWeeks(weekStart, 1))} aria-label="Next week">
            <ChevronRight className="size-5" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-ink-100 md:grid-cols-7 md:divide-x md:divide-y-0">
        {days.map((d) => {
          const iso = toIsoDate(d)
          const items = byDay[iso] ?? []
          const isToday = isSameDay(d, new Date())
          const weekend = d.getDay() === 0 || d.getDay() === 6
          return (
            <section key={iso} aria-label={format(d, 'EEEE, MMMM d')} className={cn('flex gap-3 p-3 md:min-h-[22rem] md:flex-col md:gap-2', weekend && 'bg-ink-25')}>
              <h3 className="flex w-14 shrink-0 flex-col items-center md:w-auto md:flex-row md:justify-between md:px-1">
                <span className={cn('text-xs font-semibold tracking-wider uppercase', isToday ? 'text-brand-800' : 'text-ink-500')}>{format(d, 'EEE')}</span>
                <span className={cn('flex size-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums', isToday ? 'bg-brand-900 text-white' : 'text-ink-900')}>{format(d, 'd')}</span>
              </h3>
              <ul className="min-w-0 flex-1 space-y-2">
                {items.length === 0 && <li className="py-2 text-xs text-ink-500 md:hidden">No appointments</li>}
                {items.map((a) => {
                  const muted = a.status === 'cancelled' || a.status === 'declined'
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(a)}
                        className={cn(
                          'block w-full rounded-lg border-l-4 px-2.5 py-2 text-left text-xs transition-colors',
                          appointmentStatusStyles[a.status],
                          a.id === highlightId && 'ring-2 ring-brand-500',
                        )}
                      >
                        <span className="block font-semibold text-ink-900 tabular-nums">{format(parseISO(`${a.date}T${a.time}`), 'h:mm a')}</span>
                        <span className={cn('mt-0.5 block font-medium text-ink-800', muted && 'line-through')}>{appointmentTypes[a.type].label}</span>
                        <span className="relative mt-0.5 block truncate text-ink-600">
                          {person(a.homeownerId)?.label ?? 'Home Owner'}
                          <span className="sr-only">, {appointmentStatus[a.status].label}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </Card>
  )
}
