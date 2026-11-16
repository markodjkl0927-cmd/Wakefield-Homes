import { useMemo } from 'react'
import { Link } from 'react-router'
import { BellRing, Eye, FileText, Landmark, MessagesSquare, Phone, Users } from 'lucide-react'
import type { Home, HomeStatus } from '@/types'
import { useDocumentTitle } from '@/lib/utils'
import { pluralize } from '@/lib/format'
import { photos } from '@/data/images'
import { homeStatus } from '@/data/labels'
import { homeModels } from '@/data/models'
import { isForSale, usePublishedHomes, useOffice, useSettings } from '@/store/hooks'
import { Alert, buttonStyles, EmptyState, Segmented, Select, type TabItem } from '@/components/ui'
import { PageHero } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { MortgageCalculator } from '@/components/site/MortgageCalculator'
import { HomeListingCard } from './homes/HomeListingCard'
import { ArrowLink, ValuePoint } from './homes/parts'
import { byStatus } from './homes/utils'
import { useUrlFilters } from './homes/useUrlFilters'

type StatusFilter = 'all' | 'available' | 'coming-soon' | 'under-construction' | 'sold'
type SortKey = 'recommended' | 'price-asc' | 'price-desc' | 'newest'

const FILTERS: StatusFilter[] = ['all', 'available', 'coming-soon', 'under-construction', 'sold']
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Recently updated' },
]

/** On phones the alert's button moves under its text (lined up with it) instead of squeezing it into a narrow column. */
const ALERT_STACK = 'mt-4 max-sm:flex-wrap max-sm:[&>div:last-child]:basis-full max-sm:[&>div:last-child]:pl-8'

type ListingFilters = { status: StatusFilter; sort: SortKey }
const DEFAULT_FILTERS: ListingFilters = { status: 'all', sort: 'recommended' }

function sanitizeFilters(raw: Partial<ListingFilters>): ListingFilters {
  return {
    status: raw.status && FILTERS.includes(raw.status) ? raw.status : 'all',
    sort: raw.sort && SORTS.some((s) => s.value === raw.sort) ? raw.sort : 'recommended',
  }
}

/** The price a home sorts by: none for sold homes or homes without a published price. */
function listPrice(h: Home): number | null {
  return h.status === 'sold' ? null : h.price
}

/** Homes without a price (price TBD, sold) always sort after priced ones. */
function byPrice(dir: 1 | -1) {
  return (a: Home, b: Home) => {
    const pa = listPrice(a)
    const pb = listPrice(b)
    if (pa == null && pb == null) return byStatus(a, b)
    if (pa == null) return 1
    if (pb == null) return -1
    return (pa - pb) * dir
  }
}

/** A home that belongs to a Home Owner is never listed as for sale, whatever its build status. */
function publicStatus(h: Home): Exclude<StatusFilter, 'all'> | null {
  if (h.status === 'sold') return 'sold'
  if (!isForSale(h)) return null
  return h.status === 'available' || h.status === 'coming-soon' || h.status === 'under-construction' ? h.status : null
}

export default function MoveInReadyPage() {
  const office = useOffice()
  const show3d = useSettings().features.view3d
  useDocumentTitle('Move In Ready Homes')
  const published = usePublishedHomes()
  // For sale (available, coming soon, under construction — never a home that belongs to a Home Owner) plus sold examples.
  const homes = useMemo(() => published.filter((h) => publicStatus(h) !== null), [published])
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS, sanitizeFilters)
  const { status: filter, sort } = filters

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: homes.length, available: 0, 'coming-soon': 0, 'under-construction': 0, sold: 0 }
    for (const h of homes) {
      const s = publicStatus(h)
      if (s) c[s] += 1
    }
    return c
  }, [homes])

  const visible = useMemo(() => {
    const list = filter === 'all' ? [...homes] : homes.filter((h) => publicStatus(h) === filter)
    if (sort === 'price-asc') list.sort(byPrice(1))
    else if (sort === 'price-desc') list.sort(byPrice(-1))
    else if (sort === 'newest') list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    else list.sort((a, b) => byStatus(a, b) || Number(b.featured) - Number(a.featured))
    return list
  }, [homes, filter, sort])

  // Statuses with no homes are left out (except the one a shared link asks for), so no filter leads nowhere.
  const filterItems: TabItem<StatusFilter>[] = FILTERS.filter((f) => f === 'all' || f === filter || counts[f] > 0).map((f) => ({
    value: f,
    label: f === 'all' ? 'All homes' : homeStatus[f as HomeStatus].label,
    count: counts[f],
  }))

  const forSaleCount = counts.available + counts['coming-soon'] + counts['under-construction']
  const nothingAvailable = counts.available === 0 && forSaleCount > 0
  const typicalPrice = useMemo(() => homes.find((h) => isForSale(h) && h.price)?.price ?? 1_000_000, [homes])
  const filterLabel = filter === 'all' ? '' : homeStatus[filter as HomeStatus].label.toLowerCase()

  const valuePoints = [
    {
      icon: <Users />,
      title: 'Built by the family',
      body: 'Every home here is a new Wakefield home from the Genuario family, who have been building in Northern Virginia for more than 50 years.',
    },
    {
      icon: <FileText />,
      title: 'Know what’s included',
      body: 'Listings link the home’s brochure and included-features list whenever we publish them, so you can see what comes with it.',
    },
    {
      icon: <Eye />,
      title: 'See it for yourself',
      body: show3d ? 'Visit with our team — or walk around homes marked “3D tour” online first, by day, at dusk or at night.' : 'Visit with our team and see the craftsmanship up close.',
    },
    {
      icon: <MessagesSquare />,
      title: 'Talk to the builder',
      body: 'Questions go straight to the Wakefield team — the people who build the home.',
    },
  ]

  return (
    <>
      <PageHero
        image={photos.hero.oronocoTownhomesDusk}
        eyebrow="Homes for sale"
        title="Move In Ready Homes"
        description={`New Wakefield homes for sale in and around Alexandria, from coming soon to ready to move in.${show3d ? ' Homes marked “3D tour” can be explored online first.' : ''}`}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Move In Ready Homes' }]}
        actions={
          <>
            <Link to="/contact?interest=move-in-ready" className={buttonStyles('white', 'lg')}>
              <MessagesSquare className="size-5" aria-hidden /> Contact our team
            </Link>
            <a href={`tel:${office.phone}`} className={buttonStyles('periwinkle', 'lg')}>
              <Phone className="size-5" aria-hidden /> {office.phoneDisplay}
            </a>
          </>
        }
      >
        {forSaleCount > 0 && (
          <ul className="mt-8 flex flex-wrap gap-2 text-sm text-white" aria-label="Homes for sale at a glance">
            {counts.available > 0 && <li className="rounded-full bg-ink-950/30 px-3 py-1.5 ring-1 ring-white/25 ring-inset">{counts.available} ready to move in</li>}
            {counts['coming-soon'] > 0 && <li className="rounded-full bg-ink-950/30 px-3 py-1.5 ring-1 ring-white/25 ring-inset">{counts['coming-soon']} coming soon</li>}
            {counts['under-construction'] > 0 && (
              <li className="rounded-full bg-ink-950/30 px-3 py-1.5 ring-1 ring-white/25 ring-inset">{counts['under-construction']} under construction</li>
            )}
          </ul>
        )}
      </PageHero>

      <section className="bg-white py-12 sm:py-16" aria-labelledby="listings-title">
        <div className="container-page">
          <h2 id="listings-title" className="sr-only">
            Homes for sale
          </h2>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="mb-2 text-sm font-medium text-ink-800" id="status-filter-label">
                Show
              </p>
              <Segmented
                items={filterItems}
                value={filter}
                onChange={(v) => setFilters({ status: v })}
                ariaLabel="Filter homes by status"
                className="max-sm:[&>button]:min-h-10"
              />
            </div>
            <div className="w-full sm:w-60">
              <label htmlFor="mir-sort" className="mb-2 block text-sm font-medium text-ink-800">
                Sort by
              </label>
              <Select id="mir-sort" value={sort} onChange={(e) => setFilters({ sort: e.target.value as SortKey })}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <p className="mt-6 text-sm text-ink-600" aria-live="polite">
            Showing {pluralize(visible.length, 'home')}
            {filterLabel && ` · ${filterLabel}`}
          </p>

          {nothingAvailable && filter === 'all' && (
            <Alert
              tone="info"
              className={ALERT_STACK}
              title="No homes are ready to move in right now"
              action={
                <Link to="/contact?interest=move-in-ready" className={buttonStyles('primary', 'sm')}>
                  <BellRing className="size-4" aria-hidden /> Get updates
                </Link>
              }
            >
              Here’s what’s coming soon and under construction. Tell us what you’re looking for and a Wakefield representative will contact you.
            </Alert>
          )}

          {visible.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((h) => (
                <HomeListingCard key={h.id} home={h} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl bg-ink-50 ring-1 ring-ink-200/70">
              <EmptyState
                icon={<BellRing className="size-6" aria-hidden />}
                title={homes.length === 0 ? 'New homes are on the way' : `No ${filterLabel ? filterLabel + ' ' : ''}homes right now`}
                description={
                  homes.length === 0
                    ? 'Our next homes will be listed here. Tell us what you’re looking for — or build one of our plans on your own lot.'
                    : 'Try another filter, or tell us what you’re looking for.'
                }
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    {filter !== 'all' && homes.length > 0 && (
                      <button type="button" className={buttonStyles('secondary')} onClick={() => setFilters({ status: 'all' })}>
                        Show all homes
                      </button>
                    )}
                    <Link to="/contact?interest=move-in-ready" className={buttonStyles('primary')}>
                      Get updates
                    </Link>
                    {homes.length === 0 && (
                      <Link to="/our-homes/gallery" className={buttonStyles('secondary')}>
                        Browse {homeModels.length} plans
                      </Link>
                    )}
                  </div>
                }
              />
            </div>
          )}
        </div>
      </section>

      <Section tone="tint">
        <SectionHeading
          eyebrow="Buying a new Wakefield home"
          title="A new home from a family builder"
          description="Every home listed here is a new home built by Wakefield."
        />
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {valuePoints.map((v) => (
            <ValuePoint key={v.title} icon={v.icon} title={v.title}>
              {v.body}
            </ValuePoint>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
          <div>
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-800 ring-1 ring-brand-100" aria-hidden>
              <Landmark className="size-5" />
            </span>
            <h2 className="display-heading mt-5 text-3xl sm:text-4xl">Financing your new home</h2>
            <p className="mt-4 text-lg leading-8 text-ink-600">
              Our preferred local lenders can talk you through your options. Use the estimator to see what a monthly payment could look like.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/finance/home-purchase" className={buttonStyles('primary', 'lg')}>
                Meet our lenders
              </Link>
              <Link to="/finance" className={buttonStyles('periwinkle', 'lg')}>
                Financing overview
              </Link>
            </div>
            <ArrowLink to="/build-on-your-lot" className="mt-5">
              Own land? Build On Your Lot instead
            </ArrowLink>
          </div>
          <MortgageCalculator defaultPrice={typicalPrice} compact />
        </div>
      </Section>

      <CTASection
        title="Not seeing the right home?"
        description={`Tell us what you’re looking for, or ask about building one of our ${homeModels.length} plans on your own lot.`}
      />
    </>
  )
}
