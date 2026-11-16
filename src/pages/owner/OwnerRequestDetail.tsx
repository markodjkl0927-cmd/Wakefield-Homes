import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { CalendarClock, CheckCircle2, CircleDot, Flag, Home as HomeIcon, Images, MessagesSquare, Plus, Send, UserRound, ZoomIn } from 'lucide-react'
import type { MaintenanceRequest, RequestComment, RequestEvent, RequestStatus, User } from '@/types'
import { cn } from '@/lib/cn'
import { sleep, useDocumentTitle } from '@/lib/utils'
import { formatDate, formatDateShort, formatDateTime, formatRelative } from '@/lib/format'
import { requestCategories, requestPriority, requestStatus } from '@/data/labels'
import { useAppStore } from '@/store'
import { useCurrentUser, useHomeLookup, usePersonLookup, useSettings, type PersonRef } from '@/store/hooks'
import { toast } from '@/store/ui'
import { Alert, Avatar, Badge, Button, ButtonLink, Card, CardBody, CardHeader, Field, Lightbox, SmartImage, StatusBadge, Textarea, smoothBehavior } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { RequestTracker } from './components/RequestTracker'
import { CustomerCareCard } from './components/CustomerCareCard'
import { DetailList, NotFoundPanel } from './components/ui'

export default function OwnerRequestDetail() {
  const { id } = useParams()
  const user = useCurrentUser()
  const request = useAppStore((s) => s.requests.find((r) => r.id === id))
  const mine = request && user && request.homeownerId === user.id ? request : undefined
  useDocumentTitle(mine ? `Request #${mine.number}` : 'Request not found')

  if (!user) return null
  if (!mine) {
    return (
      <NotFoundPanel
        title="Request not found"
        description="This request doesn’t exist or isn’t on your account. You can see all of your requests on the Maintenance page."
        backTo="/owner/maintenance"
        backLabel="All requests"
      />
    )
  }
  return <RequestView key={mine.id} request={mine} owner={user} />
}

type ThreadItem = { kind: 'message'; at: string; comment: RequestComment } | { kind: 'event'; at: string; event: RequestEvent; text: ReactNode; icon: ReactNode }

/**
 * Owner-facing wording for a status / assignee / work-date change, or null when another line already
 * says it (e.g. "Assigned" right after "Tom Becker is handling your request") or it's no news to the
 * owner. `statusBefore` is the request's status just before this event.
 */
function describeEvent(
  e: RequestEvent,
  i: number,
  all: RequestEvent[],
  owner: User,
  person: (id: string) => PersonRef | undefined,
  statusBefore: RequestStatus,
): { text: ReactNode; icon: ReactNode } | null {
  const who = (id: string) => (id === owner.id ? 'You' : (person(id)?.name ?? 'The Wakefield team'))
  const sameMoment = (type: RequestEvent['type']) => all.some((o) => o !== e && o.type === type && o.at === e.at)
  const strong = (s: string) => <span className="font-semibold text-ink-800">{s}</span>
  if (e.type === 'assignee') {
    if (e.assigneeId) return { text: <>{strong(person(e.assigneeId)?.name ?? 'A team member')} is handling your request</>, icon: <UserRound /> }
    // Unassigned (e.g. the team member moved on): only news while the work is still open.
    if (statusBefore === 'resolved' || statusBefore === 'closed') return null
    return {
      text: statusBefore === 'submitted' || statusBefore === 'assigned' ? 'Your request is waiting for a team member' : 'A new team member will pick up your request',
      icon: <UserRound />,
    }
  }
  if (e.type === 'schedule') {
    if (e.date) return { text: <>Work scheduled for {strong(formatDateShort(e.date))}</>, icon: <CalendarClock /> }
    return { text: 'The work date was cleared — we’ll confirm a new date with you', icon: <CalendarClock /> }
  }
  // Status changes
  switch (e.status) {
    case 'submitted':
      if (i === 0) {
        return e.byUserId === owner.id
          ? { text: <>{strong('You')} submitted this request</>, icon: <CircleDot /> }
          : { text: <>{strong(who(e.byUserId))} logged this request for you</>, icon: <CircleDot /> }
      }
      return sameMoment('assignee') ? null : { text: 'Back in the queue', icon: <CircleDot /> }
    case 'assigned':
      return sameMoment('assignee') ? null : { text: <>Marked {strong('Assigned')}</>, icon: <CircleDot /> }
    case 'scheduled':
      return sameMoment('schedule') ? null : { text: <>Marked {strong('Scheduled')}</>, icon: <CalendarClock /> }
    case 'in-progress':
      return { text: <>{strong(who(e.byUserId))} started work</>, icon: <CircleDot /> }
    case 'resolved':
      return { text: <>{strong(who(e.byUserId))} marked this {strong('Resolved')}</>, icon: <CheckCircle2 /> }
    case 'closed':
      return e.byUserId === owner.id
        ? { text: <>{strong('You')} confirmed the fix · Closed</>, icon: <CheckCircle2 /> }
        : { text: <>{strong(who(e.byUserId))} closed this request</>, icon: <CheckCircle2 /> }
    default:
      return null
  }
}

function RequestView({ request, owner }: { request: MaintenanceRequest; owner: User }) {
  const person = usePersonLookup()
  const homeRef = useHomeLookup()(request.homeId)
  const settings = useSettings()
  const setStatus = useAppStore((s) => s.setRequestStatus)
  const addComment = useAppStore((s) => s.addRequestComment)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [justClosed, setJustClosed] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const closedRef = useRef<HTMLDivElement>(null)
  const prevCount = useRef(0)

  const category = requestCategories[request.category]
  const CategoryIcon = category.icon
  const assignee = person(request.assignedToId)
  const closed = request.status === 'closed'
  const finished = closed || request.status === 'resolved'

  // The confirm button disappears with the "resolved" notice: move focus to the "closed" notice that replaces it.
  useEffect(() => {
    if (justClosed && closed) closedRef.current?.focus({ preventScroll: true })
  }, [justClosed, closed])

  // Messages (never staff-only notes) and status / assignee / date changes, oldest first.
  const thread = useMemo<ThreadItem[]>(() => {
    const events = request.events ?? []
    const items: ThreadItem[] = request.comments.filter((c) => !c.internal).map((comment) => ({ kind: 'message' as const, at: comment.at, comment }))
    let status: RequestStatus = 'submitted'
    events.forEach((event, i) => {
      const d = describeEvent(event, i, events, owner, person, status)
      if (event.type === 'status' && event.status) status = event.status
      if (d) items.push({ kind: 'event', at: event.at, event, ...d })
    })
    return items.sort((a, b) => a.at.localeCompare(b.at))
  }, [request.comments, request.events, owner, person])
  const messageCount = thread.filter((t) => t.kind === 'message').length

  // Keep the newest message in view after sending.
  useEffect(() => {
    if (prevCount.current && thread.length > prevCount.current) endRef.current?.scrollIntoView({ behavior: smoothBehavior(), block: 'nearest' })
    prevCount.current = thread.length
  }, [thread.length])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    const body = message.trim()
    if (!body || sending) return
    setSending(true)
    await sleep(250)
    addComment(request.id, body)
    setMessage('')
    setSending(false)
    toast.success('Message sent', 'The Wakefield team will reply here.')
  }

  const confirmFixed = async () => {
    if (confirming) return
    setConfirming(true)
    await sleep(300)
    // Recorded as a status event ("You confirmed the fix · Closed"), not as a chat message.
    setStatus(request.id, 'closed')
    setConfirming(false)
    setJustClosed(true)
    toast.success('Thanks for confirming', `Request #${request.number} is now closed.`)
  }

  const photos = request.photos.map((src, i) => ({ src, alt: `Photo ${i + 1} attached to request #${request.number}`, caption: `Photo ${i + 1} of ${request.photos.length}` }))

  return (
    <>
      <PageHeader
        back={{ to: '/owner/maintenance', label: 'All requests' }}
        title={<span className="wrap-anywhere">{request.title}</span>}
        meta={
          <>
            <span className="rounded-md bg-ink-100 px-2 py-0.5 text-sm font-semibold text-ink-700 tabular-nums">#{request.number}</span>
            <Badge size="md" tone="neutral" icon={<CategoryIcon className="size-3.5" aria-hidden />}>
              {category.label}
            </Badge>
            <StatusBadge def={requestStatus[request.status]} size="md" />
            <Badge size="md" tone={requestPriority[request.priority].tone} icon={<Flag className="size-3.5" aria-hidden />}>
              {requestPriority[request.priority].label} priority
            </Badge>
          </>
        }
      />

      <Card className="px-5 py-5 sm:px-8 sm:py-6">
        <h2 className="sr-only">Progress</h2>
        <RequestTracker status={request.status} />
      </Card>

      {request.status === 'resolved' && (
        <Alert
          tone="success"
          title="Our team marked this as resolved"
          className="mt-6"
          action={
            <Button onClick={confirmFixed} loading={confirming} leftIcon={<CheckCircle2 className="size-4" aria-hidden />} className="hidden sm:inline-flex">
              Confirm it’s fixed
            </Button>
          }
        >
          Please confirm everything is fixed. If something still isn’t right, send us a message below.
          <Button onClick={confirmFixed} loading={confirming} leftIcon={<CheckCircle2 className="size-4" aria-hidden />} className="mt-3 w-full sm:hidden">
            Confirm it’s fixed
          </Button>
        </Alert>
      )}
      {closed && (
        <div ref={closedRef} tabIndex={-1} data-focus-target className="mt-6 outline-none">
          <Alert tone="info" title="This request is closed">
            Thanks for letting us know. If anything else comes up, you can start a new request any time.
          </Alert>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="What’s happening" icon={<CategoryIcon className="size-[18px]" aria-hidden />} />
            <CardBody>
              <p className="leading-7 text-user text-ink-700">{request.description}</p>
              {photos.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
                    <Images className="size-4 text-ink-500" aria-hidden /> Photos
                  </h3>
                  <ul className="grid grid-cols-3 gap-3">
                    {photos.map((p, i) => (
                      <li key={`${i}-${p.src.slice(-16)}`}>
                        <button type="button" onClick={() => setLightbox(i)} className="group relative block w-full overflow-hidden rounded-xl ring-1 ring-ink-200" aria-label={`Open ${p.alt}`}>
                          <SmartImage src={p.src} alt="" className="aspect-square w-full" imgClassName="transition-transform duration-500 group-hover:scale-[1.04]" />
                          <span className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-ink-950/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
                            <ZoomIn className="size-4" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Updates and messages" description="Progress on your request, and messages between you and the Wakefield team." icon={<MessagesSquare className="size-[18px]" aria-hidden />} />
            <CardBody>
              {messageCount === 0 && (
                <p className="mb-5 rounded-xl bg-ink-50 px-4 py-4 text-center text-sm text-ink-600">No messages yet. The Wakefield team will post updates here — you can add details or ask a question below.</p>
              )}
              <ol className="space-y-5" aria-label="Updates and messages">
                {thread.map((item) => {
                  if (item.kind === 'event') {
                    return (
                      <li key={item.event.id} className="flex items-center gap-3 text-sm text-ink-600">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink-50 text-ink-500 ring-1 ring-ink-200 [&>svg]:size-4" aria-hidden>
                          {item.icon}
                        </span>
                        <p className="min-w-0">
                          {item.text}
                          <span className="text-ink-500">
                            {' · '}
                            <time dateTime={item.at} title={formatDateTime(item.at)}>
                              {formatRelative(item.at)}
                            </time>
                          </span>
                        </p>
                      </li>
                    )
                  }
                  const c = item.comment
                  const author = person(c.authorId)
                  const mineMsg = c.authorId === owner.id
                  const staff = (c.authorRole ?? author?.role) !== 'homeowner'
                  // Plain name: whether a team member's account still exists is admin business, not the owner's.
                  const authorName = mineMsg ? 'You' : (author?.name ?? 'Wakefield Homes')
                  return (
                    <li key={c.id} className={cn('flex gap-3', mineMsg && 'flex-row-reverse')}>
                      <Avatar name={author?.name ?? 'Wakefield Homes'} size="sm" className="mt-5" />
                      <div className={cn('flex max-w-[85%] min-w-0 flex-col sm:max-w-[75%]', mineMsg && 'items-end')}>
                        <p className={cn('flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink-500', mineMsg && 'justify-end')}>
                          <span className="font-semibold text-ink-800">{authorName}</span>
                          {staff && !mineMsg && <Badge tone="brand">Wakefield{author?.user?.title ? ` · ${author.user.title}` : ''}</Badge>}
                          <time dateTime={c.at} title={formatDateTime(c.at)}>
                            {formatRelative(c.at)}
                          </time>
                        </p>
                        <div
                          className={cn(
                            'mt-1.5 rounded-2xl px-4 py-2.5 text-sm leading-6 text-user',
                            mineMsg ? 'rounded-tr-md bg-brand-900 text-white' : 'rounded-tl-md bg-ink-100 text-ink-800 ring-1 ring-ink-200/60 ring-inset',
                          )}
                        >
                          {c.body}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
              <div ref={endRef} />
            </CardBody>
            <div className="rounded-b-2xl border-t border-ink-100 bg-ink-25 px-5 py-4 sm:px-6">
              {closed ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-ink-600">This request is closed. Need more help?</p>
                  <ButtonLink to={`/owner/maintenance?new=1&home=${request.homeId}`} variant="secondary" leftIcon={<Plus className="size-4" aria-hidden />}>
                    New request
                  </ButtonLink>
                </div>
              ) : (
                <form onSubmit={send}>
                  <Field label="Message the Wakefield team" htmlFor="request-message">
                    <Textarea
                      id="request-message"
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={1000}
                      placeholder="Add details, answer a question, or let us know a good time to visit"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault()
                          e.currentTarget.form?.requestSubmit()
                        }
                      }}
                    />
                  </Field>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="hidden text-xs text-ink-500 sm:block">Ctrl + Enter to send</p>
                    <Button type="submit" loading={sending} disabled={!message.trim()} leftIcon={<Send className="size-4" aria-hidden />} className="ml-auto">
                      Send message
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <DetailList
                items={[
                  {
                    label: 'Home',
                    value: homeRef?.home ? (
                      <Link to={`/owner/homes/${homeRef.home.id}`} className="inline-flex items-center gap-1 text-brand-800 hover:underline">
                        <HomeIcon className="size-3.5 shrink-0" aria-hidden /> <span className="wrap-anywhere">{homeRef.title}</span>
                      </Link>
                    ) : homeRef ? (
                      <span className="wrap-anywhere">{homeRef.title}</span>
                    ) : (
                      '—'
                    ),
                  },
                  { label: 'Category', value: category.label },
                  { label: 'Priority', value: requestPriority[request.priority].label },
                  { label: 'Submitted', value: formatDate(request.createdAt) },
                  { label: 'Preferred date', value: request.preferredDate ? formatDate(request.preferredDate) : 'No preference' },
                  ...(request.scheduledFor || !finished
                    ? [{ label: 'Scheduled for', value: request.scheduledFor ? formatDate(request.scheduledFor) : <span className="font-normal text-ink-500">Not yet scheduled</span> }]
                    : []),
                  { label: 'Last update', value: formatRelative(request.updatedAt) },
                ]}
              />
              <div className="mt-5 border-t border-ink-100 pt-5">
                <p className="text-xs font-medium text-ink-500">Assigned to</p>
                {assignee ? (
                  <div className="mt-2 flex items-center gap-3">
                    <Avatar name={assignee.name} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-900">{assignee.name}</p>
                      <p className="text-xs text-ink-600">{assignee.user?.title ?? 'Wakefield team'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-ink-600">{finished ? 'The Wakefield team' : 'A team member will be assigned shortly.'}</p>
                )}
              </div>
            </CardBody>
          </Card>
          {settings.office.phone && <CustomerCareCard />}
        </div>
      </div>

      <Lightbox images={photos} index={lightbox} onClose={() => setLightbox(null)} onIndexChange={setLightbox} />
    </>
  )
}
