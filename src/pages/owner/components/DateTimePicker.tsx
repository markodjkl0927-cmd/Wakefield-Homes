import { useCallback, useMemo, type ReactNode } from 'react'
import { addDays, isAfter, isBefore, startOfDay } from 'date-fns'
import { CalendarDays, Clock, Moon, Sun } from 'lucide-react'
import type { Appointment, Settings } from '@/types'
import { cn } from '@/lib/cn'
import { toIsoDate } from '@/lib/utils'
import { formatDayLabel, formatTime } from '@/lib/format'
import { useAppStore } from '@/store'
import { Calendar } from '@/components/ui'
import { describeWorkDays, fromMinutes, timeRange, toMinutes } from './data'

/**
 * Open start times for a day: generated from the booking settings (start/end/slot length),
 * dropping times that would overlap any booking that isn't cancelled or declined.
 */
export function openSlots(
  date: string,
  durationMins: number,
  booking: Settings['booking'],
  appointments: Appointment[],
  excludeId?: string,
): string[] {
  const step = Math.max(15, booking.slotMins || 60)
  const start = toMinutes(booking.startTime)
  const end = toMinutes(booking.endTime)
  const busy = appointments
    .filter((a) => a.date === date && a.id !== excludeId && a.status !== 'cancelled' && a.status !== 'declined')
    .map((a) => [toMinutes(a.time), toMinutes(a.time) + (a.durationMins || 60)] as const)
  const now = new Date()
  // Same-day bookings need at least an hour's notice.
  const earliest = date === toIsoDate(now) ? now.getHours() * 60 + now.getMinutes() + 60 : -1
  const slots: string[] = []
  for (let t = start; t + durationMins <= end; t += step) {
    if (t < earliest) continue
    if (busy.some(([s, e]) => t < e && t + durationMins > s)) continue
    slots.push(fromMinutes(t))
  }
  return slots
}

export interface DateTimePickerProps {
  date: string | null
  time: string | null
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
  durationMins: number
  /** Appointment being rescheduled (its own slot stays available). */
  excludeId?: string
}

/** Calendar + time-slot grid that follows Platform settings → booking hours. */
export function DateTimePicker({ date, time, onDateChange, onTimeChange, durationMins, excludeId }: DateTimePickerProps) {
  const booking = useAppStore((s) => s.settings.booking)
  const appointments = useAppStore((s) => s.appointments)
  const today = useMemo(() => startOfDay(new Date()), [])
  const lastDay = useMemo(() => addDays(today, Math.max(1, booking.daysAhead)), [today, booking.daysAhead])
  // Days outside the booking window, non-working days, and days with no open times left are unavailable.
  const isDisabled = useCallback(
    (d: Date) =>
      isBefore(d, today) ||
      isAfter(d, lastDay) ||
      !booking.workDays.includes(d.getDay()) ||
      openSlots(toIsoDate(d), durationMins, booking, appointments, excludeId).length === 0,
    [today, lastDay, booking, appointments, durationMins, excludeId],
  )
  const selectedUnavailable = !!date && isDisabled(new Date(`${date}T00:00:00`))
  const slots = useMemo(
    () => (date && !selectedUnavailable ? openSlots(date, durationMins, booking, appointments, excludeId) : []),
    [date, selectedUnavailable, durationMins, booking, appointments, excludeId],
  )
  const morning = slots.filter((s) => toMinutes(s) < 12 * 60)
  const afternoon = slots.filter((s) => toMinutes(s) >= 12 * 60)

  const group = (label: string, icon: ReactNode, items: string[]) =>
    items.length > 0 && (
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-500 uppercase">
          <span className="[&>svg]:size-3.5" aria-hidden>
            {icon}
          </span>
          {label}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {items.map((slot) => {
            const selected = slot === time
            return (
              <button
                key={slot}
                type="button"
                data-time-slot
                aria-pressed={selected}
                onClick={() => onTimeChange(slot)}
                className={cn(
                  'h-10 rounded-lg text-sm font-medium tabular-nums ring-1 transition-colors ring-inset',
                  selected ? 'bg-brand-900 text-white ring-brand-900' : 'bg-white text-ink-800 ring-ink-200 hover:bg-brand-50 hover:ring-brand-300',
                )}
              >
                {formatTime(slot)}
              </button>
            )
          })}
        </div>
      </div>
    )

  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-8">
      <div>
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <CalendarDays className="size-4 text-brand-700" aria-hidden /> Choose a day
        </p>
        <Calendar value={date} onChange={onDateChange} isDisabled={isDisabled} minDate={today} />
        <p className="mt-3 text-xs leading-5 text-ink-500">
          Office appointments {describeWorkDays(booking.workDays)}, {formatTime(booking.startTime)} – {formatTime(booking.endTime)}. Book up to {booking.daysAhead} days ahead.
        </p>
      </div>
      <div className="md:border-l md:border-ink-100 md:pl-8">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Clock className="size-4 text-brand-700" aria-hidden />
          {date ? `Open times · ${formatDayLabel(date)}` : 'Open times'}
        </p>
        {!date ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-25 px-6 text-center text-sm text-ink-500">
            Pick a day to see open times.
          </div>
        ) : slots.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-25 px-6 text-center text-sm text-ink-600">
            {selectedUnavailable ? 'That day isn’t available for appointments. Please choose another day.' : 'No open times left on this day. Please choose another day.'}
          </div>
        ) : (
          <div role="group" aria-label={`Open times on ${formatDayLabel(date)}`} className="space-y-4">
            {group('Morning', <Sun />, morning)}
            {group('Afternoon', <Moon />, afternoon)}
          </div>
        )}
        {date && time && !selectedUnavailable && (
          <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-950" aria-live="polite">
            <span className="font-semibold">{formatDayLabel(date)}</span>, {timeRange(time, durationMins)}
          </p>
        )}
      </div>
    </div>
  )
}
