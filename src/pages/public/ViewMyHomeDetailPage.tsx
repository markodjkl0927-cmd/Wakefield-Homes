import { useMemo, useRef } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRight, CalendarClock, Camera, Images, KeyRound, LayoutTemplate, MapPin } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { pluralize } from '@/lib/format'
import { getModel } from '@/data/models'
import { getPortfolioHome, portfolioHomes, portfolioSections, portfolioStatusLabels, type PortfolioHome } from '@/data/portfolio'
import { isForSale, useCurrentUser, useHome } from '@/store/hooks'
import { Badge, buttonStyles, EmptyState, SmartImage, useScrollFade } from '@/components/ui'
import { Breadcrumbs } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { portalHomeFor } from '@/components/site/SiteHeader'
import { ArrowLink, NotFoundState } from './homes/parts'
import { PortfolioCard, portfolioPlace, portfolioTone } from './homes/PortfolioCard'
import { PortfolioGallery, stageAnchor } from './homes/PortfolioGallery'
import { bareName, scrollToSection, tourLabel } from './homes/utils'

/** Three other homes: same community first, then current builds, then the rest. */
function moreHomes(home: PortfolioHome): PortfolioHome[] {
  const others = portfolioHomes.filter((h) => h.slug !== home.slug && h.photos.length > 0)
  const rank = (h: PortfolioHome) => (h.communityId && h.communityId === home.communityId ? 0 : h.status === 'under-construction' ? 1 : 2)
  return [...others].sort((a, b) => rank(a) - rank(b)).slice(0, 3)
}

/** Jump links to each stage; sticks under the site header while the gallery scrolls. */
function StageNav({ home }: { home: PortfolioHome }) {
  const sections = portfolioSections(home)
  const ref = useRef<HTMLDivElement>(null)
  useScrollFade(ref)
  if (sections.length < 2) return null
  return (
    <nav aria-label="Construction stages" data-sticky-chrome className="sticky top-[72px] z-20 border-b border-ink-100 bg-white/95 backdrop-blur">
      <div ref={ref} className="scroll-fade-x scrollbar-thin container-page flex gap-2 overflow-x-auto py-3">
        {sections.map((s, i) => (
          <a
            key={s.stage}
            href={`#${stageAnchor(s.stage)}`}
            onClick={(e) => {
              e.preventDefault()
              scrollToSection(stageAnchor(s.stage))
            }}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-ink-50 px-3.5 text-sm font-medium whitespace-nowrap text-ink-800 ring-1 ring-ink-200 ring-inset transition-colors hover:bg-brand-50 hover:text-brand-900 hover:ring-brand-200"
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-brand-800 ring-1 ring-brand-100 tabular-nums" aria-hidden>
              {i + 1}
            </span>
            {s.label}
            <span className="text-ink-500 tabular-nums">{s.photos.length}</span>
          </a>
        ))}
      </div>
    </nav>
  )
}

export default function ViewMyHomeDetailPage() {
  const { slug } = useParams()
  const home = getPortfolioHome(slug)
  useDocumentTitle(home ? `${home.address} · View My Home` : 'Home not found')
  const listing = useHome(home?.homeId)
  const user = useCurrentUser()
  const more = useMemo(() => (home ? moreHomes(home) : []), [home])

  if (!home) {
    return (
      <NotFoundState
        title="We couldn’t find that home"
        description="The link may be out of date. Every home with a photo gallery is listed on View My Home."
        links={[
          { label: 'View My Home', to: '/view-my-home', primary: true },
          { label: 'Move In Ready Homes', to: '/move-in-ready' },
          { label: 'Contact us', to: '/contact' },
        ]}
      />
    )
  }

  const model = home.modelSlug ? getModel(home.modelSlug) : undefined
  const sections = portfolioSections(home)
  // The public listing for this address, when it's on the website (and still for sale, for the inquiry button).
  const listed = listing && listing.published ? listing : undefined
  const forSale = !!listed && isForSale(listed)
  const signedInOwner = user?.role === 'homeowner'
  const place = portfolioPlace(home)

  return (
    <>
      {/* Header */}
      <section className="relative isolate overflow-hidden border-b border-ink-100 bg-gradient-to-b from-brand-50 to-white">
        <div className="absolute -top-24 -right-24 -z-10 size-96 rounded-full bg-lavender-100/70 blur-3xl" aria-hidden />
        <div className="container-page grid items-center gap-10 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14 lg:py-14">
          <div className="min-w-0 animate-fade-up">
            <Breadcrumbs
              items={[
                { label: 'Home', to: '/' },
                { label: 'Our Homes', to: '/our-homes' },
                { label: 'View My Home', to: '/view-my-home' },
                { label: home.address },
              ]}
            />
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Badge tone={portfolioTone[home.status]} dot size="md">
                {portfolioStatusLabels[home.status]}
              </Badge>
              {home.buildOnYourLot && (
                <Badge tone="violet" size="md">
                  Build On Your Lot
                </Badge>
              )}
            </div>
            <h1 className="display-heading mt-4 text-4xl sm:text-5xl">{home.address}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[15px] text-ink-600">
              <MapPin className="size-4 shrink-0 text-ink-400" aria-hidden />
              <span>{home.city.startsWith(place) ? home.city : `${place} · ${home.city}`}</span>
            </p>
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4 border-y border-ink-200/80 py-4">
              {home.planLabel && (
                <div className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                    <LayoutTemplate className="size-3.5 text-brand-700" aria-hidden /> Plan
                  </dt>
                  <dd className="mt-1 text-[15px] font-semibold text-ink-900">
                    {model ? (
                      <Link to={`/our-homes/models/${model.slug}`} className="text-brand-800 underline-offset-4 hover:underline">
                        {home.planLabel}
                      </Link>
                    ) : (
                      home.planLabel
                    )}
                  </dd>
                </div>
              )}
              {home.statusNote && (
                <div className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                    <CalendarClock className="size-3.5 text-brand-700" aria-hidden /> Status
                  </dt>
                  <dd className="mt-1 text-[15px] font-semibold text-ink-900">{home.statusNote}</dd>
                </div>
              )}
              <div className="min-w-0">
                <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                  <Camera className="size-3.5 text-brand-700" aria-hidden /> Photos
                </dt>
                <dd className="mt-1 text-[15px] font-semibold text-ink-900">
                  {home.photos.length > 0 ? pluralize(home.photos.length, 'photo') : 'Coming soon'}
                </dd>
              </div>
            </dl>
            {home.summary && <p className="mt-5 max-w-xl text-lg leading-8 text-ink-600">{home.summary}</p>}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {home.photos.length > 0 && (
                <a
                  href={`#${stageAnchor(sections[0].stage)}`}
                  onClick={(e) => {
                    e.preventDefault()
                    scrollToSection(stageAnchor(sections[0].stage))
                  }}
                  className={buttonStyles('primary', 'lg')}
                >
                  <Images className="size-5" aria-hidden /> See the photos
                </a>
              )}
              {listed && (
                <Link to={`/homes/${listed.slug}`} className={buttonStyles(home.photos.length > 0 ? 'periwinkle' : 'primary', 'lg')}>
                  View the listing
                </Link>
              )}
              {!listed && model && (
                <Link to={`/our-homes/models/${model.slug}`} className={buttonStyles('periwinkle', 'lg')}>
                  Explore the {bareName(model.name)} plan
                </Link>
              )}
            </div>
          </div>
          <div className="relative">
            <SmartImage src={home.cover} alt={`Photo of ${home.address}`} priority className="aspect-[4/3] w-full rounded-3xl shadow-lift ring-1 ring-ink-200/70" />
          </div>
        </div>
      </section>

      <StageNav home={home} />

      {/* Photos */}
      <div className="bg-white py-12 sm:py-16">
        <div className="container-page">
          {home.photos.length > 0 ? (
            <PortfolioGallery home={home} />
          ) : (
            <div className="rounded-3xl bg-ink-50 ring-1 ring-ink-200/70">
              <h2 className="sr-only">Photos</h2>
              <EmptyState
                icon={<Camera className="size-6" aria-hidden />}
                title="Photos coming soon"
                description={`Construction photos of ${home.address} will appear here as work gets under way.`}
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    {forSale && listed && (
                      <Link to={`/contact?home=${encodeURIComponent(listed.slug)}`} className={buttonStyles('primary')}>
                        {tourLabel(listed.status)}
                      </Link>
                    )}
                    <Link to="/view-my-home" className={buttonStyles('secondary')}>
                      Browse other homes
                    </Link>
                  </div>
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Portal callout */}
      <Section size="sm" tone="tint">
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-white p-6 shadow-card ring-1 ring-ink-200/70 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-white" aria-hidden>
              <KeyRound className="size-5" />
            </span>
            <div>
              <h2 className="display-heading text-2xl">Building with Wakefield? Sign in to the Home Owner portal</h2>
              <p className="mt-2 max-w-2xl text-[15px] leading-7 text-ink-600">
                Follow your own home’s progress and keep your agreements, appointments and maintenance requests in one place.
              </p>
            </div>
          </div>
          <Link to={signedInOwner ? portalHomeFor(user?.role) : '/access/homeowners'} className={buttonStyles('primary', 'lg', 'w-full shrink-0 sm:w-auto')}>
            {signedInOwner ? 'Go to my dashboard' : 'Home Owner login'} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </Section>

      {/* More homes */}
      {more.length > 0 && (
        <Section>
          <SectionHeading eyebrow="View My Home" title="More homes to explore" action={<ArrowLink to="/view-my-home">All homes</ArrowLink>} />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((h) => (
              <li key={h.slug} className="min-w-0">
                <PortfolioCard home={h} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <CTASection />
    </>
  )
}
