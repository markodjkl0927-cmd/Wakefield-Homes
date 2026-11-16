import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowDown, ArrowUp, Bath, BedDouble, ChevronsUpDown, Ruler, Search, SearchX, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'
import { matchesQuery } from '@/lib/utils'
import { PRICE_AS_OF } from '@/data/models'
import { Badge, Button, Card, EmptyState, Field, Input, Select, SmartImage, Table, TBody, TD, TH, THead, TR } from '@/components/ui'
import { Spec } from '@/components/site/cards'
import { useOffice } from '@/store/hooks'
import { priceListPlans, priceListSqft, priceListStyles, sortPlans, type PriceListPlan, type SortDir, type SortKey } from './pricing'

interface SortState {
  key: SortKey
  dir: SortDir
}

const columns: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'name', label: 'Plan' },
  { key: 'style', label: 'Style' },
  { key: 'beds', label: 'Beds' },
  { key: 'baths', label: 'Baths' },
  { key: 'sqft', label: 'Sq ft' },
  { key: 'price', label: 'Base price', align: 'right' },
]

/** Sort choices for small screens, where there are no column headers to click. */
const sortChoices: { value: string; label: string; sort: SortState }[] = [
  { value: 'price-asc', label: 'Lowest price', sort: { key: 'price', dir: 'asc' } },
  { value: 'price-desc', label: 'Highest price', sort: { key: 'price', dir: 'desc' } },
  { value: 'name-asc', label: 'Name A–Z', sort: { key: 'name', dir: 'asc' } },
  { value: 'sqft-asc', label: 'Smallest first', sort: { key: 'sqft', dir: 'asc' } },
  { value: 'sqft-desc', label: 'Largest first', sort: { key: 'sqft', dir: 'desc' } },
]

const modelPath = (m: PriceListPlan) => `/our-homes/models/${m.slug}`

/** The row's price as published, or its note ("Call for update") as a call link. */
function PriceValue({ plan, size = 'md' }: { plan: PriceListPlan; size?: 'md' | 'lg' }) {
  const office = useOffice()
  if (plan.priceList.price == null) {
    return (
      <a
        href={`tel:${office.phone}`}
        className="relative z-10 inline-flex min-h-10 items-center font-semibold whitespace-nowrap text-brand-800 underline-offset-4 hover:underline lg:min-h-0"
      >
        {plan.priceList.priceNote ?? 'Call for update'}
        <span className="sr-only"> on the price of {plan.name}: {office.phoneDisplay}</span>
      </a>
    )
  }
  return <span className={cn('font-semibold text-ink-900 tabular-nums', size === 'lg' ? 'text-xl' : 'text-base')}>{formatPrice(plan.priceList.price)}</span>
}

/** Extra price published in the row, e.g. "Expanded $963,371" (only rows with a base price have one). */
function priceNote(plan: PriceListPlan) {
  return plan.priceList.price != null ? plan.priceList.priceNote : undefined
}

function SortHeader({ column, sort, onSort }: { column: (typeof columns)[number]; sort: SortState; onSort: (key: SortKey) => void }) {
  const active = sort.key === column.key
  const Icon = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown
  return (
    <TH aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={cn('whitespace-nowrap', column.align === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={() => onSort(column.key)}
        className={cn(
          'group -mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-semibold tracking-wide uppercase transition-colors hover:bg-ink-100 hover:text-ink-900',
          active ? 'text-ink-900' : 'text-ink-500',
          column.align === 'right' && 'flex-row-reverse',
        )}
      >
        {column.label}
        <Icon className={cn('size-3.5', active ? 'text-brand-800' : 'text-ink-400 group-hover:text-ink-600')} aria-hidden />
      </button>
    </TH>
  )
}

/**
 * The live Build On Your Lot price list (as of PRICE_AS_OF): every published row with its own size, beds,
 * baths, style, price and description. Searchable, filterable by style and sortable (table on lg+, cards below).
 */
export function PriceList() {
  const [query, setQuery] = useState('')
  const [style, setStyle] = useState('all')
  const [sort, setSort] = useState<SortState>({ key: 'price', dir: 'asc' })

  const rows = useMemo(() => {
    const list = priceListPlans.filter(
      (m) => (style === 'all' || m.priceList.style === style) && matchesQuery(query, m.name, m.priceList.style, m.priceList.description),
    )
    return sortPlans(list, sort.key, sort.dir)
  }, [query, style, sort])

  const filtersActive = query.trim() !== '' || style !== 'all'
  const clearFilters = () => {
    setQuery('')
    setStyle('all')
  }
  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  const sortValue = `${sort.key}-${sort.dir}`
  const sortIsListed = sortChoices.some((c) => c.value === sortValue)

  return (
    <div>
      {/* Toolbar */}
      <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-200/70 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <Field label="Search plans" className="md:flex-1">
            {(id) => (
              <Input
                id={id}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Plan name, style or feature"
                leftIcon={<Search className="size-4" aria-hidden />}
                autoComplete="off"
                className="h-11"
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-4 md:flex">
            <Field label="Style" className="min-w-0 md:w-56">
              {(id) => (
                <Select id={id} value={style} onChange={(e) => setStyle(e.target.value)} className="h-11">
                  <option value="all">All styles</option>
                  {priceListStyles.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Sort by" className="min-w-0 md:w-52 lg:hidden">
              {(id) => (
                <Select
                  id={id}
                  value={sortIsListed ? sortValue : 'custom'}
                  onChange={(e) => {
                    const choice = sortChoices.find((c) => c.value === e.target.value)
                    if (choice) setSort(choice.sort)
                  }}
                  className="h-11"
                >
                  {!sortIsListed && (
                    <option value="custom" disabled>
                      Custom
                    </option>
                  )}
                  {sortChoices.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </div>
      </div>

      <div className="mt-5 flex min-h-10 flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-600" aria-live="polite">
          Showing <span className="font-semibold text-ink-900">{rows.length}</span> of {priceListPlans.length} plans
          {style !== 'all' && <> · {style}</>}
        </p>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters} leftIcon={<X className="size-4" aria-hidden />} className="h-10">
            Clear filters
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <Card className="mt-3">
          <EmptyState
            icon={<SearchX className="size-6" aria-hidden />}
            title="No plans match your search"
            description="Try another name or style, or clear the filters to see every plan on the price list."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Desktop: sortable table */}
          <div className="mt-3 hidden overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70 lg:block">
            <Table>
              <caption className="sr-only">
                Build On Your Lot base prices as of {PRICE_AS_OF}, subject to change without notice. Column headings are buttons that sort the table.
              </caption>
              <THead>
                <tr>
                  {columns.map((c) => (
                    <SortHeader key={c.key} column={c} sort={sort} onSort={toggleSort} />
                  ))}
                </tr>
              </THead>
              <TBody>
                {rows.map((m) => (
                  <TR key={m.id} className="transition-colors hover:bg-brand-50/40">
                    <TD className="py-4 align-top">
                      <div className="flex items-start gap-4">
                        <Link to={modelPath(m)} tabIndex={-1} aria-hidden className="shrink-0">
                          <SmartImage src={m.image} alt="" className="aspect-[4/3] w-24 rounded-lg ring-1 ring-ink-200/70" />
                        </Link>
                        <div className="max-w-md min-w-0">
                          <div className="flex items-center gap-2">
                            <Link to={modelPath(m)} className="font-semibold text-ink-900 underline-offset-4 hover:text-brand-800 hover:underline">
                              {m.name}
                            </Link>
                            {m.isNew && (
                              <Badge tone="brand" className="bg-brand-900 text-white ring-brand-900">
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-ink-600">{m.priceList.description}</p>
                        </div>
                      </div>
                    </TD>
                    <TD className="py-4 align-top">{m.priceList.style}</TD>
                    <TD className="py-4 align-top tabular-nums">{m.priceList.beds}</TD>
                    <TD className="py-4 align-top tabular-nums">{m.priceList.baths}</TD>
                    <TD className="py-4 align-top whitespace-nowrap tabular-nums">{priceListSqft(m)}</TD>
                    <TD className="py-4 text-right align-top">
                      <PriceValue plan={m} />
                      {priceNote(m) && <p className="mt-0.5 text-xs text-ink-500">{priceNote(m)}</p>}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {/* Mobile and tablet: stacked cards */}
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:hidden">
            {rows.map((m) => (
              <li
                key={m.id}
                className="relative flex flex-col rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-200/70 transition-shadow has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500"
              >
                <div className="flex gap-4">
                  <SmartImage src={m.image} alt="" className="aspect-square w-20 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium tracking-wide text-ink-500 uppercase">{m.priceList.style}</p>
                    <h3 className="mt-0.5 font-display text-lg leading-snug font-semibold text-ink-900">
                      <Link to={modelPath(m)} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
                        {m.name}
                      </Link>
                      {m.isNew && (
                        <Badge tone="brand" className="ml-2 bg-brand-900 align-middle text-white ring-brand-900">
                          New
                        </Badge>
                      )}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      <Spec icon={<BedDouble />}>{m.priceList.beds} beds</Spec>
                      <Spec icon={<Bath />}>{m.priceList.baths} baths</Spec>
                      <Spec icon={<Ruler />}>{priceListSqft(m)} sq ft</Spec>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-600">{m.priceList.description}</p>
                <div className="mt-auto pt-4">
                  <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-3">
                    <span className="text-sm text-ink-500">Base price</span>
                    <PriceValue plan={m} size="lg" />
                  </div>
                  {priceNote(m) && <p className="mt-0.5 text-right text-xs text-ink-500">{priceNote(m)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
