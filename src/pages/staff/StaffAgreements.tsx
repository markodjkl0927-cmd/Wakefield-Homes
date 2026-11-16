import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { EyeOff, FileSignature, Lock, Plus } from 'lucide-react'
import type { Agreement, AgreementStatus, AgreementType } from '@/types'
import { agreementStatus, agreementTypes } from '@/data/labels'
import { formatPrice, formatRelative } from '@/lib/format'
import { matchesQuery, useDocumentTitle } from '@/lib/utils'
import { useAppStore } from '@/store'
import { useCurrentUser, useHomeLookup, usePersonLookup } from '@/store/hooks'
import { Avatar, ButtonLink, Card, EmptyState, Segmented, StatusBadge, Table, TBody, TD, TH, THead, TR } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { FilterBar, SearchField, SelectField, StaffGuard } from './components/common'

type StatusFilter = 'all' | AgreementStatus
const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'awaiting-signature', label: 'Awaiting signature' },
  { value: 'signed', label: 'Signed' },
  { value: 'active', label: 'Active' },
  { value: 'void', label: 'Void' },
]

export default function StaffAgreements() {
  useDocumentTitle('Agreements')
  return (
    <StaffGuard permission="agreements.edit" title="Agreements">
      <AgreementsWorkspace />
    </StaffGuard>
  )
}

/** Who touched it last, in words: "Signed by Daniel Ellis" for signed documents, "Draft by …" for drafts. */
function useLastActivity() {
  const person = usePersonLookup()
  const me = useCurrentUser()
  return (a: Agreement) => {
    const name = (id: string | undefined) => (id && id === me?.id ? 'You' : person(id)?.label ?? 'Someone')
    if (a.status === 'signed') return { who: `Signed by ${name(a.signedByUserId ?? a.homeownerId)}`, at: a.signedAt ?? a.updatedAt }
    if (a.status === 'draft') return { who: `Draft by ${name(a.history[0]?.byUserId ?? a.updatedByUserId)}`, at: a.updatedAt }
    return { who: name(a.updatedByUserId), at: a.updatedAt }
  }
}

function AgreementsWorkspace() {
  const [params] = useSearchParams()
  const agreements = useAppStore((s) => s.agreements)
  const person = usePersonLookup()
  const homeRef = useHomeLookup()
  const lastActivity = useLastActivity()
  const navigate = useNavigate()

  const [status, setStatus] = useState<StatusFilter>(() => {
    const p = params.get('status') as StatusFilter | null
    return p && statusFilters.some((f) => f.value === p) ? p : 'all'
  })
  const [type, setType] = useState<AgreementType | 'all'>('all')
  const [query, setQuery] = useState('')

  const base = useMemo(
    () =>
      agreements.filter((a) => {
        if (type !== 'all' && a.type !== type) return false
        return matchesQuery(query, a.title, a.reference, a.summary, person(a.homeownerId)?.name, homeRef(a.homeId)?.title)
      }),
    [agreements, type, query, person, homeRef],
  )
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: base.length }
    for (const a of base) c[a.status] = (c[a.status] ?? 0) + 1
    return c
  }, [base])
  const rows = useMemo(() => base.filter((a) => status === 'all' || a.status === status).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [base, status])

  return (
    <>
      <PageHeader
        title="Agreements"
        description="Contracts, change orders and warranties shared with Home Owners. Drafts stay private; every shared change is versioned and the Home Owner is notified."
        actions={
          <ButtonLink to="/staff/agreements/new" leftIcon={<Plus className="size-4" aria-hidden />}>
            New agreement
          </ButtonLink>
        }
      />

      <FilterBar>
        <Segmented ariaLabel="Agreement status" value={status} onChange={setStatus} items={statusFilters.map((f) => ({ ...f, count: counts[f.value] ?? 0 }))} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[30rem]">
          <SelectField
            label="Type"
            value={type}
            onChange={(v) => setType(v as AgreementType | 'all')}
            options={[{ value: 'all', label: 'All types' }, ...(Object.keys(agreementTypes) as AgreementType[]).map((t) => ({ value: t, label: agreementTypes[t].label }))]}
          />
          <SearchField value={query} onChange={setQuery} placeholder="Title, reference or Home Owner" />
        </div>
      </FilterBar>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileSignature className="size-6" aria-hidden />}
            title={status === 'draft' ? 'No drafts' : 'No agreements match'}
            description={status === 'draft' ? 'Drafts stay private until you share them with the Home Owner.' : 'Try another filter, or create a new agreement.'}
            action={
              <ButtonLink to="/staff/agreements/new" variant="secondary" leftIcon={<Plus className="size-4" aria-hidden />}>
                New agreement
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden lg:block">
            <Table className="min-w-[900px]">
              <caption className="sr-only">Agreements</caption>
              <THead>
                <tr>
                  <TH>Agreement</TH>
                  <TH>Home Owner</TH>
                  <TH>Status</TH>
                  <TH className="text-center">Version</TH>
                  <TH>Last activity</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((a) => {
                  const owner = person(a.homeownerId)
                  const home = homeRef(a.homeId)
                  const last = lastActivity(a)
                  const TypeIcon = agreementTypes[a.type].icon
                  return (
                    <TR key={a.id} interactive onClick={() => navigate(`/staff/agreements/${a.id}`)}>
                      <TD>
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800 ring-1 ring-brand-100" aria-hidden>
                            <TypeIcon className="size-[18px]" />
                          </span>
                          <div className="min-w-0">
                            <Link to={`/staff/agreements/${a.id}`} onClick={(e) => e.stopPropagation()} className="block max-w-[22rem] truncate font-semibold text-ink-900 hover:text-brand-800 hover:underline">
                              {a.title}
                            </Link>
                            <span className="block text-xs text-ink-500">
                              {agreementTypes[a.type].label} · <span className="font-mono">{a.reference}</span>
                              {a.amount != null && <> · {formatPrice(a.amount)}</>}
                            </span>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Avatar name={owner?.name ?? '?'} size="sm" />
                          <div className="min-w-0">
                            <span className="block max-w-[14rem] truncate font-medium text-ink-900">{owner?.label ?? 'Home Owner'}</span>
                            <span className="block max-w-[14rem] truncate text-xs text-ink-500">{home ? `${home.title}${home.removed ? ' (removed)' : ''}` : 'No home linked'}</span>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <StatusBadge def={agreementStatus[a.status]} />
                        <SeenNote agreement={a} />
                      </TD>
                      <TD className="text-center font-medium text-ink-900 tabular-nums">
                        {a.status === 'draft' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-normal text-ink-500" title="Private to staff — the first shared version is version 1">
                            <Lock className="size-3.5" aria-hidden /> Private
                          </span>
                        ) : (
                          `v${a.version}`
                        )}
                      </TD>
                      <TD className="whitespace-nowrap">
                        <span className="block max-w-[14rem] truncate text-ink-800">{last.who}</span>
                        <span className="block text-xs text-ink-500">{formatRelative(last.at)}</span>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </Card>

          <ul className="space-y-3 lg:hidden">
            {rows.map((a) => {
              const owner = person(a.homeownerId)
              const home = homeRef(a.homeId)
              const last = lastActivity(a)
              return (
                <li key={a.id} className="relative rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-200/70 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-xs text-ink-500">
                      {agreementTypes[a.type].label} · <span className="font-mono">{a.reference}</span>
                    </p>
                    <span className="shrink-0 text-xs font-medium text-ink-600 tabular-nums">{a.status === 'draft' ? 'Private' : `v${a.version}`}</span>
                  </div>
                  <Link to={`/staff/agreements/${a.id}`} className="mt-1 block font-semibold text-ink-900 wrap-anywhere after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
                    {a.title}
                  </Link>
                  <p className="mt-1 truncate text-sm text-ink-600">
                    {owner?.label ?? 'Home Owner'}
                    {home ? ` · ${home.title}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <StatusBadge def={agreementStatus[a.status]} />
                      <SeenNote agreement={a} />
                    </div>
                    <span className="text-xs text-ink-500">
                      {a.status === 'signed' ? last.who : 'Updated'} {formatRelative(last.at)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </>
  )
}

/** Whether the Home Owner has opened the latest shared version (drafts, void and signed documents say nothing). */
function SeenNote({ agreement: a }: { agreement: Agreement }) {
  if (a.status === 'draft' || a.status === 'void' || a.status === 'signed') return null
  const seen = a.seenVersion ?? 0
  if (seen >= a.version) return null
  return (
    <span className="mt-1 flex items-center gap-1 text-xs text-ink-500">
      <EyeOff className="size-3.5" aria-hidden /> {seen > 0 ? `Hasn’t seen v${a.version}` : 'Not opened yet'}
    </span>
  )
}
