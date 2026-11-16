import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BadgeDollarSign, Calculator, ChartColumn, ChevronDown, Clock, ExternalLink, FileSpreadsheet, House, Lock, Percent, RotateCcw } from 'lucide-react'
import type { Home } from '@/types'
import { getCommunity } from '@/data/communities'
import {
  average,
  basisStats,
  estimateFor,
  median,
  oronocoMarketAnalysis,
  priceBasisLabels,
  type CmaComparable,
  type CmaSale,
  type CmaSubject,
  type PriceBasis,
} from '@/data/marketAnalysis'
import { cn } from '@/lib/cn'
import { formatDate, formatNumber, formatPrice, formatPriceShort, pluralize } from '@/lib/format'
import { useDocumentTitle } from '@/lib/utils'
import { useAppStore } from '@/store'
import { Badge, BarChart, Button, Card, CardBody, CardHeader, Checkbox, Field, Input, Segmented, StatCard, Table, TBody, TD, TH, THead } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { StaffGuard } from './components/common'

/**
 * Market analysis (Staff): the company's comparative market analysis (CMA) for the Oronoco Street
 * townhomes — comparable sales, market figures and estimated prices. The defaults reproduce the
 * spreadsheet; staff can switch the price-per-sq-ft basis, add appreciation and leave comparables out.
 */

type SoldComparable = CmaComparable & { sale: CmaSale }
type CompFilter = 'all' | 'sold' | 'listed'

const analysis = oronocoMarketAnalysis
const BASES: PriceBasis[] = ['average', 'median', 'high', 'low']
const basisWords: Record<PriceBasis, string> = { average: 'the average', median: 'the median', high: 'the highest', low: 'the lowest' }

const isSold = (c: CmaComparable): c is SoldComparable => !!c.sale
const soldComps = analysis.comparables.filter(isSold)
const listedCount = analysis.comparables.length - soldComps.length

/** "207 S Alfred St" → "Alfred": short labels for the chart. */
function streetName(address: string): string {
  return address
    .replace(/^\d+\s+/, '')
    .replace(/^[NSEW]\s+/, '')
    .replace(/\s+(St|Street|Ave|Avenue|Rd|Road)$/, '')
}

/** "1007½ Oronoco Street" → "1007½". */
function houseNumber(address: string): string {
  return address.split(' ')[0]
}

function percent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`
}

/** "4 full, 1 half" (the CMA writes 4/1). */
function bathsLabel(c: CmaComparable): string {
  return c.halfBaths ? `${c.fullBaths} full, ${c.halfBaths} half` : `${c.fullBaths} full`
}

function builtLabel(c: CmaComparable): string {
  return c.condition === 'New' ? `New construction, ${c.yearBuilt}` : `Built ${c.yearBuilt}`
}

/** The appreciation field as a number from 0 to 20 (%). */
function parsePct(value: string): number {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? Math.min(20, Math.max(0, n)) : 0
}

/** "a, b and c" */
function listSentence(items: string[]): string {
  return items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export default function StaffMarket() {
  useDocumentTitle('Market analysis')
  return (
    // Pricing belongs with editing homes ("Update home details, prices, status and photos").
    <StaffGuard permission="homes.edit" title="Market analysis">
      <MarketAnalysisWorkspace />
    </StaffGuard>
  )
}

function MarketAnalysisWorkspace() {
  const homes = useAppStore((s) => s.homes)
  const community = getCommunity(analysis.communityId)
  const [basis, setBasis] = useState<PriceBasis>('average')
  const [appreciation, setAppreciation] = useState('0')
  const [excluded, setExcluded] = useState<ReadonlySet<number>>(() => new Set())

  const pct = parsePct(appreciation)
  const used = useMemo(() => soldComps.filter((c) => !excluded.has(c.n)), [excluded])
  const stats = useMemo(() => basisStats(used.map((c) => c.sale.perSqftFinished)), [used])
  const perSqft = stats ? stats[basis] : null
  const changed = basis !== 'average' || pct !== 0 || excluded.size > 0
  const homesById = useMemo(() => new Map(homes.map((h) => [h.id, h])), [homes])

  const toggleComp = (n: number) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  const reset = () => {
    setBasis('average')
    setAppreciation('0')
    setExcluded(new Set())
  }

  return (
    <>
      <PageHeader
        title="Market analysis"
        description={`Comparable sales in ${analysis.area} and estimated prices for the three ${analysis.name} townhomes, from the company’s comparative market analysis (CMA).`}
        meta={
          <>
            <Badge tone="brand" icon={<FileSpreadsheet className="size-3" aria-hidden />}>
              CMA updated {formatDate(analysis.updated)}
            </Badge>
            <Badge icon={<Lock className="size-3" aria-hidden />}>Staff only, not on the website</Badge>
          </>
        }
        actions={
          community ? (
            <a
              href={`/communities/${community.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-ink-800 shadow-sm ring-1 ring-ink-200 ring-inset hover:bg-ink-50"
            >
              <ExternalLink className="size-4" aria-hidden /> {community.name} on the website<span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : undefined
        }
      />

      <div className="space-y-6">
        <MarketSnapshot />

        <Card>
          <CardHeader
            title="Estimated prices"
            description="Finished square feet × price per finished sq ft of the sold comparables, plus the CMA’s garage / ADU allowance."
            icon={<Calculator className="size-[18px]" aria-hidden />}
          />
          <CardBody className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0">
                <p className="mb-1.5 text-sm font-medium text-ink-800" aria-hidden>
                  Price per finished sq ft
                </p>
                <Segmented ariaLabel="Price per finished sq ft" value={basis} onChange={setBasis} items={BASES.map((b) => ({ value: b, label: priceBasisLabels[b] }))} />
              </div>
              <Field label="Appreciation" htmlFor="cma-appreciation" className="w-full sm:w-36">
                <div className="relative">
                  <Input
                    id="cma-appreciation"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={20}
                    step={0.5}
                    value={appreciation}
                    onChange={(e) => setAppreciation(e.target.value)}
                    className="pr-8 tabular-nums"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-500" aria-hidden>
                    %
                  </span>
                </div>
              </Field>
              {changed && (
                <Button variant="ghost" onClick={reset} leftIcon={<RotateCcw className="size-4" aria-hidden />} className="self-start sm:self-auto">
                  Reset to the CMA
                </Button>
              )}
            </div>

            <p className="text-sm text-ink-600" aria-live="polite">
              {perSqft != null ? (
                <>
                  Using <strong className="font-semibold text-ink-900">{formatPrice(perSqft)}</strong> per finished sq ft — {basisWords[basis]} of {pluralize(used.length, 'sold comparable')}
                  {pct > 0 ? `, plus ${pct}% appreciation` : ''}.
                </>
              ) : (
                'Tick at least one sold comparable below to estimate prices.'
              )}
            </p>

            <ul className="grid grid-cols-1 gap-4 xl:grid-cols-3" aria-label="Estimated prices">
              {analysis.subjects.map((s) => (
                <SubjectCard key={s.homeId} subject={s} stats={stats} perSqft={perSqft} pct={pct} home={homesById.get(s.homeId)} />
              ))}
            </ul>
          </CardBody>
        </Card>

        <Comparables excluded={excluded} onToggleUse={toggleComp} />

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
          <PerSqftChart excluded={excluded} stats={stats} />
          <MethodNotes />
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Market snapshot                                                      */
/* ------------------------------------------------------------------ */

function MarketSnapshot() {
  const prices = soldComps.map((c) => c.sale.price)
  const ratios = soldComps.map((c) => c.sale.price / c.listPrice)
  const days = soldComps.flatMap((c) => (c.daysOnMarket != null ? [c.daysOnMarket] : []))
  const atOrAbove = ratios.filter((r) => r >= 1).length
  return (
    <section aria-labelledby="market-snapshot">
      <h2 id="market-snapshot" className="sr-only">
        Market snapshot
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Comparable homes" value={analysis.comparables.length} icon={<House aria-hidden />} hint={`${soldComps.length} sold · ${listedCount} for sale`} />
        <StatCard label="Median sold price" value={formatPriceShort(median(prices))} icon={<BadgeDollarSign aria-hidden />} tone="emerald" hint={`Average ${formatPriceShort(average(prices))}`} />
        {/* Non-breaking spaces keep a lone word or number from wrapping onto its own line. */}
        <StatCard label="Sold vs. asking" value={percent(average(ratios))} icon={<Percent aria-hidden />} tone="lavender" hint={`${atOrAbove} of ${ratios.length} sold at or above asking`} />
        <StatCard label="Days on market" value={`${median(days)} days`} icon={<Clock aria-hidden />} tone="amber" hint={`Median of sold homes · average ${Math.round(average(days))}`} />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Estimates                                                            */
/* ------------------------------------------------------------------ */

function SubjectCard({
  subject,
  stats,
  perSqft,
  pct,
  home,
}: {
  subject: CmaSubject
  stats: Record<PriceBasis, number> | null
  perSqft: number | null
  pct: number
  home: Home | undefined
}) {
  const est = perSqft != null ? estimateFor(subject, perSqft, pct) : null
  const low = stats ? estimateFor(subject, stats.low, pct).total : null
  const high = stats ? estimateFor(subject, stats.high, pct).total : null
  const website = !home ? 'Not in Homes & 3D' : home.price != null ? formatPrice(home.price) : (home.priceNote ?? 'No price set')
  return (
    // Phones and 1280px+: one column per card. In between, the cards stack and each one splits in two
    // (summary | breakdown), since three columns beside the sidebar would be too narrow.
    <li className="flex flex-col rounded-xl bg-white p-5 ring-1 ring-ink-200 ring-inset sm:grid sm:grid-cols-2 sm:gap-x-8 xl:flex xl:flex-col">
      <div className="flex min-w-0 flex-col">
        {/* Badge first, on its own line, so the three cards line up whatever its length. */}
        <Badge tone={subject.kind === 'New' ? 'brand' : 'violet'} className="self-start">
          {subject.kind}
        </Badge>
        <h3 className="mt-2 font-semibold text-ink-900">{subject.address}</h3>
        <p className="mt-0.5 text-xs text-ink-500">
          “{subject.cmaLabel}” in the CMA · {formatNumber(subject.lotSqft)} sq ft lot
        </p>

        <p className="mt-5 text-sm text-ink-500">Estimated value</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-ink-900 tabular-nums xl:text-[1.75rem]">{est ? formatPrice(est.total) : '—'}</p>
        {low != null && high != null && (
          <p className="mt-1 text-xs text-ink-500">
            Range {formatPriceShort(low)}–{formatPriceShort(high)} across comparables
          </p>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {est && perSqft != null && (
          <dl className="mt-4 space-y-1.5 border-t border-ink-100 pt-3 text-sm sm:mt-0 sm:border-t-0 sm:pt-0 xl:mt-4 xl:border-t xl:pt-3">
            <Line label={`${formatNumber(subject.finishedSqft)} sq ft × ${formatPrice(perSqft)}`} value={formatPrice(est.homeValue)} />
            {est.appreciation > 0 && <Line label={`Appreciation, ${pct}%`} value={`+${formatPrice(est.appreciation)}`} />}
            <Line label={`Garage / ADU, ${formatNumber(subject.garageAdu.sqft)} sq ft`} value={`+${formatPrice(est.garageAdu)}`} />
          </dl>
        )}

        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-ink-100 pt-3 text-sm">
            <span className="min-w-0 text-ink-500">
              Website: <span className="font-medium text-ink-800">{website}</span>
            </span>
            {home && (
              <Link to={`/staff/homes/${home.id}`} aria-label={`Edit home: ${subject.address}`} className="inline-flex items-center gap-1 font-medium text-brand-800 hover:underline">
                Edit home
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

function Line({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="min-w-0 text-ink-500">{label}</dt>
      <dd className="shrink-0 font-medium text-ink-800 tabular-nums">{value}</dd>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Comparables                                                          */
/* ------------------------------------------------------------------ */

function Comparables({ excluded, onToggleUse }: { excluded: ReadonlySet<number>; onToggleUse: (n: number) => void }) {
  const [filter, setFilter] = useState<CompFilter>('all')
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set())
  const rows = analysis.comparables.filter((c) => filter === 'all' || (filter === 'sold') === !!c.sale)
  const toggleOpen = (n: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })

  return (
    <Card>
      <CardHeader
        title="Comparable homes"
        description={`${analysis.comparables.length} homes in ${analysis.area}, as listed in the CMA. Only sold homes have a price per sq ft — untick one to leave it out of the estimates.`}
        icon={<House className="size-[18px]" aria-hidden />}
      />
      <div className="border-b border-ink-100 px-5 py-3 sm:px-6">
        <Segmented
          ariaLabel="Which comparables"
          size="sm"
          value={filter}
          onChange={setFilter}
          items={[
            { value: 'all', label: 'All', count: analysis.comparables.length },
            { value: 'sold', label: 'Sold', count: soldComps.length },
            { value: 'listed', label: 'For sale', count: listedCount },
          ]}
        />
      </div>

      {/* Wide screens: table */}
      <div className="hidden xl:block">
        <Table className="min-w-[860px]">
          <caption className="sr-only">Comparable homes from the CMA{filter === 'all' ? '' : filter === 'sold' ? ', sold only' : ', for sale only'}</caption>
          <THead>
            <tr>
              <TH className="w-16 text-center">Use</TH>
              <TH>Home</TH>
              <TH>Status</TH>
              <TH>Size</TH>
              <TH className="text-right">Price</TH>
              <TH className="text-right whitespace-nowrap">
                Per sq ft<span className="sr-only"> (finished)</span>
              </TH>
              <TH className="text-right">Days</TH>
              <TH className="w-12">
                <span className="sr-only">Details</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((c) => (
              <CompRow key={c.n} comp={c} used={!excluded.has(c.n)} open={open.has(c.n)} onToggleUse={onToggleUse} onToggleOpen={() => toggleOpen(c.n)} />
            ))}
          </TBody>
        </Table>
      </div>

      {/* Phones, tablets and laptops: cards */}
      <ul className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:hidden" aria-label="Comparable homes">
        {rows.map((c) => (
          <CompCard key={c.n} comp={c} used={!excluded.has(c.n)} open={open.has(c.n)} onToggleUse={onToggleUse} onToggleOpen={() => toggleOpen(c.n)} />
        ))}
      </ul>
    </Card>
  )
}

interface CompItemProps {
  comp: CmaComparable
  used: boolean
  open: boolean
  onToggleUse: (n: number) => void
  onToggleOpen: () => void
}

function StatusBadgeFor({ comp }: { comp: CmaComparable }) {
  return comp.sale ? (
    <Badge tone="success" dot>
      Sold
    </Badge>
  ) : (
    <Badge tone="info" dot>
      For sale
    </Badge>
  )
}

function CompRow({ comp: c, used, open, onToggleUse, onToggleOpen }: CompItemProps) {
  const detailsId = `cma-comp-${c.n}`
  return (
    <>
      <tr className={cn(open && 'bg-ink-25')}>
        <TD className="text-center">
          {c.sale ? (
            <label className="relative inline-flex cursor-pointer items-center justify-center p-1">
              <input type="checkbox" className="size-4 rounded border-ink-300 accent-brand-800" checked={used} onChange={() => onToggleUse(c.n)} />
              <span className="sr-only">Use {c.address} in the estimates</span>
            </label>
          ) : (
            <span className="text-ink-300" title="Not sold: no price per sq ft">
              —<span className="sr-only">Not sold, so not used</span>
            </span>
          )}
        </TD>
        <TD>
          <p className="font-semibold whitespace-nowrap text-ink-900">{c.address}</p>
          <p className="text-xs text-ink-500">{[c.style, builtLabel(c)].filter(Boolean).join(' · ')}</p>
        </TD>
        <TD>
          <StatusBadgeFor comp={c} />
          {c.sale && <p className="mt-1 text-xs whitespace-nowrap text-ink-500">{formatDate(c.sale.date)}</p>}
        </TD>
        <TD className="whitespace-nowrap tabular-nums">
          {formatNumber(c.finishedSqft)} sq ft
          <span className="block text-xs text-ink-500">
            {c.beds} beds · {c.fullBaths}/{c.halfBaths} baths<span className="sr-only"> (full/half)</span>
          </span>
        </TD>
        <TD className="text-right whitespace-nowrap tabular-nums">
          {c.sale ? (
            <>
              <span className="font-semibold text-ink-900">{formatPrice(c.sale.price)}</span>
              <span className="block text-xs text-ink-500">Asked {formatPrice(c.listPrice)}</span>
            </>
          ) : (
            <>
              <span className="font-medium text-ink-900">{formatPrice(c.listPrice)}</span>
              <span className="block text-xs text-ink-500">Asking</span>
            </>
          )}
        </TD>
        <TD className="text-right whitespace-nowrap tabular-nums">
          {c.sale ? (
            <>
              <span className={cn('font-semibold', used ? 'text-ink-900' : 'text-ink-400 line-through')}>{formatPrice(c.sale.perSqftFinished)}</span>
              {!used && <span className="sr-only"> (left out)</span>}
            </>
          ) : (
            <span className="text-ink-400">—</span>
          )}
        </TD>
        <TD className="text-right tabular-nums">{c.daysOnMarket ?? <span className="text-ink-400">—</span>}</TD>
        <TD className="text-right">
          <Button variant="ghost" size="icon-sm" aria-expanded={open} aria-controls={detailsId} aria-label={`Details for ${c.address}`} onClick={onToggleOpen}>
            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
          </Button>
        </TD>
      </tr>
      <tr id={detailsId} hidden={!open} className="bg-ink-25">
        <td colSpan={8} className="px-6 pt-1 pb-6">
          <CompDetails comp={c} />
        </td>
      </tr>
    </>
  )
}

function CompCard({ comp: c, used, open, onToggleUse, onToggleOpen }: CompItemProps) {
  const detailsId = `cma-comp-card-${c.n}`
  return (
    <li className="flex flex-col rounded-xl bg-white p-4 ring-1 ring-ink-200 ring-inset">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-ink-900">{c.address}</h3>
          <p className="text-xs text-ink-500">{[c.style, builtLabel(c)].filter(Boolean).join(' · ')}</p>
        </div>
        <StatusBadgeFor comp={c} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <CardStat label={c.sale ? `Sold ${formatDate(c.sale.date)}` : 'Asking'} value={formatPrice(c.sale?.price ?? c.listPrice)} sub={c.sale ? `Asked ${formatPrice(c.listPrice)}` : undefined} />
        <CardStat
          label="Per finished sq ft"
          value={c.sale ? <span className={cn(!used && 'text-ink-400 line-through')}>{formatPrice(c.sale.perSqftFinished)}</span> : '—'}
          sub={c.sale ? `${formatPrice(c.sale.perSqftAboveGrade)} above grade` : 'Not sold'}
        />
        <CardStat label="Beds · baths" value={`${c.beds} beds`} sub={`${bathsLabel(c)} baths`} />
        <CardStat label="Finished sq ft" value={formatNumber(c.finishedSqft)} sub={`${formatNumber(c.aboveGradeSqft)} above grade`} />
        <CardStat label="Lot" value={`${formatNumber(c.lotSqft)} sq ft`} />
        <CardStat label="Days on market" value={c.daysOnMarket ?? '—'} />
      </dl>
      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3">
          {c.sale ? (
            <Checkbox
              label={
                <>
                  Use in estimates<span className="sr-only"> for {c.address}</span>
                </>
              }
              checked={used}
              onChange={() => onToggleUse(c.n)}
            />
          ) : (
            <span className="text-xs text-ink-500">Not sold, so not in the estimates</span>
          )}
          <Button variant="ghost" size="sm" aria-expanded={open} aria-controls={detailsId} onClick={onToggleOpen} rightIcon={<ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />}>
            Details<span className="sr-only"> for {c.address}</span>
          </Button>
        </div>
        <div id={detailsId} hidden={!open} className="mt-3 border-t border-ink-100 pt-3">
          <CompDetails comp={c} />
        </div>
      </div>
    </li>
  )
}

function CardStat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink-900 tabular-nums">{value}</dd>
      {sub && <dd className="text-xs text-ink-500">{sub}</dd>}
    </div>
  )
}

function CompDetails({ comp: c }: { comp: CmaComparable }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Features</p>
        {c.note && <p className="mt-2 text-sm text-amber-800">{c.note}</p>}
        <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm text-ink-700 sm:grid-cols-2">
          {c.features.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-400" aria-hidden />
              {f}
            </li>
          ))}
        </ul>
      </div>
      <dl className="grid grid-cols-1 gap-y-1.5 text-sm sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-1">
        <Fact label="Baths">{bathsLabel(c)}</Fact>
        <Fact label="Above grade">
          {formatNumber(c.aboveGradeSqft)} sq ft{c.sale ? ` · ${formatPrice(c.sale.perSqftAboveGrade)} per sq ft` : ''}
        </Fact>
        <Fact label="Lot">
          {formatNumber(c.lotSqft)} sq ft{c.lotDimensions ? ` (${c.lotDimensions})` : ''}
        </Fact>
        <Fact label="Exterior">{c.exterior}</Fact>
        <Fact label="Parking">{c.parking}</Fact>
        <Fact label="Condition">{c.condition}</Fact>
        <Fact label="Fireplaces">{c.fireplaces || 'None'}</Fact>
        <Fact label="Basement">{c.basement ? 'Yes' : 'No'}</Fact>
        {c.sale && <Fact label="Financing">{c.sale.terms}</Fact>}
      </dl>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-ink-500">{label}</dt>
      <dd className="min-w-0 text-ink-800">{children}</dd>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Chart and notes                                                      */
/* ------------------------------------------------------------------ */

function PerSqftChart({ excluded, stats }: { excluded: ReadonlySet<number>; stats: Record<PriceBasis, number> | null }) {
  return (
    <Card>
      <CardHeader
        title="Price per finished sq ft"
        description="Sold comparables, as given in the CMA. Grey bars are left out of the estimates."
        icon={<ChartColumn className="size-[18px]" aria-hidden />}
      />
      <CardBody>
        <BarChart
          height={190}
          valueFormat={(v) => formatPrice(v)}
          data={soldComps.map((c) => ({ label: streetName(c.address), value: c.sale.perSqftFinished, color: excluded.has(c.n) ? 'var(--color-ink-200)' : undefined }))}
        />
        {stats && (
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BASES.map((b) => (
              <div key={b} className="rounded-lg bg-ink-25 px-3 py-2 ring-1 ring-ink-100 ring-inset">
                <dt className="text-xs text-ink-500">{priceBasisLabels[b]}</dt>
                <dd className="font-semibold text-ink-900 tabular-nums">{formatPrice(stats[b])}</dd>
              </div>
            ))}
          </dl>
        )}
      </CardBody>
    </Card>
  )
}

function MethodNotes() {
  const allowances = listSentence(analysis.subjects.map((s) => `${formatPrice(s.garageAdu.value)} at ${houseNumber(s.address)}`))
  return (
    <Card>
      <CardHeader title="How the estimate works" icon={<Calculator className="size-[18px]" aria-hidden />} />
      <CardBody className="space-y-4 text-sm leading-6 text-ink-700">
        <p>
          Each home’s <strong className="font-semibold text-ink-900">finished square feet</strong> × the <strong className="font-semibold text-ink-900">price per finished sq ft</strong> of the sold
          comparables — the average, as in the CMA, unless you pick another basis — plus the garage / ADU allowance: {allowances}.
        </p>
        <div>
          <p className="font-semibold text-ink-900">Notes in the CMA</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 marker:text-ink-400">
            {analysis.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
        <p className="flex items-start gap-2.5 rounded-lg bg-ink-25 p-3 text-ink-600 ring-1 ring-ink-100 ring-inset">
          <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
          <span>
            Source: {analysis.source}. The comparables’ listing photos stay in the spreadsheet. Only staff see this page — the website keeps each home’s own price or price note, set in Homes &amp; 3D.
          </span>
        </p>
      </CardBody>
    </Card>
  )
}
