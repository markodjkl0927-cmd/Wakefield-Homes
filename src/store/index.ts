import { create } from 'zustand'
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware'
import type {
  ActivityEntry,
  Agreement,
  AgreementSection,
  AgreementType,
  Appointment,
  AppointmentType,
  ConstructionStage,
  ConstructionStageKey,
  Home,
  HomeStatus,
  HouseConfig,
  Lead,
  LeadInterest,
  MaintenanceRequest,
  Notification,
  Permission,
  RequestCategory,
  RequestEvent,
  RequestPriority,
  RequestStatus,
  Role,
  Settings,
  User,
  UserStatus,
} from '@/types'
import { createSeed, demoAccounts, type SeedData } from '@/data/seed'
import { createPublicListings } from '@/data/listings'
import { appointmentTypes, constructionStages, homeStatus, requestCategories, requestStatus, roleLabels, stageProgress } from '@/data/labels'
import {
  addDaysIso,
  collapseSpaces,
  daysBetween,
  generateReadablePassword,
  normalizeEmail,
  normalizePhone,
  nowIso,
  sentence,
  slugify,
  snapToWorkDay,
  toIsoDate,
  todayIso,
  uid,
} from '@/lib/utils'
import { formatDateShort, formatTime, pluralize } from '@/lib/format'
import { toast } from './ui'

/**
 * Client-side demo "backend". Every portal reads and writes this store.
 *
 * Persistence (see the bottom of this file):
 * - The demo data is saved to localStorage and shared by every tab: a change in one tab shows up live in the
 *   others, so an owner tab and a staff tab can sit side by side.
 * - Who is signed in is kept per tab (sessionStorage). A new tab starts with the most recent sign-in.
 * - Saving never throws into the UI: when the browser's storage is full the app keeps working in memory and
 *   shows one toast asking to reset the demo data.
 * - Saved data opened on a later day has all of its dates moved forward, so the demo always looks current.
 */

/* ------------------------------------------------------------------ */
/* State and public types                                               */
/* ------------------------------------------------------------------ */

/** Everything that is saved and shared between tabs. */
export type DemoData = SeedData & {
  /** Identifies the sample-data definition. Untouched saved data from an older definition is replaced on load. */
  seedFingerprint: string
  /** Identifies the public listings definition (listings.ts); saved listings are refreshed when it changes. */
  listingsFingerprint: string
  /** True once someone changed the demo data (anything but signing in or reading). */
  modified: boolean
}

export interface DemoState extends DemoData {
  /** Signed-in user of this tab (not shared between tabs). */
  sessionUserId: string | null
  /** Set while a Super Admin is "viewing as" another user: the Super Admin's id. */
  impersonatorId: string | null
}

export type ActionResult = { ok: true } | { ok: false; error: string }
export type LoginResult = { ok: true; user: User; firstSignIn: boolean } | { ok: false; error: string }

/** What deleting an account (or changing its type) touches — for confirmation dialogs. */
export interface AccountFootprint {
  /** Homes they own (left without an owner). */
  homes: number
  /** Appointments booked for them (removed). */
  appointments: number
  upcomingAppointments: number
  /** Their maintenance requests (removed). */
  requests: number
  openRequests: number
  /** Agreements issued to them, including drafts (removed). */
  agreements: number
  /** Drafts and documents still waiting for their signature. */
  unsignedAgreements: number
  /** Requests assigned to them as a team member (unassigned). */
  assignedRequests: number
  /** Appointments they're the team member for (team member cleared). */
  staffAppointments: number
  /** Website leads assigned to them (unassigned). */
  leads: number
}

export interface HomeFootprint {
  ownerId?: string
  agreements: number
  appointments: number
  upcomingAppointments: number
  requests: number
  openRequests: number
}

export interface NewUserInput {
  role: Role
  name: string
  email: string
  phone?: string
  title?: string
  address?: string
  status?: UserStatus
  password?: string
}

export interface NewHomeInput {
  title: string
  address: string
  city: string
  modelId: string
  communityId?: string
  lot?: string
  status: Home['status']
  price: number | null
  priceNote?: string
  beds: number
  baths: number
  sqft: number
  lotSizeAcres?: number
  description: string
  images: string[]
  published: boolean
  featured?: boolean
  ownerId?: string
  house3d: HouseConfig
}

export interface NewAgreementInput {
  homeownerId: string
  homeId?: string
  type: AgreementType
  title: string
  amount?: number
  summary: string
  sections: AgreementSection[]
  /** 'draft' keeps it private to staff; 'awaiting-signature' / 'active' shares it as version 1. */
  status: Agreement['status']
}

export interface NewAppointmentInput {
  /** The Home Owner the appointment is for. Ignored when a Home Owner books for themselves. */
  homeownerId: string
  homeId?: string
  type: AppointmentType
  date: string
  time: string
  location: Appointment['location']
  notes: string
  /** Staff booking on behalf of a Home Owner: the team member (defaults to the person booking). */
  staffId?: string
  /** Staff booking on behalf of a Home Owner: a note shown to the Home Owner. */
  staffNote?: string
}

export interface NewRequestInput {
  /** The Home Owner the request is for. Ignored when a Home Owner files it themselves. */
  homeownerId: string
  homeId: string
  category: RequestCategory
  title: string
  description: string
  priority: RequestPriority
  preferredDate?: string
  photos: string[]
  /** Staff logging a request on behalf of a Home Owner: assign it straight away. */
  assignedToId?: string
}

export interface NewLeadInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  interest: LeadInterest
  modelSlug?: string
  bestTime?: string
  message: string
  /** The listing the inquiry was sent from (home detail page). */
  homeId?: string
  /** Where it came from, e.g. "Community page: Hybla Valley Farms". Defaults to the listing or the contact form. */
  source?: string
}

export interface DemoActions {
  // auth
  login: (email: string, password: string, portal?: 'homeowner' | 'staff') => LoginResult
  /** Presentation switcher / scripts: signs in without a password. Refuses missing and disabled accounts. */
  loginAs: (userId: string) => LoginResult
  logout: () => void
  impersonate: (userId: string) => ActionResult
  stopImpersonating: () => void
  // users (Super Admin)
  createUser: (input: NewUserInput) => User
  updateUser: (id: string, patch: Partial<Omit<User, 'id'>>) => ActionResult & { removed?: AccountFootprint }
  deleteUser: (id: string) => ActionResult & { removed?: AccountFootprint }
  setUserStatus: (id: string, status: UserStatus) => ActionResult
  resetPassword: (id: string) => string
  // homes
  createHome: (input: NewHomeInput) => Home
  updateHome: (id: string, patch: Partial<Omit<Home, 'id'>>, summary?: string) => void
  deleteHome: (id: string) => ActionResult
  updateHome3d: (id: string, patch: Partial<Home['view3d']>) => void
  assignHomeOwner: (homeId: string, ownerId: string | undefined) => ({ ok: true; tookOffMarket: boolean } | { ok: false; error: string })
  setConstructionStage: (homeId: string, stage: ConstructionStageKey) => void
  addConstructionPhoto: (homeId: string, photo: { stage: string; url: string; caption?: string }) => void
  // agreements
  createAgreement: (input: NewAgreementInput) => Agreement
  updateAgreement: (id: string, patch: Partial<Pick<Agreement, 'title' | 'summary' | 'sections' | 'amount' | 'status' | 'type' | 'homeId'>>, note: string) => void
  sendAgreementForSignature: (id: string) => void
  signAgreement: (id: string, signatureName: string) => ActionResult
  markAgreementSeen: (id: string) => void
  voidAgreement: (id: string, note?: string) => void
  deleteAgreement: (id: string) => ActionResult
  // appointments
  requestAppointment: (input: NewAppointmentInput) => Appointment
  confirmAppointment: (id: string, staffId?: string, staffNote?: string) => void
  declineAppointment: (id: string, staffNote: string) => void
  rescheduleAppointment: (id: string, date: string, time: string, staffNote?: string) => void
  cancelAppointment: (id: string, reason?: string) => void
  completeAppointment: (id: string) => void
  // maintenance requests
  createRequest: (input: NewRequestInput) => MaintenanceRequest
  updateRequest: (id: string, patch: Partial<Pick<MaintenanceRequest, 'priority' | 'scheduledFor' | 'title' | 'description' | 'category'>>) => void
  scheduleRequest: (id: string, date: string | undefined, options?: { markScheduled?: boolean }) => void
  setRequestStatus: (id: string, status: RequestStatus, note?: string) => void
  assignRequest: (id: string, staffId: string | undefined) => ActionResult
  addRequestComment: (id: string, body: string, internal?: boolean) => void
  // leads
  createLead: (input: NewLeadInput) => Lead
  updateLead: (id: string, patch: Partial<Pick<Lead, 'status' | 'assignedToId'>>) => void
  deleteLead: (id: string) => void
  // notifications
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  /** Marks the signed-in user's notifications that link to this page as read (call on route change). */
  markNotificationsReadForPath: (path: string) => void
  // settings
  updateSettings: (patch: Partial<Settings>) => void
  setFeature: (key: keyof Settings['features'], value: boolean) => void
  setCategoryEnabled: (key: RequestCategory, value: boolean) => void
  setStaffPermission: (permission: Permission, granted: boolean) => void
  // demo
  /** Restores the sample data. Ends "View as" and keeps the presenter signed in (see the returned user). */
  resetDemo: () => { user: User | null; switched: boolean }
}

export type AppStore = DemoState & DemoActions

/* ------------------------------------------------------------------ */
/* Sample data, fingerprint and pure helpers                            */
/* ------------------------------------------------------------------ */

/** FNV-1a hash of sample data with every date blanked out, so it only changes when the definition does. */
function fingerprintOf(value: unknown): string {
  const text = JSON.stringify(value).replace(/\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z)?/g, '#')
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

const SEED_FINGERPRINT = fingerprintOf(createSeed())
const LISTINGS_FINGERPRINT = fingerprintOf(createPublicListings())

function initialData(): DemoData {
  return { ...createSeed(), seedFingerprint: SEED_FINGERPRINT, listingsFingerprint: LISTINGS_FINGERPRINT, modified: false }
}

const DATA_KEYS = Object.keys(initialData()) as (keyof DemoData)[]

function pickData(s: DemoData): DemoData {
  const out = {} as Record<string, unknown>
  for (const k of DATA_KEYS) out[k] = s[k]
  return out as DemoData
}

function isDemoData(value: unknown): value is Partial<DemoData> {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  const lists = ['users', 'homes', 'agreements', 'appointments', 'requests', 'leads', 'notifications', 'activity'] as const
  return lists.every((k) => Array.isArray(v[k])) && !!v.settings && typeof v.settings === 'object'
}

const FOR_SALE: HomeStatus[] = ['available', 'coming-soon']
const ACTIVE_APPOINTMENT: Appointment['status'][] = ['requested', 'confirmed', 'rescheduled']
const OPEN_REQUEST: RequestStatus[] = ['submitted', 'assigned', 'scheduled', 'in-progress']
/** Double-click / double-submit window: an identical record created this recently is returned instead of a copy. */
const DUPLICATE_MS = 8000

const AGREEMENT_PREFIX: Record<AgreementType, string> = {
  purchase: 'PA',
  construction: 'CC',
  'change-order': 'CO',
  warranty: 'WR',
  addendum: 'AD',
  hoa: 'HO',
}

/** The user when it's a Staff or Super Admin account, otherwise undefined. */
const staffOf = (u: User | undefined): User | undefined => (u && (u.role === 'staff' || u.role === 'admin') ? u : undefined)
const isRecent = (iso: string | undefined) => !!iso && Date.now() - Date.parse(iso) < DUPLICATE_MS
/** Homes have no createdAt field: remember when this window created them, for the double-submit guard. */
const homesCreatedAt = new Map<string, string>()

function excerpt(text: string, max = 80): string {
  const t = collapseSpaces(text)
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

/** "Design selections on Wed, Nov 18 at 10:00 AM" */
function apptLabel(a: Pick<Appointment, 'type' | 'date' | 'time'>): string {
  return `${appointmentTypes[a.type].label} on ${formatDateShort(a.date)} at ${formatTime(a.time)}`
}

/** True when a notification link points at this page (query strings and trailing slashes ignored). */
function samePath(link: string | undefined, path: string): boolean {
  if (!link) return false
  const clean = (p: string) => p.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
  return clean(link) === clean(path)
}

/** True when a notification link points at one of these record ids (e.g. /owner/agreements/agr_x). */
function linksToAny(link: string | undefined, ids: Set<string>): boolean {
  if (!link || !ids.size) return false
  const last = link.split(/[?#]/)[0].split('/').filter(Boolean).pop()
  return !!last && ids.has(last)
}

/** True when a notification is addressed to this user (directly or via their role) and they may open it. */
export function isForUser(n: Notification, user: User, staffPermissions?: readonly Permission[]): boolean {
  let addressed = false
  if (n.to === user.id) addressed = true
  else if (n.to === 'role:staff') addressed = user.role === 'staff' || user.role === 'admin'
  else if (n.to === 'role:admin') addressed = user.role === 'admin'
  if (!addressed) return false
  // Staff only see notifications for areas their role can open; Super Admins see everything.
  if (n.perm && user.role === 'staff' && staffPermissions) return staffPermissions.includes(n.perm)
  return true
}

/** Display name for any user id, including deleted accounts ("guest" is a website visitor). */
export function personName(state: Pick<DemoData, 'users' | 'formerUsers'>, id: string | null | undefined): string {
  if (!id) return 'Someone'
  if (id === 'guest') return 'Website visitor'
  const user = state.users.find((u) => u.id === id)
  if (user) return user.name
  const former = state.formerUsers.find((u) => u.id === id)
  return former ? former.name : 'Former user'
}

/** Title of any home id, including deleted homes. */
export function homeTitle(state: Pick<DemoData, 'homes' | 'formerHomes'>, id: string | null | undefined): string | undefined {
  if (!id) return undefined
  return state.homes.find((h) => h.id === id)?.title ?? state.formerHomes.find((h) => h.id === id)?.title
}

/** Counts of everything tied to an account — use it to tell the Super Admin what a delete or type change does. */
export function accountFootprint(state: Pick<DemoData, 'homes' | 'appointments' | 'requests' | 'agreements' | 'leads'>, userId: string): AccountFootprint {
  const today = todayIso()
  const appts = state.appointments.filter((a) => a.homeownerId === userId)
  const reqs = state.requests.filter((r) => r.homeownerId === userId)
  const agrs = state.agreements.filter((a) => a.homeownerId === userId)
  return {
    homes: state.homes.filter((h) => h.ownerId === userId).length,
    appointments: appts.length,
    upcomingAppointments: appts.filter((a) => ACTIVE_APPOINTMENT.includes(a.status) && a.date >= today).length,
    requests: reqs.length,
    openRequests: reqs.filter((r) => OPEN_REQUEST.includes(r.status)).length,
    agreements: agrs.length,
    unsignedAgreements: agrs.filter((a) => a.status === 'draft' || a.status === 'awaiting-signature').length,
    assignedRequests: state.requests.filter((r) => r.assignedToId === userId && OPEN_REQUEST.includes(r.status)).length,
    staffAppointments: state.appointments.filter((a) => a.staffId === userId && ACTIVE_APPOINTMENT.includes(a.status)).length,
    leads: state.leads.filter((l) => l.assignedToId === userId).length,
  }
}

/** Counts of the records that mention a home — for the delete-home confirmation. */
export function homeFootprint(state: Pick<DemoData, 'homes' | 'appointments' | 'requests' | 'agreements'>, homeId: string): HomeFootprint {
  const today = todayIso()
  const appts = state.appointments.filter((a) => a.homeId === homeId)
  const reqs = state.requests.filter((r) => r.homeId === homeId)
  return {
    ownerId: state.homes.find((h) => h.id === homeId)?.ownerId,
    agreements: state.agreements.filter((a) => a.homeId === homeId).length,
    appointments: appts.length,
    upcomingAppointments: appts.filter((a) => ACTIVE_APPOINTMENT.includes(a.status) && a.date >= today).length,
    requests: reqs.length,
    openRequests: reqs.filter((r) => OPEN_REQUEST.includes(r.status)).length,
  }
}

/* ------------------------------------------------------------------ */
/* Sessions (per tab) and quota-safe storage (shared)                   */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'wakefield-demo'
const STORAGE_VERSION = 3
const TAB_SESSION_KEY = 'wakefield-demo-session'
const LAST_SESSION_KEY = 'wakefield-demo-last-session'

interface SessionSnapshot {
  userId: string | null
  impersonatorId: string | null
}

function parseSession(raw: string | null): SessionSnapshot | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<SessionSnapshot> | null
    if (!v || typeof v !== 'object') return null
    return { userId: typeof v.userId === 'string' ? v.userId : null, impersonatorId: typeof v.impersonatorId === 'string' ? v.impersonatorId : null }
  } catch {
    return null
  }
}

/** This tab's sign-in; a new tab starts with the most recent sign-in in this browser. */
function readInitialSession(): SessionSnapshot {
  try {
    const tab = parseSession(sessionStorage.getItem(TAB_SESSION_KEY))
    if (tab) return tab
  } catch {
    /* storage blocked */
  }
  try {
    const last = parseSession(localStorage.getItem(LAST_SESSION_KEY))
    if (last) return last
    // Older versions kept the sign-in inside the shared data.
    const legacy = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { state?: { sessionUserId?: unknown; impersonatorId?: unknown } } | null
    if (legacy?.state && typeof legacy.state.sessionUserId === 'string') {
      return { userId: legacy.state.sessionUserId, impersonatorId: typeof legacy.state.impersonatorId === 'string' ? legacy.state.impersonatorId : null }
    }
  } catch {
    /* storage blocked or unreadable */
  }
  return { userId: null, impersonatorId: null }
}

function writeTabSession(s: SessionSnapshot) {
  try {
    sessionStorage.setItem(TAB_SESSION_KEY, JSON.stringify(s))
  } catch {
    /* storage blocked: the session still lives in memory */
  }
}

/** Remembers an explicit sign-in / sign-out so the next new tab starts with it. */
function rememberLastSession(s: SessionSnapshot) {
  writeTabSession(s)
  try {
    localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(s))
  } catch {
    /* storage full or blocked */
  }
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false
  return err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014
}

let storageFullShown = false
let storageWarned = false

/** JSON storage whose writes never throw: when the browser's quota is full the demo keeps working in memory. */
const safeStorage: PersistStorage<DemoData> = {
  getItem: (name) => {
    try {
      const raw = localStorage.getItem(name)
      return raw ? (JSON.parse(raw) as StorageValue<DemoData>) : null
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, JSON.stringify(value))
      storageFullShown = false
    } catch (err) {
      if (isQuotaError(err)) {
        if (!storageFullShown) {
          storageFullShown = true
          toast.error('Demo storage is full — reset demo data to free space', 'Your latest changes stay in this window until you reload. Reset demo data is in the user menu.')
        }
      } else if (!storageWarned) {
        // Storage blocked (e.g. privacy settings): the demo still works for this window.
        storageWarned = true
        console.warn('[demo] Could not save the demo data; changes stay in this window only.', err)
      }
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch {
      /* ignore */
    }
  },
}

/* ------------------------------------------------------------------ */
/* Moving saved dates forward (data opened on a later day)              */
/* ------------------------------------------------------------------ */

const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DATED_KEYS = ['users', 'homes', 'agreements', 'appointments', 'requests', 'leads', 'notifications', 'activity', 'formerUsers', 'formerHomes'] as const

function mapStrings<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === 'string') return fn(value) as T
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = mapStrings(v, fn)
    return out as T
  }
  return value
}

/**
 * Moves every date forward by `days` calendar days. Times of day are kept; dates land on working days
 * (future ones roll forward, past ones back), and timestamps are pulled back if needed so none is in the future.
 */
function shiftDates(data: DemoData, days: number): Partial<DemoData> {
  const now = Date.now()
  const today = todayIso()
  const workDays = data.settings.booking.workDays
  const shiftTs = (iso: string) => {
    const d = new Date(iso)
    d.setDate(d.getDate() + days)
    return d.getTime()
  }
  let newest = -Infinity
  for (const k of DATED_KEYS) {
    mapStrings(data[k], (s) => {
      if (TIMESTAMP_RE.test(s)) newest = Math.max(newest, shiftTs(s))
      return s
    })
  }
  const pullBack = newest > now ? newest - now + 60_000 : 0
  const fn = (s: string) => {
    if (TIMESTAMP_RE.test(s)) return new Date(shiftTs(s) - pullBack).toISOString()
    if (DATE_RE.test(s)) {
      const d = addDaysIso(s, days)
      return snapToWorkDay(d, d >= today ? 1 : -1, workDays)
    }
    return s
  }
  const out: Partial<DemoData> = {}
  for (const k of DATED_KEYS) (out as Record<string, unknown>)[k] = mapStrings(data[k], fn)
  return out
}

/* ------------------------------------------------------------------ */
/* The store                                                            */
/* ------------------------------------------------------------------ */

const initialSession = readInitialSession()

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => {
      const me = () => {
        const s = get()
        return s.users.find((u) => u.id === s.sessionUserId)
      }
      /** Current actor for records ("guest" on the public site). During "View as" this is the viewed user. */
      const actorId = () => get().sessionUserId ?? 'guest'
      const nameOf = (id?: string | null) => personName(get(), id)
      const findUser = (id?: string | null) => (id ? get().users.find((u) => u.id === id) : undefined)
      const activeStaff = (id?: string | null) => {
        const u = findUser(id)
        return u && staffOf(u) && u.status !== 'disabled' ? u : undefined
      }

      /** Audit log. While a Super Admin is viewing as someone, the Super Admin is recorded as the actor. */
      const log = (action: string, target: string, kind: ActivityEntry['kind'], actor?: string) => {
        const s = get()
        let who = actor ?? s.sessionUserId ?? 'guest'
        let viewingAsId: string | undefined
        if (s.impersonatorId && who === s.sessionUserId) {
          viewingAsId = who
          who = s.impersonatorId
        }
        const entry: ActivityEntry = { id: uid('act'), actorId: who, ...(viewingAsId ? { viewingAsId } : {}), action, target, at: nowIso(), kind }
        // Every change is logged, so this is also where the demo data becomes "modified" (signing in doesn't count).
        set((st) => ({ activity: [entry, ...st.activity].slice(0, 400), ...(kind !== 'auth' && !st.modified ? { modified: true } : {}) }))
      }

      /**
       * Sends a notification. `perm` limits a staff-wide one to staff who can open its link. With `key`, an unread
       * notification with the same key sent moments ago is replaced, so one action never produces two alerts.
       */
      const notify = (to: string, title: string, body: string, link?: string, opts: { perm?: Permission; key?: string } = {}) => {
        const n: Notification = { id: uid('ntf'), to, title, body, link, at: nowIso(), readBy: [], ...(opts.perm ? { perm: opts.perm } : {}), ...(opts.key ? { key: opts.key } : {}) }
        set((s) => {
          const cutoff = Date.now() - 15_000
          const rest = opts.key ? s.notifications.filter((x) => !(x.key === opts.key && x.to === to && x.readBy.length === 0 && Date.parse(x.at) >= cutoff)) : s.notifications
          return { notifications: [n, ...rest].slice(0, 300) }
        })
      }

      const patchAppointment = (id: string, patch: Partial<Appointment>) =>
        set((s) => ({ appointments: s.appointments.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: nowIso() } : a)) }))

      const patchRequest = (id: string, patch: Partial<MaintenanceRequest>) =>
        set((s) => ({ requests: s.requests.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: nowIso() } : r)) }))

      const reqEvent = (e: Omit<RequestEvent, 'id' | 'at' | 'byUserId'>): RequestEvent => ({ id: uid('evt'), at: nowIso(), byUserId: actorId(), ...e })

      const signIn = (user: User): LoginResult => {
        const firstSignIn = !user.lastLoginAt
        const lastLoginAt = nowIso()
        const status: UserStatus = user.status === 'invited' ? 'active' : user.status
        set((s) => ({
          sessionUserId: user.id,
          impersonatorId: null,
          users: s.users.map((u) => (u.id === user.id ? { ...u, lastLoginAt, status } : u)),
        }))
        rememberLastSession({ userId: user.id, impersonatorId: null })
        log('signed in', user.name, 'auth', user.id)
        return { ok: true, user: { ...user, lastLoginAt, status }, firstSignIn }
      }

      /** Removes what belongs to a Home Owner account: its appointments, requests, agreements and their alerts. */
      const dropOwnerRecords = (userId: string) => {
        set((s) => {
          const gone = new Set<string>([
            ...s.agreements.filter((a) => a.homeownerId === userId).map((a) => a.id),
            ...s.requests.filter((r) => r.homeownerId === userId).map((r) => r.id),
          ])
          return {
            agreements: s.agreements.filter((a) => a.homeownerId !== userId),
            appointments: s.appointments.filter((a) => a.homeownerId !== userId),
            requests: s.requests.filter((r) => r.homeownerId !== userId),
            homes: s.homes.map((h) => (h.ownerId === userId ? { ...h, ownerId: undefined, updatedAt: nowIso() } : h)),
            notifications: s.notifications.filter((n) => n.to !== userId && !linksToAny(n.link, gone)),
          }
        })
      }

      /** Hands back a team member's work: requests are unassigned, appointments and leads lose their team member. */
      const releaseStaffWork = (userId: string, reason: string) => {
        const at = nowIso()
        const by = actorId()
        set((s) => ({
          requests: s.requests.map((r) =>
            r.assignedToId === userId
              ? {
                  ...r,
                  assignedToId: undefined,
                  status: r.status === 'assigned' ? ('submitted' as const) : r.status,
                  events: [
                    ...(r.events ?? []),
                    { id: uid('evt'), at, byUserId: by, type: 'assignee' as const, assigneeId: null, note: reason },
                    ...(r.status === 'assigned' ? [{ id: uid('evt'), at, byUserId: by, type: 'status' as const, status: 'submitted' as const }] : []),
                  ],
                  updatedAt: at,
                }
              : r,
          ),
          appointments: s.appointments.map((a) => (a.staffId === userId ? { ...a, staffId: undefined, updatedAt: at } : a)),
          leads: s.leads.map((l) => (l.assignedToId === userId ? { ...l, assignedToId: undefined } : l)),
          notifications: s.notifications.filter((n) => n.to !== userId),
        }))
      }

      const uniqueSlug = (title: string, excludeId?: string) => {
        const base = slugify(title) || 'home'
        const taken = new Set(get().homes.filter((h) => h.id !== excludeId).map((h) => h.slug))
        let slug = base
        for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`
        return slug
      }

      const nextReference = (type: AgreementType) => {
        const s = get()
        const taken = new Set(s.agreements.map((a) => a.reference))
        const year = new Date().getFullYear()
        let n = s.nextAgreementNumber
        let ref = ''
        do {
          ref = `WH-${AGREEMENT_PREFIX[type]}-${year}-${String(n).padStart(3, '0')}`
          n += 1
        } while (taken.has(ref))
        set({ nextAgreementNumber: n })
        return ref
      }

      /** First share of a private draft: it becomes version 1 for the Home Owner. */
      const shareDraft = (a: Agreement, status: 'awaiting-signature' | 'active', patch: Partial<Agreement>, note?: string) => {
        const by = actorId()
        const at = nowIso()
        const firstNote = collapseSpaces(note ?? '') || (status === 'awaiting-signature' ? 'Issued for your signature' : 'Shared with you')
        set((s) => ({
          agreements: s.agreements.map((x) =>
            x.id === a.id
              ? { ...x, ...patch, status, version: 1, history: [{ version: 1, at, byUserId: by, note: firstNote }], createdAt: at, updatedAt: at, updatedByUserId: by, seenByOwner: false, seenVersion: 0 }
              : x,
          ),
        }))
        const title = patch.title ?? a.title
        log(status === 'awaiting-signature' ? 'sent for signature' : 'shared agreement', title, 'agreement')
        notify(a.homeownerId, status === 'awaiting-signature' ? 'New agreement to sign' : 'New agreement shared', title, `/owner/agreements/${a.id}`)
      }

      return {
        ...initialData(),
        sessionUserId: initialSession.userId,
        impersonatorId: initialSession.impersonatorId,

        /* ------------------------------ auth ------------------------------ */
        login: (email, password, portal) => {
          const em = normalizeEmail(email)
          const user = get().users.find((u) => u.email.toLowerCase() === em)
          if (!user || user.password !== password) return { ok: false, error: 'That email and password don’t match an account.' }
          if (user.status === 'disabled') return { ok: false, error: 'This account has been disabled. Please contact Wakefield Homes.' }
          if (portal === 'homeowner' && user.role !== 'homeowner') return { ok: false, error: 'This is a Staff account — please use the Staff login.' }
          if (portal === 'staff' && user.role === 'homeowner') return { ok: false, error: 'This is a Home Owner account — please use the Home Owners login.' }
          return signIn(user)
        },
        loginAs: (userId) => {
          const user = findUser(userId)
          if (!user) return { ok: false, error: 'That account no longer exists.' }
          if (user.status === 'disabled') return { ok: false, error: `${user.name}’s account is disabled. Activate it in Users & accounts first.` }
          return signIn(user)
        },
        logout: () => {
          const s = get()
          if (s.impersonatorId) {
            log('stopped viewing as', nameOf(s.sessionUserId), 'auth', s.impersonatorId)
            log('signed out', nameOf(s.impersonatorId), 'auth', s.impersonatorId)
          } else if (s.sessionUserId) {
            log('signed out', nameOf(s.sessionUserId), 'auth', s.sessionUserId)
          }
          set({ sessionUserId: null, impersonatorId: null })
          rememberLastSession({ userId: null, impersonatorId: null })
        },
        impersonate: (userId) => {
          const s = get()
          const admin = findUser(s.impersonatorId ?? s.sessionUserId)
          if (!admin || admin.role !== 'admin') return { ok: false, error: 'Only a Super Admin can view the portal as someone else.' }
          const target = findUser(userId)
          if (!target) return { ok: false, error: 'That account no longer exists.' }
          if (target.id === admin.id) return { ok: false, error: 'You’re already signed in with this account.' }
          if (target.status === 'disabled') return { ok: false, error: `${target.name}’s account is disabled. Activate it to view their portal.` }
          if (s.impersonatorId && s.sessionUserId !== target.id) log('stopped viewing as', nameOf(s.sessionUserId), 'auth', admin.id)
          log('started viewing as', target.name, 'auth', admin.id)
          set({ impersonatorId: admin.id, sessionUserId: target.id })
          rememberLastSession({ userId: target.id, impersonatorId: admin.id })
          return { ok: true }
        },
        stopImpersonating: () => {
          const s = get()
          const adminId = s.impersonatorId
          if (!adminId) return
          const viewed = s.sessionUserId
          set({ sessionUserId: adminId, impersonatorId: null })
          rememberLastSession({ userId: adminId, impersonatorId: null })
          log('stopped viewing as', nameOf(viewed), 'auth', adminId)
        },

        /* ------------------------------ users ----------------------------- */
        createUser: (input) => {
          const email = normalizeEmail(input.email)
          const recent = get().users.find((u) => u.email === email && isRecent(u.createdAt))
          if (recent) return recent
          const user: User = {
            id: uid('usr'),
            role: input.role,
            name: collapseSpaces(input.name),
            email,
            phone: input.phone ? normalizePhone(input.phone) : '',
            title: input.title?.trim() || undefined,
            address: input.address?.trim() || undefined,
            password: input.password || generateReadablePassword(),
            status: input.status ?? 'invited',
            createdAt: nowIso(),
          }
          set((s) => ({ users: [user, ...s.users] }))
          log(user.status === 'invited' ? `invited ${roleLabels[user.role]}` : `created ${roleLabels[user.role]} account`, user.name, 'user')
          return user
        },
        updateUser: (id, patch) => {
          const s = get()
          const before = findUser(id)
          if (!before) return { ok: false, error: 'That account no longer exists.' }
          const clean: Partial<User> = { ...patch }
          delete (clean as Partial<User> & { id?: string }).id
          if (clean.email !== undefined) clean.email = normalizeEmail(clean.email)
          if (clean.name !== undefined) clean.name = collapseSpaces(clean.name)
          const newRole = clean.role && clean.role !== before.role ? clean.role : undefined
          if (newRole) {
            const actor = s.impersonatorId ?? s.sessionUserId
            if (id === actor) return { ok: false, error: 'You can’t change the type of the account you’re signed in with.' }
            if (before.role === 'admin' && s.users.filter((u) => u.role === 'admin').length <= 1) {
              return { ok: false, error: 'Keep at least one Super Admin — make another account a Super Admin first.' }
            }
          }
          const removed = newRole ? accountFootprint(s, id) : undefined
          set((st) => ({ users: st.users.map((u) => (u.id === id ? { ...u, ...clean } : u)) }))
          if (newRole) {
            // No orphans: a former Home Owner keeps no owner records; a former team member keeps no assignments.
            if (before.role === 'homeowner') dropOwnerRecords(id)
            else if (newRole === 'homeowner') releaseStaffWork(id, `${before.name} is no longer on the team`)
            log('changed account type', `${clean.name ?? before.name} → ${roleLabels[newRole]}`, 'user')
          } else {
            const keys = Object.keys(clean)
            log(keys.length === 1 && keys[0] === 'password' ? 'changed password' : 'updated account', clean.name ?? before.name, 'user')
          }
          return { ok: true, removed }
        },
        deleteUser: (id) => {
          const s = get()
          const user = findUser(id)
          if (!user) return { ok: false, error: 'That account no longer exists.' }
          if (id === s.sessionUserId || id === s.impersonatorId) return { ok: false, error: 'You can’t delete the account you’re signed in with.' }
          if (user.role === 'admin' && s.users.filter((u) => u.role === 'admin').length <= 1) return { ok: false, error: 'Keep at least one Super Admin.' }
          const removed = accountFootprint(s, id)
          dropOwnerRecords(id)
          releaseStaffWork(id, `${user.name}’s account was deleted`)
          set((st) => ({
            users: st.users.filter((u) => u.id !== id),
            formerUsers: [{ id, name: user.name, email: user.email, role: user.role, deletedAt: nowIso() }, ...st.formerUsers.filter((f) => f.id !== id)],
          }))
          const parts = [
            removed.appointments && pluralize(removed.appointments, 'appointment'),
            removed.requests && pluralize(removed.requests, 'request'),
            removed.agreements && pluralize(removed.agreements, 'agreement'),
          ].filter(Boolean)
          log('deleted account', `${user.name}${parts.length ? ` (removed ${parts.join(', ')})` : ''}`, 'user')
          return { ok: true, removed }
        },
        setUserStatus: (id, status) => {
          const s = get()
          const user = findUser(id)
          if (!user) return { ok: false, error: 'That account no longer exists.' }
          if (status === 'disabled') {
            if (id === s.sessionUserId || id === s.impersonatorId) return { ok: false, error: 'You can’t disable the account you’re signed in with.' }
            if (user.role === 'admin' && s.users.filter((u) => u.role === 'admin' && u.status !== 'disabled').length <= 1) {
              return { ok: false, error: 'Keep at least one active Super Admin.' }
            }
          }
          // An account that never signed in goes back to "Invited" rather than "Active".
          const next: UserStatus = status === 'active' && !user.lastLoginAt ? 'invited' : status
          if (next === user.status) return { ok: true }
          set((st) => ({ users: st.users.map((u) => (u.id === id ? { ...u, status: next } : u)) }))
          log(next === 'disabled' ? 'disabled account' : 'activated account', user.name, 'user')
          return { ok: true }
        },
        resetPassword: (id) => {
          const temp = generateReadablePassword()
          set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, password: temp } : u)) }))
          log('reset password for', nameOf(id), 'user')
          return temp
        },

        /* ------------------------------ homes ----------------------------- */
        createHome: (input) => {
          const s = get()
          const title = collapseSpaces(input.title)
          const recent = s.homes.find((h) => h.title === title && h.address === input.address && isRecent(homesCreatedAt.get(h.id)))
          if (recent) return recent
          const owner = findUser(input.ownerId)
          const ownerId = owner?.role === 'homeowner' ? owner.id : undefined
          const home: Home = {
            id: uid('hm'),
            slug: uniqueSlug(title),
            title,
            address: input.address,
            city: input.city,
            communityId: input.communityId,
            lot: input.lot,
            modelId: input.modelId,
            // An owned home is never advertised for sale.
            status: ownerId && FOR_SALE.includes(input.status) ? 'under-contract' : input.status,
            published: input.published,
            featured: input.featured ?? false,
            price: input.price,
            priceNote: input.priceNote,
            beds: input.beds,
            baths: input.baths,
            sqft: input.sqft,
            lotSizeAcres: input.lotSizeAcres,
            description: input.description,
            images: input.images,
            ownerId,
            view3d: { enabled: true, config: input.house3d, hasCustomModel: false },
            updatedAt: nowIso(),
          }
          homesCreatedAt.set(home.id, home.updatedAt)
          set((st) => ({ homes: [home, ...st.homes] }))
          log('created home', home.title, 'home')
          if (ownerId) notify(ownerId, 'A home was added to your account', `${home.title} is now in your portal.`, `/owner/homes/${home.id}`)
          return home
        },
        updateHome: (id, patch, summary) => {
          const before = get().homes.find((h) => h.id === id)
          if (!before) return
          const { ownerId, slug: _slug, ...rest } = patch
          void _slug
          if ('ownerId' in patch && (ownerId ?? undefined) !== (before.ownerId ?? undefined)) get().assignHomeOwner(id, ownerId)
          const current = get().homes.find((h) => h.id === id) ?? before
          if (!Object.keys(rest).length) return
          let status = rest.status ?? current.status
          if (current.ownerId && FOR_SALE.includes(status)) status = 'under-contract'
          set((s) => ({ homes: s.homes.map((h) => (h.id === id ? { ...h, ...rest, status, updatedAt: nowIso() } : h)) }))
          log('updated home', `${current.title}${summary ? ` — ${summary}` : ''}`, 'home')
          if (current.ownerId && status !== current.status) {
            notify(current.ownerId, 'Home status updated', `${rest.title ?? current.title} is now “${homeStatus[status].label}”.`, `/owner/homes/${id}`)
          }
        },
        deleteHome: (id) => {
          const home = get().homes.find((h) => h.id === id)
          if (!home) return { ok: false, error: 'That home no longer exists.' }
          // Agreements, requests and appointments that mention it are kept and still show its name.
          set((s) => ({
            homes: s.homes.filter((h) => h.id !== id),
            formerHomes: [{ id, title: home.title, address: home.address, city: home.city, deletedAt: nowIso() }, ...s.formerHomes.filter((h) => h.id !== id)],
            notifications: s.notifications.filter((n) => !(n.link && (samePath(n.link, `/owner/homes/${id}`) || samePath(n.link, `/staff/homes/${id}`) || samePath(n.link, `/homes/${home.slug}`)))),
          }))
          log('deleted home', home.title, 'home')
          return { ok: true }
        },
        updateHome3d: (id, patch) => {
          const home = get().homes.find((h) => h.id === id)
          if (!home) return
          set((s) => ({ homes: s.homes.map((h) => (h.id === id ? { ...h, view3d: { ...h.view3d, ...patch }, updatedAt: nowIso() } : h)) }))
          const what =
            patch.enabled === true ? 'enabled 3D viewing' : patch.enabled === false ? 'disabled 3D viewing' : patch.hasCustomModel ? 'uploaded a 3D model' : patch.hasCustomModel === false ? 'removed the custom 3D model' : 'updated the 3D model'
          log(what, home.title, 'home')
        },
        assignHomeOwner: (homeId, ownerId) => {
          const home = get().homes.find((h) => h.id === homeId)
          if (!home) return { ok: false, error: 'That home no longer exists.' }
          const owner = ownerId ? findUser(ownerId) : undefined
          if (ownerId && owner?.role !== 'homeowner') return { ok: false, error: 'Homes can only be assigned to Home Owner accounts.' }
          if ((home.ownerId ?? undefined) === (ownerId ?? undefined)) return { ok: true, tookOffMarket: false }
          const previous = home.ownerId
          // A home that belongs to a Home Owner is off the market: never "Available" or "Coming soon".
          const tookOffMarket = !!ownerId && FOR_SALE.includes(home.status)
          set((s) => ({
            homes: s.homes.map((h) => (h.id === homeId ? { ...h, ownerId: ownerId || undefined, status: tookOffMarket ? 'under-contract' : h.status, updatedAt: nowIso() } : h)),
            // The previous owner can't open this home any more.
            notifications: previous ? s.notifications.filter((n) => !(n.to === previous && samePath(n.link, `/owner/homes/${homeId}`))) : s.notifications,
          }))
          log(ownerId ? 'assigned home to' : 'removed owner from', `${home.title}${owner ? ` → ${owner.name}` : ''}${tookOffMarket ? ' (now under contract)' : ''}`, 'home')
          if (ownerId) notify(ownerId, 'A home was added to your account', `${home.title} is now in your portal.`, `/owner/homes/${homeId}`)
          return { ok: true, tookOffMarket }
        },
        setConstructionStage: (homeId, stage) => {
          const home = get().homes.find((h) => h.id === homeId)
          const idx = constructionStages.findIndex((s) => s.key === stage)
          if (!home || idx < 0) return
          const today = todayIso()
          const finished = stage === 'closing'
          const prev = home.construction?.stages ?? []
          const prevOf = (key: ConstructionStageKey) => prev.find((x) => x.key === key)
          // Nothing changes: no update and no notification.
          if (finished ? home.status === 'completed' && prev.length > 0 && prev.every((x) => x.status === 'done') : prev.find((x) => x.status === 'current')?.key === stage) return
          const stages: ConstructionStage[] = constructionStages.map((def, i) => {
            const old = prevOf(def.key)
            const base = { key: def.key, label: def.label, ...(old?.note ? { note: old.note } : {}) }
            if (finished || i < idx) {
              // Stages already finished keep their date; a stage that finishes now is dated today (local date).
              const keep = old?.status === 'done' && old.date && old.date <= today
              return { ...base, status: 'done' as const, date: keep ? old.date : today }
            }
            if (i === idx) {
              const keep = old?.status === 'current' && old.date && old.date <= today
              return { ...base, status: 'current' as const, date: keep ? old.date : today }
            }
            return { ...base, status: 'upcoming' as const, date: undefined as string | undefined }
          })
          // Upcoming stages keep their planned dates while those are still ahead and in order; otherwise they're
          // spread evenly up to the estimated completion date (or left "to be scheduled" without one).
          const upcoming = stages.filter((s) => s.status === 'upcoming')
          if (upcoming.length) {
            const est = home.construction?.estCompletion
            const end = est && est > today ? est : undefined
            let last = today
            const planned = upcoming.map((s) => prevOf(s.key)?.date)
            const inOrder = planned.every((d) => {
              const ok = !!d && d > last && (!end || d <= end)
              if (d) last = d
              return ok
            })
            upcoming.forEach((s, k) => {
              if (inOrder) s.date = planned[k]
              else if (end) s.date = k === upcoming.length - 1 ? end : snapToWorkDay(addDaysIso(today, Math.max(1, Math.round((daysBetween(today, end) * (k + 1)) / upcoming.length))))
            })
          }
          set((s) => ({
            homes: s.homes.map((h) =>
              h.id === homeId
                ? {
                    ...h,
                    status: finished ? 'completed' : 'under-construction',
                    ...(finished ? { closingDate: h.closingDate && h.closingDate <= today ? h.closingDate : today, warrantyEnds: h.warrantyEnds ?? addDaysIso(today, 365) } : {}),
                    // Undoing a closing recorded today (a correction) also removes its closing and warranty dates.
                    ...(!finished && h.status === 'completed' && h.closingDate === today ? { closingDate: undefined, warrantyEnds: undefined } : {}),
                    construction: { photos: [], ...h.construction, stages, progress: stageProgress(stage) },
                    updatedAt: nowIso(),
                  }
                : h,
            ),
          }))
          const label = constructionStages[idx].label
          log('moved construction stage', `${home.title} → ${label}`, 'home')
          if (home.ownerId) {
            notify(home.ownerId, finished ? 'Your home has closed' : 'Construction update', finished ? `${home.title} is complete. Welcome home!` : `${home.title}: ${label} is underway.`, `/owner/homes/${homeId}`)
          }
        },
        addConstructionPhoto: (homeId, photo) => {
          const home = get().homes.find((h) => h.id === homeId)
          if (!home) return
          set((s) => ({
            homes: s.homes.map((h) =>
              h.id === homeId
                ? { ...h, construction: { progress: h.construction?.progress ?? 0, stages: h.construction?.stages ?? [], ...h.construction, photos: [...(h.construction?.photos ?? []), photo] }, updatedAt: nowIso() }
                : h,
            ),
          }))
          log('added construction photo', home.title, 'home')
          if (home.ownerId) notify(home.ownerId, 'New construction photo', `A new ${photo.stage.toLowerCase()} photo was added for ${home.title}.`, `/owner/homes/${homeId}`)
        },

        /* --------------------------- agreements --------------------------- */
        createAgreement: (input) => {
          const by = actorId()
          const title = collapseSpaces(input.title)
          const summary = input.summary.trim()
          // Double submit: the same document created moments ago is returned instead of a copy.
          const recent = get().agreements.find((a) => a.homeownerId === input.homeownerId && a.type === input.type && a.title === title && a.summary === summary && isRecent(a.createdAt))
          if (recent) return recent
          const at = nowIso()
          const shared = input.status !== 'draft'
          const agreement: Agreement = {
            id: uid('agr'),
            homeownerId: input.homeownerId,
            homeId: input.homeId,
            type: input.type,
            title,
            reference: nextReference(input.type),
            status: input.status,
            version: 1,
            amount: input.amount,
            summary,
            sections: input.sections,
            // Drafts are private: their single entry is replaced by "version 1" when first shared.
            history: [{ version: 1, at, byUserId: by, note: shared ? (input.status === 'awaiting-signature' ? 'Issued for your signature' : 'Shared with you') : 'Draft created' }],
            createdAt: at,
            updatedAt: at,
            updatedByUserId: by,
            seenByOwner: false,
            seenVersion: 0,
          }
          set((s) => ({ agreements: [agreement, ...s.agreements] }))
          log(shared ? 'created agreement' : 'started draft agreement', agreement.title, 'agreement')
          if (shared) {
            notify(input.homeownerId, input.status === 'awaiting-signature' ? 'New agreement to sign' : 'New agreement shared', agreement.title, `/owner/agreements/${agreement.id}`)
          }
          return agreement
        },
        updateAgreement: (id, patch, note) => {
          const a = get().agreements.find((x) => x.id === id)
          if (!a) return
          const by = actorId()
          const at = nowIso()
          const text = collapseSpaces(note ?? '')
          if (a.status === 'draft') {
            const target = patch.status
            if (target === 'awaiting-signature' || target === 'active') {
              const { status: _shared, ...rest } = patch
              void _shared
              shareDraft(a, target, rest, text)
              return
            }
            // Private draft save: no version bump, no Home Owner history, no notification.
            const { status: _status, ...rest } = patch
            void _status
            set((s) => ({ agreements: s.agreements.map((x) => (x.id === id ? { ...x, ...rest, updatedAt: at, updatedByUserId: by } : x)) }))
            log('saved draft agreement', rest.title ?? a.title, 'agreement')
            return
          }
          // Saving the same content again (e.g. a double click) doesn't create another version.
          const same = (Object.keys(patch) as (keyof typeof patch)[]).every((k) => JSON.stringify(patch[k]) === JSON.stringify(a[k]))
          if (same) return
          const version = a.version + 1
          set((s) => ({
            agreements: s.agreements.map((x) =>
              x.id === id
                ? {
                    ...x,
                    ...patch,
                    version,
                    history: [...x.history, { version, at, byUserId: by, note: text || 'Updated' }],
                    updatedAt: at,
                    updatedByUserId: by,
                    seenByOwner: false,
                    // A signed document that is edited needs a fresh signature.
                    ...(x.status === 'signed' && !patch.status ? { status: 'awaiting-signature' as const, signedAt: undefined, signatureName: undefined, signedByUserId: undefined } : {}),
                  }
                : x,
            ),
          }))
          const title = patch.title ?? a.title
          log('updated agreement', `${title} (v${version})`, 'agreement')
          notify(a.homeownerId, 'Agreement updated', `${nameOf(by)} updated “${title}”: ${sentence(text || 'see the latest version')}`, `/owner/agreements/${id}`)
        },
        sendAgreementForSignature: (id) => {
          const a = get().agreements.find((x) => x.id === id)
          if (!a) return
          if (a.status === 'draft') {
            shareDraft(a, 'awaiting-signature', {})
            return
          }
          if (a.status === 'active') {
            set((s) => ({ agreements: s.agreements.map((x) => (x.id === id ? { ...x, status: 'awaiting-signature', updatedAt: nowIso(), updatedByUserId: actorId() } : x)) }))
            log('sent for signature', a.title, 'agreement')
            notify(a.homeownerId, 'Agreement ready to sign', a.title, `/owner/agreements/${id}`)
            return
          }
          if (a.status === 'awaiting-signature') {
            log('sent signature reminder', a.title, 'agreement')
            notify(a.homeownerId, 'Reminder: agreement to sign', `“${a.title}” is waiting for your signature.`, `/owner/agreements/${id}`, { key: `agr:${id}:remind` })
          }
        },
        signAgreement: (id, signatureName) => {
          const s = get()
          const a = s.agreements.find((x) => x.id === id)
          if (!a) return { ok: false, error: 'This agreement no longer exists.' }
          if (s.impersonatorId) return { ok: false, error: `Only ${nameOf(a.homeownerId)} can sign this agreement. E-signing isn’t available while viewing as another user.` }
          if (s.sessionUserId !== a.homeownerId) return { ok: false, error: 'Only the Home Owner named on this agreement can sign it.' }
          if (a.status === 'signed') return { ok: false, error: 'This agreement is already signed.' }
          if (a.status !== 'awaiting-signature') return { ok: false, error: 'This agreement isn’t waiting for a signature.' }
          if (!s.settings.features.agreementsEsign) return { ok: false, error: 'Electronic signing is turned off. Please contact the office to sign.' }
          const name = collapseSpaces(signatureName)
          if (!name) return { ok: false, error: 'Type your full legal name to sign.' }
          const at = nowIso()
          set((st) => ({
            agreements: st.agreements.map((x) =>
              x.id === id
                ? { ...x, status: 'signed', signedAt: at, signatureName: name, signedByUserId: a.homeownerId, seenByOwner: true, seenVersion: x.version, updatedAt: at, updatedByUserId: a.homeownerId }
                : x,
            ),
          }))
          log('signed agreement', a.title, 'agreement')
          notify('role:staff', 'Agreement signed', `${nameOf(a.homeownerId)} signed “${a.title}”.`, `/staff/agreements/${id}`, { perm: 'agreements.edit' })
          return { ok: true }
        },
        markAgreementSeen: (id) => {
          const s = get()
          if (s.impersonatorId) return // "View as" never marks the owner's documents as seen
          const a = s.agreements.find((x) => x.id === id)
          if (!a || a.homeownerId !== s.sessionUserId || a.status === 'draft') return
          if (a.seenByOwner && a.seenVersion === a.version) return
          set((st) => ({ agreements: st.agreements.map((x) => (x.id === id ? { ...x, seenByOwner: true, seenVersion: x.version } : x)) }))
        },
        voidAgreement: (id, note) => {
          const a = get().agreements.find((x) => x.id === id)
          if (!a || a.status === 'void') return
          const by = actorId()
          const text = collapseSpaces(note ?? '')
          set((s) => ({
            agreements: s.agreements.map((x) =>
              x.id === id ? { ...x, status: 'void', updatedAt: nowIso(), updatedByUserId: by, history: [...x.history, { version: x.version, at: nowIso(), byUserId: by, note: text || 'Voided' }] } : x,
            ),
          }))
          log('voided agreement', a.title, 'agreement')
          if (a.status !== 'draft') notify(a.homeownerId, 'Agreement voided', text ? `${a.title} — ${sentence(text)}` : a.title, `/owner/agreements/${id}`)
        },
        deleteAgreement: (id) => {
          const a = get().agreements.find((x) => x.id === id)
          if (!a) return { ok: false, error: 'This agreement no longer exists.' }
          if (a.status !== 'draft') return { ok: false, error: 'Only drafts can be deleted. Void a shared agreement instead.' }
          set((s) => ({ agreements: s.agreements.filter((x) => x.id !== id), notifications: s.notifications.filter((n) => !linksToAny(n.link, new Set([id]))) }))
          log('deleted draft agreement', a.title, 'agreement')
          return { ok: true }
        },

        /* --------------------------- appointments ------------------------- */
        requestAppointment: (input) => {
          const actor = me()
          const office = staffOf(actor)
          const ownerId = office || actor?.role !== 'homeowner' ? input.homeownerId : actor.id
          const owner = findUser(ownerId)
          if (!owner || owner.role !== 'homeowner') throw new Error('Appointments can only be booked for a Home Owner account.')
          const recent = get().appointments.find(
            (a) => a.homeownerId === ownerId && a.type === input.type && a.date === input.date && a.time === input.time && ACTIVE_APPOINTMENT.includes(a.status) && isRecent(a.createdAt),
          )
          if (recent) return recent
          const teamMember = office ? (activeStaff(input.staffId) ?? office) : undefined
          const at = nowIso()
          const appt: Appointment = {
            id: uid('apt'),
            homeownerId: ownerId,
            homeId: input.homeId,
            type: input.type,
            date: input.date,
            time: input.time,
            durationMins: appointmentTypes[input.type].durationMins,
            location: input.location,
            notes: input.notes.trim(),
            // Booked by the office (e.g. a phone call): confirmed straight away.
            status: office ? 'confirmed' : 'requested',
            ...(teamMember ? { staffId: teamMember.id } : {}),
            ...(office && input.staffNote?.trim() ? { staffNote: input.staffNote.trim() } : {}),
            bookedById: actor?.id ?? ownerId,
            createdAt: at,
            updatedAt: at,
          }
          set((s) => ({ appointments: [appt, ...s.appointments] }))
          if (office) {
            log('booked appointment for', `${owner.name} — ${apptLabel(appt)}`, 'appointment')
            const withWhom = teamMember && teamMember.id !== office.id ? ` with ${teamMember.name}` : ''
            notify(ownerId, 'Appointment booked for you', `${office.name} booked ${apptLabel(appt)}${withWhom}. ${appt.staffNote ? sentence(appt.staffNote) : 'It’s confirmed.'}`, '/owner/appointments')
          } else {
            log('requested appointment', apptLabel(appt), 'appointment')
            notify('role:staff', 'New booking request', `${owner.name} requested ${apptLabel(appt)}.`, '/staff/appointments', { perm: 'appointments.manage' })
          }
          return appt
        },
        confirmAppointment: (id, staffId, staffNote) => {
          const a = get().appointments.find((x) => x.id === id)
          if (!a || (a.status !== 'requested' && a.status !== 'rescheduled')) return
          const actor = me()
          const teamMember = activeStaff(staffId) ?? activeStaff(a.staffId) ?? staffOf(actor)
          const note = staffNote?.trim()
          patchAppointment(id, { status: 'confirmed', staffId: teamMember?.id, staffNote: note || a.staffNote })
          log('confirmed appointment', `${nameOf(a.homeownerId)} — ${apptLabel(a)}`, 'appointment')
          notify(a.homeownerId, 'Appointment confirmed', `${apptLabel(a)} is confirmed${teamMember ? ` with ${teamMember.name}` : ''}.${note ? ` ${sentence(note)}` : ''}`, '/owner/appointments')
        },
        declineAppointment: (id, staffNote) => {
          const a = get().appointments.find((x) => x.id === id)
          if (!a || (a.status !== 'requested' && a.status !== 'rescheduled')) return
          const note = staffNote.trim()
          patchAppointment(id, { status: 'declined', staffNote: note || undefined })
          log('declined appointment', `${nameOf(a.homeownerId)} — ${apptLabel(a)}`, 'appointment')
          notify(a.homeownerId, 'Appointment not available', `${apptLabel(a)} isn’t available.${note ? ` ${sentence(note)}` : ''}`, '/owner/appointments')
        },
        rescheduleAppointment: (id, date, time, staffNote) => {
          const a = get().appointments.find((x) => x.id === id)
          if (!a || !ACTIVE_APPOINTMENT.includes(a.status)) return
          if (a.date === date && a.time === time) return // nothing changed: no update, no notification
          const actor = me()
          const office = staffOf(actor)
          const note = staffNote?.trim() || undefined
          const moved = { ...a, date, time }
          patchAppointment(id, {
            date,
            time,
            // The office picks the new time, so it's confirmed; a Home Owner's change needs the office to confirm.
            status: office ? 'confirmed' : 'requested',
            // The old note was about the old time.
            staffNote: office ? note : undefined,
            ...(office && !a.staffId ? { staffId: office.id } : {}),
            rescheduled: { fromDate: a.date, fromTime: a.time, byUserId: actor?.id ?? a.homeownerId, at: nowIso() },
          })
          log('rescheduled appointment', `${nameOf(a.homeownerId)} — ${apptLabel(moved)}`, 'appointment')
          const type = appointmentTypes[a.type].label
          if (office) {
            notify(a.homeownerId, 'Appointment moved', `${type} is now on ${formatDateShort(date)} at ${formatTime(time)}.${note ? ` ${sentence(note)}` : ''}`, '/owner/appointments')
          } else {
            notify('role:staff', 'Booking change requested', `${nameOf(a.homeownerId)} asked to move ${type} to ${formatDateShort(date)} at ${formatTime(time)}.`, '/staff/appointments', { perm: 'appointments.manage' })
          }
        },
        cancelAppointment: (id, reason) => {
          const a = get().appointments.find((x) => x.id === id)
          if (!a || !ACTIVE_APPOINTMENT.includes(a.status)) return
          const byOwner = me()?.id === a.homeownerId
          const note = reason?.trim()
          patchAppointment(id, { status: 'cancelled', staffNote: !byOwner && note ? note : a.staffNote })
          log('canceled appointment', `${nameOf(a.homeownerId)} — ${apptLabel(a)}`, 'appointment')
          if (byOwner) notify('role:staff', 'Appointment canceled', `${nameOf(a.homeownerId)} canceled ${apptLabel(a)}.`, '/staff/appointments', { perm: 'appointments.manage' })
          else notify(a.homeownerId, 'Appointment canceled', `${apptLabel(a)} was canceled.${note ? ` ${sentence(note)}` : ''}`, '/owner/appointments')
        },
        completeAppointment: (id) => {
          const a = get().appointments.find((x) => x.id === id)
          if (!a || (a.status !== 'confirmed' && a.status !== 'rescheduled')) return
          const actor = me()
          const office = staffOf(actor)
          patchAppointment(id, { status: 'completed', ...(!a.staffId && office ? { staffId: office.id } : {}) })
          log('completed appointment', `${nameOf(a.homeownerId)} — ${apptLabel(a)}`, 'appointment')
        },

        /* ------------------------------ requests -------------------------- */
        createRequest: (input) => {
          const actor = me()
          const office = staffOf(actor)
          const ownerId = office || actor?.role !== 'homeowner' ? input.homeownerId : actor.id
          const owner = findUser(ownerId)
          if (!owner || owner.role !== 'homeowner') throw new Error('Requests can only be filed for a Home Owner account.')
          const title = collapseSpaces(input.title)
          const description = input.description.trim()
          const recent = get().requests.find((r) => r.homeownerId === ownerId && r.homeId === input.homeId && r.title === title && r.description === description && isRecent(r.createdAt))
          if (recent) return recent
          const assignee = office ? activeStaff(input.assignedToId) : undefined
          const number = get().nextRequestNumber
          const at = nowIso()
          const by = actor?.id ?? ownerId
          const events: RequestEvent[] = [{ id: uid('evt'), at, byUserId: by, type: 'status', status: 'submitted', ...(office ? { note: `Logged by ${office.name} for ${owner.name}` } : {}) }]
          if (assignee) {
            events.push({ id: uid('evt'), at, byUserId: by, type: 'assignee', assigneeId: assignee.id }, { id: uid('evt'), at, byUserId: by, type: 'status', status: 'assigned' })
          }
          const req: MaintenanceRequest = {
            id: uid('req'),
            number,
            homeownerId: ownerId,
            homeId: input.homeId,
            category: input.category,
            title,
            description,
            priority: input.priority,
            ...(input.preferredDate ? { preferredDate: input.preferredDate } : {}),
            photos: input.photos,
            status: assignee ? 'assigned' : 'submitted',
            ...(assignee ? { assignedToId: assignee.id } : {}),
            comments: [],
            events,
            createdById: by,
            createdAt: at,
            updatedAt: at,
          }
          set((s) => ({ requests: [req, ...s.requests], nextRequestNumber: s.nextRequestNumber + 1 }))
          if (office) {
            log('logged request for', `${owner.name} — #${number} ${title}`, 'request')
            notify(ownerId, `Request #${number} logged for you`, `${office.name} logged “${title}”. You can follow it here.`, `/owner/maintenance/${req.id}`)
            if (assignee && assignee.id !== office.id) notify(assignee.id, `You were assigned request #${number}`, title, `/staff/requests/${req.id}`, { perm: 'requests.manage' })
          } else {
            log('submitted request', `#${number} ${title}`, 'request')
            notify('role:staff', `New request #${number} · ${requestCategories[input.category].label}`, `${owner.name}: ${title}`, `/staff/requests/${req.id}`, { perm: 'requests.manage' })
          }
          return req
        },
        updateRequest: (id, patch) => {
          const r = get().requests.find((x) => x.id === id)
          if (!r) return
          const { scheduledFor, ...rest } = patch
          if ('scheduledFor' in patch) get().scheduleRequest(id, scheduledFor, { markScheduled: false })
          if (!Object.keys(rest).length) return
          patchRequest(id, rest)
          const what = rest.priority && Object.keys(rest).length === 1 ? `priority set to ${rest.priority}` : Object.keys(rest).join(', ')
          log('updated request', `#${r.number} ${rest.title ?? r.title} — ${what}`, 'request')
        },
        scheduleRequest: (id, date, options) => {
          const r = get().requests.find((x) => x.id === id)
          if (!r) return
          const markScheduled = options?.markScheduled ?? true
          const actor = me()
          const ownerLink = `/owner/maintenance/${id}`
          if (date) {
            const promote = markScheduled && (r.status === 'submitted' || r.status === 'assigned')
            if (r.scheduledFor === date && !promote) return
            const events = [...(r.events ?? []), reqEvent({ type: 'schedule', date })]
            let assignedToId = r.assignedToId
            const office = staffOf(actor)
            if (promote && !assignedToId && office) {
              assignedToId = office.id
              events.push(reqEvent({ type: 'assignee', assigneeId: office.id }))
            }
            if (promote) events.push(reqEvent({ type: 'status', status: 'scheduled' }))
            patchRequest(id, { scheduledFor: date, status: promote ? 'scheduled' : r.status, assignedToId, events })
            log('scheduled request', `#${r.number} ${r.title} — ${formatDateShort(date)}`, 'request')
            notify(r.homeownerId, `Request #${r.number} scheduled`, `${r.title} — scheduled for ${formatDateShort(date)}.`, ownerLink, { key: `req:${id}:schedule` })
            return
          }
          if (!r.scheduledFor) return
          // Without a date it isn't "Scheduled" any more.
          const status: RequestStatus = r.status === 'scheduled' ? (r.assignedToId ? 'assigned' : 'submitted') : r.status
          const events = [...(r.events ?? []), reqEvent({ type: 'schedule', date: null }), ...(status !== r.status ? [reqEvent({ type: 'status', status })] : [])]
          patchRequest(id, { scheduledFor: undefined, status, events })
          log('cleared request date', `#${r.number} ${r.title}`, 'request')
          notify(r.homeownerId, `Request #${r.number}: new date to follow`, `${r.title} — we’ll confirm a new date with you.`, ownerLink, { key: `req:${id}:schedule` })
        },
        setRequestStatus: (id, status, note) => {
          const r = get().requests.find((x) => x.id === id)
          if (!r) return
          const actor = me()
          const text = note?.trim() ?? ''
          if (status === r.status && !text) return
          const at = nowIso()
          const by = actorId()

          if (actor?.id === r.homeownerId) {
            // A Home Owner can only confirm that a resolved request is fixed. It's a status event, not a chat message.
            if (!(status === 'closed' && r.status === 'resolved')) return
            patchRequest(id, { status: 'closed', events: [...(r.events ?? []), reqEvent({ type: 'status', status: 'closed', note: text || 'Confirmed the fix' })] })
            log('confirmed request is fixed', `#${r.number} ${r.title}`, 'request')
            notify('role:staff', `Request #${r.number} closed`, `${actor.name} confirmed “${r.title}” is fixed.`, `/staff/requests/${id}`, { perm: 'requests.manage' })
            return
          }

          const events = [...(r.events ?? [])]
          let assignedToId = r.assignedToId
          if (status === 'submitted' && assignedToId) {
            // Back in the queue: nobody is assigned yet.
            assignedToId = undefined
            events.push(reqEvent({ type: 'assignee', assigneeId: null }))
          } else if ((status === 'assigned' || status === 'scheduled' || status === 'in-progress') && !assignedToId && staffOf(actor)) {
            // Work can't be assigned to nobody: the person moving it takes it.
            assignedToId = actor?.id
            events.push(reqEvent({ type: 'assignee', assigneeId: actor?.id ?? null }))
          }
          if (status !== r.status) events.push(reqEvent({ type: 'status', status, ...(text ? { note: text } : {}) }))
          const comments = text ? [...r.comments, { id: uid('cmt'), authorId: by, authorRole: actor?.role, body: text, at }] : r.comments
          patchRequest(id, { status, assignedToId, events, comments })
          log(status !== r.status ? `marked request ${requestStatus[status].label.toLowerCase()}` : 'sent an update on request', `#${r.number} ${r.title}`, 'request')
          const ownerLink = `/owner/maintenance/${id}`
          if (status === 'scheduled' && status !== r.status && r.scheduledFor) {
            notify(r.homeownerId, `Request #${r.number} scheduled`, `${r.title} — scheduled for ${formatDateShort(r.scheduledFor)}.${text ? ` ${sentence(text)}` : ''}`, ownerLink, { key: `req:${id}:schedule` })
          } else {
            notify(r.homeownerId, status !== r.status ? `Request #${r.number}: ${requestStatus[status].label}` : `Update on request #${r.number}`, text ? sentence(text) : r.title, ownerLink, { key: `req:${id}:status` })
          }
          if (assignedToId && assignedToId !== r.assignedToId && assignedToId !== actor?.id) {
            notify(assignedToId, `You were assigned request #${r.number}`, r.title, `/staff/requests/${id}`, { perm: 'requests.manage' })
          }
        },
        assignRequest: (id, staffId) => {
          const r = get().requests.find((x) => x.id === id)
          if (!r) return { ok: false, error: 'This request no longer exists.' }
          const target = staffId ? activeStaff(staffId) : undefined
          if (staffId && !target) return { ok: false, error: 'Requests can only be assigned to active Staff or Super Admin accounts.' }
          if ((r.assignedToId ?? undefined) === target?.id) return { ok: true }
          let status = r.status
          if (target && status === 'submitted') status = 'assigned'
          if (!target && status === 'assigned') status = 'submitted'
          const events = [...(r.events ?? []), reqEvent({ type: 'assignee', assigneeId: target?.id ?? null }), ...(status !== r.status ? [reqEvent({ type: 'status', status })] : [])]
          patchRequest(id, { assignedToId: target?.id, status, events })
          log(target ? 'assigned request' : 'unassigned request', `#${r.number} ${r.title}${target ? ` → ${target.name}` : ''}`, 'request')
          if (target) {
            notify(r.homeownerId, `Request #${r.number} assigned`, `${target.name} is handling “${r.title}”.`, `/owner/maintenance/${id}`, { key: `req:${id}:assignee` })
            if (target.id !== me()?.id) notify(target.id, `You were assigned request #${r.number}`, r.title, `/staff/requests/${id}`, { perm: 'requests.manage' })
          }
          return { ok: true }
        },
        addRequestComment: (id, body, internal) => {
          const r = get().requests.find((x) => x.id === id)
          const text = body.trim()
          if (!r || !text) return
          const actor = me()
          const by = actorId()
          const byOwner = actor?.id === r.homeownerId
          const isInternal = !!internal && !byOwner
          patchRequest(id, { comments: [...r.comments, { id: uid('cmt'), authorId: by, authorRole: actor?.role, body: text, at: nowIso(), ...(isInternal ? { internal: true } : {}) }] })
          log(isInternal ? 'added internal note' : 'commented on request', `#${r.number} ${r.title}`, 'request')
          if (isInternal) return
          if (byOwner) notify('role:staff', `New message on request #${r.number}`, `${nameOf(by)}: ${excerpt(text)}`, `/staff/requests/${id}`, { perm: 'requests.manage' })
          else notify(r.homeownerId, `New message on request #${r.number}`, `${nameOf(by)}: ${excerpt(text)}`, `/owner/maintenance/${id}`)
        },

        /* -------------------------------- leads --------------------------- */
        createLead: (input) => {
          const email = normalizeEmail(input.email)
          const message = input.message.trim()
          const recent = get().leads.find((l) => l.email === email && l.message === message && isRecent(l.createdAt))
          if (recent) return recent
          const home = input.homeId ? get().homes.find((h) => h.id === input.homeId) : undefined
          const firstName = collapseSpaces(input.firstName)
          const lastName = collapseSpaces(input.lastName)
          const lead: Lead = {
            id: uid('led'),
            firstName,
            lastName,
            email,
            phone: input.phone.trim() ? normalizePhone(input.phone) : '',
            interest: input.interest,
            ...(input.modelSlug ? { modelSlug: input.modelSlug } : {}),
            ...(input.bestTime ? { bestTime: input.bestTime } : {}),
            message,
            source: input.source?.trim() || (home ? `Listing: ${home.title}` : 'Website contact form'),
            status: 'new',
            createdAt: nowIso(),
            ...(home ? { homeId: home.id, homeSlug: home.slug, homeTitle: home.title } : {}),
          }
          set((s) => ({ leads: [lead, ...s.leads] }))
          log('submitted inquiry', `${firstName} ${lastName}${home ? ` — ${home.title}` : ''}`, 'lead', 'guest')
          notify('role:staff', 'New website inquiry', `${firstName} ${lastName}${home ? ` · ${home.title}` : ''} — ${excerpt(message, 70)}`, '/staff/leads', { perm: 'leads.view' })
          return lead
        },
        updateLead: (id, patch) => {
          const l = get().leads.find((x) => x.id === id)
          if (!l) return
          const clean = { ...patch }
          if ('assignedToId' in clean && clean.assignedToId && !activeStaff(clean.assignedToId)) delete clean.assignedToId
          set((s) => ({ leads: s.leads.map((x) => (x.id === id ? { ...x, ...clean } : x)) }))
          log('updated lead', `${l.firstName} ${l.lastName}`, 'lead')
        },
        deleteLead: (id) => {
          const l = get().leads.find((x) => x.id === id)
          set((s) => ({ leads: s.leads.filter((x) => x.id !== id) }))
          log('deleted lead', l ? `${l.firstName} ${l.lastName}` : id, 'lead')
        },

        /* ---------------------------- notifications ----------------------- */
        markNotificationRead: (id) => {
          const s = get()
          const meId = s.sessionUserId
          if (!meId || s.impersonatorId) return
          if (!s.notifications.some((n) => n.id === id && !n.readBy.includes(meId))) return
          set((st) => ({ notifications: st.notifications.map((n) => (n.id === id && !n.readBy.includes(meId) ? { ...n, readBy: [...n.readBy, meId] } : n)) }))
        },
        markAllNotificationsRead: () => {
          const s = get()
          const user = me()
          if (!user || s.impersonatorId) return
          const perms = s.settings.staffPermissions
          if (!s.notifications.some((n) => isForUser(n, user, perms) && !n.readBy.includes(user.id))) return
          set((st) => ({
            notifications: st.notifications.map((n) => (isForUser(n, user, perms) && !n.readBy.includes(user.id) ? { ...n, readBy: [...n.readBy, user.id] } : n)),
          }))
        },
        markNotificationsReadForPath: (path) => {
          const s = get()
          const user = me()
          if (!user || s.impersonatorId) return
          const perms = s.settings.staffPermissions
          const hit = (n: Notification) => !n.readBy.includes(user.id) && samePath(n.link, path) && isForUser(n, user, perms)
          if (!s.notifications.some(hit)) return
          set((st) => ({ notifications: st.notifications.map((n) => (hit(n) ? { ...n, readBy: [...n.readBy, user.id] } : n)) }))
        },

        /* ------------------------------- settings ------------------------- */
        updateSettings: (patch) => {
          set((s) => ({ settings: { ...s.settings, ...patch } }))
          const names: Record<string, string> = { office: 'office details', booking: 'booking hours', staffPermissions: 'staff permissions', features: 'features', categories: 'request types' }
          log('updated settings', Object.keys(patch).map((k) => names[k] ?? k).join(', '), 'settings')
        },
        setFeature: (key, value) => {
          set((s) => ({ settings: { ...s.settings, features: { ...s.settings.features, [key]: value } } }))
          log(value ? 'enabled feature' : 'disabled feature', key, 'settings')
        },
        setCategoryEnabled: (key, value) => {
          set((s) => ({ settings: { ...s.settings, categories: { ...s.settings.categories, [key]: value } } }))
          log(value ? 'enabled request category' : 'disabled request category', requestCategories[key].label, 'settings')
        },
        setStaffPermission: (permission, granted) => {
          set((s) => {
            const current = new Set(s.settings.staffPermissions)
            if (granted) current.add(permission)
            else current.delete(permission)
            return { settings: { ...s.settings, staffPermissions: [...current] } }
          })
          log(granted ? 'granted staff permission' : 'revoked staff permission', permission, 'settings')
        },

        /* --------------------------------- demo --------------------------- */
        resetDemo: () => {
          const s = get()
          // "View as" ends: the Super Admin who was viewing stays signed in.
          const keepId = s.impersonatorId ?? s.sessionUserId
          const keep = findUser(keepId)
          const fresh = initialData()
          let user = keep ? fresh.users.find((u) => u.id === keep.id) : undefined
          if (!user && keep) {
            // An account created during the demo doesn't exist in the sample data: use the sample account for the same role.
            const stand = demoAccounts.find((d) => d.role === keep.role)
            user = fresh.users.find((u) => u.id === stand?.id)
          }
          storageFullShown = false
          set({ ...fresh, sessionUserId: user?.id ?? null, impersonatorId: null })
          rememberLastSession({ userId: user?.id ?? null, impersonatorId: null })
          return { user: user ?? null, switched: !!user && user.id !== keepId }
        },
      }
    },
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: safeStorage,
      // Only the demo data is shared; who is signed in stays with each tab.
      partialize: (s) => pickData(s),
      // Older saved shapes are replaced with fresh sample data.
      migrate: () => initialData(),
      merge: (persisted, current) => (isDemoData(persisted) ? { ...current, ...pickData({ ...pickData(current), ...persisted } as DemoData) } : current),
    },
  ),
)

/* ------------------------------------------------------------------ */
/* After loading: fresh data for a new definition, current dates,       */
/* a valid session — and live sync with other tabs                      */
/* ------------------------------------------------------------------ */

/** Moves the saved dates forward when the data was saved on an earlier day. */
function refreshDates() {
  const s = useAppStore.getState()
  const asOf = s.datesAsOf ? toIsoDate(new Date(s.datesAsOf)) : null
  const today = todayIso()
  if (!asOf) {
    useAppStore.setState({ datesAsOf: nowIso() })
    return
  }
  if (asOf >= today) return
  useAppStore.setState({ ...shiftDates(pickData(s), daysBetween(asOf, today)), datesAsOf: nowIso() })
}

/** Signs this tab out (or back to the Super Admin) when its account was deleted or disabled elsewhere. */
function validateSession() {
  const s = useAppStore.getState()
  if (!s.sessionUserId && !s.impersonatorId) return
  const user = s.users.find((u) => u.id === s.sessionUserId)
  const admin = s.impersonatorId ? s.users.find((u) => u.id === s.impersonatorId) : undefined
  if (s.impersonatorId && (!admin || admin.role !== 'admin' || admin.status === 'disabled')) {
    useAppStore.setState({ sessionUserId: null, impersonatorId: null })
    writeTabSession({ userId: null, impersonatorId: null })
    toast.info('You’ve been signed out', 'Your Super Admin account was changed in another window.')
    return
  }
  if (!user || user.status === 'disabled') {
    const why = user ? 'was disabled' : 'no longer exists'
    if (admin) {
      useAppStore.setState({ sessionUserId: admin.id, impersonatorId: null })
      writeTabSession({ userId: admin.id, impersonatorId: null })
      toast.info('Back to your Super Admin view', `The account you were viewing as ${why}.`)
      return
    }
    useAppStore.setState({ sessionUserId: null, impersonatorId: null })
    writeTabSession({ userId: null, impersonatorId: null })
    toast.info('You’ve been signed out', `This account ${why}.`)
  }
}

/**
 * Brings the public listings (listings.ts — the client's real homes) up to date in saved data while keeping
 * everything else the demo changed. A listing assigned to a Home Owner keeps its owner (and stays off the market).
 */
function refreshListings(s: DemoData): Partial<DemoData> {
  const fresh = createPublicListings()
  const freshIds = new Set(fresh.map((h) => h.id))
  const previous = new Set(s.listingIds ?? [])
  const byId = new Map(s.homes.map((h) => [h.id, h]))
  const linked = (id: string) => s.agreements.some((a) => a.homeId === id) || s.appointments.some((a) => a.homeId === id) || s.requests.some((r) => r.homeId === id)
  const listings = fresh.map((h): Home => {
    const old = byId.get(h.id)
    const view3d = { ...h.view3d, hasCustomModel: old?.view3d.hasCustomModel ?? false }
    if (!old?.ownerId) return { ...h, view3d }
    return { ...h, view3d, ownerId: old.ownerId, status: FOR_SALE.includes(h.status) ? 'under-contract' : h.status }
  })
  // Owned demo homes and homes staff created stay; a listing that was removed from listings.ts stays only if
  // someone depends on it.
  const others = s.homes.filter((h) => !freshIds.has(h.id) && (!previous.has(h.id) || !!h.ownerId || linked(h.id)))
  return { homes: [...listings, ...others], listingIds: fresh.map((h) => h.id), listingsFingerprint: LISTINGS_FINGERPRINT }
}

function afterLoad() {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    /* storage blocked */
  }
  const s = useAppStore.getState()
  if (!stored) {
    // First visit: save the sample data so every tab shares the same copy.
    useAppStore.setState({})
  } else if (s.seedFingerprint !== SEED_FINGERPRINT && !s.modified) {
    // The sample data changed since this browser saved it and nothing was changed here: use the new sample data.
    useAppStore.setState({ ...initialData() })
  } else if (s.listingsFingerprint !== LISTINGS_FINGERPRINT) {
    // The demo was used: keep its changes, but show the current public listings.
    useAppStore.setState(refreshListings(pickData(s)))
  }
  refreshDates()
  validateSession()
  writeTabSession({ userId: useAppStore.getState().sessionUserId, impersonatorId: useAppStore.getState().impersonatorId })
}

afterLoad()

// Keep this tab's sign-in in sessionStorage whenever it changes.
useAppStore.subscribe((s, prev) => {
  if (s.sessionUserId !== prev.sessionUserId || s.impersonatorId !== prev.impersonatorId) {
    writeTabSession({ userId: s.sessionUserId, impersonatorId: s.impersonatorId })
  }
})

if (typeof window !== 'undefined') {
  // Another tab saved: load its data (this tab keeps its own sign-in).
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return
    void useAppStore.persist.rehydrate().then(() => {
      refreshDates()
      validateSession()
    })
  }
  // A tab left open overnight catches up when it's shown again.
  const onVisible = () => {
    if (document.visibilityState === 'visible') refreshDates()
  }
  window.addEventListener('storage', onStorage)
  document.addEventListener('visibilitychange', onVisible)
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisible)
    })
  }

  // Handy for demos and automated checks: window.__demo.loginAs('usr_sarah')
  ;(window as unknown as { __demo: unknown }).__demo = {
    store: useAppStore,
    /** Signs in by id or email; returns false (and logs why) for missing or disabled accounts. */
    loginAs: (idOrEmail: string) => {
      const s = useAppStore.getState()
      const key = idOrEmail.trim().toLowerCase()
      const u = s.users.find((x) => x.id === idOrEmail || x.email.toLowerCase() === key)
      if (!u) return false
      const result = s.loginAs(u.id)
      if (!result.ok) console.warn(`[demo] ${result.error}`)
      return result.ok
    },
    reset: () => useAppStore.getState().resetDemo(),
  }
}
