import { useMemo, useRef, useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import type { Appointment, AppointmentType } from '@/types'
import { appointmentLocations, appointmentTypes } from '@/data/labels'
import { cn } from '@/lib/cn'
import { formatDateShort, formatTime } from '@/lib/format'
import { useAppStore } from '@/store'
import { useCurrentUser, useHomeowners, useOffice, useStaffUsers } from '@/store/hooks'
import { toast } from '@/store/ui'
import { Alert, Button, Field, Modal, Segmented, Select, Textarea } from '@/components/ui'
import { HomeOwnerSelect, firstName, optionalTagAA } from './common'
import { DaySlotPicker, defaultLocationFor, formatDuration, homeOptionalTypes, isOpenSlot, suggestHomeFor } from './scheduling'

const typeKeys = Object.keys(appointmentTypes) as AppointmentType[]
const locationKeys = Object.keys(appointmentLocations) as Appointment['location'][]
const locationShort: Record<Appointment['location'], string> = { office: 'Office', 'home-site': 'At the home', video: 'Video call' }

type ErrorKey = 'owner' | 'type' | 'home' | 'when'
const errorOrder: ErrorKey[] = ['owner', 'type', 'home', 'when']

/**
 * Staff book an appointment for a Home Owner who phoned or emailed the office. Office bookings are
 * confirmed straight away and the Home Owner is notified (they can see it in their portal).
 */
export function NewAppointmentModal({ onClose, onBooked, initialOwnerId }: { onClose: () => void; onBooked: (a: Appointment) => void; initialOwnerId?: string }) {
  const me = useCurrentUser()
  const owners = useHomeowners()
  const staff = useStaffUsers()
  const homes = useAppStore((s) => s.homes)
  const booking = useAppStore((s) => s.settings.booking)
  const appointments = useAppStore((s) => s.appointments)
  const requestAppointment = useAppStore((s) => s.requestAppointment)
  const office = useOffice()

  const startOwner = initialOwnerId && owners.some((o) => o.id === initialOwnerId && o.status !== 'disabled') ? initialOwnerId : ''
  const [ownerId, setOwnerId] = useState(startOwner)
  const [type, setType] = useState<AppointmentType | ''>('')
  const [homeId, setHomeId] = useState('')
  const [homeTouched, setHomeTouched] = useState(false)
  const [location, setLocation] = useState<Appointment['location']>('office')
  const [staffId, setStaffId] = useState(me && staff.some((u) => u.id === me.id) ? me.id : staff[0]?.id ?? '')
  const [date, setDate] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [staffNote, setStaffNote] = useState('')
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const inFlight = useRef(false)

  const owner = owners.find((o) => o.id === ownerId)
  const ownerHomes = useMemo(() => homes.filter((h) => h.ownerId === ownerId), [homes, ownerId])
  const home = ownerHomes.find((h) => h.id === homeId)
  const typeDef = type ? appointmentTypes[type] : null
  const durationMins = typeDef?.durationMins ?? 60
  const homeOptional = !type || homeOptionalTypes.includes(type)
  const homeRequired = !!type && (!homeOptional || location === 'home-site')
  const needsHomeButNone = !!owner && homeRequired && ownerHomes.length === 0
  const staffOptions = useMemo(() => [...staff].sort((a, b) => Number(b.id === me?.id) - Number(a.id === me?.id) || a.name.localeCompare(b.name)), [staff, me?.id])

  const clear = (...keys: ErrorKey[]) => setErrors((e) => (keys.some((k) => e[k]) ? { ...e, ...Object.fromEntries(keys.map((k) => [k, undefined])) } : e))

  /** A picked time that no longer fits (other visit length, booked meanwhile) is cleared. */
  const keepTimeIfOpen = (nextDuration: number) => {
    if (date && time && !isOpenSlot(date, time, nextDuration, booking, appointments)) setTime(null)
  }

  const changeOwner = (id: string) => {
    setOwnerId(id)
    setHomeTouched(false)
    setHomeId(type ? suggestHomeFor(type, homes.filter((h) => h.ownerId === id)) : '')
    clear('owner', 'home')
  }

  const changeType = (t: AppointmentType) => {
    setType(t)
    setLocation(defaultLocationFor[t])
    if (!homeTouched) setHomeId(suggestHomeFor(t, ownerHomes))
    keepTimeIfOpen(appointmentTypes[t].durationMins)
    clear('type', 'home')
  }

  const validate = () => {
    const e: Partial<Record<ErrorKey, string>> = {}
    if (!ownerId) e.owner = 'Choose the Home Owner this appointment is for.'
    if (!type) e.type = 'Choose the type of appointment.'
    if (homeRequired && !homeId) e.home = ownerHomes.length ? (location === 'home-site' ? 'Choose the home so the team knows where to meet.' : 'Choose the home this visit is about.') : 'This visit needs a home on the account.'
    if (!date || !time) e.when = 'Choose a day and an open time.'
    else if (!isOpenSlot(date, time, durationMins, booking, appointments)) e.when = 'That time is no longer open. Please choose another.'
    setErrors(e)
    const first = errorOrder.find((k) => e[k])
    if (first === 'when') {
      // The open time slot (one Tab stop), else the calendar's focusable day.
      const slot = date ? document.querySelector<HTMLElement>('#newappt-times ~ [role="radiogroup"] [tabindex="0"]') : null
      ;(slot ?? document.querySelector<HTMLElement>('[role="dialog"] [data-iso][tabindex="0"]'))?.focus()
    } else if (first) {
      // With no homes on the account the Home select is disabled: send focus to the Home Owner instead.
      document.getElementById(`newappt-${first === 'home' && !ownerHomes.length ? 'owner' : first}`)?.focus()
    }
    return !first
  }

  const submit = () => {
    if (inFlight.current || !validate() || !owner || !type || !date || !time) return
    inFlight.current = true
    setSubmitting(true)
    try {
      const appt = requestAppointment({
        homeownerId: owner.id,
        homeId: homeId || undefined,
        type,
        date,
        time,
        location,
        notes: notes.trim(),
        staffId: staffId || undefined,
        staffNote: staffNote.trim() || undefined,
      })
      toast.success(`Booked for ${owner.name}`, `${appointmentTypes[type].label} on ${formatDateShort(date)} at ${formatTime(time)} is confirmed. ${firstName(owner.name)} has been notified.`)
      onBooked(appt)
    } catch (err) {
      inFlight.current = false
      setSubmitting(false)
      toast.error('The appointment couldn’t be booked', err instanceof Error ? err.message : undefined)
    }
  }

  const locationHint =
    location === 'office' ? office.fullAddress || office.address : location === 'home-site' ? (home ? `${home.address}, ${home.city}` : 'At the Home Owner’s home or lot') : 'We’ll send the Home Owner a video link'

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title="New appointment"
      description="Book a visit for a Home Owner who called or emailed. It’s confirmed straight away and they’re notified in their portal."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting} leftIcon={<CalendarCheck className="size-4" aria-hidden />}>
            Book appointment
          </Button>
        </>
      }
    >
      <div className={cn('space-y-6', optionalTagAA)}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Home Owner" required error={errors.owner} htmlFor="newappt-owner">
            <HomeOwnerSelect
              id="newappt-owner"
              value={ownerId}
              onChange={changeOwner}
              owners={owners}
              invalid={!!errors.owner}
              describedBy={errors.owner ? 'newappt-owner-error' : undefined}
              autoFocus={!startOwner}
            />
          </Field>
          <Field label="Type" required error={errors.type} htmlFor="newappt-type" hint={typeDef && !errors.type ? `${typeDef.description} ${formatDuration(typeDef.durationMins)}.` : undefined}>
            <Select
              id="newappt-type"
              value={type}
              onChange={(e) => changeType(e.target.value as AppointmentType)}
              aria-invalid={!!errors.type || undefined}
              aria-describedby={errors.type ? 'newappt-type-error' : typeDef ? 'newappt-type-hint' : undefined}
              data-autofocus={startOwner ? true : undefined}
            >
              {!type && <option value="">Choose a type…</option>}
              {typeKeys.map((t) => (
                <option key={t} value={t}>
                  {appointmentTypes[t].label} · {formatDuration(appointmentTypes[t].durationMins)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Home"
            required={homeRequired}
            optional={!homeRequired}
            error={errors.home}
            htmlFor="newappt-home"
            hint={!errors.home && !ownerId ? 'Choose the Home Owner first.' : undefined}
          >
            <Select
              id="newappt-home"
              value={homeId}
              onChange={(e) => {
                setHomeId(e.target.value)
                setHomeTouched(true)
                clear('home')
              }}
              disabled={!ownerId || ownerHomes.length === 0}
              aria-invalid={!!errors.home || undefined}
              aria-describedby={errors.home ? 'newappt-home-error' : !ownerId ? 'newappt-home-hint' : undefined}
            >
              {(!homeRequired || !homeId) && <option value="">{ownerId && ownerHomes.length === 0 ? 'No homes on this account' : homeRequired ? 'Choose a home…' : 'Not about a specific home'}</option>}
              {ownerHomes.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title} — {h.address}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Team member" htmlFor="newappt-staff" hint={`${staff.find((u) => u.id === staffId)?.title ?? 'Wakefield team'} · shown to the Home Owner as their contact.`}>
            <Select id="newappt-staff" value={staffId} onChange={(e) => setStaffId(e.target.value)} aria-describedby="newappt-staff-hint">
              {staffOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.id === me?.id ? ' (you)' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <div className="space-y-1.5 sm:col-span-2">
            <p id="newappt-where" className="text-sm font-medium text-ink-800">
              Where
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <Segmented
                ariaLabel="Where"
                value={location}
                onChange={(v) => {
                  setLocation(v)
                  clear('home')
                }}
                items={locationKeys.map((k) => {
                  const Icon = appointmentLocations[k].icon
                  return { value: k, label: locationShort[k], icon: <Icon className="size-4" aria-hidden /> }
                })}
              />
              <p className="min-w-0 text-sm text-ink-500">{locationHint}</p>
            </div>
          </div>
        </div>

        {needsHomeButNone && owner && (
          <Alert tone="warning" title={`${firstName(owner.name)} has no homes on the account yet`}>
            {typeDef?.label ?? 'This visit'} needs a home. Book a new home consultation or an office meeting instead, or assign the home under Homes &amp; 3D first.
          </Alert>
        )}

        <fieldset className="rounded-2xl bg-ink-25 p-4 ring-1 ring-ink-200/70 ring-inset sm:p-5">
          <legend className="sr-only">Date and time</legend>
          <DaySlotPicker
            idPrefix="newappt"
            date={date}
            time={time}
            onDateChange={(d) => {
              setDate(d)
              setTime(null)
              clear('when')
            }}
            onTimeChange={(t) => {
              setTime(t)
              clear('when')
            }}
            durationMins={durationMins}
            error={errors.when}
          />
          {!type && <p className="mt-3 text-xs text-ink-500">Times shown for a one-hour visit until you choose the type.</p>}
        </fieldset>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="What it’s about" optional hint="What the Home Owner asked for. They see this in their portal.">
            {(id) => <Textarea id={id} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Wants to walk the loft framing before insulation." aria-describedby={`${id}-hint`} />}
          </Field>
          <Field label="Message to the Home Owner" optional hint="Sent with the confirmation, e.g. what to bring or where to park.">
            {(id) => <Textarea id={id} rows={3} value={staffNote} onChange={(e) => setStaffNote(e.target.value)} maxLength={500} placeholder="Park in the visitor spaces by the side entrance." aria-describedby={`${id}-hint`} />}
          </Field>
        </div>
      </div>
    </Modal>
  )
}
