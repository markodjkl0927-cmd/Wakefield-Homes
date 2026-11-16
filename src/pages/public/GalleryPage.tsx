import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Box, Info, PencilRuler, Search, SearchX, SlidersHorizontal, X } from 'lucide-react'
import type { HomeModel } from '@/types'
import { cn } from '@/lib/cn'
import { useDocumentTitle, matchesQuery } from '@/lib/utils'
import { pluralize } from '@/lib/format'
import { homeModels, PRICE_AS_OF } from '@/data/models'
import { useSettings } from '@/store/hooks'
import { Button, buttonStyles, Drawer, EmptyState, Input, Segmented, Select, smoothBehavior, type TabItem } from '@/components/ui'
import { PageHero } from '@/components/site/PageHero'
import { CTASection } from '@/components/site/CTASection'
import { ModelCard } from '@/components/site/cards'
import { bareName, matchesBeds, POPULAR_PLAN_SLUGS, styleGroup, styleGroupsOf, styleGroupSlug, type BedFilter } from './homes/utils'
import { useUrlFilters } from './homes/useUrlFilters'

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'size' | 'name'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'size', label: 'Size: largest first' },
  { value: 'name', label: 'Name: A to Z' },
]

const BED_ITEMS: TabItem<BedFilter>[] = [
  { value: 'any', label: 'Any' },
  { value: '4', label: '4 beds' },
  { value: '5', label: '5+ beds' },
]

/** Featured order: new plans, then the plans we feature most, then the rest alphabetically. */
function featuredRank(m: HomeModel): number {
  if (m.isNew) return 0
  const popular = (POPULAR_PLAN_SLUGS as readonly string[]).indexOf(m.slug)
  return popular >= 0 ? 1 + popular : 100
}

/** Plans without a published price always sort last. */
function byPrice(dir: 1 | -1) {
  return (a: HomeModel, b: HomeModel) => {
    if (a.basePrice == null && b.basePrice == null) return bareName(a.name).localeCompare(bareName(b.name))
    if (a.basePrice == null) return 1
    if (b.basePrice == null) return -1
    return (a.basePrice - b.basePrice) * dir
  }
}

const STYLE_GROUPS = styleGroupsOf(homeModels)

type GalleryFilters = { q: string; style: string; beds: BedFilter; sort: SortKey }
const DEFAULT_FILTERS: GalleryFilters = { q: '', style: 'all', beds: 'any', sort: 'featured' }

/** Unknown values in a shared link fall back to the defaults. */
function sanitizeFilters(raw: Partial<GalleryFilters>): GalleryFilters {
  return {
    q: raw.q ?? '',
    style: raw.style && STYLE_GROUPS.some((s) => s.slug === raw.style) ? raw.style : 'all',
    beds: raw.beds === '4' || raw.beds === '5' ? raw.beds : 'any',
    sort: SORTS.some((s) => s.value === raw.sort) ? (raw.sort as SortKey) : 'featured',
  }
}

const sorters: Record<SortKey, (a: HomeModel, b: HomeModel) => number> = {
  featured: (a, b) => featuredRank(a) - featuredRank(b) || bareName(a.name).localeCompare(bareName(b.name)),
  'price-asc': byPrice(1),
  'price-desc': byPrice(-1),
  size: (a, b) => (b.sqftMax ?? b.sqftMin) - (a.sqftMax ?? a.sqftMin),
  name: (a, b) => bareName(a.name).localeCompare(bareName(b.name)),
}

/**
 * The four filter controls. Rendered in the toolbar, and again in the phone/tablet filter panel
 * (with its own id prefix, so labels stay unique while both exist).
 */
function FilterFields({
  idPrefix,
  filters,
  setFilters,
  stacked,
}: {
  idPrefix: string
  filters: GalleryFilters
  setFilters: (patch: Partial<GalleryFilters>) => void
  stacked?: boolean
}) {
  const id = (name: string) => `${idPrefix}-${name}`
  return (
    <>
      <div className={cn(!stacked && 'col-span-2 lg:col-span-1')}>
        <label htmlFor={id('search')} className="mb-1.5 block text-sm font-medium text-ink-800">
          Search plans
        </label>
        <div className="relative">
          <Input
            id={id('search')}
            type="search"
            value={filters.q}
            onChange={(e) => setFilters({ q: e.target.value })}
            placeholder="e.g. loft, porch"
            leftIcon={<Search className="size-4" aria-hidden />}
            className="pr-9 [&::-webkit-search-cancel-button]:hidden"
            autoComplete="off"
          />
          {filters.q && (
            <button
              type="button"
              onClick={() => setFilters({ q: '' })}
              className="absolute inset-y-0 right-1 my-auto flex size-8 items-center justify-center rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-800"
              aria-label="Clear search"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
      <div>
        <label htmlFor={id('style')} className="mb-1.5 block text-sm font-medium text-ink-800">
          Style
        </label>
        <Select id={id('style')} value={filters.style} onChange={(e) => setFilters({ style: e.target.value })}>
          <option value="all">All styles ({homeModels.length})</option>
          {STYLE_GROUPS.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.label} ({s.count})
            </option>
          ))}
        </Select>
      </div>
      <div className={cn(!stacked && 'order-last col-span-2 lg:order-none lg:col-span-1')}>
        <p id={id('beds-label')} className="mb-1.5 text-sm font-medium text-ink-800">
          Bedrooms
        </p>
        <Segmented
          items={BED_ITEMS}
          value={filters.beds}
          onChange={(v) => setFilters({ beds: v })}
          ariaLabel="Bedrooms"
          className="w-full sm:w-auto [&>button]:flex-1 [&>button]:justify-center max-sm:[&>button]:min-h-10"
        />
      </div>
      <div>
        <label htmlFor={id('sort')} className="mb-1.5 block text-sm font-medium text-ink-800">
          Sort by
        </label>
        <Select id={id('sort')} value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value as SortKey })}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
    </>
  )
}

export default function GalleryPage() {
  useDocumentTitle('Home Gallery')
  const show3d = useSettings().features.view3d
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS, sanitizeFilters)
  const { q, style, beds, sort } = filters
  const activeCount = (q.trim() ? 1 : 0) + (style !== 'all' ? 1 : 0) + (beds !== 'any' ? 1 : 0)
  const filtered = activeCount > 0

  const results = useMemo(
    () =>
      homeModels
        .filter((m) => matchesQuery(q, m.name, m.style, m.summary, ...m.highlights))
        .filter((m) => style === 'all' || styleGroupSlug(styleGroup(m.style)) === style)
        .filter((m) => matchesBeds(m, beds))
        .sort(sorters[sort]),
    [q, style, beds, sort],
  )

  const clearFilters = () => setFilters({ q: '', style: 'all', beds: 'any' })
  const styleLabel = STYLE_GROUPS.find((s) => s.slug === style)?.label

  // Phones and tablets: once the toolbar has scrolled away, a floating "Filters" button opens the same filters in a panel.
  const toolbarRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const [showPill, setShowPill] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  useEffect(() => {
    const toolbar = toolbarRef.current
    const list = resultsRef.current
    if (!toolbar || !list) return
    let toolbarInView = true
    let listInView = false
    const update = () => setShowPill(!toolbarInView && listInView)
    const watchToolbar = new IntersectionObserver(
      ([e]) => {
        toolbarInView = e.isIntersecting
        update()
      },
      { rootMargin: '-72px 0px 0px 0px' },
    )
    const watchList = new IntersectionObserver(
      ([e]) => {
        listInView = e.isIntersecting
        update()
      },
      { rootMargin: '0px 0px -96px 0px' },
    )
    watchToolbar.observe(toolbar)
    watchList.observe(list)
    return () => {
      watchToolbar.disconnect()
      watchList.disconnect()
    }
  }, [])

  const showResults = () => {
    setPanelOpen(false)
    resultsRef.current?.scrollIntoView({ behavior: smoothBehavior(), block: 'start' })
  }

  return (
    <>
      <PageHero
        eyebrow="Our Homes"
        title="Home Gallery"
        description={`All ${homeModels.length} Wakefield floor plans in one place. Compare sizes and Build On Your Lot prices${show3d ? ' — then open any plan to walk around it in 3D' : ''}.`}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Our Homes', to: '/our-homes' }, { label: 'Home Gallery' }]}
        size="sm"
      />

      <section className="bg-white pt-8 pb-4 sm:pt-10 sm:pb-6" aria-labelledby="plans-title">
        <div className="container-page">
          <h2 id="plans-title" className="sr-only">
            Floor plans
          </h2>

          {/* Toolbar */}
          <div
            ref={toolbarRef}
            role="search"
            aria-label="Filter floor plans"
            className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-200/70 sm:gap-4 sm:p-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-end"
          >
            <FilterFields idPrefix="gallery" filters={filters} setFilters={setFilters} />
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-700" aria-live="polite">
              <span className="font-semibold text-ink-900">{pluralize(results.length, 'plan')}</span>
              {filtered ? ` of ${homeModels.length}` : ''}
              {styleLabel ? ` · ${styleLabel}` : ''}
              {beds !== 'any' ? ` · ${beds === '4' ? '4 bedrooms' : '5+ bedrooms'}` : ''}
              {q.trim() ? ` · “${q.trim()}”` : ''}
              {filtered && (
                <Button variant="link" size="sm" className="ml-3 align-baseline text-sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-ink-600">
              <Info className="size-3.5 shrink-0 text-brand-700" aria-hidden />
              <span>
                Build On Your Lot base prices as of {PRICE_AS_OF}; subject to change without notice.{' '}
                <Link to="/build-on-your-lot/price-list" className="font-medium text-brand-800 underline underline-offset-2 hover:text-brand-900">
                  Price list
                </Link>
              </span>
            </p>
          </div>

          <div ref={resultsRef} className="scroll-mt-24">
            {results.length > 0 ? (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((m) => (
                  <ModelCard key={m.id} model={m} />
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl bg-ink-50 ring-1 ring-ink-200/70">
                <EmptyState
                  icon={<SearchX className="size-6" aria-hidden />}
                  title="No plans match those filters"
                  description="Try a different style or bedroom count — or tell us what you need. Every plan can be customized."
                  action={
                    <div className="flex flex-wrap justify-center gap-3">
                      <Button variant="secondary" onClick={clearFilters}>
                        Clear filters
                      </Button>
                      <Link to="/contact?interest=custom-home" className={buttonStyles('primary')}>
                        Talk to our team
                      </Link>
                    </div>
                  }
                />
              </div>
            )}
          </div>

          <div className="mt-12 flex flex-col items-start gap-5 rounded-2xl bg-brand-50 p-6 ring-1 ring-brand-100 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-white" aria-hidden>
                {show3d ? <Box className="size-5" /> : <PencilRuler className="size-5" />}
              </span>
              <div>
                <h2 className="text-lg font-semibold text-ink-900">{show3d ? 'Every plan, live in 3D' : 'Every plan can be customized'}</h2>
                <p className="mt-1 max-w-xl text-[15px] leading-7 text-ink-600">
                  {show3d
                    ? 'Open any plan to walk around it, zoom in on the details and see it by day, at dusk or at night.'
                    : 'Options packages let you add or remove features to fit your lot, your family and your budget.'}
                </p>
              </div>
            </div>
            {show3d ? (
              <Link to="/our-homes/models/stockton" className={buttonStyles('periwinkle', 'lg', 'shrink-0')}>
                <Box className="size-5" aria-hidden /> Try it with the Stockton
              </Link>
            ) : (
              <Link to="/build-on-your-lot" className={buttonStyles('periwinkle', 'lg', 'shrink-0')}>
                How Build On Your Lot works
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Floating filter button (below lg), shown while the plan list is on screen and the toolbar is not. */}
      <div
        data-sticky-actions
        className={cn(
          'pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 transition-[opacity,transform] duration-300 lg:hidden',
          showPill && !panelOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        )}
        inert={!showPill || panelOpen}
        aria-hidden={!showPill || panelOpen}
      >
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="pointer-events-auto inline-flex h-12 items-center gap-2.5 rounded-full bg-brand-900 pr-5 pl-4 text-sm font-semibold text-white shadow-pop ring-1 ring-white/20 hover:bg-brand-800"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters
          {activeCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-900 tabular-nums">
              {activeCount}
              <span className="sr-only"> active</span>
            </span>
          )}
          <span className="font-normal text-brand-100" aria-hidden>
            ·
          </span>
          <span className="font-normal text-brand-100">{pluralize(results.length, 'plan')}</span>
        </button>
      </div>

      <Drawer
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Filter plans"
        description={`${pluralize(results.length, 'plan')}${filtered ? ` of ${homeModels.length}` : ''} match`}
        width="md"
        footer={
          <>
            {filtered && (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
            <Button onClick={showResults}>Show {pluralize(results.length, 'plan')}</Button>
          </>
        }
      >
        {/* Focus lands on the panel, not the search box, so phones don't pop the keyboard open. */}
        <div className="grid gap-5 p-5" tabIndex={-1} data-autofocus data-focus-target>
          <FilterFields idPrefix="gallery-panel" filters={filters} setFilters={setFilters} stacked />
        </div>
      </Drawer>

      <CTASection
        title="Found a plan you love?"
        description="Tell us about your lot, your timing and your must-haves. We’ll walk you through how that plan could be built — and customized — for you."
      />
    </>
  )
}
