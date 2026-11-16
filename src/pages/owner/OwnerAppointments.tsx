import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { CalendarCheck, CalendarClock, CalendarPlus, CalendarX, Clock, History, Phone } from 'lucide-react'
import type { Appointment } from '@/types'
import { cn } from '@/lib/cn'
import { useDocumentTitle } from '@/lib/utils'
import { formatDayLabel, formatPhone, formatTime } from '@/lib/format'
import { appointmentTypes } from '@/data/labels'
import { useAppStore } from '@/store'
import { useCurrentUser, useSettings, useUsersById } from '@/store/hooks'
import { confirmDialog, toast } from '@/store/ui'
import { Alert, Button, Card, CardBody, CardHeader, EmptyState, buttonStyles, smoothBehavior } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { AppointmentCard } from './components/AppointmentCard'
import { BookingModal } from './components/BookingModal'
import { RescheduleModal } from './components/RescheduleModal'
import { CustomerCareCard } from './components/CustomerCareCard'
import { describeWorkDays, useHomesById, useOwnerAppointments, whenPhrase } from './components/data'
import { useHistoryDialog } from './components/dialogHistory'

export default function OwnerAppointments() {
  useDocumentTitle('Appointments')
  const user = useCurrentUser()
  const { upcoming, past } = useOwnerAppointments(user?.id)
  const homesById = useHomesById()
  const usersById = useUsersById()
  const settings = useSettings()
  const cancelAppointment = useAppStore((s) => s.cancelAppointment)
  const { pathname, key: locationKey } = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const booking = useHistoryDialog('book-appointment')
  const reschedule = useHistoryDialog<{ id: string }>('reschedule-appointment')
  const [highlight, setHighlight] = useState<string | null>(null)
  const highlightTimer = useRef<number | undefined>(undefined)
  const bookingEnabled = settings.features.booking
  const phone = formatPhone(settings.office.phone)

  // Deep link from the overview: /owner/appointments?book=1 opens the booking dialog (and drops the parameter).
  const deepLinkHandled = useRef<string | null>(null)
  useEffect(() => {
    if (params.get('book') !== '1' || deepLinkHandled.current === locationKey) return
    deepLinkHandled.current = locationKey
    const next = new URLSearchParams(params)
    next.delete('book')
    void navigate({ pathname, search: next.toString() ? `?${next}` : '' }, { replace: true })
    if (bookingEnabled) booking.open()
  }, [params, locationKey, bookingEnabled, pathname, booking, navigate])

  useEffect(() => () => window.clearTimeout(highlightTimer.current), [])

  const onBooked = (a: Appointment) => {
    setHighlight(a.id)
    window.setTimeout(() => document.getElementById(`appt-${a.id}`)?.scrollIntoView({ behavior: smoothBehavior(), block: 'center' }), 160)
    window.clearTimeout(highlightTimer.current)
    highlightTimer.current = window.setTimeout(() => setHighlight(null), 4000)
  }

  // Only upcoming appointments can be moved, and only while online booking is on.
  const rescheduling = bookingEnabled && reschedule.isOpen ? upcoming.find((a) => a.id === reschedule.params?.id) : undefined

  const cancel = async (a: Appointment) => {
    const type = appointmentTypes[a.type]
    const ok = await confirmDialog({
      title: 'Cancel this appointment?',
      description: `${type.label} ${whenPhrase(a.date, a.time, { on: true })} will be canceled and the Wakefield office notified.`,
      confirmLabel: 'Cancel appointment',
      cancelLabel: 'Keep it',
      tone: 'danger',
    })
    if (!ok) return
    cancelAppointment(a.id)
    toast.success('Appointment canceled', `${type.label} · ${formatDayLabel(a.date)} at ${formatTime(a.time)}`)
  }

  if (!user) return null

  const steps = bookingEnabled
    ? [
        { title: 'Request a time', body: 'Choose the type of visit, the home, and an open day and time.' },
        { title: 'We confirm it', body: 'The office confirms your request — you’ll get a notification here.' },
        { title: 'Change plans any time', body: 'Reschedule or cancel from this page before the visit.' },
      ]
    : [
        { title: 'Call the office', body: `Online booking is paused. Call ${phone} to book a visit or change a time.` },
        { title: 'We confirm it', body: 'The office books the visit with you and it appears on this page.' },
        { title: 'Can’t make it?', body: 'You can still cancel an upcoming appointment from this page.' },
      ]

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Book time with the Wakefield office — design selections, site visits, walkthroughs, warranty inspections and more."
        actions={
          bookingEnabled ? (
            <Button leftIcon={<CalendarPlus className="size-4" aria-hidden />} onClick={() => booking.open()}>
              Book an appointment
            </Button>
          ) : undefined
        }
      />

      {!bookingEnabled && (
        <Alert tone="info" title="Online booking is paused" className="mb-6">
          To book a visit or change a time, call the office at{' '}
          <a href={`tel:${settings.office.phone}`} className="font-semibold underline">
            {phone}
          </a>{' '}
          ({settings.office.hours}). Your existing appointments are listed below.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="upcoming-title">
            <h2 id="upcoming-title" className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-900">
              Upcoming
              <span className="rounded-full bg-ink-200/70 px-2 py-0.5 text-xs font-semibold text-ink-700 tabular-nums">{upcoming.length}</span>
            </h2>
            {upcoming.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<CalendarCheck className="size-6" aria-hidden />}
                  title="No upcoming appointments"
                  description={
                    bookingEnabled
                      ? 'Book design selections, a site visit, a walkthrough or a meeting at the office.'
                      : `Online booking is paused — call ${phone} to book a visit.`
                  }
                  action={
                    bookingEnabled ? (
                      <Button leftIcon={<CalendarPlus className="size-4" aria-hidden />} onClick={() => booking.open()}>
                        Book an appointment
                      </Button>
                    ) : undefined
                  }
                />
              </Card>
            ) : (
              <ul className="space-y-4">
                {upcoming.map((a) => (
                  <li key={a.id} id={`appt-${a.id}`} className="scroll-mt-24">
                    <Card className={cn('p-5 transition-shadow duration-500 sm:p-6', highlight === a.id && 'shadow-lift ring-2 ring-brand-500')}>
                      <AppointmentCard
                        appointment={a}
                        home={a.homeId ? homesById[a.homeId] : undefined}
                        staff={a.staffId ? usersById[a.staffId] : undefined}
                        officeAddress={settings.office.address}
                        actions={
                          <>
                            {bookingEnabled ? (
                              <Button
                                variant="secondary"
                                leftIcon={<CalendarClock className="size-4" aria-hidden />}
                                onClick={() => reschedule.open({ id: a.id })}
                                aria-label={`Reschedule ${appointmentTypes[a.type].label.toLowerCase()} ${whenPhrase(a.date, a.time, { on: true })}`}
                              >
                                Reschedule
                              </Button>
                            ) : (
                              <a href={`tel:${settings.office.phone}`} className={buttonStyles('secondary', 'md')}>
                                <Phone className="size-4" aria-hidden /> Call to reschedule
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              leftIcon={<CalendarX className="size-4" aria-hidden />}
                              onClick={() => cancel(a)}
                              aria-label={`Cancel ${appointmentTypes[a.type].label.toLowerCase()} ${whenPhrase(a.date, a.time, { on: true })}`}
                              className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                            >
                              Cancel
                            </Button>
                          </>
                        }
                      />
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="past-title">
            <h2 id="past-title" className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-900">
              Past &amp; canceled
              <span className="rounded-full bg-ink-200/70 px-2 py-0.5 text-xs font-semibold text-ink-700 tabular-nums">{past.length}</span>
            </h2>
            {past.length === 0 ? (
              <Card>
                <EmptyState compact icon={<History className="size-6" aria-hidden />} title="No past appointments yet" description="Completed and canceled appointments are kept here for your records." />
              </Card>
            ) : (
              <Card>
                <ul className="divide-y divide-ink-100">
                  {past.map((a) => (
                    <li key={a.id} className="p-5 sm:p-6">
                      <AppointmentCard
                        appointment={a}
                        home={a.homeId ? homesById[a.homeId] : undefined}
                        staff={a.staffId ? usersById[a.staffId] : undefined}
                        officeAddress={settings.office.address}
                      />
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title={bookingEnabled ? 'How booking works' : 'Booking by phone'} icon={<Clock className="size-[18px]" aria-hidden />} />
            <CardBody>
              <ol className="space-y-4">
                {steps.map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-900 ring-1 ring-brand-100">{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{step.title}</p>
                      <p className="mt-0.5 text-sm text-ink-600">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-5 rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-700 ring-1 ring-ink-200/60 ring-inset">
                Appointments are available {describeWorkDays(settings.booking.workDays)}, {formatTime(settings.booking.startTime)} – {formatTime(settings.booking.endTime)}.
              </p>
              {!bookingEnabled && (
                <a href={`tel:${settings.office.phone}`} className={buttonStyles('secondary', 'md', 'mt-4 w-full')}>
                  <Phone className="size-4" aria-hidden /> Call {phone}
                </a>
              )}
            </CardBody>
          </Card>
          <CustomerCareCard />
        </div>
      </div>

      {booking.isOpen && bookingEnabled && <BookingModal dialog={booking} onBooked={onBooked} />}
      {rescheduling && <RescheduleModal appointment={rescheduling} onClose={() => reschedule.close()} />}
    </>
  )
}
