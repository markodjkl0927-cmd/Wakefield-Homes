import type { ReactNode } from 'react'
import { CalendarClock, Clock, Home as HomeIcon, MessageSquareText, UserRound } from 'lucide-react'
import type { Appointment, Home, User } from '@/types'
import { cn } from '@/lib/cn'
import { formatDateShort, formatDayLabel, formatTime } from '@/lib/format'
import { appointmentLocations, appointmentStatus, appointmentTypes } from '@/data/labels'
import { StatusBadge } from '@/components/ui'
import { DateBlock } from './ui'
import { ACTIVE_APPOINTMENT_STATUSES, formatDuration, timeRange } from './data'

export function locationDetail(appointment: Appointment, home: Home | undefined, officeAddress: string): string {
  if (appointment.location === 'office') return officeAddress
  if (appointment.location === 'home-site') return home ? `${home.address}, ${home.city}` : 'Your home site'
  return 'A video link arrives with your confirmation'
}

/** "Moved by the Wakefield office from Tue, Nov 17 at 10:00 AM" — for upcoming appointments whose time changed. */
export function movedNote(appointment: Appointment): string | null {
  const moved = appointment.rescheduled
  if (!moved || !ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)) return null
  const from = `${formatDateShort(moved.fromDate)} at ${formatTime(moved.fromTime)}`
  return moved.byUserId === appointment.homeownerId ? `You asked to move this from ${from}` : `Moved by the Wakefield office from ${from}`
}

function Meta({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 shrink-0 text-ink-400 [&>svg]:size-4" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  )
}

/** Appointment summary used on the Appointments page (full) and the Overview (compact). */
export function AppointmentCard({
  appointment,
  home,
  staff,
  officeAddress,
  actions,
  compact,
  className,
}: {
  appointment: Appointment
  home?: Home
  staff?: User
  officeAddress: string
  actions?: ReactNode
  compact?: boolean
  className?: string
}) {
  const type = appointmentTypes[appointment.type]
  const TypeIcon = type.icon
  const location = appointmentLocations[appointment.location]
  const LocationIcon = location.icon
  const inactive = ['completed', 'cancelled', 'declined'].includes(appointment.status)
  const moved = movedNote(appointment)

  return (
    <article className={cn('grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 sm:gap-x-5', className)}>
      {compact ? (
        <DateBlock date={appointment.date} size="sm" muted={inactive} />
      ) : (
        <>
          <DateBlock date={appointment.date} size="sm" muted={inactive} className="sm:hidden" />
          <DateBlock date={appointment.date} size="md" muted={inactive} className="hidden sm:flex" />
        </>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h3 className={cn('flex items-start gap-2 font-semibold', inactive ? 'text-ink-700' : 'text-ink-900')}>
            <TypeIcon className={cn('mt-1 size-4 shrink-0', inactive ? 'text-ink-400' : 'text-brand-700')} aria-hidden />
            {type.label}
          </h3>
          <StatusBadge def={appointmentStatus[appointment.status]} />
        </div>
        <ul className={cn('mt-2 grid gap-x-6 gap-y-1.5 text-sm text-ink-600', !compact && 'md:grid-cols-2')}>
          <Meta icon={<Clock />}>
            <span className="font-medium text-ink-800">{formatDayLabel(appointment.date)}</span> · <span className="whitespace-nowrap">{timeRange(appointment.time, appointment.durationMins)}</span>
            {!compact && <span className="block text-ink-500">{formatDuration(appointment.durationMins)}</span>}
          </Meta>
          <Meta icon={<LocationIcon />}>
            {location.label}
            {!compact && <span className="block text-ink-500">{locationDetail(appointment, home, officeAddress)}</span>}
          </Meta>
          {!compact && home && (
            <Meta icon={<HomeIcon />}>
              <span className="wrap-anywhere">{home.title}</span>
            </Meta>
          )}
          {!compact && (
            <Meta icon={<UserRound />}>
              {staff ? (
                <>
                  With {staff.name}
                  {staff.title && <span className="block text-ink-500">{staff.title}</span>}
                </>
              ) : (
                <span className="text-ink-500">{appointment.status === 'requested' ? 'A team member will be assigned' : 'Wakefield team'}</span>
              )}
            </Meta>
          )}
        </ul>
        {moved && (
          <p className="mt-2 flex items-start gap-2 text-sm text-ink-600">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
            {moved}
          </p>
        )}
        {!compact && appointment.notes && (
          <p className="mt-3 text-sm text-user text-ink-600">
            <span className="font-medium text-ink-800">Your notes: </span>
            {appointment.notes}
          </p>
        )}
        {!compact && appointment.staffNote && (
          <div className="mt-3 flex gap-2.5 rounded-xl bg-brand-50/70 px-3.5 py-2.5 text-sm text-brand-950 ring-1 ring-brand-100 ring-inset">
            <MessageSquareText className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
            <p className="text-user">
              <span className="font-semibold">Note from Wakefield: </span>
              {appointment.staffNote}
            </p>
          </div>
        )}
      </div>
      {actions && <div className="col-span-2 mt-4 flex flex-wrap gap-2 sm:col-span-1 sm:col-start-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
    </article>
  )
}
