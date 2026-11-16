import { useMemo } from 'react'
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'
import type { Agreement, Appointment, AppointmentType, Home, MaintenanceRequest, RequestCategory } from '@/types'
import { useAppStore } from '@/store'
import { toIsoDate } from '@/lib/utils'
import { formatTime } from '@/lib/format'

/*
 * Derived data for the Home Owner portal. Every hook selects a raw store slice and derives with
 * useMemo (Zustand v5 re-renders forever when a selector returns a fresh array/object).
 */

/** 'rescheduled' is no longer produced by the store (office moves are confirmed), but older data may hold it. */
export const ACTIVE_APPOINTMENT_STATUSES: Appointment['status'][] = ['requested', 'confirmed', 'rescheduled']

export function isUpcomingAppointment(a: Appointment, today = toIsoDate(new Date())): boolean {
  return ACTIVE_APPOINTMENT_STATUSES.includes(a.status) && a.date >= today
}

export function isRequestOpen(r: MaintenanceRequest): boolean {
  return r.status !== 'resolved' && r.status !== 'closed'
}

/**
 * Whether the Home Owner has opened the latest version: 'new' when they never opened the document,
 * 'updated' when there's a version they haven't seen, null when they're up to date.
 */
export function agreementFreshness(a: Agreement): 'new' | 'updated' | null {
  if (a.status === 'draft') return null
  const seen = a.seenVersion ?? (a.seenByOwner ? a.version : 0)
  if (!seen) return 'new'
  return seen < a.version ? 'updated' : null
}

/** Same rule as the sidebar badge: awaiting a signature, or a version the owner hasn't opened yet. */
export function agreementNeedsAction(a: Agreement): boolean {
  return a.status === 'awaiting-signature' || agreementFreshness(a) !== null
}

/** The owner's agreements (drafts are staff-only), most urgent first. */
export function useOwnerAgreements(ownerId: string | undefined): Agreement[] {
  const agreements = useAppStore((s) => s.agreements)
  return useMemo(() => {
    if (!ownerId) return []
    return agreements
      .filter((a) => a.homeownerId === ownerId && a.status !== 'draft')
      .sort((a, b) => Number(agreementNeedsAction(b)) - Number(agreementNeedsAction(a)) || b.updatedAt.localeCompare(a.updatedAt))
  }, [agreements, ownerId])
}

const apptKey = (a: Appointment) => `${a.date}T${a.time}`

/** The owner's appointments split into upcoming (soonest first) and past/canceled (latest first). */
export function useOwnerAppointments(ownerId: string | undefined) {
  const appointments = useAppStore((s) => s.appointments)
  return useMemo(() => {
    const today = toIsoDate(new Date())
    const mine = ownerId ? appointments.filter((a) => a.homeownerId === ownerId) : []
    const upcoming = mine.filter((a) => isUpcomingAppointment(a, today)).sort((a, b) => apptKey(a).localeCompare(apptKey(b)))
    const past = mine.filter((a) => !isUpcomingAppointment(a, today)).sort((a, b) => apptKey(b).localeCompare(apptKey(a)))
    return { all: mine, upcoming, past }
  }, [appointments, ownerId])
}

/** The owner's maintenance requests, most recently updated first. */
export function useOwnerRequests(ownerId: string | undefined): MaintenanceRequest[] {
  const requests = useAppStore((s) => s.requests)
  return useMemo(
    () => (ownerId ? requests.filter((r) => r.homeownerId === ownerId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : []),
    [requests, ownerId],
  )
}

export function useHomesById(): Record<string, Home> {
  const homes = useAppStore((s) => s.homes)
  return useMemo(() => Object.fromEntries(homes.map((h) => [h.id, h])), [homes])
}

/** The request types a Super Admin has enabled (Platform settings), in the brief's order. */
export function useEnabledRequestCategories(): RequestCategory[] {
  const categories = useAppStore((s) => s.settings.categories)
  return useMemo(() => (Object.keys(categories) as RequestCategory[]).filter((c) => categories[c]), [categories])
}

const categoryPhrase: Record<RequestCategory, string> = {
  gardening: 'gardening',
  'road-fixing': 'road fixing',
  report: 'reports',
  'house-fix': 'house fixes',
}

/** "Gardening, road fixing & more", "Reports and house fixes", "House fixes" — for the enabled request types. */
export function requestTypesPhrase(enabled: RequestCategory[]): string {
  const words = enabled.map((c) => categoryPhrase[c])
  const text = words.length > 2 ? `${words[0]}, ${words[1]} & more` : words.join(' and ')
  return text ? text[0].toUpperCase() + text.slice(1) : ''
}

const requestNoun: Record<Exclude<RequestCategory, 'report'>, string> = {
  gardening: 'gardening',
  'road-fixing': 'road fixing',
  'house-fix': 'a house fix',
}

/**
 * What the owner can ask for, as the start of a sentence: "Request gardening, road fixing or a house fix,
 * or report a problem", "Request a house fix", "Report a problem" — for the enabled request types.
 */
export function requestActionPhrase(enabled: RequestCategory[]): string {
  const nouns = enabled.filter((c): c is Exclude<RequestCategory, 'report'> => c !== 'report').map((c) => requestNoun[c])
  const list = nouns.length > 1 ? `${nouns.slice(0, -1).join(', ')} or ${nouns[nouns.length - 1]}` : (nouns[0] ?? '')
  const report = enabled.includes('report')
  if (list) return report ? `Request ${list}, or report a problem` : `Request ${list}`
  return report ? 'Report a problem' : ''
}

/* ------------------------------------------------------------------ */
/* Time helpers                                                         */
/* ------------------------------------------------------------------ */

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function fromMinutes(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

/** "10:00 AM – 11:30 AM" */
export function timeRange(time: string, durationMins: number): string {
  return `${formatTime(time)} – ${formatTime(fromMinutes(toMinutes(time) + durationMins))}`
}

/** "1 hr 30 min" */
export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!h) return `${m} min`
  return m ? `${h} hr ${m} min` : `${h} hr`
}

/**
 * A day for use inside a sentence: "today", "tomorrow", "yesterday" or "Fri, Nov 13" — with
 * `{ on: true }` the date gets its preposition ("on Fri, Nov 13") so it reads "Site visit on Fri, Nov 13"
 * and "Site visit tomorrow" alike. (formatDayLabel's "Today" / "Tomorrow" are for labels, not sentences.)
 */
export function dayPhrase(value: string, { on = false }: { on?: boolean } = {}): string {
  const d = parseISO(value)
  if (isToday(d)) return 'today'
  if (isTomorrow(d)) return 'tomorrow'
  if (isYesterday(d)) return 'yesterday'
  const date = format(d, 'EEE, MMM d')
  return on ? `on ${date}` : date
}

/** "tomorrow at 3:00 PM" / "on Fri, Nov 13 at 3:00 PM" */
export function whenPhrase(date: string, time: string, opts?: { on?: boolean }): string {
  return `${dayPhrase(date, opts)} at ${formatTime(time)}`
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** "Monday to Friday" for a contiguous run, otherwise "Mon, Wed, Fri". */
export function describeWorkDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b)
  if (!sorted.length) return 'No days'
  const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1)
  if (contiguous && sorted.length > 2) return `${dayNames[sorted[0]]} to ${dayNames[sorted[sorted.length - 1]]}`
  return sorted.map((d) => dayNames[d].slice(0, 3)).join(', ')
}

export function greetingFor(date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

/* ------------------------------------------------------------------ */
/* Booking defaults                                                     */
/* ------------------------------------------------------------------ */

/** Where each appointment type usually happens. */
export const defaultLocationFor: Record<AppointmentType, Appointment['location']> = {
  consultation: 'office',
  'design-selections': 'office',
  'site-visit': 'home-site',
  walkthrough: 'home-site',
  'warranty-inspection': 'home-site',
  closing: 'office',
  'office-meeting': 'office',
}

/** Appointment types that don't need to be about a specific home. */
export const homeOptionalTypes: AppointmentType[] = ['consultation', 'office-meeting']

/** Pre-select the most likely home: finished homes for warranty visits, homes being built for the rest. */
export function suggestHomeFor(type: AppointmentType, homes: Home[]): string {
  if (!homes.length || homeOptionalTypes.includes(type)) return ''
  if (homes.length === 1) return homes[0].id
  const building = homes.find((h) => h.status === 'under-construction' || h.status === 'under-contract')
  const finished = homes.find((h) => h.status === 'completed' || h.status === 'sold')
  if (type === 'warranty-inspection') return (finished ?? homes[0]).id
  return (building ?? homes[0]).id
}
