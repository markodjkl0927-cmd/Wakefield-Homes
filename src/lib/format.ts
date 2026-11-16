import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('en-US')

/** $1,245,000 */
export function formatPrice(value: number | null | undefined): string {
  if (value == null) return 'Call for pricing'
  return usd.format(value)
}

/** $1.25M / $745K — compact price for cards and charts. */
export function formatPriceShort(value: number | null | undefined): string {
  if (value == null) return '—'
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 2).replace(/\.?0+$/, '')}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return usd.format(value)
}

export function formatNumber(value: number): string {
  return num.format(value)
}

/** 3,678 sq ft, or 3,106–4,000 sq ft for a range. */
export function formatSqft(min: number, max?: number | null): string {
  if (max && max !== min) return `${num.format(min)}–${num.format(max)} sq ft`
  return `${num.format(min)} sq ft`
}

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value
}

/** Nov 12, 2026 */
export function formatDate(value: string | Date): string {
  return format(toDate(value), 'MMM d, yyyy')
}

/** Thu, Nov 12 */
export function formatDateShort(value: string | Date): string {
  return format(toDate(value), 'EEE, MMM d')
}

/** Nov 12, 2026 · 2:30 PM */
export function formatDateTime(value: string | Date): string {
  return format(toDate(value), "MMM d, yyyy '·' h:mm a")
}

/** "14:30" -> "2:30 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(2000, 0, 1, h, m)
  return format(d, 'h:mm a')
}

/** Today / Tomorrow / Yesterday / Thu, Nov 12 */
export function formatDayLabel(value: string | Date): string {
  const d = toDate(value)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEE, MMM d')
}

/** "just now" (under a minute), "3 hours ago", or "in 2 days" for future times. */
export function formatRelative(value: string | Date): string {
  const d = toDate(value)
  if (Math.abs(Date.now() - d.getTime()) < 60_000) return 'just now'
  return formatDistanceToNowStrict(d, { addSuffix: true })
}

/** "Jordan Ellis" -> "JE" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** +17033603134 -> (703) 360-3134 */
export function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, '').replace(/^1/, '')
  if (d.length !== 10) return e164
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
