import type { HomeModel, PriceListRow } from '@/types'
import { priceListModels } from '@/data/models'
import { formatNumber } from '@/lib/format'

/** A plan on the live Build On Your Lot price list, with its row exactly as published. */
export type PriceListPlan = HomeModel & { priceList: PriceListRow }
/** A price-list plan with a published base price (every row except "Call for update"). */
export type PricedPlan = PriceListPlan & { priceList: PriceListRow & { price: number } }

/** The 19 plans on the live price list, alphabetically. */
export const priceListPlans: PriceListPlan[] = priceListModels.filter((m): m is PriceListPlan => !!m.priceList)

/** Price-list plans with a published base price (18 of the 19). */
export const pricedPlans: PricedPlan[] = priceListPlans.filter((m): m is PricedPlan => m.priceList.price != null)

/** The plan with the lowest published base price (used for "from $…" teasers). */
export const lowestPricedPlan: PricedPlan = pricedPlans.reduce((min, m) => (m.priceList.price < min.priceList.price ? m : min), pricedPlans[0])

/** The price list's styles, alphabetically (as published, e.g. "Craftsman / Cottage"). */
export const priceListStyles: string[] = [...new Set(priceListPlans.map((m) => m.priceList.style))].sort((a, b) => a.localeCompare(b))

/** "4–5" -> 4.05 so that ranges sort just after the single value. */
export function bedsSortValue(beds: string): number {
  const nums = beds.match(/\d+/g)?.map(Number) ?? [0]
  return nums[0] + (nums[1] ?? nums[0]) / 100
}

/** "3.5" -> 3.5, "5 full, 2 half" -> 5.52 */
export function bathsSortValue(baths: string): number {
  const full = baths.match(/(\d+)\s*full/i)
  const half = baths.match(/(\d+)\s*half/i)
  if (full) return Number(full[1]) + (half ? 0.5 + Number(half[1]) / 100 : 0)
  const n = baths.match(/\d+(\.\d+)?/)
  return n ? Number(n[0]) : 0
}

/** 2,805 (no unit; the column or label provides it). */
export function priceListSqft(m: PriceListPlan): string {
  return formatNumber(m.priceList.sqft)
}

export type SortKey = 'name' | 'style' | 'beds' | 'baths' | 'sqft' | 'price'
export type SortDir = 'asc' | 'desc'

/** Sorts price-list plans by their published row; "Call for update" plans always sink to the bottom when sorting by price. */
export function sortPlans(list: PriceListPlan[], key: SortKey, dir: SortDir): PriceListPlan[] {
  const sign = dir === 'asc' ? 1 : -1
  const byName = (a: PriceListPlan, b: PriceListPlan) => a.name.localeCompare(b.name)
  return [...list].sort((a, b) => {
    const pa = a.priceList
    const pb = b.priceList
    switch (key) {
      case 'price': {
        if (pa.price == null && pb.price == null) return byName(a, b)
        if (pa.price == null) return 1
        if (pb.price == null) return -1
        return sign * (pa.price - pb.price) || byName(a, b)
      }
      case 'sqft':
        return sign * (pa.sqft - pb.sqft) || byName(a, b)
      case 'beds':
        return sign * (bedsSortValue(pa.beds) - bedsSortValue(pb.beds)) || byName(a, b)
      case 'baths':
        return sign * (bathsSortValue(pa.baths) - bathsSortValue(pb.baths)) || byName(a, b)
      case 'style':
        return sign * pa.style.localeCompare(pb.style) || byName(a, b)
      default:
        return sign * byName(a, b)
    }
  })
}
