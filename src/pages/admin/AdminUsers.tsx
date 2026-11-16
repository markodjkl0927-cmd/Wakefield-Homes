import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Search, UserPlus, Users } from 'lucide-react'
import type { Role, User, UserStatus } from '@/types'
import { roleLabels } from '@/data/labels'
import { formatDateTime, formatPhone, formatRelative, pluralize } from '@/lib/format'
import { matchesQuery, useDocumentTitle } from '@/lib/utils'
import { cn } from '@/lib/cn'
import { useAppStore } from '@/store'
import { PageHeader } from '@/components/portal/PageHeader'
import { Avatar, Badge, Button, Card, CardFooter, EmptyState, Field, Input, Segmented, Select, TBody, TD, TH, THead, TR } from '@/components/ui'
import { RoleBadge, UserStatusBadge } from './components/bits'
import { CredentialsDialog } from './components/CredentialsDialog'
import { DeleteAccountDialog } from './components/DeleteAccountDialog'
import { roleOrder, userStatusLabels } from './components/meta'
import { UserDrawer } from './components/UserDrawer'
import { UserFormModal, type UserFormMode, type UserFormResult } from './components/UserFormModal'
import { UserRowMenu } from './components/UserRowMenu'
import { useUserActions } from './components/useUserActions'
import { useUrlFilters } from './components/useUrlFilters'

type RoleFilter = 'all' | Role
type StatusFilter = 'all' | UserStatus

const statusOrder: UserStatus[] = ['active', 'invited', 'disabled']
const urlKeys = ['role', 'status', 'new'] as const

function parseRole(value: string | null): RoleFilter {
  return value && (roleOrder as string[]).includes(value) ? (value as Role) : 'all'
}

function parseStatus(value: string | null): StatusFilter {
  return value && (statusOrder as string[]).includes(value) ? (value as UserStatus) : 'all'
}

export default function AdminUsers() {
  useDocumentTitle('Users & accounts')
  const users = useAppStore((s) => s.users)
  const homes = useAppStore((s) => s.homes)
  const actions = useUserActions()
  const { showCredentials } = actions
  const [filters, updateParams] = useUrlFilters(urlKeys)

  const role = parseRole(filters.role)
  const status = parseStatus(filters.status)
  const createOpen = filters.new === '1'

  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFromDrawer, setEditFromDrawer] = useState(false)
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  useEffect(() => {
    if (!highlightId) return
    const t = window.setTimeout(() => setHighlightId(null), 3200)
    return () => window.clearTimeout(t)
  }, [highlightId])

  const homesByOwner = useMemo(() => {
    const map: Record<string, number> = {}
    for (const h of homes) if (h.ownerId) map[h.ownerId] = (map[h.ownerId] ?? 0) + 1
    return map
  }, [homes])

  const roleCounts = useMemo(() => {
    const counts: Record<RoleFilter, number> = { all: users.length, homeowner: 0, staff: 0, admin: 0 }
    for (const u of users) counts[u.role] += 1
    return counts
  }, [users])

  const statusCounts = useMemo(() => {
    const counts: Record<UserStatus, number> = { active: 0, invited: 0, disabled: 0 }
    for (const u of users) if (role === 'all' || u.role === role) counts[u.status] += 1
    return counts
  }, [users, role])

  const matches = useCallback(
    (u: User, r: RoleFilter, st: StatusFilter, q: string) =>
      (r === 'all' || u.role === r) &&
      (st === 'all' || u.status === st) &&
      matchesQuery(q, u.name, u.email, u.title, u.phone, u.phone ? formatPhone(u.phone) : '', u.address, roleLabels[u.role]),
    [],
  )

  const rows = useMemo(
    () => users.filter((u) => matches(u, role, status, query)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [users, role, status, query, matches],
  )

  const filtersActive = role !== 'all' || status !== 'all' || query.trim() !== ''
  const clearFilters = () => {
    setQuery('')
    updateParams({ role: null, status: null })
  }

  const detailsUser = useMemo(() => (detailsId ? users.find((u) => u.id === detailsId) ?? null : null), [users, detailsId])
  const editingUser = useMemo(() => (editingId ? users.find((u) => u.id === editingId) ?? null : null), [users, editingId])

  const formMode: UserFormMode | null = createOpen
    ? { kind: 'create', defaultRole: role === 'all' ? 'homeowner' : role }
    : editingUser
      ? { kind: 'edit', user: editingUser }
      : null

  const openCreate = () => updateParams({ new: '1' })
  const openDetails = useCallback((id: string) => setDetailsId(id), [])
  const closeDetails = useCallback(() => setDetailsId(null), [])
  const openEdit = useCallback((u: User, fromDrawer = false) => {
    setDetailsId(null)
    setEditFromDrawer(fromDrawer)
    setEditingId(u.id)
  }, [])

  const closeForm = useCallback(
    (result?: UserFormResult) => {
      const returnTo = editFromDrawer ? editingId : null
      setEditingId(null)
      setEditFromDrawer(false)
      if (result?.created) {
        // Make sure the new account is visible, then highlight it and hand over the sign-in details.
        const visible = matches(result.user, role, status, query)
        if (!visible) setQuery('')
        updateParams(visible ? { new: null } : { new: null, role: null, status: null })
        setHighlightId(result.user.id)
        if (result.credentials) showCredentials(result.credentials)
      } else if (createOpen) {
        updateParams({ new: null })
      }
      if (returnTo && !result?.created) setDetailsId(returnTo)
    },
    [editFromDrawer, editingId, matches, role, status, query, updateParams, createOpen, showCredentials],
  )

  // Counts are rendered inside the label (not via `count`) so they keep AA contrast on the grey track,
  // and the labels shorten on phones so all four options fit without scrolling.
  const roleLabel = (long: string, short: string, count: number) => (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{long}</span>
      <span className="font-normal tabular-nums">{count}</span>
    </>
  )
  const roleItems: { value: RoleFilter; label: ReactNode }[] = [
    { value: 'all', label: roleLabel('All', 'All', roleCounts.all) },
    { value: 'homeowner', label: roleLabel('Home Owners', 'Owners', roleCounts.homeowner) },
    { value: 'staff', label: roleLabel('Staff', 'Staff', roleCounts.staff) },
    { value: 'admin', label: roleLabel('Super Admins', 'Admins', roleCounts.admin) },
  ]

  return (
    <>
      <PageHeader
        title="Users & accounts"
        description="Create, modify and delete Home Owner, Staff and Super Admin accounts."
        actions={
          <Button onClick={openCreate} leftIcon={<UserPlus className="size-4" aria-hidden />}>
            Create account
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-4 border-b border-ink-100 px-4 py-4 sm:px-6 min-[1400px]:flex-row min-[1400px]:items-end min-[1400px]:justify-between">
          <Segmented
            ariaLabel="Filter by role"
            className="self-start min-[1400px]:self-auto"
            items={roleItems}
            value={role}
            onChange={(v) => updateParams({ role: v === 'all' ? null : v })}
          />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px] min-[1400px]:w-[520px]">
            <Field label="Search">
              {(id) => (
                <Input
                  id={id}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name, email, phone or title"
                  leftIcon={<Search className="size-4" aria-hidden />}
                  autoComplete="off"
                />
              )}
            </Field>
            <Field label="Status">
              {(id) => (
                <Select id={id} value={status} onChange={(e) => updateParams({ status: e.target.value === 'all' ? null : e.target.value })}>
                  <option value="all">All statuses</option>
                  {statusOrder.map((s) => (
                    <option key={s} value={s}>
                      {userStatusLabels[s].label} ({statusCounts[s]})
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Users className="size-6" aria-hidden />}
            title="No accounts match"
            description={users.length ? 'Try a different search, role or status.' : 'Create the first account to get started.'}
            action={
              users.length ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button onClick={openCreate}>Create account</Button>
              )
            }
          />
        ) : (
          <>
            {/* Wide screens: a table with no overflow wrapper, so the row menus are never clipped. */}
            <table className="hidden w-full border-collapse text-left text-sm xl:table">
              <caption className="sr-only">Accounts ({rows.length})</caption>
              <THead>
                <tr>
                  <TH>Account</TH>
                  <TH>Role</TH>
                  <TH className="hidden min-[1400px]:table-cell">Title</TH>
                  <TH className="text-right">Homes</TH>
                  <TH>Status</TH>
                  <TH className="whitespace-nowrap">Last sign-in</TH>
                  <TH className="w-14">
                    <span className="sr-only">Actions</span>
                  </TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((u) => {
                  const self = actions.isSelf(u)
                  return (
                    <TR
                      key={u.id}
                      interactive
                      onClick={() => openDetails(u.id)}
                      className={cn('transition-colors duration-700', highlightId === u.id && 'bg-emerald-50 hover:bg-emerald-50')}
                    >
                      <TD>
                        <div className="flex max-w-[300px] items-center gap-3">
                          <Avatar name={u.name} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openDetails(u.id)
                                }}
                                className="truncate rounded text-left font-semibold text-ink-900 hover:text-brand-800 hover:underline"
                              >
                                {u.name}
                              </button>
                              {self && <Badge tone="brand">You</Badge>}
                            </div>
                            <p className="truncate text-ink-500">{u.email}</p>
                            {u.title && <p className="truncate text-xs text-ink-500 min-[1400px]:hidden">{u.title}</p>}
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <RoleBadge role={u.role} />
                      </TD>
                      <TD className="hidden max-w-[220px] truncate min-[1400px]:table-cell">{u.title ?? <span className="text-ink-500">—</span>}</TD>
                      <TD className="text-right tabular-nums">
                        {u.role === 'homeowner' ? (
                          homesByOwner[u.id] ?? 0
                        ) : (
                          <span className="text-ink-500">
                            <span aria-hidden>—</span>
                            <span className="sr-only">Not applicable</span>
                          </span>
                        )}
                      </TD>
                      <TD>
                        <UserStatusBadge status={u.status} />
                      </TD>
                      <TD className="whitespace-nowrap">
                        {u.lastLoginAt ? (
                          <time dateTime={u.lastLoginAt} title={formatDateTime(u.lastLoginAt)}>
                            {formatRelative(u.lastLoginAt)}
                          </time>
                        ) : (
                          <span className="text-ink-500">Never</span>
                        )}
                      </TD>
                      <TD className="py-2 text-right">
                        <UserRowMenu user={u} actions={actions} onDetails={() => openDetails(u.id)} onEdit={() => openEdit(u)} />
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </table>

            {/* Below 1280px: a card list (the table would not fit beside the sidebar). */}
            <ul className="divide-y divide-ink-100 xl:hidden" aria-label={`Accounts (${rows.length})`}>
              {rows.map((u) => {
                const self = actions.isSelf(u)
                const meta = [
                  u.title,
                  u.role === 'homeowner' ? pluralize(homesByOwner[u.id] ?? 0, 'home') : null,
                  u.lastLoginAt ? `Signed in ${formatRelative(u.lastLoginAt)}` : 'Never signed in',
                ].filter(Boolean)
                return (
                  <li
                    key={u.id}
                    onClick={() => openDetails(u.id)}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 px-4 py-4 transition-colors duration-700 hover:bg-ink-25 sm:px-6 md:items-center',
                      highlightId === u.id && 'bg-emerald-50',
                    )}
                  >
                    <Avatar name={u.name} />
                    {/* Phones: stacked. Tablets and laptops: identity on the left, badges and meta on the right. */}
                    <div className="min-w-0 flex-1 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-x-6">
                      <div className="min-w-0 pt-0.5 md:pt-0">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDetails(u.id)
                            }}
                            className="truncate rounded text-left font-semibold text-ink-900 hover:text-brand-800"
                          >
                            {u.name}
                          </button>
                          {self && <Badge tone="brand">You</Badge>}
                        </div>
                        <p className="truncate text-sm text-ink-500">{u.email}</p>
                      </div>
                      <div className="md:text-right">
                        <div className="mt-2 flex flex-wrap gap-1.5 md:mt-0 md:justify-end">
                          <RoleBadge role={u.role} />
                          <UserStatusBadge status={u.status} />
                        </div>
                        <p className="mt-2 text-xs text-ink-500 md:mt-1.5">{meta.join(' · ')}</p>
                      </div>
                    </div>
                    <div className="-mt-1 -mr-2 shrink-0 md:mt-0">
                      <UserRowMenu user={u} actions={actions} onDetails={() => openDetails(u.id)} onEdit={() => openEdit(u)} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        <CardFooter className="justify-between text-sm text-ink-500">
          <p aria-live="polite">
            Showing {rows.length} of {pluralize(users.length, 'account')}
          </p>
          {filtersActive && rows.length > 0 && (
            <Button variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </CardFooter>
      </Card>

      <UserFormModal mode={formMode} onClose={closeForm} />
      <CredentialsDialog value={actions.credentials} onClose={actions.closeCredentials} />
      <DeleteAccountDialog request={actions.deleteRequest} onResolve={actions.resolveDelete} />
      <UserDrawer user={detailsUser} actions={actions} onClose={closeDetails} onEdit={(u) => openEdit(u, true)} onReopen={openDetails} />
    </>
  )
}
