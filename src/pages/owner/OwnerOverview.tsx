import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { format } from 'date-fns'
import { ArrowRight, Bell, CalendarDays, CalendarPlus, FileSignature, Home as HomeIcon, Phone, Wrench, X, type LucideIcon } from 'lucide-react'
import type { Home } from '@/types'
import { cn } from '@/lib/cn'
import { useDocumentTitle } from '@/lib/utils'
import { formatDate, formatRelative, pluralize } from '@/lib/format'
import { appointmentTypes } from '@/data/labels'
import { getModel } from '@/data/models'
import { useAppStore } from '@/store'
import { useCurrentUser, useHomesByOwner, useMyNotifications, useOffice, usePersonLookup, useSettings } from '@/store/hooks'
import { Alert, ButtonLink, Card, CardHeader, EmptyState, ProgressBar, SmartImage, StatusBadge } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import type { LoginRedirectState } from '@/pages/auth/LoginPage'
import { CustomerCareCard } from './components/CustomerCareCard'
import { AppointmentCard } from './components/AppointmentCard'
import { RequestRow } from './components/rows'
import { CardLink, SectionTitle } from './components/ui'
import { WarrantyLines, isBuilding, ownerHomeStatus, warrantyInfo } from './components/homeBits'
import {
  agreementFreshness,
  firstName,
  greetingFor,
  isRequestOpen,
  requestTypesPhrase,
  useEnabledRequestCategories,
  useHomesById,
  useOwnerAgreements,
  useOwnerAppointments,
  useOwnerRequests,
  whenPhrase,
} from './components/data'

interface AttentionItem {
  id: string
  tone: 'warning' | 'info' | 'success'
  title: string
  body: string
  to: string
  cta: string
}

interface QuickAction {
  /** A page in the portal, or a tel: link. */
  to?: string
  href?: string
  icon: LucideIcon
  title: string
  body: string
}

function HomeSummaryCard({ home }: { home: Home }) {
  const model = getModel(home.modelId)
  const building = isBuilding(home)
  const current = home.construction?.stages.find((s) => s.status === 'current')
  const warranty = warrantyInfo(home)
  const covered = warranty.structuralActive || warranty.workmanshipActive
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70 transition-all focus-within:ring-2 focus-within:ring-brand-500 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative">
        <SmartImage src={home.images[0] ?? model?.image} alt="" className="aspect-[16/9] w-full" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
        <StatusBadge def={ownerHomeStatus(home)} className="absolute top-3 left-3 bg-white/95 shadow-sm" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-semibold wrap-anywhere text-ink-900">
          <Link to={`/owner/homes/${home.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {home.title}
          </Link>
        </h3>
        <p className="mt-0.5 text-sm text-ink-600">
          {home.address}, {home.city}
        </p>
        <div className="mt-auto pt-5">
          {building && home.construction ? (
            <div>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink-600">
                  Current stage: <span className="font-semibold text-ink-900">{current?.label ?? 'Getting started'}</span>
                </span>
                <span className="font-semibold text-brand-900 tabular-nums">{home.construction.progress}%</span>
              </div>
              <ProgressBar value={home.construction.progress} className="mt-2" label={`${home.title} construction progress`} />
              {home.construction.estCompletion && <p className="mt-2 text-xs text-ink-500">Estimated completion {formatDate(home.construction.estCompletion)}</p>}
            </div>
          ) : warranty.workmanshipEnds || warranty.structuralEnds ? (
            <WarrantyLines
              info={warranty}
              className={cn('rounded-xl px-3 py-2.5 text-sm ring-1 ring-inset', covered ? 'bg-emerald-50/70 ring-emerald-100' : 'bg-ink-50 ring-ink-200')}
            />
          ) : home.closingDate ? (
            <p className="text-sm text-ink-600">Closed {formatDate(home.closingDate)}</p>
          ) : null}
        </div>
      </div>
    </article>
  )
}

const quickColumns: Record<number, string> = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-2 xl:grid-cols-4' }

/**
 * Quick action: a row on phones and wide screens. In a row of three between md and xl a row would be
 * cramped (titles wrap, descriptions get cut off), so there it becomes a tile: icon, then title and text.
 */
function QuickActionCard({ action, tile }: { action: QuickAction; tile: boolean }) {
  const className = cn(
    'group relative flex h-full items-center gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift hover:ring-brand-200',
    tile && 'md:max-xl:flex-col md:max-xl:items-start md:max-xl:gap-3',
  )
  const inner = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-white shadow-sm">
        <action.icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink-900">{action.title}</span>
        <span className="mt-0.5 line-clamp-2 block text-sm text-ink-600">{action.body}</span>
      </span>
      <ArrowRight
        className={cn(
          'size-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700',
          tile && 'md:max-xl:absolute md:max-xl:top-5 md:max-xl:right-5',
        )}
        aria-hidden
      />
    </>
  )
  return action.href ? (
    <a href={action.href} className={className}>
      {inner}
    </a>
  ) : (
    <Link to={action.to ?? '/owner'} className={className}>
      {inner}
    </Link>
  )
}

export default function OwnerOverview() {
  useDocumentTitle('Overview')
  const user = useCurrentUser()
  const homes = useHomesByOwner(user?.id)
  const agreements = useOwnerAgreements(user?.id)
  const { upcoming } = useOwnerAppointments(user?.id)
  const requests = useOwnerRequests(user?.id)
  const notifications = useMyNotifications()
  const person = usePersonLookup()
  const homesById = useHomesById()
  const settings = useSettings()
  const office = useOffice()
  const enabledCategories = useEnabledRequestCategories()
  const markRead = useAppStore((s) => s.markNotificationRead)
  const location = useLocation()
  const navigate = useNavigate()

  const bookingOn = settings.features.booking
  const maintenanceOn = settings.features.maintenance && enabledCategories.length > 0
  const esignOn = settings.features.agreementsEsign
  const welcome = !!(location.state as LoginRedirectState | null)?.firstSignIn

  const attention = useMemo(() => {
    const items: AttentionItem[] = []
    for (const a of agreements) {
      const latest = a.history[a.history.length - 1]
      const by = person(latest?.byUserId ?? a.updatedByUserId)?.name ?? 'Wakefield Homes'
      const when = formatRelative(latest?.at ?? a.updatedAt)
      const fresh = agreementFreshness(a)
      const note = fresh && latest?.note ? ` — ${latest.note}` : ''
      if (a.status === 'awaiting-signature') {
        items.push(
          esignOn
            ? {
                id: `agr-${a.id}`,
                tone: 'warning',
                title: `${a.title} is ready for your signature`,
                body: `${fresh === 'updated' ? 'Updated' : 'Sent'} by ${by} · ${when}${note}`,
                to: `/owner/agreements/${a.id}`,
                cta: 'Review & sign',
              }
            : {
                id: `agr-${a.id}`,
                tone: 'warning',
                title: `${a.title} needs your signature`,
                body: `Signature needed — online signing is paused, so please call the office at ${office.phoneDisplay} to sign. ${fresh === 'updated' ? 'Updated' : 'Sent'} by ${by} · ${when}.`,
                to: `/owner/agreements/${a.id}`,
                cta: 'Review',
              },
        )
      } else if (fresh) {
        items.push({
          id: `agr-${a.id}`,
          tone: 'info',
          title: fresh === 'new' ? `${a.title} was shared with you` : `${a.title} was updated`,
          body: `${by} · ${when}${note}`,
          to: `/owner/agreements/${a.id}`,
          cta: fresh === 'new' ? 'Open document' : 'View changes',
        })
      }
    }
    for (const ap of upcoming) {
      if (ap.status !== 'requested') continue
      items.push({
        id: `apt-${ap.id}`,
        tone: 'info',
        title: `${appointmentTypes[ap.type].label} — awaiting confirmation`,
        body: `You asked for ${whenPhrase(ap.date, ap.time)}. The Wakefield office will confirm shortly.`,
        to: '/owner/appointments',
        cta: 'View booking',
      })
    }
    for (const r of requests) {
      if (r.status === 'resolved') {
        items.push({ id: `req-${r.id}`, tone: 'success', title: `Request #${r.number} is resolved`, body: `Please confirm “${r.title}” is fixed.`, to: `/owner/maintenance/${r.id}`, cta: 'Confirm fix' })
      }
    }
    return items
  }, [agreements, upcoming, requests, person, esignOn, office.phoneDisplay])

  const openRequests = useMemo(() => requests.filter(isRequestOpen), [requests])
  const recent = notifications.slice(0, 5)
  const toSign = agreements.filter((a) => a.status === 'awaiting-signature').length
  const unseen = agreements.filter((a) => a.status !== 'awaiting-signature' && agreementFreshness(a)).length

  if (!user) return null

  const callReason = !bookingOn && !maintenanceOn ? 'to book a visit or request maintenance' : !bookingOn ? 'to book a visit' : 'for maintenance and repairs'
  const quickActions: QuickAction[] = [
    ...(bookingOn ? [{ to: '/owner/appointments?book=1', icon: CalendarPlus, title: 'Book an appointment', body: 'Meet with the Wakefield office' }] : []),
    ...(maintenanceOn ? [{ to: '/owner/maintenance?new=1', icon: Wrench, title: 'Request maintenance', body: requestTypesPhrase(enabledCategories) }] : []),
    {
      to: '/owner/agreements',
      icon: FileSignature,
      title: 'View agreements',
      body: toSign
        ? esignOn
          ? `${pluralize(toSign, 'document')} to sign`
          : 'Signature needed — call the office'
        : unseen
          ? `${pluralize(unseen, 'new or updated document', 'new or updated documents')}`
          : agreements.length
            ? pluralize(agreements.length, 'document')
            : 'No documents yet',
    },
    ...(!bookingOn || !maintenanceOn ? [{ href: `tel:${office.phone}`, icon: Phone, title: 'Call the office', body: `${office.phoneDisplay} · ${callReason}` }] : []),
  ]

  const dismissWelcome = () => void navigate(location.pathname, { replace: true, state: null })

  return (
    <>
      <PageHeader
        title={`${greetingFor()}, ${firstName(user.name)}`}
        description={
          <>
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · Here’s the latest on your {homes.length === 1 ? 'home' : 'homes'}.
          </>
        }
      />

      <div className="space-y-8">
        {welcome && (
          <Alert
            tone="success"
            title={`Welcome to your Home Owner Portal, ${firstName(user.name)}`}
            action={
              <button type="button" onClick={dismissWelcome} className="-m-1.5 rounded-lg p-1.5 text-emerald-800 hover:bg-emerald-100" aria-label="Dismiss welcome message">
                <X className="size-4" aria-hidden />
              </button>
            }
          >
            Your homes, agreements, appointments and requests all live here. When you have a minute,{' '}
            <Link to="/owner/profile#password" className="font-semibold underline underline-offset-2">
              replace your temporary password
            </Link>{' '}
            with one only you know.
          </Alert>
        )}

        <section aria-labelledby="attention-title">
          <div className="mb-3 flex items-center gap-2">
            <h2 id="attention-title" className="text-base font-semibold text-ink-900">
              Needs your attention
            </h2>
            {attention.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 tabular-nums">
                {attention.length}
                <span className="sr-only"> {attention.length === 1 ? 'item' : 'items'}</span>
              </span>
            )}
          </div>
          {attention.length === 0 ? (
            <Alert tone="success" title="You’re all caught up">
              Nothing needs your attention right now. We’ll let you know when something changes.
            </Alert>
          ) : (
            <ul className="space-y-3">
              {attention.map((item) => (
                <li key={item.id}>
                  <Alert
                    tone={item.tone}
                    title={<span className="wrap-anywhere">{item.title}</span>}
                    action={
                      <ButtonLink to={item.to} size="sm" variant={item.tone === 'warning' ? 'primary' : 'secondary'} className="hidden sm:inline-flex">
                        {item.cta}
                      </ButtonLink>
                    }
                  >
                    <span className="wrap-anywhere">{item.body}</span>
                    <Link to={item.to} className="mt-1 flex min-h-10 items-center gap-1 font-semibold underline underline-offset-2 sm:hidden">
                      {item.cta} <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </Alert>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="quick-title">
          <h2 id="quick-title" className="sr-only">
            Quick actions
          </h2>
          {/* grid-cols-1 = minmax(0, 1fr): the cards never grow wider than a narrow phone screen. */}
          <ul className={cn('grid grid-cols-1 gap-3', quickColumns[quickActions.length])}>
            {quickActions.map((a) => (
              <li key={a.title} className="min-w-0">
                <QuickActionCard action={a} tile={quickActions.length >= 3} />
              </li>
            ))}
          </ul>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
          <div className="min-w-0 space-y-8 xl:col-span-2">
            <section aria-labelledby="homes-title">
              <SectionTitle id="homes-title" title="My homes" to="/owner/homes" />
              {homes.length === 0 ? (
                <Card>
                  <EmptyState
                    compact
                    icon={<HomeIcon className="size-6" aria-hidden />}
                    title="No homes on your account yet"
                    description="When Wakefield adds your home, its progress, photos and documents will appear here."
                  />
                </Card>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {homes.map((h) => (
                    <HomeSummaryCard key={h.id} home={h} />
                  ))}
                </div>
              )}
            </section>

            <Card>
              <CardHeader title="Upcoming appointments" icon={<CalendarDays className="size-[18px]" aria-hidden />} action={<CardLink to="/owner/appointments" />} />
              {upcoming.length === 0 ? (
                <EmptyState
                  compact
                  title="No upcoming appointments"
                  description={bookingOn ? 'Book design selections, a site visit or a meeting at the office.' : `Online booking is paused — call ${office.phoneDisplay} to book a visit.`}
                  action={
                    bookingOn ? (
                      <ButtonLink to="/owner/appointments?book=1" size="sm" leftIcon={<CalendarPlus className="size-4" aria-hidden />}>
                        Book an appointment
                      </ButtonLink>
                    ) : undefined
                  }
                />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {upcoming.slice(0, 3).map((a) => (
                    <li key={a.id} className="px-5 py-4 sm:px-6">
                      <AppointmentCard compact appointment={a} home={a.homeId ? homesById[a.homeId] : undefined} officeAddress={settings.office.address} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* With maintenance requests switched off, the card only stays while there are open requests to follow. */}
            {(maintenanceOn || openRequests.length > 0) && (
              <Card>
                <CardHeader title="Open maintenance requests" icon={<Wrench className="size-[18px]" aria-hidden />} action={<CardLink to="/owner/maintenance" />} />
                {openRequests.length === 0 ? (
                  <EmptyState
                    compact
                    title="No open requests"
                    description={`Need something looked at? ${requestTypesPhrase(enabledCategories)} — we’re on it.`}
                    action={
                      <ButtonLink to="/owner/maintenance?new=1" size="sm" variant="secondary">
                        New request
                      </ButtonLink>
                    }
                  />
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {openRequests.slice(0, 4).map((r) => (
                      <RequestRow key={r.id} request={r} home={homesById[r.homeId]} compact />
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </div>

          {/* Side column on wide screens; two cards side by side below xl, so neither gets squeezed. */}
          <div className="grid min-w-0 grid-cols-1 content-start gap-6 md:grid-cols-2 xl:grid-cols-1">
            <Card className="min-w-0">
              <CardHeader title="Recent updates" icon={<Bell className="size-[18px]" aria-hidden />} />
              {recent.length === 0 ? (
                <EmptyState compact title="No updates yet" description="News about your home, documents and requests will show up here." />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {recent.map((n) => {
                    const unread = !n.readBy.includes(user.id)
                    const inner = (
                      <>
                        <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', unread ? 'bg-brand-600' : 'bg-ink-200')} aria-hidden />
                        <span className="min-w-0">
                          {unread && <span className="sr-only">Unread: </span>}
                          <span className={cn('block text-sm wrap-anywhere', unread ? 'font-semibold text-ink-900' : 'font-medium text-ink-800')}>{n.title}</span>
                          <span className="mt-0.5 block text-sm wrap-anywhere text-ink-600">{n.body}</span>
                          <span className="mt-1 block text-xs text-ink-500">{formatRelative(n.at)}</span>
                        </span>
                      </>
                    )
                    return (
                      <li key={n.id}>
                        {n.link ? (
                          <Link to={n.link} onClick={() => markRead(n.id)} className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50 focus-visible:outline-offset-[-2px] sm:px-6">
                            {inner}
                          </Link>
                        ) : (
                          <div className="flex gap-3 px-5 py-3.5 sm:px-6">{inner}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
            <CustomerCareCard className="min-w-0" />
          </div>
        </div>
      </div>
    </>
  )
}
