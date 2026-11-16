import { useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, ArrowRight, CalendarCheck, CalendarDays, Clock, Home as HomeIcon, MapPin } from 'lucide-react'
import type { Appointment, AppointmentType } from '@/types'
import { sleep } from '@/lib/utils'
import { formatDayLabel, formatPhone, formatTime } from '@/lib/format'
import { appointmentLocations, appointmentTypes } from '@/data/labels'
import { useAppStore } from '@/store'
import { useCurrentUser, useHomesByOwner } from '@/store/hooks'
import { toast } from '@/store/ui'
import { Alert, Button, ChoiceCards, Field, Modal, Select, Textarea } from '@/components/ui'
import { DateTimePicker } from './DateTimePicker'
import { StepError, StepHeading, StepIndicator, useStepFocus } from './ui'
import { defaultLocationFor, formatDuration, homeOptionalTypes, suggestHomeFor, timeRange } from './data'
import { useDialogBack, type HistoryDialog } from './dialogHistory'

const STEPS = ['Type', 'Home & place', 'Date & time', 'Review']
const HEADINGS = ['What would you like to book?', 'Which home, and where should we meet?', 'When works for you?', 'Check your request']
const typeKeys = Object.keys(appointmentTypes) as AppointmentType[]
const locationKeys = Object.keys(appointmentLocations) as Appointment['location'][]

/**
 * Four-step booking flow: type → home & place → date & time → notes and review.
 * The browser or phone Back button steps back through the flow and finally closes it (useDialogBack).
 * Continue is never disabled: an unfinished step says what's missing and moves focus to it, and every
 * step change moves focus to the new step's heading.
 */
export function BookingModal({ dialog, onBooked }: { dialog: HistoryDialog; onBooked?: (a: Appointment) => void }) {
  const user = useCurrentUser()
  const homes = useHomesByOwner(user?.id)
  const office = useAppStore((s) => s.settings.office)
  const requestAppointment = useAppStore((s) => s.requestAppointment)
  const uid = useId()
  const headingId = `${uid}-heading`
  const errorId = `${uid}-error`
  const headingRef = useRef<HTMLHeadingElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const [step, setStep] = useState(0)
  const [type, setType] = useState<AppointmentType | null>(null)
  const [homeId, setHomeId] = useState('')
  const [homeTouched, setHomeTouched] = useState(false)
  const [location, setLocation] = useState<Appointment['location'] | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const typeDef = type ? appointmentTypes[type] : null
  const home = homes.find((h) => h.id === homeId)
  const homeOptional = !!type && homeOptionalTypes.includes(type)
  const homeRequired = !!type && (!homeOptional || location === 'home-site')
  const needsHomeButNone = !!type && !homeOptional && homes.length === 0

  useStepFocus(step, headingRef)
  useDialogBack(dialog, () => {
    if (step === 0) return false
    setError(null)
    setStep(step - 1)
    return true
  })

  const chooseType = (t: AppointmentType) => {
    setType(t)
    setLocation(defaultLocationFor[t])
    if (!homeTouched) setHomeId(suggestHomeFor(t, homes))
    // Durations differ per type, so a previously picked time may no longer fit.
    setTime(null)
    setError(null)
  }

  const locationOptions = useMemo(
    () =>
      locationKeys.map((key) => {
        const def = appointmentLocations[key]
        const Icon = def.icon
        const description =
          key === 'office' ? office.address : key === 'home-site' ? (home ? `${home.address}, ${home.city}` : 'Your home or lot') : 'We’ll send a link'
        // Meeting at the site needs a home on the account.
        const noHome = key === 'home-site' && homes.length === 0
        return { value: key, label: def.label, description: noHome ? 'Needs a home on your account' : description, icon: <Icon className="size-5" aria-hidden />, disabled: noHome }
      }),
    [office.address, home, homes.length],
  )

  /** Says what the step still needs and focuses that control; null when the step is complete. */
  const missing = (): { message: string; focus: string } | null => {
    if (step === 0 && !type) return { message: 'Choose the type of visit to continue.', focus: 'input[name="appointment-type"]' }
    if (step === 1) {
      if (homeRequired && !homeId) return { message: 'Choose the home this visit is about.', focus: 'select' }
      if (!location) return { message: 'Choose where we should meet.', focus: 'input[name="appointment-location"]' }
    }
    if (step === 2) {
      if (!date) return { message: 'Choose a day to see the open times.', focus: '[role="grid"] button[tabindex="0"]' }
      if (!time) return { message: 'Choose a time to continue.', focus: '[data-time-slot]' }
    }
    return null
  }

  const goNext = () => {
    const gap = missing()
    if (gap) {
      setError(gap.message)
      bodyRef.current?.querySelector<HTMLElement>(gap.focus)?.focus()
      return
    }
    setError(null)
    setStep(step + 1)
  }

  const goBack = () => {
    setError(null)
    setStep(Math.max(0, step - 1))
  }

  const submit = async () => {
    if (!user || !type || !location || !date || !time || submitting) return
    setSubmitting(true)
    try {
      await sleep(350)
      const appointment = requestAppointment({ homeownerId: user.id, homeId: homeId || undefined, type, date, time, location, notes: notes.trim() })
      toast.success('Appointment requested', `${appointmentTypes[type].label} · ${formatDayLabel(date)} at ${formatTime(time)}. The office will confirm it shortly.`)
      onBooked?.(appointment)
      dialog.close()
    } catch (e) {
      toast.error('We couldn’t send your request', e instanceof Error ? e.message : 'Please try again, or call the office.')
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onClose={() => dialog.close()}
      size="lg"
      title="Book an appointment"
      description="Schedule time with the Wakefield office. We’ll confirm your request in the portal."
      footer={
        <>
          {step > 0 && (
            <Button key="back" variant="ghost" leftIcon={<ArrowLeft className="size-4" aria-hidden />} onClick={goBack} className="mr-auto">
              Back
            </Button>
          )}
          {/* Distinct keys: React must not morph "Continue" into the final button mid-click. */}
          {step < STEPS.length - 1 ? (
            !(step === 1 && needsHomeButNone) && (
              <Button key="continue" onClick={goNext} aria-describedby={error ? errorId : undefined} rightIcon={<ArrowRight className="size-4" aria-hidden />}>
                Continue
              </Button>
            )
          ) : (
            <Button key="submit" onClick={submit} loading={submitting} leftIcon={<CalendarCheck className="size-4" aria-hidden />}>
              Request appointment
            </Button>
          )}
        </>
      }
    >
      <StepIndicator steps={STEPS} current={step} />
      <div ref={bodyRef} className="mt-6">
        <StepHeading ref={headingRef} id={headingId}>
          {HEADINGS[step]}
        </StepHeading>
        {error && <StepError id={errorId}>{error}</StepError>}

        <div className="mt-4">
          {step === 0 && (
            <fieldset aria-labelledby={headingId} aria-describedby={error ? errorId : undefined}>
              <ChoiceCards
                name="appointment-type"
                value={type}
                onChange={chooseType}
                columns={2}
                options={typeKeys.map((key) => {
                  const def = appointmentTypes[key]
                  const Icon = def.icon
                  return {
                    value: key,
                    label: def.label,
                    icon: <Icon className="size-5" aria-hidden />,
                    description: (
                      <>
                        {def.description}
                        <span className="mt-1 block text-xs font-medium text-ink-500">{formatDuration(def.durationMins)}</span>
                      </>
                    ),
                  }
                })}
              />
            </fieldset>
          )}

          {step === 1 && type && (
            <div className="space-y-6">
              {needsHomeButNone ? (
                <Alert tone="warning" title="This visit needs a home on your account">
                  Choose a new home consultation or an office meeting instead, or call the office at{' '}
                  <a href={`tel:${office.phone}`} className="font-semibold underline">
                    {formatPhone(office.phone)}
                  </a>
                  .
                  <Button variant="secondary" size="sm" onClick={goBack} leftIcon={<ArrowLeft className="size-4" aria-hidden />} className="mt-3 flex">
                    Choose another visit
                  </Button>
                </Alert>
              ) : (
                <>
                  <Field label="Home" optional={homeOptional && location !== 'home-site'}>
                    {(id) => (
                      <Select
                        id={id}
                        value={homeId}
                        aria-invalid={!!error && homeRequired && !homeId}
                        aria-describedby={error && homeRequired && !homeId ? errorId : undefined}
                        onChange={(e) => {
                          setHomeId(e.target.value)
                          setHomeTouched(true)
                          setError(null)
                        }}
                      >
                        {(homeOptional || !homeId) && <option value="">{homeOptional && location !== 'home-site' ? 'Not about a specific home' : 'Choose a home…'}</option>}
                        {homes.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.title} — {h.address}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <fieldset>
                    <legend className="mb-3 text-sm font-medium text-ink-800">Meeting place</legend>
                    <ChoiceCards
                      name="appointment-location"
                      value={location}
                      onChange={(v) => {
                        setLocation(v)
                        setError(null)
                      }}
                      columns={3}
                      options={locationOptions}
                    />
                    {location === 'home-site' && !homeId && homes.length > 0 && !error && <p className="mt-2 text-sm text-amber-800">Choose the home above so we know where to meet.</p>}
                  </fieldset>
                </>
              )}
            </div>
          )}

          {step === 2 && typeDef && (
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
              durationMins={typeDef.durationMins}
            />
          )}

          {step === 3 && typeDef && type && location && date && time && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-ink-25 p-5 ring-1 ring-ink-200/70 ring-inset">
                <div className="flex items-start gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-white">
                    <typeDef.icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{typeDef.label}</p>
                    <p className="text-sm text-ink-600">{typeDef.description}</p>
                  </div>
                </div>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <ReviewItem icon={<CalendarDays />} label="Date" value={format(parseISO(date), 'EEEE, MMMM d, yyyy')} />
                  <ReviewItem icon={<Clock />} label="Time" value={`${timeRange(time, typeDef.durationMins)} (${formatDuration(typeDef.durationMins)})`} />
                  <ReviewItem
                    icon={<MapPin />}
                    label="Location"
                    value={location === 'office' ? `${appointmentLocations.office.label}, ${office.address}` : location === 'home-site' ? (home ? `${home.address}, ${home.city}` : 'Your home site') : 'Video call'}
                  />
                  <ReviewItem icon={<HomeIcon />} label="Home" value={home?.title ?? 'Not about a specific home'} />
                </dl>
              </div>
              <Field label="Anything we should know?" optional hint="For example, the rooms you want to focus on or who will join you.">
                {(id) => <Textarea id={id} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Add a note for the Wakefield team" aria-describedby={`${id}-hint`} />}
              </Field>
              <p className="text-sm text-ink-600">Your request goes to the Wakefield office. It shows as “Requested” until a team member confirms it, and you’ll get a notification here.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

function ReviewItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-2 text-xs font-medium text-ink-500">
        <span className="text-brand-700 [&>svg]:size-4" aria-hidden>
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-0.5 pl-6 font-medium wrap-anywhere text-ink-900">{value}</dd>
    </div>
  )
}
