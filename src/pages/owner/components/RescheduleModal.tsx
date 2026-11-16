import { useId, useRef, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import type { Appointment } from '@/types'
import { sleep, toIsoDate } from '@/lib/utils'
import { formatDayLabel, formatTime } from '@/lib/format'
import { appointmentTypes } from '@/data/labels'
import { useAppStore } from '@/store'
import { toast } from '@/store/ui'
import { Button, Modal } from '@/components/ui'
import { DateTimePicker } from './DateTimePicker'
import { StepError } from './ui'
import { whenPhrase } from './data'

/** Pick a new day and time for an upcoming appointment (the office re-confirms it). */
export function RescheduleModal({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const reschedule = useAppStore((s) => s.rescheduleAppointment)
  const today = toIsoDate(new Date())
  const errorId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)
  const [date, setDate] = useState<string | null>(appointment.date >= today ? appointment.date : null)
  const [time, setTime] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const type = appointmentTypes[appointment.type]

  const submit = async () => {
    if (saving) return
    const gap = !date
      ? { message: 'Choose a new day to see the open times.', focus: '[role="grid"] button[tabindex="0"]' }
      : !time
        ? { message: 'Choose a new time.', focus: '[data-time-slot]' }
        : date === appointment.date && time === appointment.time
          ? { message: 'That’s the time you already have. Choose a different day or time.', focus: '[data-time-slot]' }
          : null
    if (gap || !date || !time) {
      setError(gap?.message ?? null)
      if (gap) bodyRef.current?.querySelector<HTMLElement>(gap.focus)?.focus()
      return
    }
    setSaving(true)
    await sleep(300)
    reschedule(appointment.id, date, time)
    toast.success('New time requested', `${type.label} · ${formatDayLabel(date)} at ${formatTime(time)}. The office will confirm the change.`)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Reschedule appointment"
      description={`${type.label}, currently booked for ${whenPhrase(appointment.date, appointment.time)}.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep current time
          </Button>
          <Button onClick={submit} loading={saving} aria-describedby={error ? errorId : undefined} leftIcon={<CalendarClock className="size-4" aria-hidden />}>
            Request new time
          </Button>
        </>
      }
    >
      <div ref={bodyRef}>
        <DateTimePicker
          date={date}
          time={time}
          onDateChange={(d) => {
            setDate(d)
            setTime(null)
            setError(null)
          }}
          onTimeChange={(t) => {
            setTime(t)
            setError(null)
          }}
          durationMins={appointment.durationMins}
          excludeId={appointment.id}
        />
      </div>
      {error && <StepError id={errorId}>{error}</StepError>}
      <p className="mt-6 text-sm text-ink-600">Your booking shows as “Requested” again until the Wakefield office confirms the new time.</p>
    </Modal>
  )
}
