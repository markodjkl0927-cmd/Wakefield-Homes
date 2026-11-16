import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRightLeft, CalendarClock, CheckCircle2, ImageOff, Inbox, Lock, Mail, MessageSquare, PhoneCall, Phone, Send, UserRound } from 'lucide-react'
import type { MaintenanceRequest, RequestComment, RequestEvent, RequestPriority, RequestStatus } from '@/types'
import { requestCategories, requestFlow, requestPriority, requestStatus, roleLabels } from '@/data/labels'
import { cn } from '@/lib/cn'
import { formatDateShort, formatDateTime, formatPhone, formatRelative, pluralize } from '@/lib/format'
import { useDocumentTitle } from '@/lib/utils'
import { useAppStore } from '@/store'
import { useCan, useCanAny, useCurrentUser, useHomeLookup, useHomesByOwner, usePersonLookup, useStaffUsers, useUsersById, type PersonRef } from '@/store/hooks'
import { toast } from '@/store/ui'
import { Avatar, Badge, Button, ButtonLink, Card, CardBody, CardHeader, Checkbox, EmptyState, Field, Input, Lightbox, Select, SmartImage, StatusBadge, Switch, Textarea } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { CategoryIcon, InfoRow, PriorityBadge, StaffGuard, firstName, optionalTagAA, priorityOrder, todayIso } from './components/common'

export default function StaffRequestDetail() {
  const { id } = useParams()
  const request = useAppStore((s) => s.requests.find((r) => r.id === id))
  useDocumentTitle(request ? `Request #${request.number}` : 'Request')
  return (
    <StaffGuard permission="requests.manage" title="Request">
      {request ? (
        <RequestDetail request={request} />
      ) : (
        <>
          <PageHeader title="Request not found" back={{ to: '/staff/requests', label: 'All requests' }} />
          <Card>
            <EmptyState
              icon={<MessageSquare className="size-6" aria-hidden />}
              title="This request doesn’t exist any more"
              description="It may have been removed, or the demo data was reset."
              action={<ButtonLink to="/staff/requests">Back to requests</ButtonLink>}
            />
          </Card>
        </>
      )}
    </StaffGuard>
  )
}

function RequestDetail({ request: r }: { request: MaintenanceRequest }) {
  const person = usePersonLookup()
  const homeRef = useHomeLookup()
  const me = useCurrentUser()
  const owner = person(r.homeownerId)
  const home = homeRef(r.homeId)
  const loggedBy = r.createdById && r.createdById !== r.homeownerId ? person(r.createdById) : undefined
  const category = requestCategories[r.category]
  const [photoIndex, setPhotoIndex] = useState<number | null>(null)

  return (
    <>
      <PageHeader
        back={{ to: '/staff/requests', label: 'All requests' }}
        title={<span className="wrap-anywhere">{r.title}</span>}
        meta={
          <>
            <span className="text-sm font-semibold text-ink-500 tabular-nums">#{r.number}</span>
            <Badge size="md" icon={<CategoryIcon category={r.category} size="sm" className="-ml-1.5 size-5 rounded-full ring-0 [&>svg]:size-3" />}>
              {category.label}
            </Badge>
            <StatusBadge def={requestStatus[r.status]} size="md" />
            <PriorityBadge priority={r.priority} className="px-2.5 py-1 text-sm" />
          </>
        }
      />

      <div className={cn('grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]', optionalTagAA)}>
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Request details"
              description={
                loggedBy
                  ? `Logged ${formatRelative(r.createdAt)} by ${loggedBy.id === me?.id ? 'you' : loggedBy.label} for ${owner?.label ?? 'a Home Owner'}`
                  : `Submitted ${formatRelative(r.createdAt)} by ${owner?.label ?? 'a Home Owner'}`
              }
            />
            <CardBody className="space-y-6">
              <p className="text-user text-[15px] leading-7 text-ink-700">{r.description}</p>
              <dl className="grid grid-cols-1 gap-4 rounded-xl bg-ink-50 p-4 text-sm sm:grid-cols-3">
                <div className="min-w-0">
                  <dt className="text-ink-500">Home</dt>
                  <dd className="mt-0.5 font-medium text-ink-900">{home ? home.title : 'Home removed'}</dd>
                  {home && <dd className="text-ink-500">{home.removed ? 'No longer listed' : home.address}</dd>}
                </div>
                <div>
                  <dt className="text-ink-500">Preferred date</dt>
                  <dd className="mt-0.5 font-medium text-ink-900">{r.preferredDate ? formatDateShort(r.preferredDate) : 'Any time'}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Work date</dt>
                  <dd className="mt-0.5 font-medium text-ink-900">{r.scheduledFor ? formatDateShort(r.scheduledFor) : 'Not scheduled yet'}</dd>
                </div>
              </dl>
              <section aria-labelledby="req-photos">
                <h3 id="req-photos" className="text-sm font-semibold text-ink-900">
                  Photos {r.photos.length > 0 && <span className="font-normal text-ink-500">({r.photos.length})</span>}
                </h3>
                {r.photos.length === 0 ? (
                  <p className="mt-2 flex items-center gap-2 text-sm text-ink-500">
                    <ImageOff className="size-4" aria-hidden /> No photos were attached to this request.
                  </p>
                ) : (
                  <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {r.photos.map((src, i) => (
                      <li key={i}>
                        <button type="button" onClick={() => setPhotoIndex(i)} className="block w-full overflow-hidden rounded-xl ring-1 ring-ink-200 hover:ring-brand-300" aria-label={`Open photo ${i + 1} of ${r.photos.length}`}>
                          <SmartImage src={src} alt="" className="aspect-square w-full" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </CardBody>
          </Card>

          <Conversation request={r} owner={owner} />
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Request management">
          <ManageCard request={r} />
          <HomeOwnerCard ownerId={r.homeownerId} />
          <Card>
            <CardHeader title="Request info" />
            <CardBody className="py-2">
              <dl className="divide-y divide-ink-100">
                <InfoRow label="Request">#{r.number}</InfoRow>
                <InfoRow label="Category">{category.label}</InfoRow>
                <InfoRow label="Created">{formatDateTime(r.createdAt)}</InfoRow>
                {loggedBy && <InfoRow label="Logged by">{loggedBy.label}</InfoRow>}
                <InfoRow label="Last updated">{formatRelative(r.updatedAt)}</InfoRow>
                <InfoRow label="Preferred date">{r.preferredDate ? formatDateShort(r.preferredDate) : 'Any time'}</InfoRow>
                <InfoRow label="Assigned to">{r.assignedToId ? person(r.assignedToId)?.label ?? '—' : 'Nobody yet'}</InfoRow>
              </dl>
            </CardBody>
          </Card>
        </aside>
      </div>

      <Lightbox
        images={r.photos.map((src, i) => ({ src, alt: `Photo ${i + 1} for request #${r.number}: ${r.title}` }))}
        index={photoIndex}
        onClose={() => setPhotoIndex(null)}
        onIndexChange={setPhotoIndex}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Conversation and history                                             */
/* ------------------------------------------------------------------ */

type TimelineItem = { kind: 'comment'; at: string; comment: RequestComment } | { kind: 'events'; at: string; events: RequestEvent[] }

/** Same person, same moment: one action that changed several things (e.g. assigned + status). */
const sameMoment = (a: { at: string; byUserId: string }, b: { at: string; byUserId: string }) => a.byUserId === b.byUserId && Math.abs(Date.parse(a.at) - Date.parse(b.at)) < 2000

function Conversation({ request: r, owner }: { request: MaintenanceRequest; owner?: PersonRef }) {
  const person = usePersonLookup()
  const me = useCurrentUser()
  const addRequestComment = useAppStore((s) => s.addRequestComment)
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ownerFirst = owner ? firstName(owner.name) : 'the Home Owner'

  const comments = useMemo(() => [...r.comments].sort((a, b) => a.at.localeCompare(b.at)), [r.comments])
  const internalCount = comments.filter((c) => c.internal).length

  /** Messages and status / assignee / date changes in one timeline, oldest first. */
  const timeline = useMemo(() => {
    const events = [...(r.events ?? [])].sort((a, b) => a.at.localeCompare(b.at))
    const groups: RequestEvent[][] = []
    for (const e of events) {
      const last = groups[groups.length - 1]
      // One line per action: a second change of the same kind (e.g. a date set, then cleared) starts a new line.
      const repeat = last?.some((x) => x.type === e.type && !(x.type === 'status' && x.status === 'submitted' && x === groups[0]?.[0]))
      if (last && sameMoment(last[0], e) && !repeat) last.push(e)
      else groups.push([e])
    }
    const items: TimelineItem[] = [...groups.map((g): TimelineItem => ({ kind: 'events', at: g[0].at, events: g })), ...comments.map((c): TimelineItem => ({ kind: 'comment', at: c.at, comment: c }))]
    return items.sort((a, b) => a.at.localeCompare(b.at) || (a.kind === 'events' ? -1 : 1))
  }, [r.events, comments])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!body.trim()) {
      setError(internal ? 'Write a note first.' : 'Write a reply first.')
      return
    }
    addRequestComment(r.id, body.trim(), internal)
    toast.success(internal ? 'Internal note added' : 'Reply sent', internal ? 'Only Wakefield staff can see it.' : `${owner?.name ?? 'The Home Owner'} has been notified.`)
    setBody('')
    setError(null)
  }

  const who = (id: string) => (id === me?.id ? 'You' : person(id)?.label ?? 'Former user')

  return (
    <Card>
      <CardHeader
        title="Conversation"
        description={comments.length ? `${pluralize(comments.length, 'message')}${internalCount ? ` · ${internalCount} internal` : ''}, with status changes in between` : 'No messages yet — status changes are listed here'}
        icon={<MessageSquare className="size-[18px]" aria-hidden />}
      />
      {timeline.length === 0 ? (
        <EmptyState compact title="No messages yet" description={`Reply to ${ownerFirst} or leave an internal note for the team.`} />
      ) : (
        <ol className="space-y-5 px-5 py-5 sm:px-6">
          {timeline.map((item, index) =>
            item.kind === 'events' ? (
              <EventLine key={item.events[0].id} events={item.events} first={index === 0} request={r} who={who} comments={comments} />
            ) : (
              <CommentItem key={item.comment.id} comment={item.comment} request={r} isMe={item.comment.authorId === me?.id} />
            ),
          )}
        </ol>
      )}
      <form onSubmit={submit} className={cn('rounded-b-2xl border-t px-5 py-5 transition-colors sm:px-6', internal ? 'border-amber-200 bg-amber-50/70' : 'border-ink-100 bg-ink-25')}>
        <Field label={internal ? 'Internal note' : `Reply to ${ownerFirst}`} error={error}>
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              value={body}
              onChange={(e) => {
                setBody(e.target.value)
                if (error) setError(null)
              }}
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-error` : undefined}
              placeholder={internal ? 'Only Wakefield staff can see this note.' : 'Write a reply — the Home Owner is notified right away.'}
              className={cn(internal && 'ring-amber-300 focus:ring-amber-500')}
            />
          )}
        </Field>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Switch
            label={
              <span className="inline-flex items-center gap-1.5">
                <Lock className="size-3.5 text-amber-700" aria-hidden /> Internal note
              </span>
            }
            description="Hidden from the Home Owner"
            checked={internal}
            onChange={setInternal}
            className="sm:flex-row-reverse sm:justify-end sm:gap-3"
          />
          <Button
            type="submit"
            className={cn(internal && 'bg-amber-600 hover:bg-amber-700')}
            leftIcon={internal ? <Lock className="size-4" aria-hidden /> : <Send className="size-4" aria-hidden />}
          >
            {internal ? 'Add internal note' : 'Send reply'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function CommentItem({ comment: c, request: r, isMe }: { comment: RequestComment; request: MaintenanceRequest; isMe: boolean }) {
  const person = usePersonLookup()
  const author = person(c.authorId)
  const name = author?.label ?? 'Former user'
  // The role when it was written (an account may change type later); live staff accounts show their job title.
  const role = c.authorRole ?? author?.role
  const isOwner = role ? role === 'homeowner' : c.authorId === r.homeownerId
  let roleText = ''
  if (isOwner) roleText = roleLabels.homeowner
  else if (author?.user && author.user.role === role && author.user.title) roleText = author.user.title
  else if (role) roleText = roleLabels[role]
  return (
    <li className="flex gap-3">
      <Avatar name={author?.name ?? '?'} size="sm" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold text-ink-900">
            {name}
            {isMe && <span className="font-normal text-ink-500"> (you)</span>}
          </span>
          <span className="text-xs text-ink-500">
            {roleText ? `${roleText} · ` : ''}
            <time dateTime={c.at} title={formatDateTime(c.at)}>
              {formatRelative(c.at)}
            </time>
          </span>
          {c.internal && (
            <Badge tone="warning" icon={<Lock className="size-3" aria-hidden />}>
              Internal
            </Badge>
          )}
        </p>
        <div
          className={cn(
            'text-user mt-1.5 rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-6',
            c.internal ? 'bg-amber-50 text-amber-950 ring-1 ring-amber-200 ring-inset' : isOwner ? 'bg-ink-100 text-ink-800' : 'bg-brand-50 text-ink-800',
          )}
        >
          {c.body}
          {c.internal && <span className="mt-1 block text-xs whitespace-normal text-amber-800">Hidden from the Home Owner</span>}
        </div>
      </div>
    </li>
  )
}

/** One timeline line for a status / assignee / work-date change (several changes made at once share a line). */
function EventLine({
  events,
  first,
  request: r,
  who,
  comments,
}: {
  events: RequestEvent[]
  first: boolean
  request: MaintenanceRequest
  who: (id: string) => string
  comments: RequestComment[]
}) {
  const person = usePersonLookup()
  const by = events[0].byUserId
  // The very first "Submitted" is the request being filed, not a status change.
  const created = first && events[0].type === 'status' && events[0].status === 'submitted' ? events[0] : undefined
  const status = events.filter((e) => e.type === 'status' && e !== created).pop()
  const assignee = events.find((e) => e.type === 'assignee')
  const schedule = events.find((e) => e.type === 'schedule')
  const phrases: ReactNode[] = []
  let icon = <ArrowRightLeft aria-hidden />
  const showBadge = !!status

  if (created) {
    const logged = !!r.createdById && r.createdById !== r.homeownerId
    icon = logged ? <PhoneCall aria-hidden /> : <Inbox aria-hidden />
    phrases.push(logged ? `logged this request for ${person(r.homeownerId)?.label ?? 'the Home Owner'}` : 'submitted the request')
  }
  if (assignee) {
    if (!created) icon = <UserRound aria-hidden />
    phrases.push(assignee.assigneeId ? (assignee.assigneeId === by ? 'took it' : `assigned it to ${person(assignee.assigneeId)?.label ?? 'a team member'}`) : 'unassigned it')
  }
  if (schedule) {
    if (!created) icon = <CalendarClock aria-hidden />
    phrases.push(schedule.date ? `set the work date to ${formatDateShort(schedule.date)}` : 'cleared the work date')
  }
  if (status && !phrases.length) {
    if (status.status === 'closed' && by === r.homeownerId) {
      icon = <CheckCircle2 aria-hidden />
      phrases.push('confirmed the fix')
    } else {
      phrases.push('moved it to')
    }
  }
  // Notes that were also posted as a message aren't repeated here.
  const notes = events
    .map((e) => e.note)
    .filter((n): n is string => !!n && n !== 'Confirmed the fix' && !/^Logged by /.test(n))
    .filter((n) => !comments.some((c) => c.authorId === by && c.body === n && Math.abs(Date.parse(c.at) - Date.parse(events[0].at)) < 2000))
  const at = events[0].at
  const movedOnly = phrases.length === 1 && phrases[0] === 'moved it to'

  return (
    <li className="flex gap-3 text-sm">
      <span className="flex size-8 shrink-0 items-center justify-center text-ink-400" aria-hidden>
        <span className="flex size-6 items-center justify-center rounded-full bg-ink-100 ring-4 ring-white [&>svg]:size-3.5">{icon}</span>
      </span>
      <p className="min-w-0 pt-1 text-ink-600">
        <span className="font-medium text-ink-900">{who(by)}</span> {phrases.map((p, i) => (i ? <span key={i}> and {p}</span> : <span key={i}>{p}</span>))}
        {showBadge && status?.status && (
          <>
            {movedOnly ? (
              ' '
            ) : (
              <>
                <span aria-hidden> · </span>
                <span className="sr-only">, now </span>
              </>
            )}
            <StatusBadge def={requestStatus[status.status]} className="align-middle" />
          </>
        )}
        <span className="text-xs text-ink-500">
          {' · '}
          <time dateTime={at} title={formatDateTime(at)}>
            {formatRelative(at)}
          </time>
        </span>
        {notes.length > 0 && <span className="text-user mt-0.5 block text-xs text-ink-500">{notes.join(' · ')}</span>}
      </p>
    </li>
  )
}

/* ------------------------------------------------------------------ */
/* Side panel                                                           */
/* ------------------------------------------------------------------ */

function ManageCard({ request: r }: { request: MaintenanceRequest }) {
  const staff = useStaffUsers()
  const users = useUsersById()
  const me = useCurrentUser()
  const setRequestStatus = useAppStore((s) => s.setRequestStatus)
  const assignRequest = useAppStore((s) => s.assignRequest)
  const updateRequest = useAppStore((s) => s.updateRequest)
  const scheduleRequest = useAppStore((s) => s.scheduleRequest)

  const [status, setStatus] = useState<RequestStatus>(r.status)
  const [note, setNote] = useState('')
  const [scheduled, setScheduled] = useState(r.scheduledFor ?? '')
  const [markScheduled, setMarkScheduled] = useState(true)
  const [lastStatus, setLastStatus] = useState(r.status)
  const [lastScheduled, setLastScheduled] = useState(r.scheduledFor)
  // Controls that disappear after use ("Assign to me", "Clear") hand focus to the field they changed.
  const assigneeRef = useRef<HTMLSelectElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  // Keep the form in step when the request changes elsewhere (board, another tab).
  if (lastStatus !== r.status) {
    setLastStatus(r.status)
    setStatus(r.status)
  }
  if (lastScheduled !== r.scheduledFor) {
    setLastScheduled(r.scheduledFor)
    setScheduled(r.scheduledFor ?? '')
  }

  const stepIndex = requestFlow.indexOf(r.status)
  const assignee = r.assignedToId ? users[r.assignedToId] : undefined
  const canMarkScheduled = r.status === 'submitted' || r.status === 'assigned'
  // An assignee who can't take work any more (disabled account) still shows as the current value.
  const assigneeOptions = useMemo(() => (assignee && !staff.some((u) => u.id === assignee.id) ? [...staff, assignee] : staff), [staff, assignee])
  const takesIt = !r.assignedToId && (status === 'assigned' || status === 'scheduled' || status === 'in-progress') && status !== r.status
  const releasesIt = !!assignee && status === 'submitted' && status !== r.status

  const saveStatus = () => {
    if (status === r.status && !note.trim()) return
    setRequestStatus(r.id, status, note.trim() || undefined)
    const extra = takesIt ? ' It’s assigned to you.' : releasesIt ? ' It’s back in the queue, unassigned.' : ''
    toast.success(status === r.status ? 'Update sent to the Home Owner' : `Status set to ${requestStatus[status].label}`, `The Home Owner has been notified.${extra}`)
    setNote('')
  }

  const assign = (staffId: string | undefined) => {
    const result = assignRequest(r.id, staffId)
    if (!result.ok) {
      toast.error('Couldn’t change the assignee', result.error)
      return
    }
    if (staffId) toast.success(staffId === me?.id ? 'Assigned to you' : `Assigned to ${users[staffId]?.name ?? 'the team member'}`, 'The Home Owner has been notified.')
    else toast.success('Request unassigned', r.status === 'assigned' ? 'It’s back in the queue as Submitted.' : undefined)
  }

  const saveSchedule = () => {
    if (!scheduled) return
    const promote = markScheduled && canMarkScheduled
    scheduleRequest(r.id, scheduled, { markScheduled: promote })
    toast.success(`Work date set to ${formatDateShort(scheduled)}`, `${promote ? 'Moved to Scheduled. ' : ''}The Home Owner has been notified.`)
  }

  const clearSchedule = () => {
    scheduleRequest(r.id, undefined)
    dateRef.current?.focus()
    toast.info('Work date cleared', r.status === 'scheduled' ? 'The request is no longer marked Scheduled. The Home Owner has been told a new date will follow.' : 'The Home Owner has been told a new date will follow.')
  }

  return (
    <Card>
      <CardHeader title="Manage request" description="Changes are shared with the Home Owner." />
      <div className="divide-y divide-ink-100">
        <section aria-labelledby="mg-status" className="space-y-4 px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h3 id="mg-status" className="text-sm font-semibold text-ink-900">
              Status
            </h3>
            <StatusBadge def={requestStatus[r.status]} />
          </div>
          <ol className="flex gap-1" aria-label={`Step ${stepIndex + 1} of ${requestFlow.length}: ${requestStatus[r.status].label}`}>
            {requestFlow.map((s, i) => (
              <li key={s} className={cn('h-1.5 flex-1 rounded-full', i <= stepIndex ? 'bg-brand-700' : 'bg-ink-200')} title={requestStatus[s].label} />
            ))}
          </ol>
          <Field label="Move to" hint={takesIt ? 'Nobody is assigned yet — you’ll be assigned.' : releasesIt ? `${assignee?.name ?? 'The assignee'} will be unassigned.` : undefined}>
            {(id) => (
              <Select id={id} value={status} onChange={(e) => setStatus(e.target.value as RequestStatus)} aria-describedby={takesIt || releasesIt ? `${id}-hint` : undefined}>
                {requestFlow.map((s) => (
                  <option key={s} value={s}>
                    {requestStatus[s].label}
                    {s === r.status ? ' (current)' : ''}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Note to Home Owner" optional>
            {(id) => <Textarea id={id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Our crew will be there Thursday morning." />}
          </Field>
          <Button className="w-full" onClick={saveStatus} disabled={status === r.status && !note.trim()}>
            {status === r.status ? 'Send update' : 'Update status'}
          </Button>
        </section>

        <section aria-labelledby="mg-assignment" className="space-y-4 px-5 py-5 sm:px-6">
          <h3 id="mg-assignment" className="text-sm font-semibold text-ink-900">
            Assignment
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <Field label="Assignee" hint={assignee ? (assignee.status === 'disabled' ? 'This account is disabled — reassign the request.' : assignee.title) : undefined}>
              {(id) => (
                <Select ref={assigneeRef} id={id} value={r.assignedToId ?? ''} onChange={(e) => assign(e.target.value || undefined)}>
                  <option value="">Unassigned</option>
                  {assigneeOptions.map((u) => (
                    <option key={u.id} value={u.id} disabled={u.status === 'disabled'}>
                      {u.name}
                      {u.id === me?.id ? ' (you)' : ''}
                      {u.status === 'disabled' ? ' (disabled)' : ''}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Priority">
              {(id) => (
                <Select
                  id={id}
                  value={r.priority}
                  onChange={(e) => {
                    const p = e.target.value as RequestPriority
                    updateRequest(r.id, { priority: p })
                    toast.success(`Priority set to ${requestPriority[p].label}`)
                  }}
                >
                  {priorityOrder.map((p) => (
                    <option key={p} value={p}>
                      {requestPriority[p].label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          {!assignee && me && (
            <button
              type="button"
              onClick={() => {
                assign(me.id)
                assigneeRef.current?.focus()
              }}
              className="text-sm font-medium text-brand-800 hover:underline"
            >
              Assign to me
            </button>
          )}
        </section>

        <section aria-labelledby="mg-schedule" className="space-y-3 px-5 py-5 sm:px-6">
          <h3 id="mg-schedule" className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <CalendarClock className="size-4 text-ink-400" aria-hidden /> Schedule
          </h3>
          <Field label="Work date" hint={r.preferredDate ? `Home Owner prefers ${formatDateShort(r.preferredDate)}` : undefined}>
            {(id) => <Input ref={dateRef} id={id} type="date" min={todayIso()} value={scheduled} onChange={(e) => setScheduled(e.target.value)} />}
          </Field>
          {canMarkScheduled && <Checkbox label="Also move to “Scheduled”" checked={markScheduled} onChange={(e) => setMarkScheduled(e.target.checked)} />}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={saveSchedule} disabled={!scheduled || (scheduled === r.scheduledFor && !(markScheduled && canMarkScheduled))}>
              Save date
            </Button>
            {r.scheduledFor && (
              <Button variant="ghost" onClick={clearSchedule}>
                Clear
              </Button>
            )}
          </div>
        </section>
      </div>
    </Card>
  )
}

function HomeOwnerCard({ ownerId }: { ownerId: string }) {
  const person = usePersonLookup()
  const ref = person(ownerId)
  const owner = ref?.user
  const homes = useHomesByOwner(ownerId)
  const canOpenHomes = useCanAny(['homes.edit', 'homes.3d'])
  const canViewOwners = useCan('homeowners.view')
  if (!owner) {
    return (
      <Card>
        <CardHeader title="Home Owner" />
        <CardBody>
          <p className="text-sm text-ink-500">{ref?.deleted ? `${ref.label} — this account no longer exists.` : 'This account no longer exists.'}</p>
        </CardBody>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader title="Home Owner" />
      <CardBody className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar name={owner.name} size="md" />
          <div className="min-w-0">
            <p className="font-semibold text-ink-900">{owner.name}</p>
            <p className="text-xs text-ink-500">Home Owner since {new Date(owner.createdAt).getFullYear()}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          {owner.phone && (
            <a href={`tel:${owner.phone}`} className="flex items-center gap-2.5 rounded-lg py-1 font-medium text-brand-800 hover:underline">
              <Phone className="size-4 text-ink-400" aria-hidden /> {formatPhone(owner.phone)}
            </a>
          )}
          <a href={`mailto:${owner.email}`} className="flex min-w-0 items-center gap-2.5 rounded-lg py-1 font-medium text-brand-800 hover:underline">
            <Mail className="size-4 shrink-0 text-ink-400" aria-hidden /> <span className="truncate">{owner.email}</span>
          </a>
        </div>
        {homes.length > 0 && (
          <div>
            <p className="text-xs font-semibold tracking-wider text-ink-500 uppercase">Homes</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {homes.map((h) => (
                <li key={h.id}>
                  {canOpenHomes ? (
                    <Link to={`/staff/homes/${h.id}`} className="font-medium text-brand-800 hover:underline">
                      {h.title}
                    </Link>
                  ) : (
                    <span className="font-medium text-ink-800">{h.title}</span>
                  )}
                  <span className="block text-xs text-ink-500">{h.address}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {canViewOwners && (
          <ButtonLink to={`/staff/homeowners?owner=${owner.id}`} variant="secondary" className="w-full">
            View Home Owner profile
          </ButtonLink>
        )}
      </CardBody>
    </Card>
  )
}
