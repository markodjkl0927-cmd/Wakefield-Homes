/**
 * Comparative market analysis (CMA) for the three Oronoco Street townhomes, transcribed from the company's
 * spreadsheet "CMA Oronoco Master Updated 11-4-26.xlsx" (13 comparable homes in Old Town Alexandria).
 *
 * Internal pricing data for the Staff portal (Market analysis, and the estimate in the home editor) —
 * never shown on the public website, where the homes stay "Price TBD" until staff set a price.
 * Numbers are exactly as in the spreadsheet, including its price-per-sq-ft columns, so the default
 * estimates match its "Oronoco estimated prices" table. Feature text is lightly cleaned up (typos,
 * capitalization). The comparables' listing photos stay in the original file.
 */

export interface CmaSale {
  price: number
  /** ISO date (yyyy-mm-dd). */
  date: string
  terms: 'Cash' | 'Conventional'
  /** Price per sq ft as given in the CMA, based on the assessor's above-grade sq ft. */
  perSqftAboveGrade: number
  /** Price per sq ft as given in the CMA, based on total finished sq ft — the basis of the estimates. */
  perSqftFinished: number
}

export interface CmaComparable {
  /** Comparable number in the spreadsheet (it has no #4). */
  n: number
  address: string
  /** Lot dimensions as written in the CMA, when given. */
  lotDimensions?: string
  lotSqft: number
  yearBuilt: number
  style?: string
  beds: number
  fullBaths: number
  halfBaths: number
  fireplaces: number
  basement: boolean
  /** Total finished sq ft from the listing. */
  finishedSqft: number
  /** Above-grade sq ft from the assessor. */
  aboveGradeSqft: number
  exterior: string
  parking: string
  condition: 'Excellent' | 'New'
  features: string[]
  note?: string
  listPrice: number
  sale?: CmaSale
  daysOnMarket?: number
}

/** One of the homes being priced. */
export interface CmaSubject {
  /** The home in the store (Homes & 3D). */
  homeId: string
  address: string
  /** What the CMA calls it. */
  cmaLabel: string
  kind: string
  lotSqft: number
  finishedSqft: number
  /** The CMA's allowance for the garage / accessory dwelling unit, added to the estimate. */
  garageAdu: { sqft: number; value: number }
}

export interface MarketAnalysis {
  id: string
  communityId: string
  name: string
  area: string
  /** ISO date the CMA was last updated. */
  updated: string
  source: string
  comparables: CmaComparable[]
  subjects: CmaSubject[]
  notes: string[]
}

export const oronocoMarketAnalysis: MarketAnalysis = {
  id: 'cma_oronoco',
  communityId: 'cmt_oronoco',
  name: 'Oronoco Street',
  area: 'Old Town Alexandria',
  updated: '2026-11-04',
  source: 'CMA Oronoco Master, updated 11/4/26 (Excel)',
  notes: ['Year-over-year appreciation expected at 3% through June 2026 — not applied to the estimates.', 'No adjustment for larger lot sizes.'],
  subjects: [
    { homeId: 'hm_oronoco_1007', address: '1007 Oronoco Street', cmaLabel: '1007', kind: 'New', lotSqft: 2400, finishedSqft: 3562, garageAdu: { sqft: 632, value: 225000 } },
    { homeId: 'hm_oronoco_10075', address: '1007½ Oronoco Street', cmaLabel: '1007A', kind: 'New / remodel', lotSqft: 2400, finishedSqft: 2765, garageAdu: { sqft: 398, value: 150000 } },
    { homeId: 'hm_oronoco', address: '1009 Oronoco Street', cmaLabel: '1009', kind: 'New', lotSqft: 2400, finishedSqft: 3335, garageAdu: { sqft: 634, value: 225000 } },
  ],
  comparables: [
    {
      n: 1, address: '533 N Columbus St', lotDimensions: '18 × 94 ft', lotSqft: 1756, yearBuilt: 2017, style: 'Traditional',
      beds: 4, fullBaths: 4, halfBaths: 1, fireplaces: 2, basement: true, finishedSqft: 2696, aboveGradeSqft: 1932,
      exterior: 'HardiePlank', parking: 'Off-street parking for 2', condition: 'Excellent',
      features: ['Finished basement', 'Crown molding', 'Updated kitchen', 'Hardwood flooring', 'Builder-basic primary bath', 'Private patio, or parking for 2 cars'],
      listPrice: 2150000, daysOnMarket: 42,
    },
    {
      n: 2, address: '112 Quay St', lotDimensions: '22 × 74 ft', lotSqft: 2118, yearBuilt: 1971, style: 'Colonial',
      beds: 4, fullBaths: 3, halfBaths: 1, fireplaces: 2, basement: true, finishedSqft: 3100, aboveGradeSqft: 3100,
      exterior: 'Brick', parking: '1-car attached garage', condition: 'Excellent',
      features: ['Herringbone tile flooring in the foyer', 'Hardwood floors', 'Built-in shelves in the living room', 'Open-concept, split-level layout', 'Fireplace'],
      listPrice: 2875000, daysOnMarket: 51,
    },
    {
      n: 3, address: '207 S Alfred St', lotDimensions: '20 × 100 ft', lotSqft: 2008, yearBuilt: 1890, style: 'Traditional',
      beds: 3, fullBaths: 3, halfBaths: 1, fireplaces: 1, basement: true, finishedSqft: 2704, aboveGradeSqft: 2372,
      exterior: 'Brick', parking: 'Off-street parking for 2', condition: 'Excellent',
      features: ['Fully renovated', 'Custom millwork', 'Hardwood floors', 'Quartz countertops', 'Gas stove', 'Kitchen island', 'Farmhouse sink', 'Gas fireplace', 'Private courtyard', 'Primary suite with en-suite bath, soaker tub and marble-tiled shower'],
      listPrice: 2295000, sale: { price: 2295000, date: '2026-04-02', terms: 'Conventional', perSqftAboveGrade: 955, perSqftFinished: 849 }, daysOnMarket: 8,
    },
    {
      n: 5, address: '714 Wythe St', lotDimensions: '22 × 115 ft', lotSqft: 2466, yearBuilt: 2009, style: 'Colonial',
      beds: 5, fullBaths: 4, halfBaths: 1, fireplaces: 2, basement: true, finishedSqft: 3952, aboveGradeSqft: 2964,
      exterior: 'Brick veneer and HardiePlank', parking: 'Off-street parking for 2', condition: 'Excellent',
      features: [
        'Chef’s kitchen with quartz counters, wall oven and microwave, Viking appliances and wine fridge', 'Bar', 'Gas fireplace', 'Built-in shelving', 'Custom carpentry', 'Hardwood flooring',
        'Walk-in closet with custom shelving', 'Glass standing shower with rainfall showerhead', 'Soaker tub', 'Dual vanities', 'Rooftop patio', 'Finished basement with kitchenette', 'Private courtyard',
      ],
      listPrice: 2250000, sale: { price: 2100000, date: '2026-10-19', terms: 'Conventional', perSqftAboveGrade: 708.5, perSqftFinished: 683 }, daysOnMarket: 152,
    },
    {
      n: 6, address: '808 Oronoco St', lotDimensions: '40 × 52 ft', lotSqft: 2070, yearBuilt: 1994, style: 'Colonial',
      beds: 4, fullBaths: 3, halfBaths: 1, fireplaces: 1, basement: true, finishedSqft: 2420, aboveGradeSqft: 1344,
      exterior: 'Brick', parking: '2-car garage', condition: 'Excellent',
      features: ['Coffered ceiling', 'Wood fireplace with stone mantel', 'Built-in bookshelves', 'Two kitchens', 'Sunroom / solarium', 'Updated full bath', 'Finished basement with in-law suite'],
      listPrice: 2290000, sale: { price: 2250000, date: '2026-10-19', terms: 'Cash', perSqftAboveGrade: 1257, perSqftFinished: 930 }, daysOnMarket: 102,
    },
    {
      n: 7, address: '522 Queen St', lotDimensions: '80 × 17 ft', lotSqft: 1419, yearBuilt: 1860, style: 'Federal',
      beds: 3, fullBaths: 3, halfBaths: 1, fireplaces: 2, basement: true, finishedSqft: 3190, aboveGradeSqft: 2132,
      exterior: 'Brick', parking: 'Off-street parking for 2', condition: 'Excellent',
      features: ['Hardwood floors', 'Crown molding', 'Exposed brick', 'Private brick patio', 'Finished basement'],
      listPrice: 2495000, sale: { price: 2650232, date: '2026-05-27', terms: 'Cash', perSqftAboveGrade: 1178, perSqftFinished: 953 }, daysOnMarket: 3,
    },
    {
      n: 8, address: '210 S Pitt St', lotDimensions: '21 × 74 ft', lotSqft: 1598, yearBuilt: 1820, style: 'Traditional',
      beds: 4, fullBaths: 3, halfBaths: 1, fireplaces: 1, basement: true, finishedSqft: 3296, aboveGradeSqft: 2632,
      exterior: 'Brick and masonry', parking: 'None listed', condition: 'Excellent',
      features: [
        'End unit', 'High ceilings with crown molding', 'Wood-burning fireplace', 'Original hardwood floors', 'Chef’s kitchen with high-end appliances and glass cabinets', 'Primary bath with marble tile',
        'Private flagstone patio with mature landscaping', 'Finished basement with high ceilings', 'Copper roof and chimney cap (2020)', 'Copper gutters and downspouts (2018)', 'Water heater, boiler and dishwasher new as of 2021',
      ],
      listPrice: 2295000, sale: { price: 2420000, date: '2026-07-13', terms: 'Cash', perSqftAboveGrade: 919, perSqftFinished: 817 }, daysOnMarket: 5,
    },
    {
      n: 9, address: '109 S Lee St', lotDimensions: '24 × 77 ft', lotSqft: 1881, yearBuilt: 1880, style: 'Colonial',
      beds: 3, fullBaths: 2, halfBaths: 1, fireplaces: 3, basement: false, finishedSqft: 2084, aboveGradeSqft: 2084,
      exterior: 'Brick and masonry', parking: 'None listed', condition: 'Excellent',
      features: [
        'Fully renovated', 'Expanded kitchen with bar, premium appliances, quartz countertops and custom lighting', 'Custom paneling and carpentry throughout', 'Hardwood flooring',
        'Marble tile in the primary bath, standing shower and dual vanities', '3 fireplaces', 'Private courtyard',
      ],
      listPrice: 2300000, sale: { price: 2300000, date: '2026-07-14', terms: 'Cash', perSqftAboveGrade: 1104, perSqftFinished: 1104 }, daysOnMarket: 6,
    },
    {
      n: 10, address: '1018 Pendleton St', lotDimensions: '21 × 121 ft', lotSqft: 2178, yearBuilt: 2027, style: 'Contemporary',
      beds: 5, fullBaths: 5, halfBaths: 2, fireplaces: 1, basement: true, finishedSqft: 4273, aboveGradeSqft: 3458,
      exterior: 'Siding', parking: '2-car detached garage with ADU', condition: 'New',
      features: [
        'New construction', 'Elevator', 'In-law suite / ADU', 'Private patio / courtyard', 'Multi-tiered rooftop terrace', 'Fitness room', 'Wet bar',
        'Architectural breezeway connecting the carriage house to the main house', 'Hardwood flooring', 'Quartz countertops in the kitchen', 'Premium appliances', 'Fireplace',
      ],
      listPrice: 3499000,
    },
    {
      n: 11, address: '121 N West St', lotSqft: 1696, yearBuilt: 2026, style: 'Colonial, contemporary, transitional',
      beds: 4, fullBaths: 4, halfBaths: 1, fireplaces: 0, basement: false, finishedSqft: 2750, aboveGradeSqft: 2750,
      exterior: 'Brick façade and HardiePlank', parking: '2-car attached garage', condition: 'New',
      features: ['New construction', 'Elevator', 'Wet bar', 'Rooftop terrace', 'Chef’s kitchen', 'Premium appliances', 'Panel-matched fridge and range hood', 'Private garden', 'Marble-tiled walk-in shower in the primary suite', 'Floor-to-ceiling windows'],
      listPrice: 2742500,
    },
    {
      n: 12, address: '107 N West St', lotSqft: 1500, yearBuilt: 2026,
      beds: 4, fullBaths: 4, halfBaths: 1, fireplaces: 0, basement: false, finishedSqft: 3010, aboveGradeSqft: 2610,
      exterior: 'Brick façade and HardiePlank', parking: '2-car attached garage', condition: 'New',
      features: [
        'New construction', 'Elevator', 'Wet bar', 'Rooftop terrace', 'Chef’s kitchen', 'Premium appliances', 'Panel-matched fridge and range hood', 'Private garden',
        'Marble-tiled walk-in shower in the primary suite', 'Floor-to-ceiling windows', 'Custom millwork, including an archway into the kitchen', 'Loft',
      ],
      listPrice: 2435000,
    },
    {
      n: 13, address: '220 S Fairfax St', lotDimensions: '22 × 124 ft', lotSqft: 2813, yearBuilt: 1885, style: 'Federal',
      beds: 5, fullBaths: 3, halfBaths: 1, fireplaces: 2, basement: true, finishedSqft: 3680, aboveGradeSqft: 3170,
      exterior: 'Brick', parking: 'None', condition: 'Excellent',
      features: ['Private garden', 'Newly renovated', 'Chef’s kitchen with farm sink', 'Floor-to-ceiling windows in the living room and den', 'Hardwood floors', 'Custom millwork and carpentry', 'Marble-tile bath with glass shower'],
      listPrice: 2995000,
    },
    {
      n: 14, address: '1215 Duke St', lotDimensions: '45 × 101 ft', lotSqft: 4479, yearBuilt: 1880, style: 'Federal',
      beds: 3, fullBaths: 2, halfBaths: 1, fireplaces: 2, basement: true, finishedSqft: 2480, aboveGradeSqft: 2840,
      exterior: 'Brick', parking: '2-car detached garage', condition: 'Excellent',
      note: 'Finished basement, but its below-grade square footage is unavailable.',
      features: [
        'Hardwood floors', 'Custom carpentry and millwork', 'Built-in bookshelves', 'Fireplaces', 'Renovated kitchen with premium appliances', 'Breakfast nook with arched windows',
        'Marble-tile bath with soaker tub and standing shower', 'Second-floor balcony overlooking a private garden', 'Detached 2-car garage', 'Additional driveway parking',
      ],
      listPrice: 2440000,
    },
  ],
}

export const marketAnalyses: MarketAnalysis[] = [oronocoMarketAnalysis]

/** The analysis and subject entry that price a home, if any. */
export function marketAnalysisForHome(homeId: string): { analysis: MarketAnalysis; subject: CmaSubject } | undefined {
  for (const analysis of marketAnalyses) {
    const subject = analysis.subjects.find((s) => s.homeId === homeId)
    if (subject) return { analysis, subject }
  }
  return undefined
}

/* ------------------------------------------------------------------ */
/* Math (the spreadsheet's method)                                      */
/* ------------------------------------------------------------------ */

export type PriceBasis = 'average' | 'median' | 'high' | 'low'

export const priceBasisLabels: Record<PriceBasis, string> = { average: 'Average', median: 'Median', high: 'High', low: 'Low' }

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function average(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Average, median, high and low of a list (null when it is empty). */
export function basisStats(values: readonly number[]): Record<PriceBasis, number> | null {
  if (!values.length) return null
  return { average: average(values), median: median(values), high: Math.max(...values), low: Math.min(...values) }
}

export interface Estimate {
  /** Finished sq ft × price per sq ft. */
  homeValue: number
  appreciation: number
  garageAdu: number
  total: number
}

/**
 * The CMA's estimate: finished sq ft × price per finished sq ft of the sold comparables, plus the
 * garage / ADU allowance. Appreciation (0% in the CMA) applies to the home's value before the allowance.
 */
export function estimateFor(subject: CmaSubject, perSqft: number, appreciationPct = 0): Estimate {
  const homeValue = subject.finishedSqft * perSqft
  const appreciation = homeValue * (appreciationPct / 100)
  return { homeValue, appreciation, garageAdu: subject.garageAdu.value, total: homeValue + appreciation + subject.garageAdu.value }
}

/** The estimate with the CMA's own settings: average of every sold comparable, no appreciation. */
export function defaultEstimate(analysis: MarketAnalysis, subject: CmaSubject): { estimate: Estimate; perSqft: number; soldCount: number } | null {
  const values = analysis.comparables.flatMap((c) => (c.sale ? [c.sale.perSqftFinished] : []))
  const stats = basisStats(values)
  if (!stats) return null
  return { estimate: estimateFor(subject, stats.average), perSqft: stats.average, soldCount: values.length }
}
