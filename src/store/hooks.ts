import { useMemo } from 'react'
import type { FormerHome, FormerUser, Home, Notification, Permission, Role, User } from '@/types'
import { useAppStore, isForUser } from './index'
import { allPermissions } from '@/data/labels'
import { office as defaultOffice } from '@/data/content'
import { formatPhone } from '@/lib/format'

export type OfficeDetails = typeof defaultOffice

/**
 * Office details for display (header, footer, contact blocks, CTAs). Reads the Super Admin's
 * Platform settings, so edits there show up across the whole website. Address parts and map
 * links fall back to the original office when the address hasn't changed.
 * `email` is "" when no office email is set — hide email rows and mailto links then.
 */
export function useOffice(): OfficeDetails {
  const o = useAppStore((s) => s.settings.office)
  return useMemo(() => {
    const full = o.address.trim()
    const sameAddress = full === defaultOffice.fullAddress
    const parts = full.split(',').map((p) => p.trim()).filter(Boolean)
    const query = encodeURIComponent(full)
    return {
      ...defaultOffice,
      name: o.name.trim() || defaultOffice.name,
      address: sameAddress ? defaultOffice.address : parts.length > 2 ? parts.slice(0, -2).join(', ') : full,
      cityLine: sameAddress ? defaultOffice.cityLine : parts.length > 2 ? parts.slice(-2).join(', ') : '',
      fullAddress: full,
      phone: o.phone,
      phoneDisplay: formatPhone(o.phone),
      email: o.email.trim(),
      hours: o.hours,
      // A changed address gets a map of the new address instead of the original office pin.
      mapEmbed: sameAddress ? defaultOffice.mapEmbed : `https://maps.google.com/maps?q=${query}&z=15&output=embed`,
      mapLink: sameAddress ? defaultOffice.mapLink : `https://www.openstreetmap.org/search?query=${query}`,
    }
  }, [o])
}

/*
 * Selector hooks. Zustand v5 re-renders forever if a selector returns a NEW array/object on every
 * call, so these hooks select raw state and derive with useMemo. Follow the same pattern in pages:
 *   const homes = useAppStore((s) => s.homes)              // ✅ raw slice
 *   const mine = useMemo(() => homes.filter(...), [homes])  // ✅ derived
 *   useAppStore((s) => s.homes.filter(...))                 // ❌ new array every render
 */

export function useCurrentUser(): User | null {
  return useAppStore((s) => s.users.find((u) => u.id === s.sessionUserId) ?? null)
}

/** The Super Admin who is "viewing as" the current user, if any. */
export function useImpersonator(): User | null {
  return useAppStore((s) => (s.impersonatorId ? s.users.find((u) => u.id === s.impersonatorId) ?? null : null))
}

/**
 * True while a Super Admin is "viewing as" someone. Actions are logged as the Super Admin; e-signing is
 * refused and nothing is marked as read or seen on the viewed user's behalf.
 */
export function useIsImpersonating(): boolean {
  return useAppStore((s) => !!s.impersonatorId)
}

export function usePermissions(): Set<Permission> {
  const user = useCurrentUser()
  const staffPermissions = useAppStore((s) => s.settings.staffPermissions)
  return useMemo(() => {
    if (!user) return new Set<Permission>()
    if (user.role === 'admin') return new Set(allPermissions)
    if (user.role === 'staff') return new Set(staffPermissions)
    return new Set<Permission>()
  }, [user, staffPermissions])
}

export function useCan(permission: Permission): boolean {
  return usePermissions().has(permission)
}

/** True when the signed-in user holds at least one of these permissions (e.g. Homes & 3D: homes.edit or homes.3d). */
export function useCanAny(permissions: readonly Permission[]): boolean {
  const perms = usePermissions()
  return permissions.some((p) => perms.has(p))
}

export function useSettings() {
  return useAppStore((s) => s.settings)
}

export function useUsersById(): Record<string, User> {
  const users = useAppStore((s) => s.users)
  return useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
}

export interface PersonRef {
  id: string
  /** Plain name: "Daniel Ellis", "Website visitor" for the public site, "Former user" when unknown. */
  name: string
  /** Name for lists and logs, marking deleted accounts: "Daniel Ellis (deleted)". */
  label: string
  role?: Role
  /** The live account, when it still exists. */
  user?: User
  deleted: boolean
  guest: boolean
}

/**
 * Looks up any user id — including deleted accounts and website visitors — so pages never show "Unknown".
 *   const person = usePersonLookup(); person(r.assignedToId)?.label
 */
export function usePersonLookup(): (id: string | null | undefined) => PersonRef | undefined {
  const users = useAppStore((s) => s.users)
  const former = useAppStore((s) => s.formerUsers)
  return useMemo(() => {
    const live = new Map(users.map((u) => [u.id, u]))
    const gone = new Map<string, FormerUser>(former.map((u) => [u.id, u]))
    return (id) => {
      if (!id) return undefined
      if (id === 'guest') return { id, name: 'Website visitor', label: 'Website visitor', deleted: false, guest: true }
      const user = live.get(id)
      if (user) return { id, name: user.name, label: user.name, role: user.role, user, deleted: false, guest: false }
      const f = gone.get(id)
      if (f) return { id, name: f.name, label: `${f.name} (deleted)`, role: f.role, deleted: true, guest: false }
      return { id, name: 'Former user', label: 'Former user', deleted: true, guest: false }
    }
  }, [users, former])
}

export interface HomeRef {
  id: string
  title: string
  address: string
  city: string
  /** The live home, when it still exists. */
  home?: Home
  /** True when the home was deleted (agreements and requests keep showing its name). */
  removed: boolean
}

/** Looks up any home id, including deleted homes: ref(a.homeId)?.title, with ref.removed for a "no longer listed" note. */
export function useHomeLookup(): (id: string | null | undefined) => HomeRef | undefined {
  const homes = useAppStore((s) => s.homes)
  const former = useAppStore((s) => s.formerHomes)
  return useMemo(() => {
    const live = new Map(homes.map((h) => [h.id, h]))
    const gone = new Map<string, FormerHome>(former.map((h) => [h.id, h]))
    return (id) => {
      if (!id) return undefined
      const home = live.get(id)
      if (home) return { id, title: home.title, address: home.address, city: home.city, home, removed: false }
      const f = gone.get(id)
      return f ? { id, title: f.title, address: f.address, city: f.city, removed: true } : undefined
    }
  }, [homes, former])
}

/** Active Staff and Super Admins (assignee pickers). */
export function useStaffUsers(): User[] {
  const users = useAppStore((s) => s.users)
  return useMemo(() => users.filter((u) => (u.role === 'staff' || u.role === 'admin') && u.status !== 'disabled'), [users])
}

export function useHomeowners(): User[] {
  const users = useAppStore((s) => s.users)
  return useMemo(() => users.filter((u) => u.role === 'homeowner'), [users])
}

/** The signed-in user's notifications (only areas their role can open), newest first. */
export function useMyNotifications(): Notification[] {
  const user = useCurrentUser()
  const notifications = useAppStore((s) => s.notifications)
  const staffPermissions = useAppStore((s) => s.settings.staffPermissions)
  return useMemo(
    () => (user ? notifications.filter((n) => isForUser(n, user, staffPermissions)).sort((a, b) => b.at.localeCompare(a.at)) : []),
    [user, notifications, staffPermissions],
  )
}

export function useUnreadCount(): number {
  const user = useCurrentUser()
  const mine = useMyNotifications()
  return useMemo(() => (user ? mine.filter((n) => !n.readBy.includes(user.id)).length : 0), [mine, user])
}

export function useHome(id: string | undefined): Home | undefined {
  return useAppStore((s) => (id ? s.homes.find((h) => h.id === id || h.slug === id) : undefined))
}

export function useHomesByOwner(ownerId: string | undefined): Home[] {
  const homes = useAppStore((s) => s.homes)
  return useMemo(() => (ownerId ? homes.filter((h) => h.ownerId === ownerId) : []), [homes, ownerId])
}

/** Homes shown on the public website, newest/featured first. */
export function usePublishedHomes(): Home[] {
  const homes = useAppStore((s) => s.homes)
  return useMemo(
    () =>
      homes
        .filter((h) => h.published)
        .sort((a, b) => Number(b.featured) - Number(a.featured) || statusRank(a.status) - statusRank(b.status)),
    [homes],
  )
}

function statusRank(s: Home['status']) {
  return ['available', 'coming-soon', 'under-construction', 'under-contract', 'completed', 'sold'].indexOf(s)
}

/**
 * True when the website may present the home as for sale: published, not owned by a Home Owner, and
 * available, coming soon or still being built. A home that belongs to someone is never for sale.
 */
export function isForSale(home: Home): boolean {
  return home.published && !home.ownerId && (home.status === 'available' || home.status === 'coming-soon' || home.status === 'under-construction')
}

/** Published homes that are for sale (see isForSale), in the same order as usePublishedHomes. */
export function useHomesForSale(): Home[] {
  const published = usePublishedHomes()
  return useMemo(() => published.filter(isForSale), [published])
}

/** Whether a home's 3D viewer should be offered (global feature switch + per-home toggle). */
export function useCan3d(home: Home | undefined): boolean {
  const enabled = useAppStore((s) => s.settings.features.view3d)
  return !!home && enabled && home.view3d.enabled
}
