import { useCallback, useMemo, useRef, type KeyboardEvent } from 'react'
import { startOfDay } from 'date-fns'
import { CalendarDays, Clock } from 'lucide-react'
import type { Appointment, AppointmentType, Home, Settings } from '@/types'
import { cn } from '@/lib/cn'
import { formatDayLabel, formatTime } from '@/lib/format'
import { fromIsoDate, toIsoDate } from '@/lib/utils'
import { useAppStore } from '@/store'
import { Calendar } from '@/components/ui'
import { addMinutesToTime, timeToMinutes } from './common'

/* ------------------------------------------------------------------ */
/* Booking rules (the same office calendar the Home Owner portal uses)  */
/* ------------------------------------------------------------------ */

/** Where each appointment type usually happens. */
export const defaultLocationFor: Record<AppointmentType, Appointment['location']> = {
  consultation: 'office',
  'design-selections': 'office',
  'site-visit': 'home-site',
  walkthrough: 'home-site',
  'warranty-inspection': 'home-site',
  closing: 'office',
  'office-meeting': 'office',
}

/** Appointment types that don't have to be about a specific home. */
export const homeOptionalTypes: AppointmentType[] = ['consultation', 'office-meeting']

/** The most likely home for a visit: a finished home for warranty visits, a home being built for the rest. */
export function suggestHomeFor(type: AppointmentType, homes: Home[]): string {
  if (!homes.length || homeOptionalTypes.includes(type)) return ''
  if (homes.length === 1) return homes[0].id
  const building = homes.find((h) => h.status === 'under-construction' || h.status === 'under-contract')
  const finished = homes.find((h) => h.status === 'completed' || h.status === 'sold')
  if (type === 'warranty-inspection') return (finished ?? homes[0]).id
  return (building ?? homes[0]).id
}

/** "1 hr 30 min" */
export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!h) return `${m} min`
  return m ? `${h} hr ${m} min` : `${h} hr`
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** "Monday to Friday" for a run of days, otherwise "Mon, Wed, Fri". */
export function describeWorkDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b)
  if (!sorted.length) return 'No days'
  const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1)
  if (contiguous && sorted.length > 2) return `${dayNames[sorted[0]]} to ${dayNames[sorted[sorted.length - 1]]}`
  return sorted.map((d) => dayNames[d].slice(0, 3)).join(', ')
}

export interface Slot {
  /** HH:mm start time */
  time: string
  /** Another appointment overlaps this visit. */
  busy: boolean
}

const fromMinutes = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`

/**
 * Start times on a day for a visit of `durationMins`: every slot length from opening time, only where the
 * whole visit ends by closing time. Times already past (today) are left out; times that overlap another
 * booking (anything not canceled or declined) are marked busy — the office keeps one calendar.
 */
export function daySlots(date: string, durationMins: number, booking: Settings['booking'], appointments: Appointment[], excludeId?: string): Slot[] {
  const step = Math.max(15, booking.slotMins || 60)
  const start = timeToMinutes(booking.startTime)
  const end = timeToMinutes(booking.endTime)
  const taken = appointments
    .filter((a) => a.date === date && a.id !== excludeId && a.status !== 'cancelled' && a.status !== 'declined')
    .map((a) => [timeToMinutes(a.time), timeToMinutes(a.time) + (a.durationMins || 60)] as const)
  const now = new Date()
  const nowMins = date === toIsoDate(now) ? now.getHours() * 60 + now.getMinutes() : -1
  const out: Slot[] = []
  for (let t = start; t + durationMins <= end; t += step) {
    if (t <= nowMins) continue
    out.push({ time: fromMinutes(t), busy: taken.some(([s, e]) => t < e && t + durationMins > s) })
  }
  return out
}

/** True when `time` is an open start time on `date` for this visit length. */
export function isOpenSlot(date: string, time: string, durationMins: number, booking: Settings['booking'], appointments: Appointment[], excludeId?: string): boolean {
  return daySlots(date, durationMins, booking, appointments, excludeId).some((s) => s.time === time && !s.busy)
}

/* ------------------------------------------------------------------ */
/* Time slots: a radio group (one Tab stop; arrow keys move and select) */
/* ------------------------------------------------------------------ */

export function TimeSlotGrid({
  slots,
  value,
  onChange,
  labelledBy,
  durationMins,
  className,
}: {
  slots: Slot[]
  value: string | null
  onChange: (time: string) => void
  labelledBy: string
  durationMins: number
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const open = slots.map((s, i) => (s.busy ? -1 : i)).filter((i) => i >= 0)
  const checked = slots.findIndex((s) => !s.busy && s.time === value)
  const tabStop = checked >= 0 ? checked : open[0] ?? -1

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    if (!open.length) return
    const pos = Math.max(0, open.indexOf(index))
    let next: number | undefined
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = open[(pos + 1) % open.length]
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = open[(pos - 1 + open.length) % open.length]
    else if (e.key === 'Home') next = open[0]
    else if (e.key === 'End') next = open[open.length - 1]
    if (next === undefined) return
    e.preventDefault()
    refs.current[next]?.focus()
    onChange(slots[next].time)
  }

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className={cn('grid grid-cols-3 gap-2', className)}>
      {slots.map((s, i) => {
        const selected = i === checked
        return (
          <button
            key={s.time}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={s.busy || undefined}
            tabIndex={i === tabStop ? 0 : -1}
            title={s.busy ? 'Another appointment is booked at this time' : `${formatTime(s.time)} – ${formatTime(addMinutesToTime(s.time, durationMins))}`}
            onClick={() => !s.busy && onChange(s.time)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'h-10 rounded-lg text-sm font-medium tabular-nums ring-1 transition-colors ring-inset',
              selected
                ? 'bg-brand-900 text-white ring-brand-900'
                : s.busy
                  ? 'cursor-not-allowed bg-ink-50 text-ink-400 line-through decoration-ink-300 ring-ink-100'
                  : 'bg-white text-ink-800 ring-ink-200 hover:bg-brand-50 hover:ring-brand-300',
            )}
          >
            {formatTime(s.time)}
            {s.busy && <span className="sr-only">, booked</span>}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Day + time picker                                                    */
/* ------------------------------------------------------------------ */

/**
 * Calendar and open times for staff booking or moving a visit. Follows Platform settings → booking hours
 * (working days, opening hours, slot length). Days without an open time are unavailable. Staff may book
 * beyond the Home Owners' booking window.
 */
export function DaySlotPicker({
  idPrefix,
  date,
  time,
  onDateChange,
  onTimeChange,
  durationMins,
  excludeId,
  error,
}: {
  idPrefix: string
  date: string | null
  time: string | null
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
  durationMins: number
  /** The appointment being moved: its own slot stays open. */
  excludeId?: string
  error?: string | null
}) {
  const booking = useAppStore((s) => s.settings.booking)
  const appointments = useAppStore((s) => s.appointments)
  const today = useMemo(() => startOfDay(new Date()), [])

  const isDisabled = useCallback(
    (d: Date) => !booking.workDays.includes(d.getDay()) || daySlots(toIsoDate(d), durationMins, booking, appointments, excludeId).every((s) => s.busy),
    [booking, appointments, durationMins, excludeId],
  )
  const markers = useMemo(() => {
    const m: Record<string, number> = {}
    for (const a of appointments) if (a.id !== excludeId && a.status !== 'cancelled' && a.status !== 'declined') m[a.date] = (m[a.date] ?? 0) + 1
    return m
  }, [appointments, excludeId])
  const unavailable = !!date && isDisabled(fromIsoDate(date))
  const slots = useMemo(() => (date && !unavailable ? daySlots(date, durationMins, booking, appointments, excludeId) : []), [date, unavailable, durationMins, booking, appointments, excludeId])
  const anyBusy = slots.some((s) => s.busy)
  const labelId = `${idPrefix}-times`

  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-6 @xl:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] @xl:gap-8">
        <div>
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
            <CalendarDays className="size-4 text-brand-700" aria-hidden /> Day
          </p>
          <Calendar value={date} onChange={onDateChange} isDisabled={isDisabled} minDate={today} markers={markers} />
          <p className="mt-3 text-xs leading-5 text-ink-500">
            Office hours {describeWorkDays(booking.workDays)}, {formatTime(booking.startTime)} – {formatTime(booking.endTime)}. A dot marks days that already have appointments.
          </p>
        </div>
        <div className="@xl:border-l @xl:border-ink-100 @xl:pl-8">
          <p id={labelId} className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Clock className="size-4 text-brand-700" aria-hidden />
            {date ? `Times · ${formatDayLabel(date)}` : 'Times'}
          </p>
          {!date ? (
            <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-25 px-6 text-center text-sm text-ink-500">Pick a day to see open times.</div>
          ) : slots.length === 0 || slots.every((s) => s.busy) ? (
            <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-25 px-6 text-center text-sm text-ink-600">
              {unavailable && !booking.workDays.includes(fromIsoDate(date).getDay()) ? 'The office is closed that day. Please choose another day.' : 'No open times left on this day. Please choose another day.'}
            </div>
          ) : (
            <>
              <TimeSlotGrid slots={slots} value={time} onChange={onTimeChange} labelledBy={labelId} durationMins={durationMins} />
              {anyBusy && <p className="mt-3 text-xs text-ink-500">Crossed-out times overlap another appointment.</p>}
            </>
          )}
          {date && time && !unavailable && slots.some((s) => s.time === time && !s.busy) && (
            <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-950" aria-live="polite">
              <span className="font-semibold">{formatDayLabel(date)}</span>, {formatTime(time)} – {formatTime(addMinutesToTime(time, durationMins))}
            </p>
          )}
          {error && (
            <p id={`${idPrefix}-error`} className="mt-3 text-sm text-rose-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
