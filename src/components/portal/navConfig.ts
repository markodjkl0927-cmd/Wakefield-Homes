import {
  CalendarDays,
  FileSignature,
  History,
  Home,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserCircle,
  UserCog,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { Permission, Role } from '@/types'

export type BadgeKey = 'ownerAgreements' | 'ownerRequests' | 'ownerAppointments' | 'staffBookings' | 'staffRequests' | 'staffLeads' | 'invitedUsers'

export interface PortalNavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Exact match for the active state (overview pages). */
  end?: boolean
  /** Permission needed to see the item; with a list, any one of them is enough. */
  permission?: Permission | Permission[]
  badge?: BadgeKey
}

export interface PortalNavGroup {
  title?: string
  items: PortalNavItem[]
  /** Only shown to Super Admins (or users with the group's permissions). */
  adminOnly?: boolean
}

export const ownerNav: PortalNavGroup[] = [
  {
    items: [
      { label: 'Overview', to: '/owner', icon: LayoutDashboard, end: true },
      { label: 'My Agreements', to: '/owner/agreements', icon: FileSignature, badge: 'ownerAgreements' },
      { label: 'My Homes', to: '/owner/homes', icon: Home },
      { label: 'Appointments', to: '/owner/appointments', icon: CalendarDays, badge: 'ownerAppointments' },
      { label: 'Maintenance', to: '/owner/maintenance', icon: Wrench, badge: 'ownerRequests' },
    ],
  },
  { title: 'Account', items: [{ label: 'Profile', to: '/owner/profile', icon: UserCircle }] },
]

export const staffNav: PortalNavGroup[] = [
  {
    title: 'Workspace',
    items: [
      { label: 'Overview', to: '/staff', icon: LayoutDashboard, end: true },
      { label: 'Appointments', to: '/staff/appointments', icon: CalendarDays, permission: 'appointments.manage', badge: 'staffBookings' },
      { label: 'Requests', to: '/staff/requests', icon: Wrench, permission: 'requests.manage', badge: 'staffRequests' },
      // "Manage 3D viewing" on its own is enough to open Homes & 3D (the editor limits what can be changed).
      { label: 'Homes & 3D', to: '/staff/homes', icon: Home, permission: ['homes.edit', 'homes.3d'] },
      // Comparable sales and estimated prices (the Oronoco Street CMA): pricing goes with editing homes.
      { label: 'Market analysis', to: '/staff/market', icon: TrendingUp, permission: 'homes.edit' },
      { label: 'Agreements', to: '/staff/agreements', icon: FileSignature, permission: 'agreements.edit' },
      { label: 'Home Owners', to: '/staff/homeowners', icon: Users, permission: 'homeowners.view' },
      { label: 'Website leads', to: '/staff/leads', icon: Inbox, permission: 'leads.view', badge: 'staffLeads' },
    ],
  },
  {
    title: 'Super Admin',
    adminOnly: true,
    items: [
      { label: 'Admin overview', to: '/admin', icon: ShieldCheck, end: true },
      { label: 'Users & accounts', to: '/admin/users', icon: UserCog, permission: 'users.manage', badge: 'invitedUsers' },
      { label: 'Roles & permissions', to: '/admin/roles', icon: KeyRound, permission: 'users.manage' },
      { label: 'Platform settings', to: '/admin/settings', icon: Settings, permission: 'settings.manage' },
      { label: 'Activity log', to: '/admin/activity', icon: History, permission: 'activity.view' },
    ],
  },
]

/** True when the permission set satisfies an item's requirement (none, one, or any of a list). */
export function hasNavPermission(perms: Set<Permission>, required: PortalNavItem['permission']): boolean {
  if (!required) return true
  return Array.isArray(required) ? required.some((p) => perms.has(p)) : perms.has(required)
}

/**
 * Whether a signed-in user can open a portal path (used to hide notifications that link to areas
 * they can't open). Matches the path against the nav item it belongs to, longest match first.
 */
export function canOpenPortalPath(path: string, role: Role, perms: Set<Permission>): boolean {
  const pathname = path.split(/[?#]/)[0]
  if (pathname.startsWith('/owner')) return role === 'homeowner'
  if (pathname.startsWith('/admin') && role !== 'admin') return false
  if (pathname.startsWith('/staff') && role === 'homeowner') return false
  const items = staffNav.flatMap((g) => g.items)
  const match = items
    .filter((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]
  return match ? hasNavPermission(perms, match.permission) : true
}
