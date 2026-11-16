import { useId, useMemo } from 'react'
import { Link } from 'react-router'
import { ArrowRight, CalendarDays, FileSignature, Home, Info, Lock, RotateCcw, Wrench, type LucideIcon } from 'lucide-react'
import type { Permission, Role } from '@/types'
import { permissionLabels, roleLabels } from '@/data/labels'
import { createSeed } from '@/data/seed'
import { pluralize } from '@/lib/format'
import { useDocumentTitle } from '@/lib/utils'
import { cn } from '@/lib/cn'
import { useAppStore } from '@/store'
import { toast } from '@/store/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { Alert, Button, Card, CardBody, CardHeader, Switch } from '@/components/ui'
import { Tooltip } from './components/bits'
import { adminOnlyPermissions, inlineActionClass, roleMeta, roleOrder, workspacePermissions } from './components/meta'

const ADMIN_TOOLTIP = 'Super Admins always have every permission'

const ownerCapabilities: { label: string; description: string; icon: LucideIcon }[] = [
  { label: 'My Agreements', description: 'Read agreements shared and updated by staff, and sign them online.', icon: FileSignature },
  { label: 'My Homes', description: 'Their homes, construction progress, photos and the 3D view.', icon: Home },
  { label: 'Appointments', description: 'Book time with the Wakefield office and follow the status.', icon: CalendarDays },
  { label: 'Maintenance', description: 'Ask for gardening, road fixing or a house fix, or make a report.', icon: Wrench },
]

const groups: { title: string; description: string; permissions: Permission[]; adminOnly?: boolean }[] = [
  { title: 'Staff workspace', description: 'Day-to-day work with Home Owners, homes and leads.', permissions: workspacePermissions },
  { title: 'Super Admin area', description: 'Reserved for Super Admins.', permissions: adminOnlyPermissions, adminOnly: true },
]

/**
 * "Edit homes" and "Manage 3D viewing" both open Homes & 3D, and each works on its own.
 * Says what Staff get with the current combination (under "Manage 3D viewing", and in the toast).
 */
function homesAccessNote(granted: Set<Permission>): string {
  const edit = granted.has('homes.edit')
  const view3d = granted.has('homes.3d')
  if (edit && view3d) return 'Homes & 3D: Staff can edit homes and their 3D settings.'
  if (view3d) return 'Homes & 3D: Staff can manage 3D viewing only. Other home details are read-only.'
  if (edit) return 'Homes & 3D: Staff can edit homes. The 3D settings are locked.'
  return 'Homes & 3D is hidden from Staff while both permissions are off.'
}

export default function AdminRoles() {
  useDocumentTitle('Roles & permissions')
  const users = useAppStore((s) => s.users)
  const staffPermissions = useAppStore((s) => s.settings.staffPermissions)
  const setStaffPermission = useAppStore((s) => s.setStaffPermission)
  const updateSettings = useAppStore((s) => s.updateSettings)

  const granted = useMemo(() => new Set(staffPermissions), [staffPermissions])
  const defaults = useMemo(() => createSeed().settings.staffPermissions, [])
  const isDefault = useMemo(() => defaults.length === staffPermissions.length && defaults.every((p) => granted.has(p)), [defaults, staffPermissions, granted])
  const roleCounts = useMemo(() => {
    const c: Record<Role, number> = { homeowner: 0, staff: 0, admin: 0 }
    for (const u of users) c[u.role] += 1
    return c
  }, [users])
  const staffGranted = workspacePermissions.filter((p) => granted.has(p)).length

  const toggle = (p: Permission, on: boolean) => {
    setStaffPermission(p, on)
    // The two Homes & 3D permissions combine: say what Staff can do now.
    const next = new Set(granted)
    if (on) next.add(p)
    else next.delete(p)
    const detail = p === 'homes.edit' || p === 'homes.3d' ? homesAccessNote(next) : 'Staff see the change right away.'
    toast.success(on ? 'Permission granted to Staff' : 'Permission removed from Staff', `${permissionLabels[p].label}. ${detail}`)
  }

  const restoreDefaults = () => {
    updateSettings({ staffPermissions: [...defaults] })
    toast.success('Staff permissions restored', 'Back to the default set.')
  }

  const roleSummary: Record<Role, string> = {
    homeowner: 'Fixed Home Owner portal',
    staff: `${staffGranted} of ${workspacePermissions.length} permissions on`,
    admin: 'Every permission, always',
  }

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="Super Admins can do everything. Choose what Staff can do, and see what Home Owners get in their portal."
      />

      <section aria-labelledby="roles-heading">
        <h2 id="roles-heading" className="sr-only">
          Roles
        </h2>
        <ul className="grid gap-3 md:grid-cols-3 md:gap-4">
          {roleOrder.map((r) => {
            const meta = roleMeta[r]
            return (
              <li key={r}>
                <Card className="flex h-full items-start gap-4 p-4 sm:p-5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800 ring-1 ring-brand-100" aria-hidden>
                    <meta.icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-ink-900">{roleLabels[r]}</h3>
                    <p className="text-sm text-ink-500">{roleSummary[r]}</p>
                    <Link
                      to={`/admin/users?role=${r}`}
                      className={cn(inlineActionClass, '-mb-2 mr-0 -ml-2.5')}
                      aria-label={`View ${pluralize(roleCounts[r], 'account')} with the ${roleLabels[r]} role`}
                    >
                      {pluralize(roleCounts[r], 'account')}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      </section>

      <Card className="mt-6">
        <CardHeader
          icon={<Home className="size-[18px]" aria-hidden />}
          title="What Home Owners can do"
          description="Every Home Owner gets the same four areas, limited to their own homes and documents. There is nothing to switch."
        />
        <CardBody>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {ownerCapabilities.map((c) => (
              <li key={c.label} className="flex gap-3 rounded-xl bg-ink-25 p-4 ring-1 ring-ink-200/70 ring-inset sm:block">
                <c.icon className="mt-0.5 size-5 shrink-0 text-brand-700 sm:mt-0" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900 sm:mt-2">{c.label}</p>
                  <p className="mt-0.5 text-sm text-ink-500 sm:mt-1">{c.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Permission matrix"
          description="Turn Staff permissions on or off. Super Admins keep every permission."
          action={
            <Button variant="secondary" onClick={restoreDefaults} disabled={isDefault} leftIcon={<RotateCcw className="size-4" aria-hidden />}>
              <span className="hidden sm:inline">Restore defaults</span>
              <span className="sm:hidden">Defaults</span>
            </Button>
          }
        />
        <div className="px-5 pt-5 sm:px-6">
          <Alert tone="info">Changes apply immediately: the Staff sidebar and pages update as soon as you switch a permission.</Alert>
        </div>

        {/* md and up: the matrix as a table */}
        <div className="hidden px-5 py-5 sm:px-6 md:block">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Permissions by role</caption>
            <thead>
              <tr className="border-b border-ink-200">
                <th scope="col" className="py-3 pr-4 text-xs font-semibold tracking-wide text-ink-500 uppercase">
                  Permission
                </th>
                <th scope="col" className="w-28 px-3 py-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap text-ink-500 uppercase">
                  {roleLabels.homeowner}
                </th>
                <th scope="col" className="w-40 px-3 py-3 text-center text-xs font-semibold tracking-wide text-ink-500 uppercase">
                  {roleLabels.staff}
                </th>
                <th scope="col" className="w-40 py-3 pl-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap text-ink-500 uppercase">
                  <span className="inline-flex items-center gap-1">
                    {roleLabels.admin}
                    <Tooltip content={ADMIN_TOOLTIP} align="end">
                      {(tid) => (
                        <button type="button" aria-describedby={tid} aria-label="About Super Admin permissions" className="-my-3 inline-flex size-10 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-800">
                          <Info className="size-4" aria-hidden />
                        </button>
                      )}
                    </Tooltip>
                  </span>
                </th>
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.title} className="divide-y divide-ink-100">
                <tr>
                  <th scope="colgroup" colSpan={4} className="bg-ink-25 px-3 py-2.5 text-left">
                    <span className="text-xs font-semibold tracking-wide text-ink-700 uppercase">{g.title}</span>
                    <span className="ml-2 text-xs font-normal text-ink-500">{g.description}</span>
                  </th>
                </tr>
                {g.permissions.map((p) => (
                  <MatrixRow key={p} permission={p} adminOnly={!!g.adminOnly} granted={granted.has(p)} onToggle={toggle} note={p === 'homes.3d' ? homesAccessNote(granted) : undefined} />
                ))}
              </tbody>
            ))}
          </table>
        </div>

        {/* Phones: a Staff permission list; the fixed Super Admin / Home Owner columns are explained once. */}
        <div className="space-y-6 px-4 py-5 md:hidden">
          <p className="flex items-start gap-2 text-sm text-ink-600">
            <Lock className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
            <span>{ADMIN_TOOLTIP}. Home Owners only use their own portal, so these don’t apply to them.</span>
          </p>
          {groups.map((g) => (
            <section key={g.title} aria-label={g.title}>
              <h3 className="text-xs font-semibold tracking-wide text-ink-700 uppercase">{g.title}</h3>
              <p className="text-xs text-ink-500">{g.description}</p>
              <ul className="mt-3 divide-y divide-ink-100 rounded-xl ring-1 ring-ink-200/70 ring-inset">
                {g.permissions.map((p) => (
                  <MobilePermission key={p} permission={p} adminOnly={!!g.adminOnly} granted={granted.has(p)} onToggle={toggle} note={p === 'homes.3d' ? homesAccessNote(granted) : undefined} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Card>
    </>
  )
}

function LockedGranted() {
  return (
    <span
      title={ADMIN_TOOLTIP}
      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 ring-inset"
    >
      <Lock className="size-3" aria-hidden />
      Always
      <span className="sr-only">granted. {ADMIN_TOOLTIP}.</span>
    </span>
  )
}

function SuperAdminOnly({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap text-ink-500', className)} title="Only Super Admins can open this area">
      <Lock className="size-3.5" aria-hidden />
      Super Admin only
    </span>
  )
}

function NotAvailable() {
  return (
    <span className="text-ink-500">
      <span aria-hidden>—</span>
      <span className="sr-only">Not available</span>
    </span>
  )
}

interface PermissionRowProps {
  permission: Permission
  adminOnly: boolean
  granted: boolean
  onToggle: (p: Permission, on: boolean) => void
  /** How this permission combines with another one (e.g. "Manage 3D viewing" with "Edit homes"). */
  note?: string
}

/** Small info line under a permission's description. */
function PermissionNote({ id, children }: { id?: string; children: string }) {
  return (
    <span id={id} className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-600">
      <Info className="mt-px size-3.5 shrink-0 text-brand-700" aria-hidden />
      <span>{children}</span>
    </span>
  )
}

function MatrixRow({ permission, adminOnly, granted, onToggle, note }: PermissionRowProps) {
  const id = useId()
  const meta = permissionLabels[permission]
  return (
    <tr className="transition-colors hover:bg-ink-25/80">
      <th scope="row" className="py-3.5 pr-4 text-left font-normal">
        <span className="block font-medium text-ink-900">{meta.label}</span>
        <span className="block text-ink-500">{meta.description}</span>
        {note && <PermissionNote id={`${id}-note`}>{note}</PermissionNote>}
      </th>
      <td className="px-3 py-3.5 text-center">
        <NotAvailable />
      </td>
      <td className="px-3 py-3.5 text-center">
        {adminOnly ? (
          <SuperAdminOnly />
        ) : (
          <span className="inline-flex">
            <label htmlFor={id} className="sr-only">
              Staff: {meta.label}
              {note ? `. ${note}` : ''}
            </label>
            <Switch id={id} checked={granted} onChange={(on) => onToggle(permission, on)} />
          </span>
        )}
      </td>
      <td className="py-3.5 pl-3 text-center">
        <LockedGranted />
      </td>
    </tr>
  )
}

function MobilePermission({ permission, adminOnly, granted, onToggle, note }: PermissionRowProps) {
  const meta = permissionLabels[permission]
  if (adminOnly) {
    return (
      <li className="flex items-start justify-between gap-4 px-4 py-4">
        <div className="min-w-0 text-sm">
          <p className="font-medium text-ink-800">{meta.label}</p>
          <p className="mt-0.5 text-ink-500">{meta.description}</p>
        </div>
        <SuperAdminOnly className="mt-0.5" />
      </li>
    )
  }
  return (
    <li className="px-4 py-4">
      <Switch
        checked={granted}
        onChange={(on) => onToggle(permission, on)}
        label={
          <>
            <span className="sr-only">Staff: </span>
            {meta.label}
          </>
        }
        description={
          note ? (
            <>
              {meta.description}
              <PermissionNote>{note}</PermissionNote>
            </>
          ) : (
            meta.description
          )
        }
      />
    </li>
  )
}
