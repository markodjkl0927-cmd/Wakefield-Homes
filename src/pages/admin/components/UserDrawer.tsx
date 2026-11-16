import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Ban, CalendarDays, FileSignature, Home as HomeIcon, KeyRound, MailPlus, Pencil, ScanEye, ShieldCheck, Trash2, UserCheck, Wrench, type LucideIcon } from 'lucide-react'
import type { User } from '@/types'
import { homeStatus, permissionLabels } from '@/data/labels'
import { formatDate, formatDateTime, formatPhone, formatRelative } from '@/lib/format'
import { toIsoDate } from '@/lib/utils'
import { cn } from '@/lib/cn'
import { accountFootprint, useAppStore } from '@/store'
import { Alert, Avatar, Badge, Button, Drawer, EmptyState, SmartImage, StatusBadge } from '@/components/ui'
import { deletePreview } from './accountImpact'
import { ActivityFeed } from './ActivityFeed'
import { DetailItem, RoleBadge, SubHeading, UserStatusBadge } from './bits'
import { byNewest, firstName, inlineActionClass, involves, workspacePermissions } from './meta'
import type { UserActions } from './useUserActions'

/** Right-hand details panel for one account: profile, homes, permissions, recent activity and actions. */
export function UserDrawer({
  user,
  actions,
  onClose,
  onEdit,
  onReopen,
}: {
  user: User | null
  actions: UserActions
  onClose: () => void
  onEdit: (user: User) => void
  /** Re-open the panel (used when a confirmation is cancelled). */
  onReopen: (userId: string) => void
}) {
  const self = user ? actions.isSelf(user) : false
  return (
    <Drawer
      open={!!user}
      onClose={onClose}
      width="lg"
      title={<span className="wrap-anywhere">{user?.name ?? ''}</span>}
      description={user?.title ? <span className="wrap-anywhere">{user.title}</span> : undefined}
      footer={
        user && (
          <>
            {!self && user.status !== 'disabled' && (
              <Button variant="secondary" leftIcon={<ScanEye className="size-4" aria-hidden />} onClick={() => actions.viewAs(user)}>
                View as {firstName(user.name)}
              </Button>
            )}
            <Button leftIcon={<Pencil className="size-4" aria-hidden />} onClick={() => onEdit(user)}>
              Edit account
            </Button>
          </>
        )
      }
    >
      {user && <UserDetails user={user} actions={actions} onClose={onClose} onEdit={onEdit} onReopen={onReopen} />}
    </Drawer>
  )
}

function UserDetails({
  user,
  actions,
  onClose,
  onEdit,
  onReopen,
}: {
  user: User
  actions: UserActions
  onClose: () => void
  onEdit: (user: User) => void
  onReopen: (userId: string) => void
}) {
  const homes = useAppStore((s) => s.homes)
  const agreements = useAppStore((s) => s.agreements)
  const requests = useAppStore((s) => s.requests)
  const appointments = useAppStore((s) => s.appointments)
  const leads = useAppStore((s) => s.leads)
  const activity = useAppStore((s) => s.activity)
  const staffPermissions = useAppStore((s) => s.settings.staffPermissions)

  const self = actions.isSelf(user)
  const isOwner = user.role === 'homeowner'
  const invited = user.status === 'invited'
  const first = firstName(user.name)

  const owned = useMemo(() => homes.filter((h) => h.ownerId === user.id), [homes, user.id])
  const ownerStats = useMemo(() => {
    if (user.role !== 'homeowner') return null
    const today = toIsoDate(new Date())
    const shared = agreements.filter((a) => a.homeownerId === user.id && a.status !== 'draft')
    return {
      agreements: shared.length,
      toSign: shared.filter((a) => a.status === 'awaiting-signature').length,
      openRequests: requests.filter((r) => r.homeownerId === user.id && r.status !== 'resolved' && r.status !== 'closed').length,
      upcoming: appointments.filter((a) => a.homeownerId === user.id && a.date >= today && ['requested', 'confirmed', 'rescheduled'].includes(a.status)).length,
    }
  }, [user.id, user.role, agreements, requests, appointments])
  /** What deleting the account would take with it, for the Delete row. */
  const deleteNote = useMemo(
    () => deletePreview(accountFootprint({ homes, appointments, requests, agreements, leads }, user.id)),
    [homes, appointments, requests, agreements, leads, user.id],
  )
  // Their own changes, plus anything a Super Admin did while viewing as them.
  const recent = useMemo(() => activity.filter((a) => involves(a, user.id)).sort(byNewest).slice(0, 6), [activity, user.id])
  const grantedWorkspace = useMemo(() => workspacePermissions.filter((p) => staffPermissions.includes(p)), [staffPermissions])

  const disableBlocked = user.status !== 'disabled' ? actions.disableBlocked(user) : null
  const deleteBlocked = actions.deleteBlocked(user)

  const resetPassword = () => {
    onClose()
    void actions.reset(user)
  }
  const resendInvite = () => {
    onClose()
    actions.resendInvite(user)
  }
  const remove = async () => {
    onClose()
    const removed = await actions.remove(user)
    if (!removed) onReopen(user.id)
  }

  return (
    <div className="space-y-8 px-5 py-6">
      <div className="flex items-center gap-4">
        <Avatar name={user.name} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <RoleBadge role={user.role} size="md" />
            <UserStatusBadge status={user.status} size="md" />
            {self && (
              <Badge tone="brand" size="md">
                You
              </Badge>
            )}
          </div>
          <p className="mt-1.5 truncate text-sm text-ink-500">{user.email}</p>
        </div>
      </div>

      {invited && (
        <Alert tone="warning" title="Invitation pending">
          {first} hasn’t signed in yet. The account becomes Active after their first sign-in. If they lost the details, use Resend invitation below.
        </Alert>
      )}
      {user.status === 'disabled' && (
        <Alert
          tone="warning"
          title="Account disabled"
          action={
            <Button variant="secondary" onClick={() => actions.toggleStatus(user)}>
              Activate
            </Button>
          }
        >
          {first} can’t sign in until you activate the account.
        </Alert>
      )}

      <section>
        <SubHeading>Contact and account</SubHeading>
        <dl className="grid gap-x-6 gap-y-4 rounded-xl bg-ink-25 p-4 ring-1 ring-ink-200/70 ring-inset sm:grid-cols-2">
          <DetailItem label="Email">
            <a href={`mailto:${user.email}`} className="font-medium text-brand-800 hover:underline">
              {user.email}
            </a>
          </DetailItem>
          <DetailItem label="Phone">
            {user.phone ? (
              <a href={`tel:${user.phone}`} className="font-medium text-brand-800 hover:underline">
                {formatPhone(user.phone)}
              </a>
            ) : (
              <span className="text-ink-500">Not provided</span>
            )}
          </DetailItem>
          {isOwner ? (
            <DetailItem label="Mailing address" className="sm:col-span-2">
              {user.address || <span className="text-ink-500">Not provided</span>}
            </DetailItem>
          ) : (
            <DetailItem label="Job title" className="sm:col-span-2">
              {user.title || <span className="text-ink-500">Not set</span>}
            </DetailItem>
          )}
          <DetailItem label="Member since">{formatDate(user.createdAt)}</DetailItem>
          <DetailItem label="Last sign-in">
            {user.lastLoginAt ? (
              <>
                {formatRelative(user.lastLoginAt)}
                <span className="block text-xs text-ink-500">{formatDateTime(user.lastLoginAt)}</span>
              </>
            ) : (
              'Never'
            )}
          </DetailItem>
        </dl>
      </section>

      {isOwner && ownerStats && (
        <>
          <section>
            <SubHeading
              action={
                <button type="button" className={inlineActionClass} onClick={() => onEdit(user)}>
                  {owned.length ? 'Manage homes' : 'Assign homes'}
                </button>
              }
            >
              Homes ({owned.length})
            </SubHeading>
            {owned.length ? (
              <ul className="space-y-2">
                {owned.map((h) => (
                  <li key={h.id}>
                    <Link
                      to={`/staff/homes/${h.id}`}
                      className="flex items-center gap-3 rounded-xl p-2 pr-3 ring-1 ring-ink-200/70 ring-inset transition-colors hover:bg-ink-25 hover:ring-brand-200"
                    >
                      <SmartImage src={h.images[0]} alt="" className="size-14 shrink-0 rounded-lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink-900">{h.title}</span>
                        <span className="block truncate text-sm text-ink-500">{h.address}</span>
                      </span>
                      <StatusBadge def={homeStatus[h.status]} className="hidden sm:inline-flex" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                className="rounded-xl ring-1 ring-ink-200/70 ring-inset"
                icon={<HomeIcon className="size-6" aria-hidden />}
                title="No homes yet"
                description={`Assign a home and it appears in ${first}’s portal under My Homes.`}
              />
            )}
          </section>

          <section>
            <SubHeading>Portal at a glance</SubHeading>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MiniStat icon={FileSignature} label="Agreements" value={ownerStats.agreements} note={ownerStats.toSign ? `${ownerStats.toSign} to sign` : 'None to sign'} />
              <MiniStat icon={Wrench} label="Open requests" value={ownerStats.openRequests} note="Maintenance" />
              <MiniStat icon={CalendarDays} label="Upcoming visits" value={ownerStats.upcoming} note="Appointments" />
            </dl>
          </section>
        </>
      )}

      {user.role === 'staff' && (
        <section>
          <SubHeading
            action={
              <Link to="/admin/roles" className={inlineActionClass}>
                Edit permissions
              </Link>
            }
          >
            Permissions
          </SubHeading>
          <p className="text-sm text-ink-600">
            Uses the Staff role: {grantedWorkspace.length} of {workspacePermissions.length} workspace permissions.
          </p>
          {grantedWorkspace.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {grantedWorkspace.map((p) => (
                <li key={p}>
                  <Badge tone="neutral">{permissionLabels[p].label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {user.role === 'admin' && (
        <section>
          <SubHeading>Permissions</SubHeading>
          <p className="flex items-start gap-2 text-sm text-ink-600">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
            Super Admins always have every permission, including accounts, roles and platform settings.
          </p>
        </section>
      )}

      <section>
        <SubHeading
          action={
            recent.length > 0 && (
              <Link to={`/admin/activity?actor=${encodeURIComponent(user.id)}`} className={inlineActionClass}>
                View all
              </Link>
            )
          }
        >
          Recent activity
        </SubHeading>
        <ActivityFeed entries={recent} emptyTitle="No activity yet" emptyDescription={`${first}’s sign-ins and changes will show up here.`} />
      </section>

      <section>
        <SubHeading>Account actions</SubHeading>
        <ul className="divide-y divide-ink-100 rounded-xl ring-1 ring-ink-200/70 ring-inset">
          {invited ? (
            <ActionRow
              icon={MailPlus}
              title="Resend invitation"
              description="Issues a new temporary password and shows the invitation to pass on. This demo sends no email."
              action={
                <Button variant="secondary" onClick={resendInvite}>
                  Resend
                </Button>
              }
            />
          ) : (
            <ActionRow
              icon={KeyRound}
              title="Reset password"
              description="Their current password stops working. You’ll get a temporary one to share."
              action={
                <Button variant="secondary" onClick={resetPassword}>
                  Reset
                </Button>
              }
            />
          )}
          <ActionRow
            icon={user.status === 'disabled' ? UserCheck : Ban}
            title={user.status === 'disabled' ? 'Activate account' : 'Disable account'}
            description={
              disableBlocked
                ? disableBlocked.title
                : user.status === 'disabled'
                  ? user.lastLoginAt
                    ? `${first} can sign in again.`
                    : `${first} can sign in again. It shows as Invited until their first sign-in.`
                  : 'They can’t sign in until you activate it again. Nothing is removed.'
            }
            action={
              <Button variant="secondary" disabled={!!disableBlocked} onClick={() => actions.toggleStatus(user)}>
                {user.status === 'disabled' ? 'Activate' : 'Disable'}
              </Button>
            }
          />
          <ActionRow
            icon={Trash2}
            danger
            title="Delete account"
            description={deleteBlocked ? deleteBlocked.title : deleteNote}
            action={
              <Button variant="danger" disabled={!!deleteBlocked} onClick={() => void remove()}>
                Delete
              </Button>
            }
          />
        </ul>
      </section>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: number; note: string }) {
  return (
    <div className="rounded-xl bg-white p-3.5 ring-1 ring-ink-200/70 ring-inset">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1.5 text-2xl font-semibold text-ink-900 tabular-nums">{value}</dd>
      <dd className="text-xs text-ink-500">{note}</dd>
    </div>
  )
}

function ActionRow({ icon: Icon, title, description, action, danger }: { icon: LucideIcon; title: string; description: ReactNode; action: ReactNode; danger?: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5">
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', danger ? 'bg-rose-50 text-rose-700' : 'bg-ink-100 text-ink-600')}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        <p className="text-sm text-ink-500">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </li>
  )
}
