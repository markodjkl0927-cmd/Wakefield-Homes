import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Clock, ExternalLink, MapPin, MapPinned, Phone } from 'lucide-react'
import type { Community, CommunityStatus } from '@/types'
import { useDocumentTitle } from '@/lib/utils'
import { pluralize } from '@/lib/format'
import { communities, communityStatusLabels, currentCommunities, pastCommunities } from '@/data/communities'
import { licenses, serviceAreas } from '@/data/content'
import { photos } from '@/data/images'
import { Button, EmptyState, Segmented, type TabItem } from '@/components/ui'
import { PageHero } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { CommunityCard } from '@/components/site/cards'
import { heroPrimaryButton, heroSecondaryButton } from './boyl/shared'
import { useOffice } from '@/store/hooks'

type Filter = 'all' | CommunityStatus
const statusOrder: CommunityStatus[] = ['now-selling', 'coming-soon', 'under-construction', 'sold-out']
const filterValues: Filter[] = ['all', ...statusOrder]

const groups: { id: string; eyebrow: string; title: string; description: string; items: Community[] }[] = [
  {
    id: 'current',
    eyebrow: 'Current projects',
    title: 'What we’re building now',
    description: 'New homes for sale, homes under construction and our most recent projects — including some that have already sold.',
    items: currentCommunities,
  },
  {
    id: 'earlier',
    eyebrow: 'Earlier communities',
    title: 'Homes we’ve built',
    description: 'Communities and single homes we have completed across the Alexandria area.',
    items: pastCommunities,
  },
]

/** Match each service area to its local business license (from the Licenses page data). */
function licenseFor(area: string) {
  const key = area.toLowerCase().includes('alexandria') ? 'alexandria' : area.toLowerCase().includes('fairfax') ? 'fairfax' : 'arlington'
  return licenses.find((l) => l.label.toLowerCase().includes(key) && l.label.toLowerCase().includes('business'))
}

export default function CommunitiesPage() {
  const office = useOffice()
  useDocumentTitle('Our Communities')
  const [params, setParams] = useSearchParams()
  const raw = params.get('status')
  const status: Filter = filterValues.includes(raw as Filter) ? (raw as Filter) : 'all'

  const items = useMemo<TabItem<Filter>[]>(
    () => [
      { value: 'all', label: 'All', count: communities.length },
      ...statusOrder.map((s) => ({ value: s, label: communityStatusLabels[s], count: communities.filter((c) => c.status === s).length })),
    ],
    [],
  )
  const visibleGroups = useMemo(
    () => groups.map((g) => ({ ...g, items: status === 'all' ? g.items : g.items.filter((c) => c.status === status) })).filter((g) => g.items.length > 0),
    [status],
  )
  const visibleCount = visibleGroups.reduce((n, g) => n + g.items.length, 0)

  const setStatus = (next: Filter) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'all') p.delete('status')
        else p.set('status', next)
        return p
      },
      { replace: true, preventScrollReset: true },
    )

  const resultLabel =
    status === 'all'
      ? `Showing all ${pluralize(visibleCount, 'community and project', 'communities and projects')}`
      : `Showing ${pluralize(visibleCount, 'result')} · ${communityStatusLabels[status].toLowerCase()}`

  return (
    <>
      <PageHero
        image={photos.hero.twoHomesStreet}
        eyebrow="Alexandria · Fort Hunt · Mount Vernon"
        title="Our communities"
        description="New homes on individual lots and in small subdivisions across the Alexandria area — from Fort Hunt and Mount Vernon to Old Town."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Our Communities' }]}
        actions={
          <>
            <Link to="/move-in-ready" className={heroPrimaryButton}>
              See available homes
            </Link>
            <Link to="/build-on-your-lot" className={heroSecondaryButton}>
              Build On Your Lot
            </Link>
          </>
        }
      />

      <Section>
        {/* Filter */}
        <div className="flex flex-col gap-3 border-b border-ink-200 pb-6 md:flex-row md:items-center md:justify-between">
          {/* Local overrides: 40px tap targets and AA-contrast counts. */}
          <Segmented
            items={items}
            value={status}
            onChange={setStatus}
            ariaLabel="Filter communities by status"
            className="self-start [&>button]:min-h-10 [&>button]:px-3.5 [&_[aria-checked=false]_.tabular-nums]:text-ink-600"
          />
          <p className="text-sm text-ink-600" aria-live="polite">
            {resultLabel}
          </p>
        </div>

        {visibleGroups.length ? (
          visibleGroups.map((g, gi) => (
            <section key={g.id} aria-labelledby={`${g.id}-heading`} className={gi === 0 ? 'mt-12' : 'mt-20'}>
              <SectionHeading
                eyebrow={`${g.eyebrow} · ${g.items.length}`}
                title={<span id={`${g.id}-heading`}>{g.title}</span>}
                description={g.description}
              />
              <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((c) => (
                  <li key={c.id} className="flex">
                    <CommunityCard community={c} className="w-full" />
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <EmptyState
            className="mt-8 rounded-2xl bg-ink-50"
            icon={<MapPin className="size-6" aria-hidden />}
            title="No communities with this status right now"
            description="Check back soon, or see every community and project."
            action={
              <Button variant="secondary" onClick={() => setStatus('all')}>
                Show all communities
              </Button>
            }
          />
        )}
      </Section>

      <Section tone="tint">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="eyebrow">Where we build</p>
            <h2 className="display-heading mt-3 text-3xl sm:text-4xl">Alexandria, Fairfax &amp; Arlington</h2>
            <p className="mt-4 text-lg leading-8 text-ink-600">
              We build new homes on individual lots and in small subdivisions across three Northern Virginia jurisdictions, each with a local business license.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {serviceAreas.map((area) => {
                const license = licenseFor(area)
                return (
                  <li key={area} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-200/70">
                    <MapPinned className="size-5 text-brand-700" aria-hidden />
                    <p className="mt-3 font-semibold text-ink-900">{area}</p>
                    {license && <p className="mt-0.5 text-xs text-ink-500">Business license {license.value}</p>}
                  </li>
                )
              })}
            </ul>
            <div className="mt-8 rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-200/70 sm:p-6">
              <h3 className="text-base font-semibold text-ink-900">Our office</h3>
              <ul className="mt-4 space-y-3 text-sm text-ink-700">
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
                  <span className="min-w-0 wrap-anywhere">
                    {office.address}
                    {office.cityLine && (
                      <>
                        <br />
                        {office.cityLine}
                      </>
                    )}
                  </span>
                </li>
                <li className="flex gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
                  <a href={`tel:${office.phone}`} className="font-semibold text-brand-800 underline-offset-4 hover:underline">
                    {office.phoneDisplay}
                  </a>
                </li>
                <li className="flex gap-3">
                  <Clock className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
                  <span className="min-w-0 wrap-anywhere">{office.hours}</span>
                </li>
              </ul>
              <a
                href={office.mapLink}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-brand-800 underline-offset-4 hover:underline"
              >
                Open in maps <ExternalLink className="size-4" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          </div>
          <div className="min-h-[340px] overflow-hidden rounded-3xl bg-ink-100 shadow-card ring-1 ring-ink-200/70 lg:min-h-0">
            <iframe
              title={`Map showing the Wakefield Homes office at ${office.fullAddress}`}
              src={office.mapEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block h-full min-h-[340px] w-full border-0"
            />
          </div>
        </div>
      </Section>

      <CTASection
        title="Looking for a home in one of our communities?"
        description="Tell us what you’re looking for — a Wakefield representative will contact you to help make your dreams and ideas a reality."
      />
    </>
  )
}
