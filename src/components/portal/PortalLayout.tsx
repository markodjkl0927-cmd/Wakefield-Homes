import { Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Bell, CheckCheck, ExternalLink, Eye, LogOut, Menu, RotateCcw, Shuffle, Undo2, UserCircle, X } from 'lucide-react'
import type { Role, User } from '@/types'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/format'
import { roleLabels } from '@/data/labels'
import { demoAccounts } from '@/data/seed'
import { useAppStore } from '@/store'
import { useCurrentUser, useImpersonator, useMyNotifications, usePermissions } from '@/store/hooks'
import { confirmDialog, toast } from '@/store/ui'
import { Avatar, Badge, Drawer, MenuDivider, MenuItem, Popover } from '@/components/ui'
import { Wordmark } from '@/components/site/Wordmark'
import { portalHomeFor } from '@/components/site/SiteHeader'
import { SIGN_OUT_STATE } from '@/components/site/SiteLayout'
import { PageLoader } from '@/components/PageLoader'
import { canOpenPortalPath, hasNavPermission, ownerNav, staffNav, type BadgeKey, type PortalNavGroup } from './navConfig'

/** Sidebar counts mean "needs your attention", so each one clears once it has been dealt with. */
function useBadgeCounts(): Record<BadgeKey, number> {
  const user = useCurrentUser()
  const agreements = useAppStore((s) => s.agreements)
  const requests = useAppStore((s) => s.requests)
  const appointments = useAppStore((s) => s.appointments)
  const leads = useAppStore((s) => s.leads)
  const users = useAppStore((s) => s.users)
  const mine = useMyNotifications()
  return useMemo(() => {
    const uid = user?.id
    // Pages with an unread update for this user (a staff reply, a status change…).
    const unreadPages = new Set(mine.filter((n) => uid && n.link && !n.readBy.includes(uid)).map((n) => n.link!.split(/[?#]/)[0]))
    return {
      ownerAgreements: agreements.filter((a) => a.homeownerId === uid && a.status !== 'draft' && (!a.seenByOwner || a.status === 'awaiting-signature')).length,
      // Requests with news the owner hasn't opened yet, or a fix waiting for them to confirm.
      ownerRequests: requests.filter((r) => r.homeownerId === uid && (r.status === 'resolved' || unreadPages.has(`/owner/maintenance/${r.id}`))).length,
      // Only bookings still waiting on the office (office reschedules are confirmed straight away).
      ownerAppointments: appointments.filter((a) => a.homeownerId === uid && a.status === 'requested').length,
      staffBookings: appointments.filter((a) => a.status === 'requested').length,
      staffRequests: requests.filter((r) => r.status === 'submitted').length,
      staffLeads: leads.filter((l) => l.status === 'new').length,
      invitedUsers: users.filter((u) => u.status === 'invited').length,
    }
  }, [user, agreements, requests, appointments, leads, users, mine])
}

function SidebarNav({ groups, onNavigate, autoFocusCurrent }: { groups: PortalNavGroup[]; onNavigate?: () => void; autoFocusCurrent?: boolean }) {
  const user = useCurrentUser()
  const perms = usePermissions()
  const counts = useBadgeCounts()
  const { pathname } = useLocation()
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Portal">
      {groups
        .filter((g) => !g.adminOnly || user?.role === 'admin')
        .map((g, gi) => {
          const items = g.items.filter((i) => hasNavPermission(perms, i.permission))
          if (!items.length) return null
          return (
            <div key={g.title ?? gi}>
              {g.title && <p className="px-3 pb-2 text-[11px] font-semibold tracking-[0.14em] text-brand-200 uppercase">{g.title}</p>}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const count = item.badge ? counts[item.badge] : 0
                  const current = item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onNavigate}
                        data-autofocus={autoFocusCurrent && current ? '' : undefined}
                        className={({ isActive }) =>
                          cn(
                            'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-offset-0 focus-visible:outline-white',
                            isActive ? 'bg-white/14 text-white shadow-[inset_3px_0_0_var(--color-lavender-400)]' : 'text-brand-100 hover:bg-white/8 hover:text-white',
                          )
                        }
                      >
                        <item.icon className="size-[18px] shrink-0 opacity-90" aria-hidden />
                        <span className="flex-1 truncate">{item.label}</span>
                        {count > 0 && (
                          <span className="min-w-5 rounded-full bg-lavender-400 px-1.5 py-0.5 text-center text-[11px] font-semibold text-brand-950 tabular-nums">
                            {count}
                            <span className="sr-only"> pending</span>
                          </span>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
    </nav>
  )
}

function Sidebar({ area, onNavigate, onClose }: { area: 'owner' | 'staff'; onNavigate?: () => void; onClose?: () => void }) {
  const user = useCurrentUser()
  const groups = area === 'owner' ? ownerNav : staffNav
  const label = area === 'owner' ? 'Home Owner Portal' : user?.role === 'admin' ? 'Super Admin' : 'Staff Workspace'
  return (
    <div className="flex h-full flex-col bg-brand-900 text-white">
      <div className="flex items-start justify-between gap-3 px-5 pt-6 pb-2">
        <div className="min-w-0">
          <Wordmark tone="light" size="sm" to={area === 'owner' ? '/owner' : portalHomeFor(user?.role)} />
          <p className="mt-3 flex w-fit rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-brand-100 ring-1 ring-white/20">{label}</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} data-modal-close className="-mt-1.5 -mr-2 shrink-0 rounded-lg p-2 text-brand-100 hover:bg-white/10 hover:text-white focus-visible:outline-white" aria-label="Close navigation">
            <X className="size-5" aria-hidden />
          </button>
        )}
      </div>
      <SidebarNav groups={groups} onNavigate={onNavigate} autoFocusCurrent={!!onClose} />
      <div className="border-t border-white/15 p-3">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-brand-100 hover:bg-white/8 hover:text-white focus-visible:outline-offset-0 focus-visible:outline-white">
          <ExternalLink className="size-4" aria-hidden /> View public website
        </Link>
      </div>
    </div>
  )
}

/** Notifications the signed-in user can act on, newest first (staff never see links to areas they can't open). */
function useVisibleNotifications() {
  const user = useCurrentUser()
  const mine = useMyNotifications()
  const perms = usePermissions()
  return useMemo(() => {
    if (!user) return []
    return mine
      .filter((n) => !n.link || canOpenPortalPath(n.link, user.role, perms))
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  }, [mine, user, perms])
}

/**
 * Opening the page a notification points to counts as reading it. Runs on navigation (and on an account
 * switch), so an alert that arrives while you're already on its page still shows in the bell. The store
 * skips this while a Super Admin is viewing as someone.
 */
function useMarkVisitedNotificationsRead() {
  const { pathname } = useLocation()
  const userId = useAppStore((s) => s.sessionUserId)
  const markReadForPath = useAppStore((s) => s.markNotificationsReadForPath)
  useEffect(() => {
    if (userId) markReadForPath(pathname)
  }, [pathname, userId, markReadForPath])
}

function NotificationsMenu() {
  const user = useCurrentUser()
  const visible = useVisibleNotifications()
  const markRead = useAppStore((s) => s.markNotificationRead)
  const markAll = useAppStore((s) => s.markAllNotificationsRead)
  const navigate = useNavigate()
  const unread = user ? visible.filter((n) => !n.readBy.includes(user.id)).length : 0
  return (
    <Popover
      align="right"
      panelClassName="w-[min(380px,calc(100vw-1rem))] p-0"
      trigger={({ toggle, open }) => (
        <button type="button" onClick={toggle} aria-expanded={open} className="relative rounded-xl p-2.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
          <Bell className="size-5" aria-hidden />
          {unread > 0 && <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white" aria-hidden>{unread > 9 ? '9+' : unread}</span>}
        </button>
      )}
    >
      {({ close }) => (
        <div>
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink-900">Notifications</h2>
            {unread > 0 && (
              <button type="button" onClick={() => markAll()} className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-brand-800 hover:underline">
                <CheckCheck className="size-3.5" aria-hidden /> Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[min(24rem,70vh)] overflow-y-auto py-1">
            {visible.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-500">You’re all caught up.</li>}
            {visible.slice(0, 20).map((n) => {
              const isUnread = user ? !n.readBy.includes(user.id) : false
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      markRead(n.id)
                      close()
                      if (n.link) navigate(n.link)
                    }}
                    className="flex w-full gap-3 px-4 py-3 text-left hover:bg-ink-50 focus-visible:-outline-offset-2"
                  >
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', isUnread ? 'bg-brand-600' : 'bg-transparent')} aria-hidden />
                    <span className="min-w-0">
                      <span className={cn('block text-sm [overflow-wrap:anywhere]', isUnread ? 'font-semibold text-ink-900' : 'text-ink-700')}>
                        {isUnread && <span className="sr-only">Unread: </span>}
                        {n.title}
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-500 [overflow-wrap:anywhere]">{n.body}</span>
                      <span className="mt-1 block text-xs text-ink-500">{formatRelative(n.at)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Popover>
  )
}

/** Fixed demo personas for the presenter's account switcher (looked up by id, so edits to their email don't break it). */
function useDemoPersonas(): { role: Role; user: User }[] {
  const users = useAppStore((s) => s.users)
  return useMemo(
    () =>
      demoAccounts.flatMap((a) => {
        const user = users.find((u) => u.id === a.id)
        return user ? [{ role: user.role, user }] : []
      }),
    [users],
  )
}

function UserMenu({ area }: { area: 'owner' | 'staff' }) {
  const user = useCurrentUser()
  const impersonator = useImpersonator()
  const loginAs = useAppStore((s) => s.loginAs)
  const resetDemo = useAppStore((s) => s.resetDemo)
  const stopImpersonating = useAppStore((s) => s.stopImpersonating)
  const personas = useDemoPersonas()
  const navigate = useNavigate()
  if (!user) return null

  const switchTo = (target: User) => {
    if (target.status === 'disabled') {
      toast.error(`${target.name}’s account is disabled`, 'A Super Admin can activate it again under Users & accounts.')
      return
    }
    const result = loginAs(target.id)
    if (!result.ok) {
      toast.error(`Couldn’t sign in as ${target.name}`, result.error)
      return
    }
    navigate(portalHomeFor(target.role))
    toast.info(`Signed in as ${target.name}`, roleLabels[target.role])
  }
  const returnToAdmin = () => {
    stopImpersonating()
    // Defer so the owner/staff page's role guard (which redirects to /admin) doesn't win the race.
    window.setTimeout(() => navigate('/admin/users', { replace: true }), 0)
  }

  return (
    <Popover
      align="right"
      panelClassName="w-72"
      trigger={({ toggle, open }) => (
        <button type="button" onClick={toggle} aria-expanded={open} className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-ink-100 sm:pr-2.5">
          <Avatar name={user.name} size="sm" />
          <span className="sr-only">Account menu: </span>
          <span className="sr-only text-left sm:not-sr-only sm:block">
            <span className="block text-sm leading-tight font-semibold text-ink-900">{user.name}</span>
            <span className="block text-xs leading-tight text-ink-500">{user.title ?? roleLabels[user.role]}</span>
          </span>
        </button>
      )}
    >
      {({ close }) => (
        <>
          {impersonator && (
            <>
              <MenuItem
                icon={<Undo2 />}
                className="font-semibold text-amber-900 hover:bg-amber-50"
                onClick={() => {
                  close()
                  returnToAdmin()
                }}
              >
                Return to Super Admin
              </MenuItem>
              <MenuDivider />
            </>
          )}
          <div className="px-3 py-2.5">
            <p className="text-sm font-semibold text-ink-900">{user.name}</p>
            <p className="truncate text-xs text-ink-500">{user.email}</p>
            {impersonator && <p className="mt-1 text-xs text-amber-800">Viewed by {impersonator.name} (Super Admin)</p>}
          </div>
          <MenuDivider />
          {area === 'owner' && (
            <MenuItem
              icon={<UserCircle />}
              onClick={() => {
                close()
                navigate('/owner/profile')
              }}
            >
              My profile
            </MenuItem>
          )}
          <MenuItem
            icon={<ExternalLink />}
            onClick={() => {
              close()
              navigate('/')
            }}
          >
            View public website
          </MenuItem>
          <MenuDivider />
          <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-ink-500 uppercase">Presentation demo</p>
          {personas
            .filter((p) => p.user.id !== user.id)
            .map(({ user: target }) => (
              <MenuItem
                key={target.id}
                icon={<Shuffle />}
                onClick={() => {
                  close()
                  switchTo(target)
                }}
              >
                <span className="min-w-0 flex-1">Switch to {roleLabels[target.role]}</span>
                {target.status === 'disabled' ? (
                  <Badge tone="danger">Disabled</Badge>
                ) : (
                  <span className="text-xs text-ink-500">{target.name.split(' ')[0]}</span>
                )}
              </MenuItem>
            ))}
          <MenuItem
            icon={<RotateCcw />}
            onClick={async () => {
              close()
              const ok = await confirmDialog({
                title: 'Reset demo data?',
                description: 'Bookings, requests, agreements, homes, accounts, leads and settings go back to the sample data. You stay signed in.',
                confirmLabel: 'Reset data',
                tone: 'danger',
              })
              if (!ok) return
              // Ends "View as"; an account created during the demo hands over to the sample account of the same role.
              const { user: kept, switched } = resetDemo()
              // The page you were on may show a record that no longer exists: start again from the portal home.
              navigate(kept ? portalHomeFor(kept.role) : '/', { replace: true })
              toast.success('Demo data reset', kept && switched ? `Signed in as ${kept.name} (${roleLabels[kept.role]})` : undefined)
            }}
          >
            Reset demo data
          </MenuItem>
          <MenuDivider />
          <MenuItem
            icon={<LogOut />}
            tone="danger"
            onClick={() => {
              close()
              // Signs out once the public site has opened (see SIGN_OUT_STATE).
              navigate('/', { state: SIGN_OUT_STATE })
            }}
          >
            Sign out
          </MenuItem>
        </>
      )}
    </Popover>
  )
}

/** Shown while a Super Admin is "viewing as" another account. Stays pinned to the top while scrolling. */
function ImpersonationBanner() {
  const user = useCurrentUser()
  const admin = useImpersonator()
  const stop = useAppStore((s) => s.stopImpersonating)
  const navigate = useNavigate()
  if (!admin || !user) return null
  return (
    <div data-impersonating data-sticky-chrome className="sticky top-0 z-40 flex h-10 items-center justify-center gap-3 bg-amber-400 px-4 text-sm font-medium text-amber-950">
      <Eye className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 truncate">
        Viewing as <span className="font-semibold">{user.name}</span>
        <span className="hidden sm:inline"> ({roleLabels[user.role]})</span>
        <span className="hidden md:inline"> · changes are logged as {admin.name}</span>
      </p>
      <button
        type="button"
        onClick={() => {
          stop()
          // Defer so the owner/staff page's role guard (which redirects to /admin) doesn't win the race.
          window.setTimeout(() => navigate('/admin/users', { replace: true }), 0)
        }}
        className="shrink-0 rounded-lg bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-50 hover:bg-amber-900 focus-visible:outline-amber-950"
      >
        <span className="sm:hidden">Return</span>
        <span className="hidden sm:inline">Return to Super Admin</span>
      </button>
    </div>
  )
}

/** Shared shell for the Home Owner portal (area="owner") and the Staff / Super Admin workspace (area="staff"). */
export function PortalLayout({ area }: { area: 'owner' | 'staff' }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const impersonator = useImpersonator()
  useEffect(() => setMobileOpen(false), [pathname])
  // The drawer is for small screens only: close it if the window grows to the desktop layout.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => mq.matches && setMobileOpen(false)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  useMarkVisitedNotificationsRead()
  // Height of the "viewing as" banner: the sticky sidebar and header sit just below it.
  const shellStyle = { '--portal-top': impersonator ? '2.5rem' : '0px' } as CSSProperties

  return (
    <div data-portal-shell className="min-h-screen bg-ink-50" style={shellStyle}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <ImpersonationBanner />
      <div className="flex">
        <aside data-sticky-chrome className="sticky top-[var(--portal-top)] hidden h-[calc(100dvh_-_var(--portal-top))] w-[272px] shrink-0 lg:block">
          <Sidebar area={area} />
        </aside>
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} side="left" width="sm" ariaLabel="Portal navigation" className="bg-brand-900">
          <Sidebar area={area} onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
        </Drawer>
        <div className="flex min-w-0 flex-1 flex-col">
          <header
            data-sticky-chrome
            className="sticky top-[var(--portal-top)] z-30 flex h-16 items-center justify-between gap-2 border-b border-ink-200/80 bg-white px-3 sm:gap-3 sm:px-6 lg:px-8"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <button type="button" onClick={() => setMobileOpen(true)} className="shrink-0 rounded-xl p-2.5 text-ink-600 hover:bg-ink-100 lg:hidden" aria-label="Open navigation" aria-expanded={mobileOpen}>
                <Menu className="size-5" aria-hidden />
              </button>
              <span className="min-w-0 overflow-hidden lg:hidden">
                <Wordmark size="sm" to={null} />
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <NotificationsMenu />
              <UserMenu area={area} />
            </div>
          </header>
          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  )
}
