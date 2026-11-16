import type { Role } from '@/types'

export type Portal = 'homeowner' | 'staff'

export function portalHome(role: Role): string {
  if (role === 'homeowner') return '/owner'
  if (role === 'admin') return '/admin'
  return '/staff'
}

/** Home Owners use the Home Owner login; Staff and Super Admins use the Staff login. */
export function fitsPortal(role: Role, portal: Portal): boolean {
  return portal === 'homeowner' ? role === 'homeowner' : role === 'staff' || role === 'admin'
}

/**
 * Where to go after signing in. `?next=` is only followed when it points inside the user's own
 * portal (/owner for Home Owners, /staff for Staff, /staff or /admin for Super Admins).
 */
export function destinationFor(role: Role, next: string | null): string {
  const home = portalHome(role)
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return home
  const allowed = role === 'homeowner' ? ['/owner'] : role === 'admin' ? ['/admin', '/staff'] : ['/staff']
  const ok = allowed.some((p) => next === p || next.startsWith(`${p}/`) || next.startsWith(`${p}?`))
  return ok ? next : home
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}
