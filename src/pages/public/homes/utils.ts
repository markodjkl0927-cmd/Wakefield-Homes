import type { Community, Home, HomeModel, HomeStatus } from '@/types'
import { formatNumber, formatPrice } from '@/lib/format'
import { smoothBehavior } from '@/components/ui'

/** Order homes are listed in on the public site: for sale first, sold last. */
const STATUS_ORDER: HomeStatus[] = ['available', 'coming-soon', 'under-construction', 'under-contract', 'completed', 'sold']

export function statusRank(status: HomeStatus): number {
  const i = STATUS_ORDER.indexOf(status)
  return i === -1 ? STATUS_ORDER.length : i
}

export function byStatus(a: Home, b: Home): number {
  return statusRank(a.status) - statusRank(b.status)
}

const COMMUNITY_ORDER: Community['status'][] = ['now-selling', 'coming-soon', 'under-construction', 'sold-out']

export function byCommunityStatus(a: Community, b: Community): number {
  return COMMUNITY_ORDER.indexOf(a.status) - COMMUNITY_ORDER.indexOf(b.status)
}

/** The plans we feature in the 3D explorer and first in the Home Gallery's "Featured" order. */
export const POPULAR_PLAN_SLUGS = ['stockton', 'hamilton', 'wellington', 'lexington', 'yorktown', 'plymouth'] as const

/* ------------------------------------------------------------------ */
/* Plan styles                                                          */
/* ------------------------------------------------------------------ */

/**
 * Groups similar architectural styles so filters stay short:
 * "Craftsman Cottage" and "Neo-Craftsman" live under "Craftsman", "Modern Farmhouse" under "Farmhouse", …
 * Styles that match no family keep their own name, so new styles appear automatically.
 */
const STYLE_FAMILIES: { label: string; keywords: string[] }[] = [
  { label: 'Craftsman', keywords: ['craftsman'] },
  { label: 'Farmhouse', keywords: ['farmhouse'] },
  { label: 'Colonial & Federal', keywords: ['colonial', 'federal'] },
  { label: 'Traditional', keywords: ['traditional', 'foursquare'] },
  { label: 'Cottage & Shingle', keywords: ['cottage', 'nantucket', 'shingle'] },
]

export function styleGroup(style: string): string {
  const s = style.toLowerCase()
  return STYLE_FAMILIES.find((f) => f.keywords.some((k) => s.includes(k)))?.label ?? style
}

export function styleGroupSlug(group: string): string {
  return group
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Style groups present in a list of plans, largest first, with counts. */
export function styleGroupsOf(models: HomeModel[]): { label: string; slug: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const m of models) {
    const g = styleGroup(m.style)
    counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, slug: styleGroupSlug(label), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

/* ------------------------------------------------------------------ */
/* Bedrooms                                                             */
/* ------------------------------------------------------------------ */

/** "4–5" -> [4, 5], "4" -> [4, 4]. */
export function bedRange(beds: string): [number, number] {
  const nums = beds.match(/\d+/g)?.map(Number) ?? []
  if (!nums.length) return [0, 0]
  return [Math.min(...nums), Math.max(...nums)]
}

export type BedFilter = 'any' | '4' | '5'

/** "4" = the plan can be built with four bedrooms; "5" = five or more. */
export function matchesBeds(model: HomeModel, filter: BedFilter): boolean {
  if (filter === 'any') return true
  const [min, max] = bedRange(model.beds)
  if (filter === '4') return min <= 4 && max >= 4
  return max >= 5
}

/* ------------------------------------------------------------------ */
/* Listings: price, specs, delivery, location                           */
/* ------------------------------------------------------------------ */

/** Not built yet: unpublished specs read "TBD" (sold or finished homes simply leave them out). */
export function isUnbuilt(home: Home): boolean {
  return home.status === 'coming-soon' || home.status === 'under-construction'
}

/** True when the listing shows a dollar price (sold homes show "Sold" instead of their old asking price). */
export function hasListedPrice(home: Home): boolean {
  return home.status !== 'sold' && home.price != null
}

/** "$2,445,000", or the published wording when there is no price: "Price TBD", "Sold". */
export function homePriceLabel(home: Home): string {
  if (home.status === 'sold') return 'Sold'
  if (home.price != null) return formatPrice(home.price)
  return home.priceNote?.trim() || 'Price TBD'
}

/** The note under a dollar price ("Subject to change", "Plus $20,000 lot premium"). */
export function homePriceNote(home: Home): string | undefined {
  return hasListedPrice(home) ? home.priceNote?.trim() || undefined : undefined
}

export type SpecKey = 'beds' | 'baths' | 'sqft'

/**
 * A spec ready to show: "5", "4.5", "5,046" — "TBD" when it isn't published for a home that isn't built yet,
 * or null when it isn't published for any other home (leave it out).
 */
export function specValue(home: Home, key: SpecKey): string | null {
  if (home.unpublishedSpecs?.includes(key)) return isUnbuilt(home) ? 'TBD' : null
  return key === 'sqft' ? formatNumber(home.sqft) : String(home[key])
}

/** "Spring 2027" -> "Delivery spring 2027"; "December 2026" stays capitalized. Null once the home is finished or sold. */
export function deliveryLabel(home: Home): string | null {
  const when = home.delivery?.trim()
  if (!when || !isUnbuilt(home)) return null
  const text = /^(spring|summer|fall|autumn|winter|early|mid|late)\b/i.test(when) ? when.charAt(0).toLowerCase() + when.slice(1) : when
  return `Delivery ${text}`
}

/**
 * Where a listing is, for location tags: the community's name — or its area for single-home projects,
 * which are named by their address (e.g. "1208 Shenandoah Road" → "Alexandria, VA").
 */
export function listingPlace(home: Home, community?: Community): string {
  if (!community) return home.city
  return community.name === home.address ? community.area : community.name
}

/** Short name for selectors: the part of the title before " · " ("1208 Shenandoah Road · The Hamilton" → "1208 Shenandoah Road"). */
export function shortTitle(title: string): string {
  return title.split(' · ')[0]?.trim() || title
}

export function formatAcres(acres: number | undefined): string | null {
  if (acres == null) return null
  if (acres === 0.5) return '½ acre'
  if (acres === 0.25) return '¼ acre'
  return `${acres.toFixed(2).replace(/0$/, '')} acre`
}

/** Label for the main call to action on a listing, by status: homes not built yet take registrations of interest. */
export function tourLabel(status: HomeStatus): string {
  return status === 'coming-soon' || status === 'under-construction' ? 'Register interest' : 'Schedule a tour'
}

/** Name without the leading "The " — for sorting and short labels. */
export function bareName(name: string): string {
  return name.replace(/^The\s+/i, '')
}

/* ------------------------------------------------------------------ */
/* In-page navigation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Scrolls to a section (smoothly, unless the visitor prefers reduced motion) and moves keyboard focus there,
 * for in-page "jump" buttons. Focus goes to the section's first heading, or — with `focus: 'self'` — to the
 * element itself (give it an accessible name), so the next Tab continues inside it.
 */
export function scrollToSection(id: string, { focus = 'heading' }: { focus?: 'heading' | 'self' } = {}) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: smoothBehavior(), block: 'start' })
  const target = focus === 'self' ? el : (el.querySelector<HTMLElement>('h2, h3') ?? el)
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
  target.setAttribute('data-focus-target', '')
  target.focus({ preventScroll: true })
}

/** Runs `fn` once the browser is idle (or after a short delay where requestIdleCallback is missing). Returns a cancel function. */
export function onIdle(fn: () => void, timeout = 2000): () => void {
  if (typeof window === 'undefined') return () => undefined
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(() => fn(), { timeout })
    return () => window.cancelIdleCallback(id)
  }
  const id = setTimeout(fn, 1200)
  return () => clearTimeout(id)
}
