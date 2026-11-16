import { useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRight, BellRing, Camera, House, LandPlot, MapPin, MessageCircle, Phone, Ruler, Tag } from 'lucide-react'
import type { Community, HomeModel } from '@/types'
import { cn } from '@/lib/cn'
import { useDocumentTitle } from '@/lib/utils'
import { formatPrice, pluralize } from '@/lib/format'
import { communities, communityStatusLabels, getCommunity } from '@/data/communities'
import { getModel, PRICE_AS_OF } from '@/data/models'
import { portfolioHomes, portfolioStatusLabels, type PortfolioHome } from '@/data/portfolio'
import { useAppStore } from '@/store'
import { isForSale, useOffice, usePublishedHomes } from '@/store/hooks'
import { Badge, ButtonLink, buttonStyles, EmptyState, SmartImage } from '@/components/ui'
import { Breadcrumbs, PageHero } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CommunityCard, HomeCard, ModelCard } from '@/components/site/cards'
import { ArrowLink } from './homes/parts'
import { CommunityInquiryForm } from './boyl/CommunityInquiryForm'
import { DocumentList, useScrollToHash } from './boyl/shared'

const statusTone = { 'now-selling': 'success', 'coming-soon': 'info', 'under-construction': 'brand', 'sold-out': 'neutral' } as const
const statusRank: Record<Community['status'], number> = { 'now-selling': 0, 'coming-soon': 1, 'under-construction': 2, 'sold-out': 3 }

/** A single-home project ("1 lot", "Lot 38", "1 townhouse") rather than a community of several homes. */
function isSingleHome(c: Community) {
  return /^(1\b|lot \d+$)/i.test(c.lots.trim())
}

/** "Sold" reads better than "Sold out" for a single home. */
function statusLabel(c: Community) {
  return c.status === 'sold-out' && isSingleHome(c) ? 'Sold' : communityStatusLabels[c.status]
}

/** The published status detail, unless it only repeats the badge ("Sold", "All lots sold"). */
function statusDetail(c: Community) {
  if (!c.statusNote) return undefined
  if (c.status === 'sold-out' && /^(sold|all .*sold|both .*sold)$/i.test(c.statusNote.trim())) return undefined
  return c.statusNote
}

/** Other projects to explore: what's for sale or being built first, then the rest. */
function otherCommunities(current: Community) {
  return communities
    .filter((c) => c.id !== current.id)
    .map((c, i) => ({ c, i }))
    .sort((a, b) => statusRank[a.c.status] - statusRank[b.c.status] || Number(!!b.c.current) - Number(!!a.c.current) || a.i - b.i)
    .slice(0, 3)
    .map(({ c }) => c)
}

interface FactDef {
  key: string
  icon: ReactNode
  label: string
  value: ReactNode
  sub?: string
}

function communityFacts(c: Community): FactDef[] {
  const facts: FactDef[] = [{ key: 'address', icon: <MapPin />, label: 'Address', value: c.address }]
  // "1 lot" adds nothing on a single-home page; "Lot 38" or "3 townhomes" does.
  if (!/^1 lot$/i.test(c.lots.trim())) facts.push({ key: 'lots', icon: <LandPlot />, label: /\blots?\b/i.test(c.lots) ? 'Lots' : 'Homes', value: c.lots })
  if (c.lotSize) facts.push({ key: 'lot-size', icon: <Ruler />, label: 'Lot size', value: c.lotSize })
  if (c.priceFrom != null) {
    // Sold projects keep their published price, labelled as the listing price it was.
    const label = c.status === 'sold-out' ? (isSingleHome(c) ? 'Listed at' : 'Listed from') : isSingleHome(c) ? 'Price' : 'Priced from'
    facts.push({ key: 'price', icon: <Tag />, label, value: formatPrice(c.priceFrom), sub: c.priceNote })
  } else if (c.priceNote) {
    // "Price TBD" under the label "Price" reads as "TBD".
    facts.push({ key: 'price', icon: <Tag />, label: 'Price', value: c.priceNote.replace(/^price\s+/i, '') })
  }
  return facts
}

/** One fact tile. dt/dd stay direct children of the wrapper div, as a <dl> requires. */
function Fact({ fact, className }: { fact: FactDef; className?: string }) {
  return (
    <div className={cn('relative min-w-0 rounded-2xl bg-white py-4 pr-4 pl-12 shadow-card ring-1 ring-ink-200/70 sm:py-5 sm:pr-5 sm:pl-14', className)}>
      <dt className="text-sm text-ink-500">
        <span className="absolute top-4 left-4 text-brand-700 sm:top-5 sm:left-5 [&>svg]:size-5" aria-hidden>
          {fact.icon}
        </span>
        {fact.label}
      </dt>
      <dd className="mt-0.5 font-semibold wrap-anywhere text-ink-900">
        {fact.value}
        {fact.sub && <span className="block text-xs font-normal text-ink-500">{fact.sub}</span>}
      </dd>
    </div>
  )
}

/** Shown beside a single plan card: invites visitors to build that plan on their own lot. */
function BuildItCard({ model }: { model: HomeModel }) {
  const short = model.name.replace(/^The /, 'the ')
  const price = model.priceList?.price
  return (
    <div className="flex h-full w-full flex-col justify-between rounded-2xl bg-brand-50 p-6 ring-1 ring-brand-100 sm:p-7">
      <div>
        <p className="eyebrow">Build On Your Lot</p>
        <h3 className="mt-3 font-display text-2xl font-semibold text-ink-900">Love {short}? Build it on your land.</h3>
        <p className="mt-3 text-sm leading-6 text-ink-700">
          {price != null
            ? `Build On Your Lot base price ${formatPrice(price)} as of ${PRICE_AS_OF}, subject to change without notice. Costs that depend on your lot are priced separately.`
            : 'This plan isn’t on our Build On Your Lot price list — call us and we’ll talk through pricing for your lot.'}
        </p>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <ButtonLink to="/build-on-your-lot" rightIcon={<ArrowRight className="size-4" aria-hidden />}>
          How Build On Your Lot works
        </ButtonLink>
        <ButtonLink to="/build-on-your-lot/price-list" variant="secondary">
          See the price list
        </ButtonLink>
      </div>
    </div>
  )
}

/** Shown beside a single home card: other ways to find the right home. */
function MoreHomesCard() {
  return (
    <div className="flex h-full w-full flex-col justify-between rounded-2xl bg-ink-50 p-6 ring-1 ring-ink-200/70 sm:p-7">
      <div>
        <span className="flex size-11 items-center justify-center rounded-xl bg-white text-brand-800 ring-1 ring-ink-200/70" aria-hidden>
          <House className="size-5" />
        </span>
        <h3 className="mt-5 text-lg font-semibold text-ink-900">Looking for something different?</h3>
        <p className="mt-2 text-sm leading-6 text-ink-600">Browse all of our move-in ready homes, or build one of our plans on a lot you own.</p>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <ButtonLink to="/move-in-ready" variant="secondary" rightIcon={<ArrowRight className="size-4" aria-hidden />}>
          Browse move-in ready homes
        </ButtonLink>
        <ButtonLink to="/build-on-your-lot" variant="ghost">
          Build On Your Lot
        </ButtonLink>
      </div>
    </div>
  )
}

/** A compact link to one home's photo gallery on View My Home. */
function GalleryLink({ home }: { home: PortfolioHome }) {
  const meta = [home.lot, home.planLabel].filter(Boolean).join(' · ')
  return (
    <Link
      to={`/view-my-home/${home.slug}`}
      className="group flex h-full items-center gap-4 rounded-2xl bg-white p-3 shadow-card ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <SmartImage src={home.cover} alt="" className="aspect-[4/3] w-24 shrink-0 rounded-xl sm:w-28" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink-900 group-hover:text-brand-800 group-hover:underline">{home.address}</span>
        {meta && <span className="block text-sm text-ink-600">{meta}</span>}
        <span className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
          <Camera className="size-3.5 shrink-0" aria-hidden />
          {home.photos.length ? `${pluralize(home.photos.length, 'photo')} · ${portfolioStatusLabels[home.status]}` : 'Photos coming soon'}
        </span>
      </span>
      <ArrowRight className="mr-1 size-5 shrink-0 text-brand-800 transition-transform group-hover:translate-x-1" aria-hidden />
    </Link>
  )
}

function NotFound() {
  return (
    <>
      <PageHero
        eyebrow="Our Communities"
        title="We couldn’t find that community"
        description="It may have been renamed, or the link may be incomplete. Browse all of our communities and current projects instead."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Our Communities', to: '/communities' }, { label: 'Not found' }]}
        actions={
          <>
            <ButtonLink to="/communities" size="lg" rightIcon={<ArrowRight className="size-4" aria-hidden />}>
              View all communities
            </ButtonLink>
            <ButtonLink to="/move-in-ready" size="lg" variant="secondary">
              Browse move-in ready homes
            </ButtonLink>
          </>
        }
      />
      <Section size="sm">
        <h2 className="sr-only">Current projects</h2>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...communities]
            .sort((a, b) => statusRank[a.status] - statusRank[b.status])
            .slice(0, 3)
            .map((c) => (
              <li key={c.id} className="flex">
                <CommunityCard community={c} className="w-full" />
              </li>
            ))}
        </ul>
      </Section>
    </>
  )
}

export default function CommunityDetailPage() {
  const office = useOffice()
  const { slug = '' } = useParams()
  const community = getCommunity(slug)
  useDocumentTitle(community ? community.name : 'Community not found')
  useScrollToHash()
  const published = usePublishedHomes()
  const view3d = useAppStore((s) => s.settings.features.view3d)
  const formEnabled = useAppStore((s) => s.settings.features.contactForm)

  const homes = useMemo(() => (community ? published.filter((h) => h.communityId === community.id) : []), [published, community])
  const plans = useMemo(() => (community ? community.modelSlugs.map((s) => getModel(s)).filter((m): m is HomeModel => !!m) : []), [community])
  const galleries = useMemo(() => (community ? portfolioHomes.filter((p) => p.communityId === community.id) : []), [community])
  const others = useMemo(() => (community ? otherCommunities(community) : []), [community])

  if (!community) return <NotFound />

  const forSale = homes.filter(isForSale)
  const allSold = homes.length > 0 && homes.every((h) => h.status === 'sold')
  const homesTitle = forSale.length ? (forSale.length === 1 && homes.length === 1 ? 'The home for sale here' : 'Homes for sale here') : `Homes at ${community.name}`
  const showHomes = homes.length > 0 || !community.buildOnYourLot
  const detail = statusDetail(community)
  const facts = communityFacts(community)
  const rest = facts.slice(1)
  const factCols = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' }[facts.length] ?? 'lg:grid-cols-4'
  const plansBuilt = community.status === 'sold-out' || community.buildOnYourLot
  const plansTitle = plans.length === 1 ? (plansBuilt ? 'The plan built here' : 'The plan offered here') : plansBuilt ? 'Plans built here' : 'Plans offered here'
  const one = plans.length === 1

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-ink-100 bg-gradient-to-b from-brand-50 to-white">
        <div className="absolute -top-24 -right-24 -z-10 size-96 rounded-full bg-lavender-100/70 blur-3xl" aria-hidden />
        <div className="container-page pt-8 pb-12 sm:pt-10 sm:pb-16">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Our Communities', to: '/communities' }, { label: community.name }]} />
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="min-w-0 animate-fade-up">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Badge tone={statusTone[community.status]} dot size="md">
                  {statusLabel(community)}
                </Badge>
                {community.buildOnYourLot && (
                  <Badge tone="violet" size="md">
                    Build On Your Lot
                  </Badge>
                )}
                {detail && <span className="text-sm font-medium text-ink-700">{detail}</span>}
              </div>
              <h1 className="display-heading mt-4 text-4xl wrap-anywhere sm:text-5xl">{community.name}</h1>
              <p className="mt-3 flex items-center gap-2 text-base font-medium text-ink-600">
                <MapPin className="size-4 shrink-0 text-ink-400" aria-hidden />
                {community.area}
              </p>
              <p className="mt-6 max-w-xl text-lg leading-8 text-ink-700">{community.summary}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {formEnabled && (
                  <a href="#updates" className={buttonStyles('primary', 'lg', 'w-full sm:w-auto')}>
                    {community.buildOnYourLot || community.status === 'sold-out' ? (
                      <>
                        <MessageCircle className="size-4" aria-hidden /> Ask about a home like this
                      </>
                    ) : (
                      <>
                        <BellRing className="size-4" aria-hidden /> Get updates
                      </>
                    )}
                  </a>
                )}
                <a href={`tel:${office.phone}`} className={buttonStyles(formEnabled ? 'secondary' : 'primary', 'lg', 'w-full sm:w-auto')}>
                  <Phone className="size-4" aria-hidden /> {office.phoneDisplay}
                </a>
              </div>
            </div>
            <SmartImage
              src={community.image}
              alt={`${community.name}, ${community.area}`}
              priority
              className="aspect-[4/3] w-full rounded-3xl shadow-lift ring-1 ring-ink-200/70"
            />
          </div>

          <dl className={cn('mt-10 grid grid-cols-2 gap-3 sm:gap-4', factCols)}>
            <Fact fact={facts[0]} className="col-span-2 lg:col-span-1" />
            {rest.map((f, i) => (
              <Fact key={f.key} fact={f} className={cn(rest.length % 2 === 1 && i === rest.length - 1 && 'col-span-2 lg:col-span-1')} />
            ))}
          </dl>
        </div>
      </section>

      {/* Homes, plans, documents and galleries — with the inquiry card alongside */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
          <div className="min-w-0 space-y-16 lg:col-span-8">
            {showHomes && (
              <section aria-labelledby="homes-heading">
                <h2 id="homes-heading" className="display-heading text-2xl sm:text-3xl">
                  {homesTitle}
                </h2>
                {homes.length > 0 && (
                  <p className="mt-2 text-base text-ink-600">
                    {forSale.length
                      ? view3d
                        ? 'See photos, specifications and pricing for each home — and tour it in 3D where available.'
                        : 'See photos, specifications and pricing for each home.'
                      : allSold
                        ? 'These homes have been sold.'
                        : 'None of these homes is for sale right now.'}
                  </p>
                )}
                {homes.length ? (
                  <ul className="mt-6 grid gap-6 sm:grid-cols-2">
                    {homes.map((h) => (
                      <li key={h.id} className="flex">
                        <HomeCard home={h} className="w-full" />
                      </li>
                    ))}
                    {/* Fills the empty cell beside an odd last card. */}
                    {homes.length % 2 === 1 && (
                      <li className="hidden sm:flex">
                        <MoreHomesCard />
                      </li>
                    )}
                  </ul>
                ) : (
                  <EmptyState
                    className="mt-6 rounded-2xl bg-ink-50 ring-1 ring-ink-200/70"
                    icon={<House className="size-6" aria-hidden />}
                    title={community.status === 'sold-out' ? 'No homes are for sale here' : 'No homes are listed here yet'}
                    description={
                      community.status === 'sold-out'
                        ? 'Browse move-in ready homes in our other communities, or build one of our plans on your own lot.'
                        : 'Homes will appear here as they are listed. Browse our move-in ready homes in the meantime.'
                    }
                    action={
                      <ButtonLink to="/move-in-ready" variant="secondary" rightIcon={<ArrowRight className="size-4" aria-hidden />}>
                        Browse move-in ready homes
                      </ButtonLink>
                    }
                  />
                )}
              </section>
            )}

            {plans.length > 0 && (
              <section aria-labelledby="plans-heading">
                <h2 id="plans-heading" className="display-heading text-2xl sm:text-3xl">
                  {plansTitle}
                </h2>
                <p className="mt-2 text-base text-ink-600">
                  {view3d ? `Explore ${one ? 'it' : 'each one'} in 3D, or build ${one ? 'it' : 'one'} on your own lot.` : `See ${one ? 'its' : 'each'} floor plan and details, or build ${one ? 'it' : 'one'} on your own lot.`}
                </p>
                <ul className="mt-6 grid gap-6 sm:grid-cols-2">
                  {plans.map((m) => (
                    <li key={m.id} className="flex">
                      <ModelCard model={m} className="w-full" />
                    </li>
                  ))}
                  {one && (
                    <li className="hidden sm:flex">
                      <BuildItCard model={plans[0]} />
                    </li>
                  )}
                </ul>
              </section>
            )}

            {community.documents && community.documents.length > 0 && (
              <section aria-labelledby="documents-heading">
                <h2 id="documents-heading" className="display-heading text-2xl sm:text-3xl">
                  Brochures &amp; documents
                </h2>
                <p className="mt-2 text-base text-ink-600">As published for {community.name}. Each opens as a PDF in a new tab.</p>
                <DocumentList documents={community.documents} className="mt-6" />
              </section>
            )}

            {galleries.length > 0 && (
              <section aria-labelledby="galleries-heading">
                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                  <div>
                    <h2 id="galleries-heading" className="display-heading text-2xl sm:text-3xl">
                      Photo galleries
                    </h2>
                    <p className="mt-2 text-base text-ink-600">Construction and finished-home photos from View My Home.</p>
                  </div>
                  <ArrowLink to="/view-my-home">All galleries</ArrowLink>
                </div>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {galleries.map((g) => (
                    <li key={g.slug}>
                      <GalleryLink home={g} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="lg:col-span-4" aria-label={`Contact us about ${community.name}`}>
            {/* Sticky only where the whole card fits on screen, so no field ends up out of reach. */}
            <div id="updates" className="scroll-mt-28 [@media(min-width:64rem)_and_(min-height:50rem)]:sticky [@media(min-width:64rem)_and_(min-height:50rem)]:top-28">
              <CommunityInquiryForm key={community.id} community={community} />
            </div>
          </aside>
        </div>
      </Section>

      {/* Other communities */}
      <Section tone="tint">
        <SectionHeading eyebrow="Keep exploring" title="Other communities" action={<ArrowLink to="/communities">All communities</ArrowLink>} />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((c) => (
            <li key={c.id} className="flex">
              <CommunityCard community={c} className="w-full" />
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
