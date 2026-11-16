import { useMemo } from 'react'
import { Link } from 'react-router'
import { Box, BriefcaseBusiness, CalendarClock, ChevronRight, History, Home, Inbox, KeyRound, MailPlus, Settings, UserPlus, Users, Wrench, type LucideIcon } from 'lucide-react'
import type { RequestCategory } from '@/types'
import { requestCategories } from '@/data/labels'
import { formatDayLabel, pluralize } from '@/lib/format'
import { toIsoDate, useDocumentTitle } from '@/lib/utils'
import { useAppStore } from '@/store'
import { toast } from '@/store/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { ButtonLink, Card, CardBody, CardHeader, Donut, StatCard, Switch } from '@/components/ui'
import { ActivityFeed } from './components/ActivityFeed'
import { byNewest, featureMeta, featureOrder, inlineActionClass, roleMeta, roleOrder, userStatusLabels, type FeatureKey } from './components/meta'

/** The client's four request types, in the order used across the portals (ties keep this order). */
const categoryOrder: RequestCategory[] = ['gardening', 'road-fixing', 'report', 'house-fix']
const OPEN_STATUSES = ['submitted', 'assigned', 'scheduled', 'in-progress']

const quickActions: { to: string; label: string; description: string; icon: LucideIcon }[] = [
  { to: '/admin/users?new=1', label: 'Create account', description: 'Add a Home Owner, staff member or Super Admin.', icon: UserPlus },
  { to: '/admin/roles', label: 'Roles & permissions', description: 'Choose what Staff can see and do.', icon: KeyRound },
  { to: '/admin/settings', label: 'Platform settings', description: 'Features, request types, booking hours and office details.', icon: Settings },
  { to: '/admin/activity', label: 'Activity log', description: 'Every sign-in and change, with CSV export.', icon: History },
]

export default function AdminOverview() {
  useDocumentTitle('Admin overview')
  const users = useAppStore((s) => s.users)
  const homes = useAppStore((s) => s.homes)
  const requests = useAppStore((s) => s.requests)
  const appointments = useAppStore((s) => s.appointments)
  const leads = useAppStore((s) => s.leads)
  const activity = useAppStore((s) => s.activity)
  const features = useAppStore((s) => s.settings.features)
  const enabledCategories = useAppStore((s) => s.settings.categories)
  const setFeature = useAppStore((s) => s.setFeature)

  const accounts = useMemo(() => {
    const byRole = { homeowner: 0, staff: 0, admin: 0 }
    const byStatus = { active: 0, invited: 0, disabled: 0 }
    for (const u of users) {
      byRole[u.role] += 1
      byStatus[u.status] += 1
    }
    const ownerIds = new Set(homes.map((h) => h.ownerId).filter(Boolean))
    const ownersWithHomes = users.filter((u) => u.role === 'homeowner' && ownerIds.has(u.id)).length
    return { byRole, byStatus, ownersWithHomes }
  }, [users, homes])

  const work = useMemo(() => {
    const today = toIsoDate(new Date())
    const open = requests.filter((r) => r.status !== 'resolved' && r.status !== 'closed')
    const awaiting = appointments.filter((a) => a.status === 'requested').sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    const nextAwaiting = awaiting.find((a) => a.date >= today)
    return {
      open: open.length,
      unassigned: open.filter((r) => r.status === 'submitted').length,
      urgent: open.filter((r) => r.priority === 'urgent').length,
      awaiting: awaiting.length,
      nextAwaiting,
      newLeads: leads.filter((l) => l.status === 'new').length,
      with3d: homes.filter((h) => h.view3d.enabled).length,
    }
  }, [requests, appointments, leads, homes])

  // Ranked largest first (ties keep the usual category order), with the client's own names ("Make a report").
  const requestsByCategory = useMemo(
    () =>
      categoryOrder
        .map((c) => {
          const mine = requests.filter((r) => r.category === c)
          return { key: c, value: mine.length, open: mine.filter((r) => OPEN_STATUSES.includes(r.status)).length }
        })
        .sort((a, b) => b.value - a.value),
    [requests],
  )
  const recent = useMemo(() => [...activity].sort(byNewest).slice(0, 8), [activity])

  const roleData = roleOrder.map((r) => ({ label: roleMeta[r].plural, value: accounts.byRole[r], color: roleMeta[r].color }))

  const toggleFeature = (key: FeatureKey, value: boolean) => {
    setFeature(key, value)
    toast.success(`${featureMeta[key].label} ${value ? 'turned on' : 'turned off'}`, value ? 'It’s live for everyone right away.' : featureMeta[key].whenOff)
  }

  return (
    <>
      <PageHeader
        title="Admin overview"
        description="Platform health at a glance: accounts, open work, features and the latest activity."
        actions={
          <ButtonLink to="/admin/users?new=1" leftIcon={<UserPlus className="size-4" aria-hidden />}>
            Create account
          </ButtonLink>
        }
      />

      <section aria-labelledby="overview-stats">
        <h2 id="overview-stats" className="sr-only">
          Key numbers
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Total accounts"
            value={users.length}
            icon={<Users aria-hidden />}
            to="/admin/users"
            hint={[
              `${accounts.byStatus.active} active`,
              accounts.byStatus.invited ? `${accounts.byStatus.invited} invited` : '',
              accounts.byStatus.disabled ? `${accounts.byStatus.disabled} disabled` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          />
          <StatCard
            label="Home Owners"
            value={accounts.byRole.homeowner}
            icon={<Home aria-hidden />}
            to="/admin/users?role=homeowner"
            hint={`${accounts.ownersWithHomes} with homes`}
          />
          <StatCard
            label="Staff"
            value={accounts.byRole.staff}
            icon={<BriefcaseBusiness aria-hidden />}
            tone="lavender"
            to="/admin/users?role=staff"
            hint={`Plus ${pluralize(accounts.byRole.admin, 'Super Admin')}`}
          />
          <StatCard
            label="Pending invites"
            value={accounts.byStatus.invited}
            icon={<MailPlus aria-hidden />}
            tone="amber"
            to="/admin/users?status=invited"
            hint={accounts.byStatus.invited ? 'Not signed in yet' : 'Everyone has signed in'}
          />
          <StatCard
            label="Open requests"
            value={work.open}
            icon={<Wrench aria-hidden />}
            to="/staff/requests"
            hint={work.unassigned ? `${work.unassigned} not assigned yet` : 'All assigned'}
          />
          <StatCard
            label="Bookings to confirm"
            value={work.awaiting}
            icon={<CalendarClock aria-hidden />}
            tone="amber"
            to="/staff/appointments"
            hint={work.nextAwaiting ? `Earliest ${formatDayLabel(work.nextAwaiting.date)}` : 'Nothing waiting'}
          />
          <StatCard label="New leads" value={work.newLeads} icon={<Inbox aria-hidden />} tone="emerald" to="/staff/leads" hint={`${pluralize(leads.length, 'inquiry', 'inquiries')} in total`} />
          <StatCard
            label="Homes with 3D on"
            value={work.with3d}
            icon={<Box aria-hidden />}
            tone="lavender"
            to="/staff/homes"
            hint={features.view3d ? `of ${pluralize(homes.length, 'home')}` : '3D viewer is switched off'}
          />
        </div>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card className="min-w-0">
          <CardHeader title="Accounts by role" description="Who has access, and account status." />
          <CardBody>
            <Donut data={roleData} centerValue={String(users.length)} centerLabel="accounts" size={148} thickness={20} className="sm:flex-col" />
            <ul className="mt-5 grid grid-cols-3 gap-2 border-t border-ink-100 pt-4" aria-label="Accounts by status">
              {(['active', 'invited', 'disabled'] as const).map((st) => (
                <li key={st}>
                  <Link
                    to={`/admin/users?status=${st}`}
                    className="flex flex-col items-center rounded-xl bg-ink-25 px-2 py-2 ring-1 ring-ink-200/70 transition-colors ring-inset hover:bg-brand-50/60 hover:ring-brand-200"
                  >
                    <span className="text-lg font-semibold text-ink-900 tabular-nums">{accounts.byStatus[st]}</span>
                    <span className="text-xs text-ink-600">{userStatusLabels[st].label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title="Requests by category"
            description={`${pluralize(requests.length, 'request')} in total · ${work.open} open${work.urgent ? ` · ${work.urgent} urgent` : ''}`}
          />
          <CardBody>
            <CategoryBars rows={requestsByCategory} total={requests.length} enabled={enabledCategories} />
            <p className="mt-5 text-xs text-ink-500">
              Request types Home Owners can choose are set in{' '}
              <Link to={{ pathname: '/admin/settings', hash: '#request-types' }} className="font-medium text-brand-800 hover:underline">
                Platform settings
              </Link>
              .
            </p>
          </CardBody>
        </Card>

        <Card className="min-w-0 md:col-span-2 xl:col-span-1">
          <CardHeader title="Quick actions" description="Common Super Admin tasks." />
          <ul className="p-2">
            {quickActions.map((a) => (
              <li key={a.to}>
                <Link to={a.to} className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-brand-50/60">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800 ring-1 ring-brand-100 transition-colors group-hover:bg-white">
                    <a.icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink-900">{a.label}</span>
                    <span className="block text-sm text-ink-500">{a.description}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2">
          <CardHeader
            title="Recent activity"
            description="The latest sign-ins and changes across the platform."
            action={
              <Link to="/admin/activity" className={inlineActionClass}>
                View all
              </Link>
            }
          />
          <CardBody>
            <ActivityFeed entries={recent} />
          </CardBody>
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title="Feature switches"
            description="Changes apply immediately."
            action={
              <Link to="/admin/settings" className={inlineActionClass}>
                All settings
              </Link>
            }
          />
          <ul className="divide-y divide-ink-100">
            {featureOrder.map((key) => {
              const meta = featureMeta[key]
              return (
                <li key={key} className="flex items-start gap-3 px-5 py-4 sm:px-6">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-600" aria-hidden>
                    <meta.icon className="size-4" />
                  </span>
                  <Switch className="min-w-0 flex-1" checked={features[key]} onChange={(v) => toggleFeature(key, v)} label={meta.label} description={meta.short} />
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
    </>
  )
}

/**
 * Requests per category as a ranked bar list: the full category names never truncate (unlike a column
 * chart's axis), each bar is that category's share of all requests, and the figures are printed beside it.
 */
function CategoryBars({
  rows,
  total,
  enabled,
}: {
  rows: { key: RequestCategory; value: number; open: number }[]
  total: number
  enabled: Record<RequestCategory, boolean>
}) {
  return (
    <ul className="space-y-4">
      {rows.map((r) => {
        const c = requestCategories[r.key]
        const share = total ? r.value / total : 0
        return (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-ink-800">
                <c.icon className="size-4 shrink-0 self-center text-ink-500" aria-hidden />
                <span className="min-w-0 truncate font-medium">{c.label}</span>
                {!enabled[r.key] && <span className="shrink-0 text-xs text-ink-500">· turned off</span>}
              </span>
              <span className="shrink-0 text-ink-500">
                <span className="font-semibold text-ink-900 tabular-nums">{r.value}</span>
                <span className="sr-only"> {r.value === 1 ? 'request' : 'requests'}</span>
                {r.open > 0 && <span className="ml-1.5 text-xs">{r.open} open</span>}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-50 ring-1 ring-brand-100 ring-inset" aria-hidden>
              {r.value > 0 && <div className="h-full rounded-full bg-brand-700 transition-[width] duration-700" style={{ width: `${Math.max(share * 100, 3)}%` }} />}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
