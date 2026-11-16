import {
  Box,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  FileSignature,
  Home,
  Inbox,
  LogIn,
  Mail,
  Settings,
  ShieldCheck,
  UserCog,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { format, isThisYear, parseISO } from 'date-fns'
import type { ActivityEntry, Permission, Role, Settings as PlatformSettings, UserStatus } from '@/types'
import { permissionLabels, roleLabels, type LabelDef, type Tone } from '@/data/labels'
import { formatDate, formatDayLabel } from '@/lib/format'
import type { PersonRef } from '@/store/hooks'

/** One rule set for every form: the shared validators from src/lib/utils, re-exported for the admin forms. */
export { isValidEmail, isValidPhone, normalizePhone, phoneError } from '@/lib/utils'
/** Readable temporary password, e.g. "Cedar-Harbor-47" — the same generator the store uses for password resets. */
export { generateReadablePassword as generatePassword } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Accounts                                                             */
/* ------------------------------------------------------------------ */

export const userStatusLabels: Record<UserStatus, LabelDef> = {
  active: { label: 'Active', tone: 'success' },
  invited: { label: 'Invited', tone: 'warning' },
  disabled: { label: 'Disabled', tone: 'neutral' },
}

export const roleOrder: Role[] = ['homeowner', 'staff', 'admin']

/**
 * Presentation details per role. Chart colors were checked with the dataviz palette validator
 * (lightness band, chroma, color-blind separation and 3:1 contrast on white all pass).
 */
export const roleMeta: Record<Role, { plural: string; tone: Tone; icon: LucideIcon; description: string; color: string }> = {
  homeowner: {
    plural: 'Home Owners',
    tone: 'info',
    icon: Home,
    description: 'Home Owner portal: agreements, homes, bookings and maintenance requests.',
    color: '#2c479f',
  },
  staff: {
    plural: 'Staff',
    tone: 'brand',
    icon: BriefcaseBusiness,
    description: 'Staff workspace, limited to the permissions you choose.',
    color: '#8389f5',
  },
  admin: {
    plural: 'Super Admins',
    tone: 'violet',
    icon: ShieldCheck,
    description: 'Everything, including accounts, roles and platform settings.',
    color: '#0f9f8a',
  },
}

/** Permissions that only make sense inside the Super Admin area (routes there are admin-only). */
export const adminOnlyPermissions: Permission[] = ['users.manage', 'settings.manage', 'activity.view']
export const workspacePermissions: Permission[] = (Object.keys(permissionLabels) as Permission[]).filter((p) => !adminOnlyPermissions.includes(p))

/* ------------------------------------------------------------------ */
/* Activity log                                                         */
/* ------------------------------------------------------------------ */

export type ActivityKind = ActivityEntry['kind']

export const activityKinds: Record<ActivityKind, { label: string; plural: string; tone: Tone; icon: LucideIcon }> = {
  auth: { label: 'Sign-in', plural: 'Sign-ins', tone: 'neutral', icon: LogIn },
  user: { label: 'Account', plural: 'Accounts', tone: 'brand', icon: UserCog },
  home: { label: 'Home', plural: 'Homes', tone: 'brand', icon: Home },
  agreement: { label: 'Agreement', plural: 'Agreements', tone: 'violet', icon: FileSignature },
  appointment: { label: 'Appointment', plural: 'Appointments', tone: 'info', icon: CalendarDays },
  request: { label: 'Request', plural: 'Requests', tone: 'warning', icon: Wrench },
  lead: { label: 'Lead', plural: 'Leads', tone: 'success', icon: Inbox },
  settings: { label: 'Settings', plural: 'Settings', tone: 'neutral', icon: Settings },
}

export const activityKindOrder: ActivityKind[] = ['auth', 'user', 'home', 'agreement', 'appointment', 'request', 'lead', 'settings']

export const GUEST_ACTOR = 'guest'

/** Looks up any user id, including deleted accounts and website visitors (usePersonLookup in src/store/hooks). */
export type PersonLookup = (id: string | null | undefined) => PersonRef | undefined

/** "Alex Morgan", "Website visitor" or "Tom Becker (deleted)" — distinct for every person, never "Unknown". */
export function personLabel(id: string, person: PersonLookup): string {
  return person(id)?.label ?? 'Former user'
}

/** Second line under a name: job title or role, "Public website", or "Staff · account deleted". */
export function personSubline(id: string, person: PersonLookup): string {
  const p = person(id)
  if (!p) return 'Account removed'
  if (p.guest) return 'Public website'
  if (p.user) return p.user.title ?? roleLabels[p.user.role]
  return p.role ? `${roleLabels[p.role]} · account deleted` : 'Account removed'
}

/** The person a Super Admin was viewing as when they made this change ("View as"), if any. */
export function viewingAs(entry: ActivityEntry, person: PersonLookup): PersonRef | undefined {
  return entry.viewingAsId ? person(entry.viewingAsId) : undefined
}

/** "Alex Morgan (viewing as Daniel Ellis)" — for plain-text contexts such as search. */
export function actorText(entry: ActivityEntry, person: PersonLookup): string {
  const as = viewingAs(entry, person)
  return `${personLabel(entry.actorId, person)}${as ? ` (viewing as ${as.label})` : ''}`
}

/** True when the entry was made by this person, or by a Super Admin viewing as them. */
export function involves(entry: ActivityEntry, id: string): boolean {
  return entry.actorId === id || entry.viewingAsId === id
}

const settingsSections: Record<string, string> = {
  booking: 'Booking hours',
  office: 'Office details',
  staffPermissions: 'Staff permissions',
  features: 'Features',
  categories: 'Request types',
}

/** Turns raw keys logged by the store (e.g. "view3d", "leads.view") into readable labels. */
export function describeTarget(entry: ActivityEntry): string {
  if (entry.kind === 'settings') {
    if (entry.target in featureMeta) return featureMeta[entry.target as FeatureKey].label
    if (entry.target in permissionLabels) return permissionLabels[entry.target as Permission].label
    if (entry.action === 'updated settings') {
      return capitalize(
        entry.target
          .split(',')
          .map((k) => settingsSections[k.trim()] ?? k.trim())
          .join(', '),
      )
    }
  }
  return entry.target
}

/** Target for display: drops the redundant name on "Alex Morgan signed in Alex Morgan". */
export function displayTarget(entry: ActivityEntry, person: PersonLookup): string {
  const target = describeTarget(entry)
  if (entry.kind === 'auth' && target === person(entry.actorId)?.name) return ''
  return target
}

/** Compact exact time for narrow screens: "Today · 2:30 PM", "Tue, Nov 10 · 9:15 AM". */
export function formatWhenShort(iso: string): string {
  const d = parseISO(iso)
  return `${isThisYear(d) ? formatDayLabel(d) : formatDate(d)} · ${format(d, 'h:mm a')}`
}

export function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

/** Newest first. ISO timestamps from toISOString() sort lexicographically. */
export function byNewest<T extends { at: string }>(a: T, b: T): number {
  return b.at.localeCompare(a.at)
}

/* ------------------------------------------------------------------ */
/* Platform features                                                    */
/* ------------------------------------------------------------------ */

export type FeatureKey = keyof PlatformSettings['features']

export const featureOrder: FeatureKey[] = ['view3d', 'booking', 'maintenance', 'agreementsEsign', 'contactForm']

/**
 * Copy for the feature switches. `whenOff` says what people see while a feature is off — shown on the
 * settings page and in the toast, so the Super Admin knows exactly what changed.
 */
export const featureMeta: Record<FeatureKey, { label: string; description: string; short: string; whenOff: string; icon: LucideIcon; where: string }> = {
  view3d: {
    label: '3D home viewer',
    description: 'Shows the “View in 3D” option on homes across the website and the Home Owner portal.',
    short: '“View in 3D” on the website and Home Owner portal.',
    whenOff: 'Homes show photos only, on the website and in the Home Owner portal. Staff can still prepare 3D models.',
    icon: Box,
    where: 'Website · Home Owner portal',
  },
  booking: {
    label: 'Appointment booking',
    description: 'Lets Home Owners request appointments with the Wakefield office from their portal.',
    short: 'Home Owners book time with the Wakefield office.',
    whenOff: 'Home Owners are asked to call the office to book. Appointments already booked stay as they are.',
    icon: CalendarCheck,
    where: 'Home Owner portal',
  },
  maintenance: {
    label: 'Maintenance requests',
    description: 'Lets Home Owners ask for gardening, road fixing or a house fix, or make a report.',
    short: 'Home Owners send gardening, road and house requests.',
    whenOff: 'Home Owners are asked to call the office instead. Requests already sent stay visible, and staff keep working on them.',
    icon: Wrench,
    where: 'Home Owner portal',
  },
  agreementsEsign: {
    label: 'Agreement e-signing',
    description: 'Lets Home Owners review and sign agreements online in My Agreements.',
    short: 'Home Owners sign agreements online.',
    whenOff: 'Home Owners can still read their agreements, and are asked to call the office to sign.',
    icon: FileSignature,
    where: 'Home Owner portal',
  },
  contactForm: {
    label: 'Website contact form',
    description: 'Accepts inquiries from the website. New ones arrive in Website leads.',
    short: 'Inquiries from the website.',
    whenOff: 'Website visitors are asked to call the office instead of sending an inquiry online. Leads already received stay in Website leads.',
    icon: Mail,
    where: 'Website · Staff',
  },
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                   */
/* ------------------------------------------------------------------ */

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

/** Compact text action (e.g. "View all") with a 40px tap target. */
export const inlineActionClass =
  'inline-flex h-10 shrink-0 items-center gap-1 rounded-lg px-2.5 -mr-2.5 text-sm font-medium text-brand-800 transition-colors hover:bg-brand-50 hover:text-brand-900'
