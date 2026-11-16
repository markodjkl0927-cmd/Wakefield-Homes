import { useId, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Box, Home as HomeIcon, Plus } from 'lucide-react'
import type { Home, HomeStatus } from '@/types'
import { homeStatus } from '@/data/labels'
import { getModel } from '@/data/models'
import { getCommunity } from '@/data/communities'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'
import { matchesQuery, useDocumentTitle } from '@/lib/utils'
import { useAppStore } from '@/store'
import { useCan, useUsersById } from '@/store/hooks'
import { toast } from '@/store/ui'
import { Alert, Avatar, ButtonLink, Card, EmptyState, Segmented, SmartImage, StatusBadge, Switch, Table, TBody, TD, TH, THead, TR } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { FilterBar, SearchField, SelectField, StaffGuard } from './components/common'

type Scope = 'all' | 'listings' | 'owned' | 'drafts'

const scopeTest: Record<Scope, (h: Home) => boolean> = {
  all: () => true,
  listings: (h) => h.published,
  owned: (h) => !!h.ownerId,
  drafts: (h) => !h.published && !h.ownerId,
}

export default function StaffHomes() {
  useDocumentTitle('Homes & 3D')
  return (
    // "Manage 3D viewing" alone is enough to open Homes & 3D: the 3D switches work, the rest is read-only.
    <StaffGuard permission={['homes.edit', 'homes.3d']} title="Homes & 3D">
      <HomesWorkspace />
    </StaffGuard>
  )
}

function useHomeToggles() {
  const updateHome = useAppStore((s) => s.updateHome)
  const updateHome3d = useAppStore((s) => s.updateHome3d)
  return {
    setPublished: (h: Home, published: boolean) => {
      updateHome(h.id, { published }, published ? 'published on the website' : 'removed from the website')
      toast.success(published ? 'Published on the website' : 'Removed from the website', h.title)
    },
    set3d: (h: Home, enabled: boolean) => {
      updateHome3d(h.id, { enabled })
      toast.success(enabled ? '3D viewing enabled' : '3D viewing turned off', h.title)
    },
  }
}

function HomesWorkspace() {
  const [params] = useSearchParams()
  const homes = useAppStore((s) => s.homes)
  const view3dGlobal = useAppStore((s) => s.settings.features.view3d)
  const users = useUsersById()
  const can3d = useCan('homes.3d')
  const canEdit = useCan('homes.edit')
  const canSettings = useCan('settings.manage')
  const navigate = useNavigate()
  const toggles = useHomeToggles()

  const [scope, setScope] = useState<Scope>('all')
  const [status, setStatus] = useState<HomeStatus | 'all'>(() => {
    const p = params.get('status') as HomeStatus | null
    return p && p in homeStatus ? p : 'all'
  })
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const base = homes.filter((h) => status === 'all' || h.status === status)
    return { all: base.length, listings: base.filter(scopeTest.listings).length, owned: base.filter(scopeTest.owned).length, drafts: base.filter(scopeTest.drafts).length }
  }, [homes, status])

  const filtered = useMemo(
    () =>
      homes
        .filter((h) => scopeTest[scope](h) && (status === 'all' || h.status === status))
        .filter((h) => {
          const model = getModel(h.modelId)
          const community = h.communityId ? getCommunity(h.communityId) : undefined
          const owner = h.ownerId ? users[h.ownerId] : undefined
          return matchesQuery(query, h.title, h.address, h.city, h.lot, model?.name, community?.name, owner?.name)
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [homes, scope, status, query, users],
  )

  return (
    <>
      <PageHeader
        title="Homes & 3D"
        description={
          canEdit
            ? 'Update listings and owned homes, publish them to the website and switch 3D viewing on or off.'
            : 'Switch 3D viewing on or off and design each home’s 3D model. Other details need the “Edit homes” permission.'
        }
        actions={
          canEdit ? (
            <ButtonLink to="/staff/homes/new" leftIcon={<Plus className="size-4" aria-hidden />}>
              Add home
            </ButtonLink>
          ) : undefined
        }
      />

      {!view3dGlobal && (
        <Alert
          tone="warning"
          title="3D viewing is turned off for the whole platform"
          className="mb-5"
          action={
            canSettings ? (
              <Link to="/admin/settings" className="text-sm font-semibold text-amber-950 underline underline-offset-2">
                Platform settings
              </Link>
            ) : undefined
          }
        >
          Per-home 3D switches are still saved, but visitors and Home Owners won’t see any 3D tours until a Super Admin turns the feature back on.
        </Alert>
      )}

      <FilterBar>
        <Segmented
          ariaLabel="Which homes"
          value={scope}
          onChange={setScope}
          items={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'listings', label: 'Website listings', count: counts.listings },
            { value: 'owned', label: 'Owned homes', count: counts.owned },
            { value: 'drafts', label: 'Drafts', count: counts.drafts },
          ]}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[30rem]">
          <SelectField
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as HomeStatus | 'all')}
            options={[{ value: 'all', label: 'Any status' }, ...(Object.keys(homeStatus) as HomeStatus[]).map((s) => ({ value: s, label: homeStatus[s].label }))]}
          />
          <SearchField value={query} onChange={setQuery} placeholder="Title, address, plan or owner" />
        </div>
      </FilterBar>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HomeIcon className="size-6" aria-hidden />}
            title="No homes match"
            description={scope === 'drafts' ? 'Drafts are homes that are neither published nor owned yet.' : 'Try another filter or search term.'}
            action={
              canEdit ? (
                <ButtonLink to="/staff/homes/new" variant="secondary" leftIcon={<Plus className="size-4" aria-hidden />}>
                  Add home
                </ButtonLink>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden lg:block">
            <Table className="min-w-[900px]">
              <caption className="sr-only">Homes, with website and 3D switches</caption>
              <THead>
                <tr>
                  <TH>Home</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Price</TH>
                  <TH className="text-center whitespace-nowrap">Website</TH>
                  <TH className="text-center whitespace-nowrap">3D tour</TH>
                  <TH>Owner</TH>
                </tr>
              </THead>
              <TBody>
                {filtered.map((h) => {
                  const model = getModel(h.modelId)
                  const owner = h.ownerId ? users[h.ownerId] : undefined
                  return (
                    <TR key={h.id} interactive onClick={() => navigate(`/staff/homes/${h.id}`)}>
                      <TD>
                        <div className="flex min-w-0 items-center gap-3">
                          <SmartImage src={h.images[0] ?? model?.image} alt="" className="aspect-[4/3] w-16 shrink-0 rounded-lg" />
                          <div className="min-w-0">
                            <Link to={`/staff/homes/${h.id}`} onClick={(e) => e.stopPropagation()} className="block max-w-[20rem] truncate font-semibold text-ink-900 hover:text-brand-800 hover:underline">
                              {h.title}
                            </Link>
                            <span className="block max-w-[20rem] truncate text-xs text-ink-500">
                              {model ? `${model.name} · ` : ''}
                              {h.address}, {h.city}
                            </span>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <StatusBadge def={homeStatus[h.status]} />
                      </TD>
                      <TD className="text-right tabular-nums">
                        {h.price != null ? (
                          <span className="font-medium whitespace-nowrap text-ink-900">{formatPrice(h.price)}</span>
                        ) : (
                          <span className="ml-auto block max-w-[8.5rem] text-xs leading-snug text-ink-500">{h.priceNote ?? 'No price set'}</span>
                        )}
                      </TD>
                      <TD className="text-center">
                        <RowSwitch
                          label={`Show ${h.title} on the website`}
                          checked={h.published}
                          onChange={(v) => toggles.setPublished(h, v)}
                          disabled={!canEdit}
                          hint={!canEdit ? 'No access' : undefined}
                        />
                      </TD>
                      <TD className="text-center">
                        <RowSwitch
                          label={`3D viewing for ${h.title}`}
                          checked={h.view3d.enabled}
                          onChange={(v) => toggles.set3d(h, v)}
                          disabled={!can3d}
                          hint={!view3dGlobal && h.view3d.enabled ? 'Off globally' : !can3d ? 'No access' : undefined}
                        />
                      </TD>
                      <TD>{owner ? <OwnerChip name={owner.name} /> : <span className="text-ink-500">—</span>}</TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </Card>

          {/* Phones & tablets: cards */}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
            {filtered.map((h) => (
              <HomeCardMobile key={h.id} home={h} ownerName={h.ownerId ? users[h.ownerId]?.name : undefined} can3d={can3d} canEdit={canEdit} view3dGlobal={view3dGlobal} toggles={toggles} />
            ))}
          </ul>
        </>
      )}
    </>
  )
}

function OwnerChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <Avatar name={name} size="xs" />
      <span className="text-ink-800">{name}</span>
    </span>
  )
}

/**
 * Switch inside a clickable row: stops the click from opening the editor and gets a specific accessible name.
 * `relative` keeps the screen-reader-only label (position: absolute) inside the table's scroll box, so it
 * can't widen the page.
 */
function RowSwitch({ label, checked, onChange, disabled, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string }) {
  const id = useId()
  return (
    <div className="relative inline-flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Switch id={id} checked={checked} onChange={onChange} disabled={disabled} />
      {hint && <span className="text-[11px] whitespace-nowrap text-amber-800">{hint}</span>}
    </div>
  )
}

function HomeCardMobile({
  home: h,
  ownerName,
  can3d,
  canEdit,
  view3dGlobal,
  toggles,
}: {
  home: Home
  ownerName?: string
  can3d: boolean
  canEdit: boolean
  view3dGlobal: boolean
  toggles: ReturnType<typeof useHomeToggles>
}) {
  const model = getModel(h.modelId)
  return (
    <li className="relative flex flex-col rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-200/70 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500">
      <div className="flex gap-3">
        <SmartImage src={h.images[0] ?? model?.image} alt="" className="aspect-[4/3] w-28 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <Link to={`/staff/homes/${h.id}`} className="font-semibold text-ink-900 wrap-anywhere after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
            {h.title}
          </Link>
          <p className="mt-0.5 truncate text-xs text-ink-500">
            {h.address}, {h.city}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge def={homeStatus[h.status]} />
            <span className="text-sm font-medium text-ink-900 tabular-nums">{h.price != null ? formatPrice(h.price) : <span className="font-normal text-ink-500">{h.priceNote ?? 'No price set'}</span>}</span>
          </div>
        </div>
      </div>
      <div className="relative z-10 mt-4 grid grid-cols-2 gap-4 border-t border-ink-100 pt-3">
        <Switch
          label={
            <>
              On website<span className="sr-only"> — {h.title}</span>
            </>
          }
          checked={h.published}
          onChange={(v) => toggles.setPublished(h, v)}
          disabled={!canEdit}
        />
        <Switch
          label={
            <span className="inline-flex items-center gap-1.5">
              <Box className="size-3.5 text-ink-400" aria-hidden /> 3D tour<span className="sr-only"> — {h.title}</span>
            </span>
          }
          description={!view3dGlobal && h.view3d.enabled ? 'Off globally' : undefined}
          checked={h.view3d.enabled}
          onChange={(v) => toggles.set3d(h, v)}
          disabled={!can3d}
        />
      </div>
      <p className={cn('mt-3 text-xs text-ink-500', !ownerName && 'sr-only')}>{ownerName ? `Owned by ${ownerName}` : 'No owner'}</p>
    </li>
  )
}
