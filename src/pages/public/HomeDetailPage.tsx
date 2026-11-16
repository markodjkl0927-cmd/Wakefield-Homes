import { useEffect, useMemo, useRef, useState, type FocusEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRight, Bath, BedDouble, Box, CalendarClock, CalendarDays, Camera, Clock, Eye, FileText, LayoutTemplate, MapPin, Move3d, Phone, Ruler, Trees } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useDocumentTitle } from '@/lib/utils'
import { pluralize } from '@/lib/format'
import { getModel } from '@/data/models'
import { getCommunity } from '@/data/communities'
import { portfolioForHome, portfolioSections } from '@/data/portfolio'
import { homeStatus } from '@/data/labels'
import { isForSale, useCan3d, useCurrentUser, useHome, useOffice, usePublishedHomes, useSettings } from '@/store/hooks'
import { Alert, Badge, buttonStyles, ButtonLink, Card, smoothBehavior, StatusBadge } from '@/components/ui'
import { Breadcrumbs } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { MortgageCalculator } from '@/components/site/MortgageCalculator'
import { Viewer3D } from '@/three/Viewer3D'
import { PhotoMosaic } from './homes/PhotoMosaic'
import { InquiryForm } from './homes/InquiryForm'
import { HomeListingCard } from './homes/HomeListingCard'
import { ArrowLink, CheckList, NotFoundState, SpecTiles, type SpecItem } from './homes/parts'
import {
  bareName,
  byStatus,
  deliveryLabel,
  formatAcres,
  hasListedPrice,
  homePriceLabel,
  homePriceNote,
  scrollToSection,
  specValue,
  tourLabel,
} from './homes/utils'

export default function HomeDetailPage() {
  const office = useOffice()
  const { slug } = useParams()
  const home = useHome(slug)
  const user = useCurrentUser()
  const settings = useSettings()
  const published = usePublishedHomes()
  const can3d = useCan3d(home)

  // Unpublished homes (e.g. homes owned by portal users) are hidden from visitors; staff can preview them.
  const canPreview = !!user && user.role !== 'homeowner'
  const visible = !!home && (home.published || canPreview)
  useDocumentTitle(visible && home ? home.title : 'Home not found')

  // Homes for sale, closest first: same community, then same plan.
  const similar = useMemo(() => {
    if (!home) return []
    return published
      .filter((h) => h.id !== home.id && isForSale(h))
      .map((h) => ({ h, score: (h.communityId && h.communityId === home.communityId ? 2 : 0) + (h.modelId && h.modelId === home.modelId ? 1 : 0) }))
      .sort((a, b) => b.score - a.score || byStatus(a.h, b.h))
      .slice(0, 3)
      .map((x) => x.h)
  }, [published, home])

  // Mobile action bar: shown once the title scrolls away, hidden again when the sidebar card is reached.
  const titleRef = useRef<HTMLDivElement>(null)
  const asideRef = useRef<HTMLElement>(null)
  const [showBar, setShowBar] = useState(false)
  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const titleBottom = titleRef.current?.getBoundingClientRect().bottom ?? 0
      const asideTop = asideRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY
      setShowBar(titleBottom < 0 && asideTop > window.innerHeight - 40)
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [visible])

  // Desktop: the price + "Ask a question" card stays in view while the page scrolls — but only when it fits on
  // screen (below the sticky header). On shorter screens it scrolls with the page, so no part of it, and no
  // focused field in it, can end up out of reach under the header.
  const [stickyAside, setStickyAside] = useState(true)
  useEffect(() => {
    const aside = asideRef.current
    if (!aside) return
    const check = () => setStickyAside(aside.offsetHeight <= window.innerHeight - 120)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(aside)
    window.addEventListener('resize', check)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [visible])

  // Shift+Tab up through the card can land a field just under the sticky site header: the browser only scrolls
  // when the field leaves the window. Nudge the page so it clears the header (its :focus scroll-margin).
  const keepFocusClear = (e: FocusEvent<HTMLElement>) => {
    const field = e.target
    const clear = parseFloat(getComputedStyle(field).scrollMarginTop) || 88
    const top = field.getBoundingClientRect().top
    if (top < clear) window.scrollBy({ top: top - clear, behavior: smoothBehavior() })
  }

  if (!home || !visible) {
    return (
      <NotFoundState
        title="We couldn’t find that home"
        description="It may have been sold or taken off the market. Here are a few good places to keep looking."
        links={[
          { label: 'Move In Ready Homes', to: '/move-in-ready', primary: true },
          { label: 'Browse the Home Gallery', to: '/our-homes/gallery' },
          { label: 'Contact us', to: '/contact' },
        ]}
      />
    )
  }

  const model = getModel(home.modelId)
  const community = home.communityId ? getCommunity(home.communityId) : undefined
  // Single-home projects are named by their address; their community page would only repeat this one.
  const communityLink = community && community.name !== home.address ? community : undefined
  const portfolio = portfolioForHome(home.id)
  const sold = home.status === 'sold'
  const ownedPreview = !!home.ownerId
  const price = homePriceLabel(home)
  const priced = hasListedPrice(home)
  const priceNote = homePriceNote(home)
  const delivery = deliveryLabel(home)
  const acres = formatAcres(home.lotSizeAcres)
  const images = home.images.length ? home.images : model ? [model.image] : []
  const tourTo = `/contact?home=${encodeURIComponent(home.slug)}`
  const ctaLabel = tourLabel(home.status)
  const documents = home.documents ?? []
  // The home's photo gallery on View My Home, once it has photos.
  const gallery = portfolio && portfolio.photos.length > 0 ? portfolio : undefined
  const photoStages = gallery ? portfolioSections(gallery) : []
  const photoSummary =
    gallery && photoStages.length > 1
      ? `${pluralize(gallery.photos.length, 'photo')}, from ${photoStages[0].label.toLowerCase()} to ${photoStages[photoStages.length - 1].label.toLowerCase()}`
      : pluralize(gallery?.photos.length ?? 0, 'photo')

  const spec = (label: string, key: 'beds' | 'baths' | 'sqft', icon: ReactNode): SpecItem[] => {
    const value = specValue(home, key)
    return value ? [{ label, value, icon }] : []
  }
  const facts: SpecItem[] = [
    ...spec('Bedrooms', 'beds', <BedDouble />),
    ...spec('Bathrooms', 'baths', <Bath />),
    ...spec('Square feet', 'sqft', <Ruler />),
    ...(acres ? [{ label: 'Lot size', value: acres, icon: <Trees /> }] : []),
    ...(model
      ? [
          {
            label: 'Floor plan',
            icon: <LayoutTemplate />,
            value: (
              <Link to={`/our-homes/models/${model.slug}`} className="text-brand-800 underline-offset-4 hover:underline">
                {bareName(model.name)}
              </Link>
            ),
          },
        ]
      : portfolio?.planLabel
        ? [{ label: 'Home type', value: portfolio.planLabel, icon: <LayoutTemplate /> }]
        : []),
    ...(home.delivery && delivery ? [{ label: 'Delivery', value: home.delivery, icon: <CalendarClock /> }] : []),
  ]

  return (
    <>
      {!home.published && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="container-page flex items-center gap-2 py-2.5 text-sm text-amber-950">
            <Eye className="size-4 shrink-0 text-amber-700" aria-hidden />
            <span>
              <strong className="font-semibold">Staff preview.</strong> This home isn’t published on the website, so visitors can’t see this page.
            </span>
          </div>
        </div>
      )}

      <section className="bg-white">
        <div className="container-page pt-6 sm:pt-8">
          <Breadcrumbs
            items={[
              { label: 'Home', to: '/' },
              { label: 'Move In Ready Homes', to: '/move-in-ready' },
              { label: home.title },
            ]}
          />
          <div ref={titleRef} className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge def={homeStatus[home.status]} size="md" />
                {can3d && (
                  <Badge tone="brand" size="md" icon={<Box className="size-3.5" aria-hidden />}>
                    3D tour
                  </Badge>
                )}
              </div>
              <h1 className="display-heading mt-3 min-w-0 text-3xl wrap-anywhere sm:text-4xl lg:text-[2.75rem] lg:leading-tight">{home.title}</h1>
              <p className="mt-2 flex items-start gap-1.5 text-[15px] leading-6 text-ink-600">
                <MapPin className="mt-1 size-4 shrink-0 text-ink-400" aria-hidden />
                <span className="min-w-0 wrap-anywhere">
                  {home.address}, {home.city}
                  {communityLink && (
                    <>
                      {' '}
                      <span aria-hidden>·</span>{' '}
                      <Link to={`/communities/${communityLink.slug}`} className="font-medium text-brand-800 underline-offset-4 hover:underline">
                        {communityLink.name}
                      </Link>
                    </>
                  )}
                </span>
              </p>
            </div>
            {!sold && (
              <div className="shrink-0 lg:text-right">
                <p className={cn('font-semibold tracking-tight text-ink-900', priced ? 'text-3xl tabular-nums' : 'text-2xl')}>{price}</p>
                {priceNote && <p className="mt-0.5 text-sm text-ink-600">{priceNote}</p>}
              </div>
            )}
          </div>
          <div className="mt-6">
            <PhotoMosaic images={images} title={home.title} on3d={can3d ? () => scrollToSection('home-3d') : undefined} />
          </div>
        </div>
      </section>

      <div className="container-page grid gap-12 pt-10 pb-16 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14 lg:pb-24">
        <div className="min-w-0 space-y-12 sm:space-y-14">
          {sold && (
            <Alert
              tone="info"
              // Phones: the button wraps under the text, lined up with it, instead of squeezing the text.
              className="max-sm:flex-wrap max-sm:[&>div:last-child]:basis-full max-sm:[&>div:last-child]:pl-8"
              title="This home has been sold"
              action={
                <Link to="/move-in-ready" className={buttonStyles('primary', 'sm')}>
                  Homes for sale
                </Link>
              }
            >
              {model ? `Love the ${bareName(model.name)}? We can build this plan on your lot, or show you what’s for sale now.` : 'We can show you what’s for sale now.'}
            </Alert>
          )}

          <section aria-labelledby="facts-title">
            <h2 id="facts-title" className="text-xl font-semibold text-ink-900">
              At a glance
            </h2>
            {facts.length > 0 ? (
              <SpecTiles items={facts} columns="auto" className="mt-5" />
            ) : (
              <p className="mt-3 text-[15px] text-ink-600">Details for this home haven’t been published. Call us for more information.</p>
            )}
          </section>

          <section aria-labelledby="about-title">
            <h2 id="about-title" className="text-xl font-semibold text-ink-900">
              About this home
            </h2>
            <p className="mt-4 text-base leading-8 text-ink-700 text-user sm:text-[17px]">{home.description}</p>
            {model && (
              <div className="mt-8 rounded-2xl bg-ink-50 p-5 ring-1 ring-ink-200/60 ring-inset sm:p-6">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h3 className="text-base font-semibold text-ink-900">{model.name} plan highlights</h3>
                  <p className="text-sm text-ink-600">{model.style}</p>
                </div>
                <CheckList items={model.highlights} columns={2} className="mt-4" />
                <ArrowLink to={`/our-homes/models/${model.slug}`} className="mt-4">
                  Explore the {bareName(model.name)} plan
                </ArrowLink>
              </div>
            )}
          </section>

          {(documents.length > 0 || gallery) && (
            <section aria-labelledby="docs-title">
              <h2 id="docs-title" className="text-xl font-semibold text-ink-900">
                {documents.length === 0 ? 'Photos' : gallery ? 'Brochures & photos' : 'Brochures & documents'}
              </h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {gallery && (
                  <li>
                    <Link
                      to={`/view-my-home/${gallery.slug}`}
                      className="group flex h-full min-h-16 items-center gap-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-ink-200/70 transition-colors hover:bg-brand-50/50 hover:ring-brand-200"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800 ring-1 ring-brand-100" aria-hidden>
                        <Camera className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink-900">Photo gallery on View My Home</span>
                        <span className="block text-xs text-ink-600">{photoSummary}</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-800" aria-hidden />
                    </Link>
                  </li>
                )}
                {documents.map((d) => (
                  <li key={d.url}>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex h-full min-h-16 items-center gap-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-ink-200/70 transition-colors hover:bg-brand-50/50 hover:ring-brand-200"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800 ring-1 ring-brand-100" aria-hidden>
                        <FileText className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold text-ink-900">
                        {d.label}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 -rotate-45 text-ink-400 transition-colors group-hover:text-brand-800" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {can3d && (
            <section id="home-3d" aria-labelledby="home-3d-title" className="scroll-mt-24">
              <p className="eyebrow">Live 3D</p>
              <h2 id="home-3d-title" className="mt-2 text-xl font-semibold text-ink-900">
                Walk around this home in 3D
              </h2>
              <p className="mt-2 text-[15px] text-ink-600">See it from every side — by day, at dusk or at night.</p>
              <Viewer3D
                config={home.view3d.config}
                customModelId={home.view3d.hasCustomModel ? home.id : undefined}
                className="mt-5 aspect-[4/3] w-full rounded-3xl shadow-card ring-1 ring-ink-200/70 sm:aspect-[16/10]"
                ariaLabel={`Interactive 3D model of ${home.title}`}
              />
              <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-600">
                <Move3d className="size-4 shrink-0 text-brand-700" aria-hidden />
                {home.view3d.hasCustomModel
                  ? 'This 3D model was provided by our design team.'
                  : 'The 3D model is illustrative — final colors, options and details may differ.'}
              </p>
            </section>
          )}

          {priced && home.price != null && (
            <section aria-labelledby="payment-title">
              <h2 id="payment-title" className="text-xl font-semibold text-ink-900">
                Estimate your monthly payment
              </h2>
              <p className="mt-2 text-[15px] text-ink-600">
                Adjust the numbers to explore. For a real quote, talk to one of our{' '}
                <Link to="/finance/home-purchase" className="font-medium text-brand-800 underline underline-offset-4 hover:text-brand-900">
                  preferred lenders
                </Link>
                .
              </p>
              <MortgageCalculator defaultPrice={home.price} className="mt-5" />
            </section>
          )}
        </div>

        <aside
          ref={asideRef}
          aria-label="Contact Wakefield about this home"
          onFocus={keepFocusClear}
          className={cn('lg:self-start', stickyAside && 'lg:sticky lg:top-24')}
        >
          <Card className="overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-ink-600">{priced ? 'Price' : sold ? 'This home' : 'Pricing'}</p>
                {!sold && <StatusBadge def={homeStatus[home.status]} />}
              </div>
              <p className={cn('mt-1 leading-tight font-semibold tracking-tight text-ink-900', priced ? 'text-[1.75rem] tabular-nums' : 'text-2xl')}>{price}</p>
              {priceNote && <p className="mt-0.5 text-sm text-ink-600">{priceNote}</p>}
              {delivery && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-700">
                  <CalendarClock className="size-4 shrink-0 text-ink-400" aria-hidden />
                  {delivery}
                </p>
              )}
              <div className="mt-5 grid gap-2.5">
                {sold || ownedPreview ? (
                  <ButtonLink to="/move-in-ready" size="lg">
                    See homes for sale
                  </ButtonLink>
                ) : (
                  <ButtonLink to={tourTo} size="lg" leftIcon={<CalendarDays className="size-5" aria-hidden />}>
                    {ctaLabel}
                  </ButtonLink>
                )}
                <a href={`tel:${office.phone}`} className={buttonStyles('periwinkle', 'lg')}>
                  <Phone className="size-5" aria-hidden /> Call {office.phoneDisplay}
                </a>
              </div>
            </div>
            <div className="border-t border-ink-100 bg-ink-25 p-6">
              <h2 className="text-base font-semibold text-ink-900">Ask a question</h2>
              {settings.features.contactForm ? (
                <>
                  <p className="mt-1 text-sm text-ink-600">Send a note to our sales team about this home.</p>
                  <InquiryForm
                    compact
                    className="mt-4"
                    subject={home.title}
                    interest="move-in-ready"
                    homeId={home.id}
                    modelSlug={model?.slug}
                    defaultMessage={
                      sold
                        ? `I saw that ${home.title} has sold. Please let me know about similar homes.`
                        : home.price == null
                          ? `Please keep me posted on ${home.title} — I’d like pricing and details as soon as they’re available.`
                          : `I’m interested in ${home.title}. Please send me more information.`
                    }
                  />
                </>
              ) : (
                <div className="mt-2 space-y-2 text-sm leading-6 text-ink-600">
                  <p>
                    Call us at{' '}
                    <a href={`tel:${office.phone}`} className="font-semibold whitespace-nowrap text-brand-800 underline underline-offset-4 hover:text-brand-900">
                      {office.phoneDisplay}
                    </a>
                    {office.email ? (
                      <>
                        {' '}
                        or email{' '}
                        <a
                          href={`mailto:${office.email}?subject=${encodeURIComponent(home.title)}`}
                          className="font-semibold wrap-anywhere text-brand-800 underline underline-offset-4 hover:text-brand-900"
                        >
                          {office.email}
                        </a>
                      </>
                    ) : null}
                    .
                  </p>
                  {office.hours && (
                    <p className="flex items-center gap-1.5 text-ink-600">
                      <Clock className="size-4 shrink-0 text-ink-400" aria-hidden /> {office.hours}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>

      {similar.length > 0 && (
        <Section tone="tint">
          <SectionHeading
            eyebrow="Keep exploring"
            title={sold ? 'Homes for sale now' : 'You might also like'}
            action={<ArrowLink to="/move-in-ready">All Move In Ready Homes</ArrowLink>}
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((h) => (
              <HomeListingCard key={h.id} home={h} />
            ))}
          </div>
        </Section>
      )}

      {/* Phone action bar: price + call + primary action, always one thumb away. */}
      <div
        data-sticky-actions
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgb(16_24_40/0.25)] backdrop-blur transition-transform duration-300 lg:hidden',
          showBar ? 'translate-y-0' : 'pointer-events-none translate-y-full',
        )}
        aria-hidden={!showBar}
        inert={!showBar}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-ink-900 tabular-nums">{price}</p>
            <p className="truncate text-xs text-ink-600">{home.title}</p>
          </div>
          <a href={`tel:${office.phone}`} className={buttonStyles('periwinkle', 'icon', 'size-11 shrink-0')} aria-label={`Call ${office.phoneDisplay}`}>
            <Phone className="size-5" aria-hidden />
          </a>
          <Link to={sold || ownedPreview ? '/move-in-ready' : tourTo} className={buttonStyles('primary', 'md', 'h-11 shrink-0')}>
            {sold || ownedPreview ? 'Homes for sale' : ctaLabel}
          </Link>
        </div>
      </div>
    </>
  )
}
