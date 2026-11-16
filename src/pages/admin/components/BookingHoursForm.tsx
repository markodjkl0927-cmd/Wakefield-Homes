import { useId, useState, type FormEvent } from 'react'
import { CalendarClock } from 'lucide-react'
import type { Settings } from '@/types'
import { formatTime, pluralize } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useAppStore } from '@/store'
import { toast } from '@/store/ui'
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, Select } from '@/components/ui'
import { FormFooter } from './bits'

type Booking = Settings['booking']

/** Monday first, the way the office thinks about the week. 0 = Sunday … 6 = Saturday. */
const dayOrder = [1, 2, 3, 4, 5, 6, 0]
const dayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const dayLong = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const slotOptions = [30, 45, 60, 90]
const aheadOptions = [14, 30, 45, 60, 90, 120]

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN
}

/** [1,2,3,4,5] → "Mon–Fri"; [1,3,5] → "Mon, Wed, Fri". */
export function formatWorkDays(days: number[]): string {
  const ordered = dayOrder.filter((d) => days.includes(d))
  const runs: number[][] = []
  for (const d of ordered) {
    const last = runs[runs.length - 1]
    const prev = last?.[last.length - 1]
    if (last && prev !== undefined && dayOrder.indexOf(d) === dayOrder.indexOf(prev) + 1) last.push(d)
    else runs.push([d])
  }
  return runs.map((r) => (r.length >= 3 ? `${dayShort[r[0]]}–${dayShort[r[r.length - 1]]}` : r.map((d) => dayShort[d]).join(', '))).join(', ')
}

function validate(b: Booking): Partial<Record<'workDays' | 'startTime' | 'endTime', string>> {
  const e: Partial<Record<'workDays' | 'startTime' | 'endTime', string>> = {}
  if (!b.workDays.length) e.workDays = 'Pick at least one work day.'
  const start = minutes(b.startTime)
  const end = minutes(b.endTime)
  if (Number.isNaN(start)) e.startTime = 'Enter a start time.'
  if (Number.isNaN(end)) e.endTime = 'Enter an end time.'
  else if (!Number.isNaN(start) && end <= start) e.endTime = 'End time must be after the start time.'
  else if (!Number.isNaN(start) && end - start < b.slotMins) e.endTime = `The day must fit at least one ${b.slotMins}-minute slot.`
  return e
}

const sameBooking = (a: Booking, b: Booking) =>
  a.startTime === b.startTime &&
  a.endTime === b.endTime &&
  a.slotMins === b.slotMins &&
  a.daysAhead === b.daysAhead &&
  [...a.workDays].sort().join() === [...b.workDays].sort().join()

/** Booking hours form. Remount it (key) when the saved settings change so it starts clean. */
export function BookingHoursForm({ booking, id }: { booking: Booking; id: string }) {
  const updateSettings = useAppStore((s) => s.updateSettings)
  const bookingOn = useAppStore((s) => s.settings.features.booking)
  const setFeature = useAppStore((s) => s.setFeature)
  const [draft, setDraft] = useState<Booking>(booking)
  const base = useId()

  const dirty = !sameBooking(draft, booking)
  // Validated live: the saved settings are always valid, so errors only appear after an edit breaks them.
  const errors = validate(draft)
  const set = <K extends keyof Booking>(key: K, value: Booking[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const toggleDay = (d: number) => set('workDays', draft.workDays.includes(d) ? draft.workDays.filter((x) => x !== d) : [...draft.workDays, d])

  const slots = Math.floor((minutes(draft.endTime) - minutes(draft.startTime)) / draft.slotMins)
  const summary = Object.keys(errors).length
    ? null
    : `Home Owners can request appointments ${formatWorkDays(draft.workDays)}, ${formatTime(draft.startTime)} – ${formatTime(draft.endTime)}, in ${draft.slotMins}-minute slots (${pluralize(slots, 'slot')} a day), up to ${draft.daysAhead} days ahead.`

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const firstKey = (['workDays', 'startTime', 'endTime'] as const).find((k) => errors[k])
    if (firstKey) {
      document.getElementById(`${base}-${firstKey}`)?.focus()
      return
    }
    const next: Booking = { ...draft, workDays: dayOrder.filter((d) => draft.workDays.includes(d)) }
    updateSettings({ booking: next })
    toast.success('Booking hours saved', `${formatWorkDays(next.workDays)}, ${formatTime(next.startTime)} – ${formatTime(next.endTime)}.`)
  }

  const discard = () => setDraft(booking)

  return (
    <Card id={id} className="scroll-mt-24">
      <CardHeader
        icon={<CalendarClock className="size-[18px]" aria-hidden />}
        title="Booking hours"
        description="When Home Owners can request appointments with the Wakefield office."
      />
      <form onSubmit={onSubmit} noValidate>
        <CardBody className="space-y-6">
          {!bookingOn && (
            <Alert
              tone="warning"
              title="Appointment booking is off"
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFeature('booking', true)
                    toast.success('Appointment booking turned on')
                  }}
                >
                  Turn on
                </Button>
              }
            >
              These hours apply once booking is turned back on.
            </Alert>
          )}

          <fieldset>
            <legend className="text-sm font-medium text-ink-800">Work days</legend>
            <div className="mt-2 grid grid-cols-7 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
              {dayOrder.map((d, i) => {
                const on = draft.workDays.includes(d)
                return (
                  <button
                    key={d}
                    id={i === 0 ? `${base}-workDays` : undefined}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(d)}
                    className={cn(
                      'h-10 rounded-lg text-sm font-semibold ring-1 transition-colors ring-inset sm:min-w-[3.25rem] sm:px-3',
                      on ? 'bg-brand-900 text-white ring-brand-900 hover:bg-brand-800' : 'bg-white text-ink-600 ring-ink-200 hover:bg-ink-50 hover:text-ink-900',
                    )}
                  >
                    <abbr title={dayLong[d]} className="no-underline">
                      {dayShort[d]}
                    </abbr>
                  </button>
                )
              })}
            </div>
            {errors.workDays ? (
              <p className="mt-1.5 text-sm text-rose-600" role="alert">
                {errors.workDays}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-ink-500">Selected days are open for booking.</p>
            )}
          </fieldset>

          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-4 xl:grid-cols-4">
            <Field label="Start time" htmlFor={`${base}-startTime`} error={errors.startTime}>
              <Input
                id={`${base}-startTime`}
                type="time"
                step={900}
                value={draft.startTime}
                onChange={(e) => set('startTime', e.target.value)}
                aria-invalid={!!errors.startTime}
                aria-describedby={errors.startTime ? `${base}-startTime-error` : undefined}
              />
            </Field>
            <Field label="End time" htmlFor={`${base}-endTime`} error={errors.endTime}>
              <Input
                id={`${base}-endTime`}
                type="time"
                step={900}
                value={draft.endTime}
                onChange={(e) => set('endTime', e.target.value)}
                aria-invalid={!!errors.endTime}
                aria-describedby={errors.endTime ? `${base}-endTime-error` : undefined}
              />
            </Field>
            <Field label="Slot length" htmlFor={`${base}-slot`}>
              <Select id={`${base}-slot`} value={draft.slotMins} onChange={(e) => set('slotMins', Number(e.target.value))}>
                {slotOptions.map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Book up to" htmlFor={`${base}-ahead`}>
              <Select id={`${base}-ahead`} value={draft.daysAhead} onChange={(e) => set('daysAhead', Number(e.target.value))}>
                {[...new Set([...aheadOptions, booking.daysAhead])]
                  .sort((a, b) => a - b)
                  .map((d) => (
                    <option key={d} value={d}>
                      {d} days ahead
                    </option>
                  ))}
              </Select>
            </Field>
          </div>

          <p className={cn('rounded-xl px-4 py-3 text-sm ring-1 ring-inset', summary ? 'bg-brand-50/70 text-brand-950 ring-brand-100' : 'bg-ink-25 text-ink-500 ring-ink-200/70')} aria-live="polite">
            {summary ?? 'Fix the highlighted fields to see a preview.'}
          </p>
        </CardBody>
        <FormFooter dirty={dirty} onDiscard={discard} />
      </form>
    </Card>
  )
}
