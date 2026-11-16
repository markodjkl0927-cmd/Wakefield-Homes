import { useMemo, useState, type DragEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowDown, ArrowUp, ArrowUpDown, ClipboardPlus, Columns3, Inbox, Table2 } from 'lucide-react'
import type { MaintenanceRequest, RequestCategory, RequestPriority, RequestStatus } from '@/types'
import { requestCategories, requestFlow, requestPriority, requestStatus } from '@/data/labels'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { matchesQuery, useDocumentTitle } from '@/lib/utils'
import { useAppStore } from '@/store'
import { useCurrentUser, useHomeLookup, usePersonLookup, useStaffUsers, useUsersById } from '@/store/hooks'
import { Button, Card, EmptyState, Segmented, StatusBadge, Switch, Table, TBody, TD, TH, THead, TR } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { Age, AssigneeAvatar, CategoryIcon, FilterBar, PriorityBadge, SearchField, SelectField, StaffGuard, categoryOrder, priorityOrder } from './components/common'
import { DRAG_TYPE, RequestCard, requestColumnAccent, useMoveRequest } from './components/requests'
import { LogRequestModal } from './components/LogRequestModal'

type View = 'board' | 'table'
type SortKey = 'number' | 'title' | 'category' | 'priority' | 'status' | 'assignee' | 'createdAt' | 'updatedAt'
type Sort = { key: SortKey; dir: 'asc' | 'desc' }

/** Sort choices for the phone list (the desktop table sorts by its column headers). */
const phoneSorts: { value: string; label: string; sort: Sort }[] = [
  { value: 'newest', label: 'Newest first', sort: { key: 'createdAt', dir: 'desc' } },
  { value: 'oldest', label: 'Oldest first', sort: { key: 'createdAt', dir: 'asc' } },
  { value: 'priority', label: 'Priority', sort: { key: 'priority', dir: 'asc' } },
  { value: 'status', label: 'Status', sort: { key: 'status', dir: 'asc' } },
  { value: 'updated', label: 'Recently updated', sort: { key: 'updatedAt', dir: 'desc' } },
]

export default function StaffRequests() {
  useDocumentTitle('Requests')
  return (
    <StaffGuard permission="requests.manage" title="Requests">
      <RequestsWorkspace />
    </StaffGuard>
  )
}

function RequestsWorkspace() {
  const navigate = useNavigate()
  const requests = useAppStore((s) => s.requests)
  const person = usePersonLookup()
  const homeRef = useHomeLookup()
  const staff = useStaffUsers()
  const me = useCurrentUser()

  const [view, setView] = useState<View>('board')
  const [category, setCategory] = useState<RequestCategory | 'all'>('all')
  const [priority, setPriority] = useState<RequestPriority | 'all'>('all')
  const [assignee, setAssignee] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [showClosed, setShowClosed] = useState(false)
  const [logOpen, setLogOpen] = useState(false)

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        if (category !== 'all' && r.category !== category) return false
        if (priority !== 'all' && r.priority !== priority) return false
        if (assignee === 'none' && r.assignedToId) return false
        if (assignee !== 'all' && assignee !== 'none' && r.assignedToId !== assignee) return false
        const home = homeRef(r.homeId)
        return matchesQuery(query, `#${r.number}`, r.number, r.title, r.description, person(r.homeownerId)?.name, home?.title, home?.address)
      }),
    [requests, category, priority, assignee, query, person, homeRef],
  )

  const filtersActive = category !== 'all' || priority !== 'all' || assignee !== 'all' || query.trim() !== ''
  const closedCount = filtered.filter((r) => r.status === 'closed').length

  return (
    <>
      <PageHeader
        title="Requests"
        description="Maintenance and service requests from Home Owners — gardening, road fixing, reports and house fixes."
        actions={
          <>
            <Button onClick={() => setLogOpen(true)} leftIcon={<ClipboardPlus className="size-4" aria-hidden />}>
              Log request
            </Button>
            <Segmented
              ariaLabel="View"
              value={view}
              onChange={setView}
              items={[
                { value: 'board', label: 'Board', icon: <Columns3 className="size-4" aria-hidden /> },
                { value: 'table', label: 'Table', icon: <Table2 className="size-4" aria-hidden /> },
              ]}
            />
          </>
        }
      />

      <FilterBar className="lg:flex-nowrap">
        {/* Phones: category and priority side by side, then assignee and search full width; no empty cells. */}
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          <SelectField
            label="Category"
            value={category}
            onChange={(v) => setCategory(v as RequestCategory | 'all')}
            options={[{ value: 'all', label: 'All categories' }, ...categoryOrder.map((c) => ({ value: c, label: requestCategories[c].label }))]}
          />
          <SelectField
            label="Priority"
            value={priority}
            onChange={(v) => setPriority(v as RequestPriority | 'all')}
            options={[{ value: 'all', label: 'Any priority' }, ...priorityOrder.map((p) => ({ value: p, label: requestPriority[p].label }))]}
          />
          <SelectField
            label="Assignee"
            className="col-span-2 sm:col-span-1"
            value={assignee}
            onChange={setAssignee}
            options={[
              { value: 'all', label: 'Anyone' },
              { value: 'none', label: 'Unassigned' },
              ...staff.map((u) => ({ value: u.id, label: u.id === me?.id ? `${u.name} (you)` : u.name })),
            ]}
          />
          <SearchField value={query} onChange={setQuery} placeholder="Title, # or Home Owner" className="col-span-2 sm:col-span-3 xl:col-span-1" />
        </div>
        {view === 'board' && (
          <div className="lg:pb-2.5">
            <Switch label={`Show closed${closedCount ? ` (${closedCount})` : ''}`} checked={showClosed} onChange={setShowClosed} className="justify-start gap-3 lg:flex-row-reverse" />
          </div>
        )}
      </FilterBar>

      {view === 'board' ? (
        <Board requests={filtered} showClosed={showClosed} filtersActive={filtersActive} onLog={() => setLogOpen(true)} />
      ) : (
        <RequestsTable requests={filtered} filtersActive={filtersActive} onLog={() => setLogOpen(true)} />
      )}

      {logOpen && <LogRequestModal onClose={() => setLogOpen(false)} onCreated={(r) => navigate(`/staff/requests/${r.id}`)} />}
    </>
  )
}

function NoRequests({ filtersActive, onLog }: { filtersActive: boolean; onLog: () => void }) {
  return (
    <Card>
      <EmptyState
        icon={<Inbox className="size-6" aria-hidden />}
        title={filtersActive ? 'No requests match your filters' : 'No requests yet'}
        description={filtersActive ? 'Try clearing a filter or searching for something else.' : 'Requests from the Home Owner portal appear here. Log one for a Home Owner who called the office.'}
        action={
          !filtersActive ? (
            <Button variant="secondary" onClick={onLog} leftIcon={<ClipboardPlus className="size-4" aria-hidden />}>
              Log request
            </Button>
          ) : undefined
        }
      />
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Board                                                                */
/* ------------------------------------------------------------------ */

function Board({ requests, showClosed, filtersActive, onLog }: { requests: MaintenanceRequest[]; showClosed: boolean; filtersActive: boolean; onLog: () => void }) {
  const users = useUsersById()
  const person = usePersonLookup()
  const homeRef = useHomeLookup()
  const allRequests = useAppStore((s) => s.requests)
  const move = useMoveRequest()
  const [over, setOver] = useState<RequestStatus | null>(null)
  const columns = requestFlow.filter((s) => showClosed || s !== 'closed')

  const byStatus = useMemo(() => {
    const m = Object.fromEntries(requestFlow.map((s) => [s, [] as MaintenanceRequest[]])) as Record<RequestStatus, MaintenanceRequest[]>
    for (const r of requests) m[r.status].push(r)
    for (const s of requestFlow) {
      m[s].sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority) || a.createdAt.localeCompare(b.createdAt))
    }
    return m
  }, [requests])

  const onDrop = (status: RequestStatus) => (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    setOver(null)
    const id = e.dataTransfer.getData(DRAG_TYPE)
    const r = allRequests.find((x) => x.id === id)
    if (r) move(r, status)
  }

  if (requests.length === 0) return <NoRequests filtersActive={filtersActive} onLog={onLog} />

  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2', columns.length === 6 ? 'xl:grid-cols-6' : 'xl:grid-cols-5')}>
      {columns.map((s) => {
        const items = byStatus[s]
        return (
          <section
            key={s}
            aria-labelledby={`col-${s}`}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(DRAG_TYPE)) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (over !== s) setOver(s)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((o) => (o === s ? null : o))
            }}
            onDrop={onDrop(s)}
            className={cn(
              'relative flex min-w-0 flex-col rounded-2xl bg-ink-100/70 p-2.5 pt-3.5 ring-1 ring-ink-200/60 transition-colors ring-inset',
              'before:absolute before:inset-x-4 before:top-0 before:h-1 before:rounded-b-full',
              requestColumnAccent[s],
              over === s && 'bg-brand-50 ring-2 ring-brand-300',
            )}
          >
            <header className="flex items-center justify-between gap-2 px-1.5 pb-3">
              <h2 id={`col-${s}`} className="text-sm font-semibold text-ink-800">
                {requestStatus[s].label}
              </h2>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-ink-600 tabular-nums ring-1 ring-ink-200" aria-label={`${items.length} requests`}>
                {items.length}
              </span>
            </header>
            <div className="flex flex-1 flex-col gap-2.5">
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-ink-300 px-3 py-6 text-center text-xs text-ink-500">{over === s ? 'Drop to move here' : 'Nothing here'}</p>
              ) : (
                items.map((r) => (
                  <RequestCard key={r.id} request={r} owner={person(r.homeownerId)} home={homeRef(r.homeId)} assignee={r.assignedToId ? users[r.assignedToId] : undefined} />
                ))
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Table (desktop) and sortable list (phones)                           */
/* ------------------------------------------------------------------ */

function RequestsTable({ requests, filtersActive, onLog }: { requests: MaintenanceRequest[]; filtersActive: boolean; onLog: () => void }) {
  const users = useUsersById()
  const person = usePersonLookup()
  const homeRef = useHomeLookup()
  const navigate = useNavigate()
  const [sort, setSort] = useState<Sort>({ key: 'createdAt', dir: 'desc' })

  const sorted = useMemo(() => {
    const val = (r: MaintenanceRequest): string | number => {
      switch (sort.key) {
        case 'number':
          return r.number
        case 'title':
          return r.title.toLowerCase()
        case 'category':
          return requestCategories[r.category].label
        case 'priority':
          return priorityOrder.indexOf(r.priority)
        case 'status':
          return requestFlow.indexOf(r.status)
        case 'assignee':
          return r.assignedToId ? users[r.assignedToId]?.name ?? '' : '~'
        case 'createdAt':
          return r.createdAt
        case 'updatedAt':
          return r.updatedAt
      }
    }
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...requests].sort((a, b) => {
      const va = val(a)
      const vb = val(b)
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir || b.createdAt.localeCompare(a.createdAt)
    })
  }, [requests, sort, users])

  const toggle = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'createdAt' || key === 'updatedAt' ? 'desc' : 'asc' }))
  const phoneSort = phoneSorts.find((p) => p.sort.key === sort.key && p.sort.dir === sort.dir)?.value ?? 'custom'

  if (requests.length === 0) return <NoRequests filtersActive={filtersActive} onLog={onLog} />

  return (
    <>
      {/* Desktop table */}
      <Card className="hidden overflow-hidden md:block">
        <Table className="min-w-[900px]">
          <caption className="sr-only">Maintenance requests, sortable by column</caption>
          <THead>
            <tr>
              <SortTH k="number" sort={sort} onToggle={toggle}>
                #
              </SortTH>
              <SortTH k="title" sort={sort} onToggle={toggle}>
                Request
              </SortTH>
              <SortTH k="category" sort={sort} onToggle={toggle}>
                Category
              </SortTH>
              <SortTH k="priority" sort={sort} onToggle={toggle}>
                Priority
              </SortTH>
              <SortTH k="status" sort={sort} onToggle={toggle}>
                Status
              </SortTH>
              <SortTH k="assignee" sort={sort} onToggle={toggle}>
                Assignee
              </SortTH>
              <SortTH k="createdAt" sort={sort} onToggle={toggle}>
                Age
              </SortTH>
              <SortTH k="updatedAt" sort={sort} onToggle={toggle}>
                Updated
              </SortTH>
            </tr>
          </THead>
          <TBody>
            {sorted.map((r) => {
              const assignee = r.assignedToId ? users[r.assignedToId] : undefined
              const home = homeRef(r.homeId)
              return (
                <TR key={r.id} interactive onClick={() => navigate(`/staff/requests/${r.id}`)}>
                  <TD className="font-semibold text-ink-500 tabular-nums">#{r.number}</TD>
                  <TD className="max-w-[18rem]">
                    <Link to={`/staff/requests/${r.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-semibold text-ink-900 hover:text-brand-800 hover:underline">
                      {r.title}
                    </Link>
                    <span className="block truncate text-xs text-ink-500">
                      {person(r.homeownerId)?.label ?? 'Home Owner'} · {home ? `${home.title}${home.removed ? ' (removed)' : ''}` : 'Home removed'}
                    </span>
                  </TD>
                  <TD>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <CategoryIcon category={r.category} size="sm" />
                      {requestCategories[r.category].label}
                    </span>
                  </TD>
                  <TD>
                    <PriorityBadge priority={r.priority} />
                  </TD>
                  <TD>
                    <StatusBadge def={requestStatus[r.status]} />
                  </TD>
                  <TD>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <AssigneeAvatar user={assignee} />
                      <span className={assignee ? 'text-ink-800' : 'text-ink-500'}>{assignee?.name ?? 'Unassigned'}</span>
                    </span>
                  </TD>
                  <TD className="whitespace-nowrap text-ink-600">
                    <Age iso={r.createdAt} />
                  </TD>
                  <TD className="whitespace-nowrap text-ink-600">{formatDate(r.updatedAt)}</TD>
                </TR>
              )
            })}
          </TBody>
        </Table>
      </Card>

      {/* Phones: a sortable list of cards, with status and last update inside each card */}
      <div className="md:hidden">
        <SelectField
          label="Sort by"
          value={phoneSort}
          onChange={(v) => {
            const next = phoneSorts.find((p) => p.value === v)
            if (next) setSort(next.sort)
          }}
          options={phoneSort === 'custom' ? [{ value: 'custom', label: 'Custom' }, ...phoneSorts] : phoneSorts}
          className="mb-3"
        />
        <ul className="space-y-3" aria-label="Requests">
          {sorted.map((r) => (
            <li key={r.id}>
              <RequestCard
                request={r}
                owner={person(r.homeownerId)}
                home={homeRef(r.homeId)}
                assignee={r.assignedToId ? users[r.assignedToId] : undefined}
                draggable={false}
                footer={
                  <p className="flex items-center justify-between gap-2 text-xs text-ink-500">
                    <StatusBadge def={requestStatus[r.status]} />
                    <span>Updated {formatDate(r.updatedAt)}</span>
                  </p>
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

function SortTH({ k, sort, onToggle, children }: { k: SortKey; sort: Sort; onToggle: (k: SortKey) => void; children: string }) {
  const active = sort.key === k
  const Icon = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <TH aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onToggle(k)} className={cn('-mx-1 inline-flex items-center gap-1 rounded px-1 py-1 uppercase hover:text-ink-900', active && 'text-ink-900')}>
        {children}
        <Icon className={cn('size-3.5', !active && 'opacity-50')} aria-hidden />
      </button>
    </TH>
  )
}
