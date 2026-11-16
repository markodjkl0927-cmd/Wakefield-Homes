import { useMemo, useState } from 'react'
import { Download, History, Search } from 'lucide-react'
import { formatDateTime, formatRelative, pluralize } from '@/lib/format'
import { matchesQuery, toIsoDate, useDocumentTitle } from '@/lib/utils'
import { useAppStore } from '@/store'
import { usePersonLookup } from '@/store/hooks'
import { toast } from '@/store/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { Button, Card, EmptyState, Field, Input, Select, Table, TBody, TD, TH, THead, TR } from '@/components/ui'
import { ActorAvatar, KindBadge, ViewingAsNote } from './components/bits'
import { downloadCsv, toCsv } from './components/csv'
import { useUrlFilters } from './components/useUrlFilters'
import {
  activityKindOrder,
  activityKinds,
  actorText,
  byNewest,
  capitalize,
  describeTarget,
  displayTarget,
  formatWhenShort,
  GUEST_ACTOR,
  involves,
  personLabel,
  personSubline,
  viewingAs,
  type ActivityKind,
} from './components/meta'

const PAGE_SIZE = 25
const urlKeys = ['kind', 'actor'] as const

type KindFilter = 'all' | ActivityKind

export default function AdminActivity() {
  useDocumentTitle('Activity log')
  const activity = useAppStore((s) => s.activity)
  const person = usePersonLookup()
  const [filters, updateFilters] = useUrlFilters(urlKeys)

  const kind: KindFilter = filters.kind && (activityKindOrder as string[]).includes(filters.kind) ? (filters.kind as ActivityKind) : 'all'
  const actor = filters.actor ?? 'all'
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const setFilter = (key: 'kind' | 'actor', value: string) => {
    setLimit(PAGE_SIZE)
    updateFilters({ [key]: value === 'all' ? null : value })
  }

  const sorted = useMemo(() => [...activity].sort(byNewest), [activity])

  /**
   * Everyone who appears in the log — as the person who acted, or as the person a Super Admin was viewing as.
   * Deleted accounts keep their last known name ("Tom Becker (deleted)"), so every option is distinct.
   */
  const actorOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const e of sorted) {
      ids.add(e.actorId)
      if (e.viewingAsId) ids.add(e.viewingAsId)
    }
    const people = [...ids]
      .filter((id) => id !== GUEST_ACTOR)
      .map((id) => ({ id, name: personLabel(id, person), deleted: !!person(id)?.deleted }))
      .sort((a, b) => Number(a.deleted) - Number(b.deleted) || a.name.localeCompare(b.name))
    return { hasGuest: ids.has(GUEST_ACTOR), people }
  }, [sorted, person])

  // Facet counts ignore the type filter so each option shows what it would return.
  const base = useMemo(
    () =>
      sorted.filter(
        (e) =>
          (actor === 'all' || involves(e, actor)) &&
          matchesQuery(query, actorText(e, person), e.action, e.target, describeTarget(e), activityKinds[e.kind].label),
      ),
    [sorted, actor, query, person],
  )
  const kindCounts = useMemo(() => {
    const counts = Object.fromEntries(activityKindOrder.map((k) => [k, 0])) as Record<ActivityKind, number>
    for (const e of base) counts[e.kind] += 1
    return counts
  }, [base])
  const filtered = useMemo(() => (kind === 'all' ? base : base.filter((e) => e.kind === kind)), [base, kind])
  const visible = filtered.slice(0, limit)

  const filtersActive = kind !== 'all' || actor !== 'all' || query.trim() !== ''
  const clearFilters = () => {
    setQuery('')
    setLimit(PAGE_SIZE)
    updateFilters({ kind: null, actor: null })
  }

  const exportCsv = () => {
    if (!filtered.length) return
    const rows = filtered.map((e) => [
      e.at,
      formatDateTime(e.at),
      personLabel(e.actorId, person),
      personSubline(e.actorId, person),
      viewingAs(e, person)?.label ?? '',
      e.action,
      describeTarget(e),
      activityKinds[e.kind].label,
    ])
    const csv = toCsv(['Timestamp (UTC)', 'Date and time', 'Who', 'Role or title', 'Viewing as', 'Action', 'Target', 'Type'], rows)
    downloadCsv(`wakefield-activity-${toIsoDate(new Date())}.csv`, csv)
    toast.success('Activity exported', `${pluralize(filtered.length, 'entry', 'entries')} saved as a CSV file.`)
  }

  return (
    <>
      <PageHeader
        title="Activity log"
        description="An audit trail of sign-ins and changes across the website, the Home Owner portal and the staff workspace. Changes made with “View as” are credited to the Super Admin."
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={!filtered.length} leftIcon={<Download className="size-4" aria-hidden />}>
            Export CSV
          </Button>
        }
      />

      <Card>
        <div className="grid gap-3 border-b border-ink-100 px-4 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(0,1fr)_200px_240px]">
          <Field label="Search" className="sm:col-span-2 lg:col-span-1">
            {(id) => (
              <Input
                id={id}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setLimit(PAGE_SIZE)
                }}
                placeholder="People, actions or details"
                leftIcon={<Search className="size-4" aria-hidden />}
                autoComplete="off"
              />
            )}
          </Field>
          <Field label="Type">
            {(id) => (
              <Select id={id} value={kind} onChange={(e) => setFilter('kind', e.target.value)}>
                <option value="all">All types ({base.length})</option>
                {activityKindOrder.map((k) => (
                  <option key={k} value={k}>
                    {activityKinds[k].plural} ({kindCounts[k]})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Person">
            {(id) => (
              <Select id={id} value={actor} onChange={(e) => setFilter('actor', e.target.value)}>
                <option value="all">Everyone</option>
                {actorOptions.hasGuest && <option value={GUEST_ACTOR}>Website visitors</option>}
                {actorOptions.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                {actor !== 'all' && actor !== GUEST_ACTOR && !actorOptions.people.some((p) => p.id === actor) && (
                  <option value={actor}>{personLabel(actor, person)}</option>
                )}
              </Select>
            )}
          </Field>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<History className="size-6" aria-hidden />}
            title={activity.length ? 'No matching activity' : 'No activity yet'}
            description={activity.length ? 'Try another search, type or person.' : 'Sign-ins and changes will be recorded here.'}
            action={
              filtersActive ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="hidden xl:block">
              <Table>
                <caption className="sr-only">Activity log, newest first</caption>
                <THead>
                  <tr>
                    <TH className="w-52">When</TH>
                    <TH className="w-64">Who</TH>
                    <TH>What</TH>
                    <TH className="w-36">Type</TH>
                  </tr>
                </THead>
                <TBody>
                  {visible.map((e) => {
                    const target = displayTarget(e, person)
                    const as = viewingAs(e, person)
                    return (
                      <TR key={e.id}>
                        <TD className="align-top">
                          <time dateTime={e.at} className="block whitespace-nowrap text-ink-800">
                            {formatDateTime(e.at)}
                          </time>
                          <span className="text-xs text-ink-500">{formatRelative(e.at)}</span>
                        </TD>
                        <TD className="align-top">
                          <div className="flex items-center gap-2.5">
                            <ActorAvatar actorId={e.actorId} user={person(e.actorId)?.user} size="sm" />
                            <div className="min-w-0 max-w-48">
                              <p className="truncate font-medium text-ink-900">{personLabel(e.actorId, person)}</p>
                              {as ? (
                                <ViewingAsNote name={as.label} className="block text-xs" />
                              ) : (
                                <p className="truncate text-xs text-ink-500">{personSubline(e.actorId, person)}</p>
                              )}
                            </div>
                          </div>
                        </TD>
                        <TD className="align-top">
                          <p className="font-medium text-ink-900">{capitalize(e.action)}</p>
                          {target && <p className="wrap-anywhere text-ink-600">{target}</p>}
                        </TD>
                        <TD className="align-top">
                          <KindBadge kind={e.kind} />
                        </TD>
                      </TR>
                    )
                  })}
                </TBody>
              </Table>
            </div>

            <ol className="divide-y divide-ink-100 xl:hidden" aria-label="Activity log, newest first">
              {visible.map((e) => {
                const target = displayTarget(e, person)
                const as = viewingAs(e, person)
                return (
                  <li key={e.id} className="flex gap-3 px-4 py-4 sm:px-6">
                    <ActorAvatar actorId={e.actorId} user={person(e.actorId)?.user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-6 text-ink-600">
                        <span className="font-semibold wrap-anywhere text-ink-900">{personLabel(e.actorId, person)}</span>
                        {as && (
                          <>
                            {' '}
                            <ViewingAsNote name={as.label} />
                          </>
                        )}{' '}
                        {e.action}
                        {target && (
                          <>
                            {' '}
                            <span className="font-medium wrap-anywhere text-ink-800">{target}</span>
                          </>
                        )}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <KindBadge kind={e.kind} />
                        <time dateTime={e.at} title={formatDateTime(e.at)} className="text-xs text-ink-500">
                          {formatWhenShort(e.at)}
                        </time>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-ink-100 bg-ink-25 px-4 py-3 sm:px-6">
            <p className="text-sm text-ink-500" aria-live="polite">
              Showing {visible.length} of {pluralize(filtered.length, 'entry', 'entries')}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {filtersActive && (
                <Button variant="ghost" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
              {visible.length < filtered.length && (
                <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                  Load {Math.min(PAGE_SIZE, filtered.length - visible.length)} more
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </>
  )
}
