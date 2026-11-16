import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { format, parseISO } from 'date-fns'
import { ArrowRight, Ban, CalendarClock, Check, CheckCircle2, Clock, Mail, MoreHorizontal, Phone, PhoneCall, X } from 'lucide-react'
import type { Appointment } from '@/types'
import { appointmentLocations, appointmentStatus, appointmentTypes } from '@/data/labels'
import { cn } from '@/lib/cn'
import { formatDate, formatDateShort, formatDayLabel, formatPhone, formatRelative, formatTime } from '@/lib/format'
import { fromIsoDate } from '@/lib/utils'
import { useAppStore } from '@/store'
import { useCan, useCanAny, useCurrentUser, useHomeLookup, usePersonLookup, useSettings, useStaffUsers, useUsersById } from '@/store/hooks'
import { confirmDialog, toast } from '@/store/ui'
import { Alert, Avatar, Button, Field, MenuDivider, MenuItem, Modal, Popover, Select, StatusBadge, Textarea } from '@/components/ui'
import { addMinutesToTime, firstName, optionalTagAA, tapIcon, tapSm, todayIso } from './common'
import { DaySlotPicker, isOpenSlot } from './scheduling'

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Appointments that still need to happen. ('rescheduled' is kept for older saved data; the store no longer produces it.) */
export const ACTIVE_APPOINTMENT_STATUSES: Appointment['status'][] = ['requested', 'confirmed', 'rescheduled']

export function timeRange(a: Pick<Appointment, 'time' | 'durationMins'>) {
  return `${formatTime(a.time)} – ${formatTime(addMinutesToTime(a.time, a.durationMins))}`
}

/** "Tomorrow · Nov 13, 2026" or "Sat, Nov 21, 2026". */
export function dayAndDate(iso: string) {
  const rel = formatDayLabel(iso)
  return ['Today', 'Tomorrow', 'Yesterday'].includes(rel) ? `${rel} · ${formatDate(iso)}` : format(parseISO(iso), 'EEE, MMM d, yyyy')
}

/** Which actions make sense for an appointment right now. */
export function appointmentActions(a: Appointment, today = todayIso()) {
  const active = ACTIVE_APPOINTMENT_STATUSES.includes(a.status)
  const waiting = a.status === 'requested' || a.status === 'rescheduled'
  return {
    confirm: waiting,
    decline: waiting,
    reschedule: active,
    complete: a.status === 'confirmed' && a.date <= today,
    cancel: active,
  }
}

/** Left accent + tint per status, used by the week view blocks. */
export const appointmentStatusStyles: Record<Appointment['status'], string> = {
  requested: 'border-l-amber-500 bg-amber-50 hover:bg-amber-100/70',
  confirmed: 'border-l-emerald-500 bg-emerald-50 hover:bg-emerald-100/70',
  rescheduled: 'border-l-sky-500 bg-sky-50 hover:bg-sky-100/70',
  completed: 'border-l-ink-400 bg-ink-100 hover:bg-ink-200/70',
  cancelled: 'border-l-ink-300 bg-ink-50 text-ink-500 hover:bg-ink-100',
  declined: 'border-l-rose-400 bg-rose-50 hover:bg-rose-100/70',
}

/** "Daniel Ellis" for the appointment's Home Owner (deleted accounts read "… (deleted)"). */
function useOwnerLabel() {
  const person = usePersonLookup()
  return useCallback((a: Pick<Appointment, 'homeownerId'>) => person(a.homeownerId)?.label ?? 'the Home Owner', [person])
}

/* ------------------------------------------------------------------ */
/* Summary block used inside dialogs                                    */
/* ------------------------------------------------------------------ */

export function AppointmentSummary({ appt, className }: { appt: Appointment; className?: string }) {
  const ownerLabel = useOwnerLabel()
  const homeRef = useHomeLookup()
  const type = appointmentTypes[appt.type]
  const home = homeRef(appt.homeId)
  const Icon = type.icon
  return (
    <div className={cn('flex items-start gap-3 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-200/70 ring-inset', className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-800 ring-1 ring-ink-200">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-ink-900">{type.label}</p>
        <p className="mt-0.5 text-ink-600">
          {dayAndDate(appt.date)} · {timeRange(appt)}
        </p>
        <p className="mt-0.5 text-ink-600">
          {ownerLabel(appt)}
          {home ? ` · ${home.title}` : ''}
        </p>
      </div>
    </div>
  )
}

/** Team members for an assignee picker, keeping the current one even if their account was disabled since. */
function useTeamOptions(currentId?: string) {
  const staff = useStaffUsers()
  const users = useUsersById()
  return useMemo(() => {
    const current = currentId ? users[currentId] : undefined
    return current && !staff.some((u) => u.id === current.id) ? [...staff, current] : staff
  }, [staff, users, currentId])
}

/* ------------------------------------------------------------------ */
/* Dialogs                                                              */
/* ------------------------------------------------------------------ */

function ConfirmAppointmentModal({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const me = useCurrentUser()
  const team = useTeamOptions(appt.staffId)
  const ownerLabel = useOwnerLabel()
  const confirmAppointment = useAppStore((s) => s.confirmAppointment)
  const usable = team.filter((u) => u.status !== 'disabled')
  const [staffId, setStaffId] = useState(() => (appt.staffId && usable.some((u) => u.id === appt.staffId) ? appt.staffId : me && usable.some((u) => u.id === me.id) ? me.id : usable[0]?.id ?? ''))
  const [note, setNote] = useState(appt.staffNote ?? '')
  const done = useRef(false)

  const submit = () => {
    if (done.current) return
    done.current = true
    confirmAppointment(appt.id, staffId || undefined, note.trim() || undefined)
    toast.success('Appointment confirmed', `${ownerLabel(appt)} has been notified.`)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Confirm appointment"
      description="The Home Owner is notified as soon as you confirm."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} leftIcon={<Check className="size-4" aria-hidden />}>
            Confirm appointment
          </Button>
        </>
      }
    >
      <div className={cn('space-y-5', optionalTagAA)}>
        <AppointmentSummary appt={appt} />
        {appt.notes && (
          <div className="text-sm">
            <p className="font-medium text-ink-800">Home Owner’s note</p>
            <p className="text-user mt-1 text-ink-600">“{appt.notes}”</p>
          </div>
        )}
        <Field label="Assign to">
          {(id) => (
            <Select id={id} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              {team.map((u) => (
                <option key={u.id} value={u.id} disabled={u.status === 'disabled'}>
                  {u.name}
                  {u.id === me?.id ? ' (you)' : ''}
                  {u.title ? ` — ${u.title}` : ''}
                  {u.status === 'disabled' ? ' (disabled)' : ''}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Note to Home Owner" optional hint="Shown with the confirmation, e.g. what to bring or where to park.">
          {(id) => <Textarea id={id} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Samples will be ready in the design room." aria-describedby={`${id}-hint`} />}
        </Field>
      </div>
    </Modal>
  )
}

const declineReasons = ['That time is no longer available — please pick another slot.', 'We need to meet at the home site instead.', 'Your construction manager will call you to find a better time.']

function DeclineAppointmentModal({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const ownerLabel = useOwnerLabel()
  const declineAppointment = useAppStore((s) => s.declineAppointment)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const done = useRef(false)

  const submit = () => {
    if (done.current) return
    if (!reason.trim()) {
      setError('Please give the Home Owner a reason.')
      return
    }
    done.current = true
    declineAppointment(appt.id, reason.trim())
    toast.success('Booking request declined', `${ownerLabel(appt)} has been notified with your reason.`)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Decline booking request"
      description="Let the Home Owner know why, so they can choose another time."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep request
          </Button>
          <Button variant="danger" onClick={submit} leftIcon={<X className="size-4" aria-hidden />}>
            Decline request
          </Button>
        </>
      }
    >
      <div className={cn('space-y-5', optionalTagAA)}>
        <AppointmentSummary appt={appt} />
        <Field label="Reason" required error={error}>
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (error) setError(null)
              }}
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-error` : undefined}
              placeholder="Explain why this time doesn’t work"
            />
          )}
        </Field>
        <div>
          <p className="text-xs font-medium text-ink-600">Quick replies</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {declineReasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setReason(r)
                  setError(null)
                }}
                className="rounded-full bg-white px-3 py-2 text-left text-xs font-medium text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50 hover:ring-ink-300"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function RescheduleAppointmentModal({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const ownerLabel = useOwnerLabel()
  const booking = useSettings().booking
  const appointments = useAppStore((s) => s.appointments)
  const rescheduleAppointment = useAppStore((s) => s.rescheduleAppointment)
  // Start from the current slot when it can still be booked (future, working day, still open).
  const keep = appt.date >= todayIso() && booking.workDays.includes(fromIsoDate(appt.date).getDay()) && isOpenSlot(appt.date, appt.time, appt.durationMins, booking, appointments, appt.id)
  const [date, setDate] = useState<string | null>(keep ? appt.date : null)
  const [time, setTime] = useState<string | null>(keep ? appt.time : null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const done = useRef(false)
  const unchanged = date === appt.date && time === appt.time

  const submit = () => {
    if (done.current) return
    if (!date || !time) {
      setError('Choose a new day and an open time.')
      return
    }
    if (unchanged) return
    if (!isOpenSlot(date, time, appt.durationMins, booking, appointments, appt.id)) {
      setError('That time is no longer open. Please choose another.')
      setTime(null)
      return
    }
    done.current = true
    rescheduleAppointment(appt.id, date, time, note.trim() || undefined)
    toast.success(`Moved to ${formatDateShort(date)} at ${formatTime(time)}`, `${ownerLabel(appt)} has been notified.${appt.status === 'requested' ? ' The new time is confirmed.' : ''}`)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title="Reschedule appointment"
      description="Pick a new day and time. The new time is confirmed and the Home Owner sees it straight away."
      footer={
        <>
          {date && time && unchanged && <span className="mr-auto text-sm text-ink-500">Pick a different day or time to save.</span>}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!date || !time || unchanged} leftIcon={<CalendarClock className="size-4" aria-hidden />}>
            Save new time
          </Button>
        </>
      }
    >
      <div className={cn('space-y-5', optionalTagAA)}>
        <AppointmentSummary appt={appt} />
        <DaySlotPicker
          idPrefix="reschedule"
          date={date}
          time={time}
          onDateChange={(d) => {
            setDate(d)
            setTime(d === appt.date && keep ? appt.time : null)
            setError(null)
          }}
          onTimeChange={(t) => {
            setTime(t)
            setError(null)
          }}
          durationMins={appt.durationMins}
          excludeId={appt.id}
          error={error}
        />
        {date && time && !unchanged && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-700">
            <span className="text-ink-500 line-through">
              {formatDateShort(appt.date)}, {formatTime(appt.time)}
            </span>
            <ArrowRight className="size-4 text-ink-400" aria-hidden />
            <span className="sr-only">moves to</span>
            <span className="font-semibold text-ink-900">
              {formatDateShort(date)}, {formatTime(time)} – {formatTime(addMinutesToTime(time, appt.durationMins))}
            </span>
          </p>
        )}
        <Field label="Message to Home Owner" optional>
          {(id) => <Textarea id={id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sorry for the change — the inspector moved our site visit." />}
        </Field>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Hook: one place for every appointment action                        */
/* ------------------------------------------------------------------ */

type DialogState = { kind: 'confirm' | 'decline' | 'reschedule'; appt: Appointment } | null

export interface AppointmentActionsApi {
  confirm: (a: Appointment) => void
  decline: (a: Appointment) => void
  reschedule: (a: Appointment) => void
  complete: (a: Appointment) => void
  cancel: (a: Appointment) => Promise<void>
  dialogs: ReactNode
}

export function useAppointmentActions(): AppointmentActionsApi {
  const [dialog, setDialog] = useState<DialogState>(null)
  const ownerLabel = useOwnerLabel()
  const cancelAppointment = useAppStore((s) => s.cancelAppointment)
  const completeAppointment = useAppStore((s) => s.completeAppointment)
  const close = useCallback(() => setDialog(null), [])

  const cancel = async (a: Appointment) => {
    const owner = ownerLabel(a)
    const ok = await confirmDialog({
      title: 'Cancel this appointment?',
      description: `${appointmentTypes[a.type].label} on ${formatDateShort(a.date)} at ${formatTime(a.time)}. ${owner} will be notified.`,
      confirmLabel: 'Cancel appointment',
      cancelLabel: 'Keep appointment',
      tone: 'danger',
    })
    if (!ok) return
    cancelAppointment(a.id)
    toast.success('Appointment canceled', `${owner} has been notified.`)
  }

  const complete = (a: Appointment) => {
    completeAppointment(a.id)
    toast.success('Marked as completed', `${appointmentTypes[a.type].label} with ${ownerLabel(a)}.`)
  }

  const dialogs = (
    <>
      {dialog?.kind === 'confirm' && <ConfirmAppointmentModal appt={dialog.appt} onClose={close} />}
      {dialog?.kind === 'decline' && <DeclineAppointmentModal appt={dialog.appt} onClose={close} />}
      {dialog?.kind === 'reschedule' && <RescheduleAppointmentModal appt={dialog.appt} onClose={close} />}
    </>
  )

  return {
    confirm: (a) => setDialog({ kind: 'confirm', appt: a }),
    decline: (a) => setDialog({ kind: 'decline', appt: a }),
    reschedule: (a) => setDialog({ kind: 'reschedule', appt: a }),
    complete,
    cancel,
    dialogs,
  }
}

/* ------------------------------------------------------------------ */
/* Action buttons                                                       */
/* ------------------------------------------------------------------ */

/** Compact row actions: the main action(s) as buttons, the rest in a "More" menu. */
export function AppointmentRowActions({ appt, api, label }: { appt: Appointment; api: AppointmentActionsApi; label: string }) {
  const can = appointmentActions(appt)
  if (!can.confirm && !can.reschedule && !can.complete && !can.cancel) return null
  const menu: { label: string; icon: ReactNode; run: () => void; danger?: boolean }[] = []
  if (can.confirm || can.complete) {
    if (can.reschedule) menu.push({ label: 'Reschedule', icon: <CalendarClock />, run: () => api.reschedule(appt) })
  }
  if (can.cancel) menu.push({ label: 'Cancel appointment', icon: <Ban />, run: () => void api.cancel(appt), danger: true })

  return (
    <div className="flex flex-wrap items-center gap-2">
      {can.confirm && (
        <Button size="sm" className={tapSm} onClick={() => api.confirm(appt)} leftIcon={<Check className="size-4" aria-hidden />}>
          Confirm
        </Button>
      )}
      {can.decline && (
        <Button size="sm" variant="secondary" className={tapSm} onClick={() => api.decline(appt)}>
          Decline
        </Button>
      )}
      {!can.confirm && can.complete && (
        <Button size="sm" className={tapSm} onClick={() => api.complete(appt)} leftIcon={<CheckCircle2 className="size-4" aria-hidden />}>
          Mark completed
        </Button>
      )}
      {!can.confirm && !can.complete && can.reschedule && (
        <Button size="sm" variant="secondary" className={tapSm} onClick={() => api.reschedule(appt)} leftIcon={<CalendarClock className="size-4" aria-hidden />}>
          Reschedule
        </Button>
      )}
      {menu.length > 0 && (
        <Popover
          align="right"
          panelClassName="w-56"
          trigger={({ toggle, open }) => (
            <Button size="icon-sm" variant="ghost" className={tapIcon} onClick={toggle} aria-expanded={open} aria-label={`More actions for ${label}`}>
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          )}
        >
          {({ close }) => (
            <div>
              {menu.map((m, i) => (
                <div key={m.label}>
                  {m.danger && i > 0 && <MenuDivider />}
                  <MenuItem
                    icon={m.icon}
                    tone={m.danger ? 'danger' : 'default'}
                    onClick={() => {
                      close()
                      m.run()
                    }}
                  >
                    {m.label}
                  </MenuItem>
                </div>
              ))}
            </div>
          )}
        </Popover>
      )}
    </div>
  )
}

/**
 * All available actions as full buttons (drawer footers, where menus would be clipped). On phones the main
 * action comes first at full width, then the secondary actions side by side, then "Cancel appointment".
 */
export function AppointmentActionButtons({ appt, api, onAction }: { appt: Appointment; api: AppointmentActionsApi; onAction?: () => void }) {
  const can = appointmentActions(appt)
  const run = (fn: () => void) => () => {
    onAction?.()
    fn()
  }
  const secondary = [
    can.reschedule && (
      <Button key="reschedule" variant="secondary" onClick={run(() => api.reschedule(appt))} leftIcon={<CalendarClock className="size-4" aria-hidden />}>
        Reschedule
      </Button>
    ),
    can.decline && (
      <Button key="decline" variant="secondary" onClick={run(() => api.decline(appt))}>
        Decline
      </Button>
    ),
  ].filter(Boolean)
  const primary = can.confirm ? (
    <Button onClick={run(() => api.confirm(appt))} leftIcon={<Check className="size-4" aria-hidden />} className="w-full sm:w-auto">
      Confirm
    </Button>
  ) : can.complete ? (
    <Button onClick={run(() => api.complete(appt))} leftIcon={<CheckCircle2 className="size-4" aria-hidden />} className="w-full sm:w-auto">
      Mark completed
    </Button>
  ) : null

  if (!primary && !secondary.length && !can.cancel) return null
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
      {can.cancel && (
        <Button
          variant="ghost"
          className="text-rose-700 hover:bg-rose-50 hover:text-rose-800 max-sm:order-last max-sm:self-center sm:mr-auto"
          onClick={run(() => void api.cancel(appt))}
          leftIcon={<Ban className="size-4" aria-hidden />}
        >
          Cancel appointment
        </Button>
      )}
      {secondary.length > 0 && <div className={cn('grid gap-2 sm:flex', secondary.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>{secondary}</div>}
      {primary && <div className="max-sm:order-first">{primary}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Details (drawer body)                                                */
/* ------------------------------------------------------------------ */

export function AppointmentDetails({ appt }: { appt: Appointment }) {
  const person = usePersonLookup()
  const homeRef = useHomeLookup()
  const me = useCurrentUser()
  // Homes & 3D opens with either permission ("Manage 3D viewing" alone gives the 3D part).
  const canOpenHomes = useCanAny(['homes.edit', 'homes.3d'])
  const canViewOwners = useCan('homeowners.view')
  const ownerRef = person(appt.homeownerId)
  const owner = ownerRef?.user
  const staff = appt.staffId ? person(appt.staffId) : undefined
  const home = homeRef(appt.homeId)
  const bookedBy = appt.bookedById && appt.bookedById !== appt.homeownerId ? person(appt.bookedById) : undefined
  const moved = appt.rescheduled
  const movedBy = moved ? (moved.byUserId === me?.id ? 'you' : person(moved.byUserId)?.label ?? 'the office') : undefined
  const type = appointmentTypes[appt.type]
  const loc = appointmentLocations[appt.location]
  const TypeIcon = type.icon
  const LocIcon = loc.icon
  const date = parseISO(appt.date)

  return (
    <div className="space-y-6 px-5 py-5">
      <div className="flex items-start gap-4">
        <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-brand-50 py-2 text-brand-900 ring-1 ring-brand-100">
          <span className="text-xs font-semibold tracking-wider uppercase">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
          <span className="text-2xl leading-tight font-semibold tabular-nums">{date.getDate()}</span>
          <span className="text-xs text-brand-700">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
        </div>
        <div className="min-w-0">
          <StatusBadge def={appointmentStatus[appt.status]} />
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-ink-900">
            <TypeIcon className="size-4 text-ink-400" aria-hidden /> {type.label}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-600">
            <Clock className="size-4 text-ink-400" aria-hidden /> {timeRange(appt)} · {appt.durationMins} min
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-600">
            <LocIcon className="size-4 text-ink-400" aria-hidden /> {loc.label}
          </p>
        </div>
      </div>

      {(bookedBy || moved) && (
        <ul className="space-y-1.5 rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-600">
          {bookedBy && (
            <li className="flex items-start gap-2">
              <PhoneCall className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
              <span>
                Booked by {bookedBy.id === me?.id ? 'you' : bookedBy.label} for {firstName(ownerRef?.name ?? 'the Home Owner')} · {formatRelative(appt.createdAt)}
              </span>
            </li>
          )}
          {moved && (
            <li className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
              <span>
                Moved by {movedBy} from {formatDateShort(moved.fromDate)} at {formatTime(moved.fromTime)}
              </span>
            </li>
          )}
        </ul>
      )}

      <section aria-labelledby="appt-owner">
        <h3 id="appt-owner" className="text-xs font-semibold tracking-wider text-ink-500 uppercase">
          Home Owner
        </h3>
        {owner ? (
          <div className="mt-3 rounded-xl p-4 ring-1 ring-ink-200">
            <div className="flex items-center gap-3">
              <Avatar name={owner.name} />
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{owner.name}</p>
                {home && (
                  <p className="truncate text-sm text-ink-500">
                    {canOpenHomes && home.home ? (
                      <Link to={`/staff/homes/${home.id}`} className="font-medium text-brand-800 hover:underline">
                        {home.title}
                      </Link>
                    ) : (
                      <>
                        {home.title}
                        {home.removed ? ' (no longer listed)' : ''}
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {owner.phone && (
                <a href={`tel:${owner.phone}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-medium text-ink-800 ring-1 ring-ink-200 hover:bg-ink-50">
                  <Phone className="size-4 text-ink-400" aria-hidden /> {formatPhone(owner.phone)}
                </a>
              )}
              <a href={`mailto:${owner.email}`} className="inline-flex h-10 min-w-0 items-center gap-2 rounded-lg bg-white px-3 text-sm font-medium text-ink-800 ring-1 ring-ink-200 hover:bg-ink-50">
                <Mail className="size-4 shrink-0 text-ink-400" aria-hidden /> <span className="truncate">{owner.email}</span>
              </a>
            </div>
            {canViewOwners && (
              <Link to={`/staff/homeowners?owner=${owner.id}`} className="mt-3 inline-block text-sm font-medium text-brand-800 hover:underline">
                View Home Owner profile
              </Link>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-500">{ownerRef?.deleted ? `${ownerRef.label} — this account no longer exists.` : 'This Home Owner account no longer exists.'}</p>
        )}
      </section>

      {appt.notes && (
        <section aria-labelledby="appt-notes">
          <h3 id="appt-notes" className="text-xs font-semibold tracking-wider text-ink-500 uppercase">
            {bookedBy ? 'What it’s about' : 'Home Owner’s note'}
          </h3>
          <p className="text-user mt-2 rounded-xl bg-ink-50 p-4 text-sm leading-6 text-ink-700">“{appt.notes}”</p>
        </section>
      )}

      <section aria-labelledby="appt-staff">
        <h3 id="appt-staff" className="text-xs font-semibold tracking-wider text-ink-500 uppercase">
          Wakefield team
        </h3>
        <div className="mt-3 flex items-center gap-3 text-sm">
          {staff ? (
            <>
              <Avatar name={staff.name} size="sm" />
              <span>
                <span className="block font-medium text-ink-900">{staff.label}</span>
                {staff.user?.title && <span className="block text-xs text-ink-500">{staff.user.title}</span>}
              </span>
            </>
          ) : (
            <span className="text-ink-500">Not assigned yet</span>
          )}
        </div>
        {appt.staffNote && (
          <p className="text-user mt-3 rounded-xl bg-brand-50 p-4 text-sm leading-6 text-brand-950">
            <span className="font-medium">Note to Home Owner: </span>
            {appt.staffNote}
          </p>
        )}
      </section>

      <p className="text-xs text-ink-500">
        {bookedBy ? 'Booked' : 'Requested'} {formatRelative(appt.createdAt)} · last updated {formatRelative(appt.updatedAt)}
      </p>

      {appt.status === 'requested' && appt.date < todayIso() && (
        <Alert tone="warning" title="This request is in the past">
          Reschedule it to a new time or decline it so the Home Owner can book again.
        </Alert>
      )}
    </div>
  )
}
