import { useEffect } from 'react'

/** Short unique id with a readable prefix, e.g. uid('apt') -> "apt_k3j9x2qa". */
export function uid(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12)
  return `${prefix}_${rand}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

/* ------------------------------------------------------------------ */
/* Dates (local calendar days as yyyy-mm-dd)                            */
/* ------------------------------------------------------------------ */

/** Office working days: 0 = Sunday … 6 = Saturday. Mirrors the default booking settings. */
export const DEFAULT_WORK_DAYS: readonly number[] = [1, 2, 3, 4, 5]

export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Today's local date as yyyy-mm-dd (never the UTC date). */
export function todayIso(): string {
  return toIsoDate(new Date())
}

/** Parses a yyyy-mm-dd string as a local date (noon, so DST changes never move it to another day). */
export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12)
}

/** yyyy-mm-dd shifted by a number of calendar days. */
export function addDaysIso(iso: string, days: number): string {
  const d = fromIsoDate(iso)
  d.setDate(d.getDate() + days)
  return toIsoDate(d)
}

/** Whole calendar days from `a` to `b` (both yyyy-mm-dd); positive when b is later. */
export function daysBetween(a: string, b: string): number {
  return Math.round((fromIsoDate(b).getTime() - fromIsoDate(a).getTime()) / 864e5)
}

/** ISO date (yyyy-mm-dd) offset by a number of days from today, local time. */
export function isoDateFromToday(days: number): string {
  return addDaysIso(todayIso(), days)
}

/** Full ISO timestamp offset from now by days (and optional hours). */
export function isoFromNow(days: number, hours = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

/** True when the date (yyyy-mm-dd or Date) falls on one of the office's working days. */
export function isWorkDay(date: string | Date, workDays: readonly number[] = DEFAULT_WORK_DAYS): boolean {
  const d = typeof date === 'string' ? fromIsoDate(date) : date
  return workDays.includes(d.getDay())
}

/**
 * Moves a date onto a working day: forward (direction 1, the default) or backward (-1).
 * Dates that already are working days are returned unchanged.
 */
export function snapToWorkDay(iso: string, direction: 1 | -1 = 1, workDays: readonly number[] = DEFAULT_WORK_DAYS): string {
  if (!workDays.length) return iso
  let d = iso
  for (let i = 0; i < 7 && !isWorkDay(d, workDays); i++) d = addDaysIso(d, direction)
  return d
}

/**
 * Calendar offset from today, rolled onto a working day: future dates (and today) move forward to the next
 * working day, past dates move back to the previous one so they stay in the past.
 *   businessDayFromToday(3) on a Thursday -> Monday (Sunday rolls forward)
 */
export function businessDayFromToday(days: number, workDays: readonly number[] = DEFAULT_WORK_DAYS): string {
  return snapToWorkDay(isoDateFromToday(days), days < 0 ? -1 : 1, workDays)
}

/**
 * The n-th working day from today: workDayFromToday(1) is the next working day, workDayFromToday(-1) the
 * previous one, workDayFromToday(0) today (or the next working day when the office is closed today).
 */
export function workDayFromToday(n: number, workDays: readonly number[] = DEFAULT_WORK_DAYS): string {
  let d = todayIso()
  if (n === 0) return snapToWorkDay(d, 1, workDays)
  const step = n > 0 ? 1 : -1
  for (let left = Math.abs(n); left > 0; ) {
    d = addDaysIso(d, step)
    if (isWorkDay(d, workDays)) left--
  }
  return d
}

/** Sets the browser tab title as "<title> · Wakefield Homes". */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Wakefield Homes` : 'Wakefield Homes'
  }, [title])
}

/* ------------------------------------------------------------------ */
/* Images                                                               */
/* ------------------------------------------------------------------ */

/**
 * Downscale an image file to a JPEG data URL so it can be stored with the demo data
 * (photos attached to maintenance requests). Defaults: 1280 px on the longest side, JPEG quality 0.7
 * — roughly 120–250 KB per phone photo.
 */
export async function compressImage(file: File, maxSize = 1280, quality = 0.7): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = url
    })
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    // JPEG has no transparency: paint PNG/WebP cut-outs on white instead of black.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* ------------------------------------------------------------------ */
/* Text                                                                 */
/* ------------------------------------------------------------------ */

/** Case-insensitive "contains" across several fields. */
export function matchesQuery(query: string, ...fields: Array<string | number | null | undefined>): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return fields.some((f) => f != null && String(f).toLowerCase().includes(q))
}

/** Trims and ends the text with a period unless it already ends with punctuation ("Done." / "Done!" stay as they are). */
export function sentence(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (!t) return ''
  return /[.!?…:;]["”’')\]]*$/.test(t) ? t : `${t}.`
}

/** Collapses runs of whitespace and trims, e.g. for typed signatures and names. */
export function collapseSpaces(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

/** "1208 Shenandoah Road!" -> "1208-shenandoah-road" */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/* ------------------------------------------------------------------ */
/* Contact details: one set of rules for every form                     */
/* ------------------------------------------------------------------ */

/** name@example.com — a dot in the domain and a 2+ letter top-level domain. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

/** Normalised form for storing and comparing email addresses. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

const PHONE_CHARS = /^[\d\s()+.-]+$/

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** True when typed with an explicit non-US country code, e.g. "+44 20 7946 0000". */
function isInternationalPhone(value: string): boolean {
  const d = phoneDigits(value)
  return value.trim().startsWith('+') && !(d.length === 11 && d.startsWith('1'))
}

/**
 * Phone numbers the demo accepts: US numbers with 10 digits (or 11 starting with 1), or an international
 * number typed with "+" and its country code (8–15 digits). Only digits, spaces and ( ) + - . are allowed.
 */
export function isValidPhone(value: string, { allowInternational = true }: { allowInternational?: boolean } = {}): boolean {
  const v = value.trim()
  if (!v || !PHONE_CHARS.test(v)) return false
  const d = phoneDigits(v)
  if (isInternationalPhone(v)) return allowInternational && d.length >= 8 && d.length <= 15
  return d.length === 10 || (d.length === 11 && d.startsWith('1'))
}

/** "(703) 555-0100" -> "+17035550100" (the store keeps E.164). Anything unrecognised is returned trimmed. */
export function normalizePhone(value: string): string {
  const v = value.trim()
  const d = phoneDigits(v)
  if (!d) return ''
  if (isInternationalPhone(v)) return `+${d}`
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return v
}

/** Standard error text for an email field, or undefined when it's fine. */
export function emailError(value: string, { required = true }: { required?: boolean } = {}): string | undefined {
  const v = value.trim()
  if (!v) return required ? 'Enter your email address.' : undefined
  return isValidEmail(v) ? undefined : 'Enter an email address like name@example.com.'
}

/** Standard error text for a phone field, or undefined when it's fine. */
export function phoneError(value: string, { required = false }: { required?: boolean } = {}): string | undefined {
  const v = value.trim()
  if (!v) return required ? 'Enter a phone number so we can call you back.' : undefined
  if (!PHONE_CHARS.test(v)) return 'Phone numbers can only contain digits, spaces and ( ) + - .'
  if (isValidPhone(v)) return undefined
  return isInternationalPhone(v) ? 'Enter a full international number, like +44 20 7946 0000.' : 'Enter a 10-digit phone number, like (703) 555-0123.'
}

/* ------------------------------------------------------------------ */
/* Passwords                                                            */
/* ------------------------------------------------------------------ */

const passwordWords = ['Maple', 'Harbor', 'Cedar', 'River', 'Stone', 'Meadow', 'Birch', 'Summit', 'Willow', 'Lantern', 'Porch', 'Ridge', 'Hollin', 'Laurel', 'Oak', 'Potomac']

function randomInt(max: number): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return buf[0] % max
  }
  return Math.floor(Math.random() * max)
}

/** Readable temporary password that is easy to read out over the phone, e.g. "Cedar-Harbor-47". */
export function generateReadablePassword(): string {
  const a = passwordWords[randomInt(passwordWords.length)]
  let b = passwordWords[randomInt(passwordWords.length)]
  while (b === a) b = passwordWords[randomInt(passwordWords.length)]
  return `${a}-${b}-${String(10 + randomInt(90))}`
}
