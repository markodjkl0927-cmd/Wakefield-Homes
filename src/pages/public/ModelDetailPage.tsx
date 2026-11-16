import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRight, Bath, BedDouble, Box, CalendarDays, Car, FileText, ListChecks, Move3d, Phone, Receipt, Ruler, Wrench } from 'lucide-react'
import type { HomeModel } from '@/types'
import { useDocumentTitle } from '@/lib/utils'
import { formatPrice, formatSqft } from '@/lib/format'
import { getModel, homeModels, PRICE_AS_OF } from '@/data/models'
import { portfolioHomes } from '@/data/portfolio'
import { isForSale, usePublishedHomes, useSettings, useOffice } from '@/store/hooks'
import { Badge, buttonStyles, ButtonLink, Card, SmartImage } from '@/components/ui'
import { Breadcrumbs } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { ModelCard } from '@/components/site/cards'
import { Viewer3D } from '@/three/Viewer3D'
import { HomeListingCard } from './homes/HomeListingCard'
import { PortfolioCard } from './homes/PortfolioCard'
import { ArrowLink, CheckList, NotFoundState } from './homes/parts'
import { bareName, byStatus, scrollToSection, styleGroup } from './homes/utils'

/** Same style family first (closest in size), then everything else by size. */
function similarPlans(model: HomeModel, count = 3): HomeModel[] {
  const group = styleGroup(model.style)
  const bySize = (a: HomeModel, b: HomeModel) => Math.abs(a.sqftMin - model.sqftMin) - Math.abs(b.sqftMin - model.sqftMin)
  const others = homeModels.filter((m) => m.id !== model.id)
  const same = others.filter((m) => styleGroup(m.style) === group).sort(bySize)
  const rest = others.filter((m) => styleGroup(m.style) !== group).sort(bySize)
  return [...same, ...rest].slice(0, count)
}

export default function ModelDetailPage() {
  const office = useOffice()
  const { slug } = useParams()
  const model = slug ? getModel(slug) : undefined
  useDocumentTitle(model ? `${model.name} floor plan` : 'Plan not found')
  const published = usePublishedHomes()
  const show3d = useSettings().features.view3d

  const forSale = useMemo(() => (model ? published.filter((h) => h.modelId === model.id && isForSale(h)).sort(byStatus) : []), [published, model])
  // Homes we've built on this plan, with photo galleries on View My Home.
  const built = useMemo(() => (model ? portfolioHomes.filter((p) => p.modelSlug === model.slug && p.photos.length >= 4).slice(0, 3) : []), [model])
  const similar = useMemo(() => (model ? similarPlans(model) : []), [model])

  if (!model) {
    return (
      <NotFoundState
        title="We couldn’t find that floor plan"
        description={`The link may be out of date. All ${homeModels.length} of our plans are in the Home Gallery — each one with photos and prices${show3d ? ' and a 3D view' : ''}.`}
        links={[
          { label: 'Browse the Home Gallery', to: '/our-homes/gallery', primary: true },
          { label: 'Move In Ready Homes', to: '/move-in-ready' },
          { label: 'Contact us', to: '/contact' },
        ]}
      />
    )
  }

  const shortName = bareName(model.name)
  const consultTo = `/contact?model=${encodeURIComponent(model.slug)}`
  const keySpecs = [
    { label: 'Bedrooms', value: model.beds, icon: <BedDouble /> },
    { label: 'Bathrooms', value: model.baths, icon: <Bath /> },
    { label: 'Living area', value: formatSqft(model.sqftMin, model.sqftMax), icon: <Ruler /> },
    { label: 'Garage', value: model.garage, icon: <Car /> },
  ]
  const specRows: { label: string; value: string }[] = [
    { label: 'Style', value: model.style },
    { label: 'Bedrooms', value: model.beds },
    { label: 'Bathrooms', value: model.baths },
    { label: 'Finished living area', value: formatSqft(model.sqftMin, model.sqftMax) },
    { label: 'Garage', value: model.garage },
    ...(model.levels ? [{ label: 'Levels', value: model.levels }] : []),
    { label: 'Build On Your Lot base price', value: model.basePrice != null ? formatPrice(model.basePrice) : 'Call for pricing' },
  ]

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-ink-100 bg-gradient-to-b from-brand-50 to-white">
        <div className="absolute -top-24 -right-24 -z-10 size-96 rounded-full bg-lavender-100/70 blur-3xl" aria-hidden />
        <div className="container-page grid items-center gap-10 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14 lg:py-16">
          <div className="animate-fade-up">
            <Breadcrumbs
              items={[
                { label: 'Home', to: '/' },
                { label: 'Our Homes', to: '/our-homes' },
                { label: 'Home Gallery', to: '/our-homes/gallery' },
                { label: model.name },
              ]}
            />
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Badge tone="brand" size="md">
                {model.style}
              </Badge>
              {model.isNew && (
                <Badge size="md" className="bg-brand-900 text-white ring-brand-900">
                  New plan
                </Badge>
              )}
            </div>
            <h1 className="display-heading mt-4 text-4xl sm:text-5xl lg:text-6xl">{model.name}</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-ink-600">{model.summary}</p>
            <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-ink-200/80 py-5 sm:flex sm:flex-wrap sm:gap-x-10">
              {keySpecs.map((s) => (
                <div key={s.label} className="min-w-0 sm:whitespace-nowrap">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                    <span className="text-brand-700 [&>svg]:size-3.5" aria-hidden>
                      {s.icon}
                    </span>
                    {s.label}
                  </dt>
                  <dd className="mt-1 text-[15px] font-semibold text-ink-900">{s.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to={consultTo} size="lg" leftIcon={<CalendarDays className="size-5" aria-hidden />}>
                Schedule a consultation
              </ButtonLink>
              {show3d && (
                <a
                  href="#model-3d"
                  onClick={(e) => {
                    e.preventDefault()
                    scrollToSection('model-3d')
                  }}
                  className={buttonStyles('periwinkle', 'lg')}
                >
                  <Box className="size-5" aria-hidden /> Explore in 3D
                </a>
              )}
            </div>
          </div>
          <div className="relative">
            <SmartImage src={model.image} alt={`${model.name} exterior`} priority className="aspect-[4/3] w-full rounded-3xl shadow-lift ring-1 ring-ink-200/70" />
            <div className="absolute bottom-4 left-4 rounded-2xl bg-white/95 px-4 py-3 shadow-lift ring-1 ring-black/5 backdrop-blur sm:bottom-5 sm:left-5 sm:px-5">
              {model.basePrice != null ? (
                <>
                  <p className="text-xs font-medium text-ink-600">Build On Your Lot from</p>
                  <p className="text-xl font-semibold text-ink-900 tabular-nums sm:text-2xl">{formatPrice(model.basePrice)}</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-ink-600">Build On Your Lot</p>
                  <p className="text-lg font-semibold text-ink-900">Call for pricing</p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Live 3D */}
      {show3d && (
        <section id="model-3d" aria-labelledby="model-3d-title" className="scroll-mt-20 bg-white py-14 sm:py-20">
          <div className="container-page">
            <div className="max-w-2xl">
              <p className="eyebrow">Live 3D</p>
              <h2 id="model-3d-title" className="display-heading mt-3 text-3xl sm:text-4xl">
                Walk around the {shortName}
              </h2>
              <p className="mt-3 text-lg leading-8 text-ink-600">See it from every side, then switch between day, dusk and night with the controls on the model.</p>
            </div>
            <Viewer3D
              config={model.house3d}
              className="mt-8 aspect-[4/3] w-full rounded-3xl shadow-lift ring-1 ring-ink-200/70 sm:aspect-[16/9] lg:aspect-auto lg:h-[580px]"
              ariaLabel={`Interactive 3D model of ${model.name}`}
            />
            <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-500">
              <Move3d className="size-4 shrink-0 text-brand-700" aria-hidden />
              The 3D model is an illustration of the {shortName} exterior. Elevations, colors and options vary by home.
            </p>
          </div>
        </section>
      )}

      {/* Overview, specifications and price */}
      <Section tone="tint">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
          <div className="min-w-0 space-y-12">
            <section aria-labelledby="overview-title">
              <p className="eyebrow">Overview</p>
              <h2 id="overview-title" className="display-heading mt-3 text-3xl">
                What makes the {shortName} special
              </h2>
              <p className="mt-4 text-[17px] leading-8 text-ink-700">
                Like every plan in our portfolio, the {shortName} can be tailored with options packages to fit your lot, your family and your budget — with
                an independent architect available whenever you need one.
              </p>
              <CheckList items={model.highlights} columns={2} className="mt-7" />
            </section>

            <section aria-labelledby="specs-title">
              <h2 id="specs-title" className="text-xl font-semibold text-ink-900">
                Specifications
              </h2>
              <dl className="mt-5 divide-y divide-ink-100 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70">
                {specRows.map((r) => (
                  <div key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 px-5 py-3.5 sm:grid-cols-[220px_minmax(0,1fr)] sm:px-6">
                    <dt className="text-sm text-ink-600">{r.label}</dt>
                    <dd className="text-right text-[15px] font-semibold text-ink-900 sm:text-left">{r.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-ink-500">Square footage is approximate and varies with the options you choose.</p>
            </section>
          </div>

          <aside aria-label={`Pricing for ${model.name}`} className="lg:sticky lg:top-24 lg:self-start">
            <Card className="p-6">
              {model.basePrice != null ? (
                <>
                  <p className="text-sm text-ink-600">Build On Your Lot from</p>
                  <p className="mt-1 text-[2rem] leading-tight font-semibold tracking-tight text-ink-900 tabular-nums">{formatPrice(model.basePrice)}</p>
                  {model.basePriceNote && <p className="mt-1 text-sm font-medium text-ink-700">{model.basePriceNote}</p>}
                  <p className="mt-3 text-xs leading-5 text-ink-600">
                    Base price as of {PRICE_AS_OF}; subject to change without notice. Excludes options, sitework, permit fees and the other costs listed
                    on the price list.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-ink-600">Build On Your Lot</p>
                  <p className="mt-1 text-[1.75rem] leading-tight font-semibold text-ink-900">Call for pricing</p>
                  <p className="mt-3 text-xs leading-5 text-ink-600">Ask our team about pricing for this plan on your lot.</p>
                </>
              )}
              <div className="mt-5 grid gap-2.5">
                <ButtonLink to={consultTo} size="lg" leftIcon={<CalendarDays className="size-5" aria-hidden />}>
                  Schedule a consultation
                </ButtonLink>
                <a href={`tel:${office.phone}`} className={buttonStyles('periwinkle', 'lg')}>
                  <Phone className="size-5" aria-hidden /> Call {office.phoneDisplay}
                </a>
              </div>
              <ul className="mt-6 space-y-1 border-t border-ink-100 pt-4">
                {model.brochureUrl && (
                  <li>
                    <a
                      href={model.brochureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group -mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm font-medium text-ink-800 hover:bg-brand-50 hover:text-brand-900"
                    >
                      <span className="text-brand-700 [&>svg]:size-4" aria-hidden>
                        <FileText />
                      </span>
                      <span className="flex-1">
                        {shortName} brochure (PDF)<span className="sr-only"> (opens in a new tab)</span>
                      </span>
                      <ArrowRight className="size-4 -rotate-45 text-ink-400 group-hover:text-brand-800" aria-hidden />
                    </a>
                  </li>
                )}
                {[
                  { to: '/build-on-your-lot/price-list', label: 'BOYL price list', icon: <Receipt /> },
                  { to: '/build-on-your-lot', label: 'How Build On Your Lot works', icon: <Wrench /> },
                  { to: '/build-on-your-lot/features', label: 'What’s included in every home', icon: <ListChecks /> },
                ].map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="group -mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm font-medium text-ink-800 hover:bg-brand-50 hover:text-brand-900">
                      <span className="text-brand-700 [&>svg]:size-4" aria-hidden>
                        {l.icon}
                      </span>
                      <span className="flex-1">{l.label}</span>
                      <ArrowRight className="size-4 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-800" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </Section>

      {/* Homes for sale built on this plan */}
      {forSale.length > 0 && (
        <Section>
          <SectionHeading
            eyebrow="For sale"
            title={`${shortName} homes for sale`}
            description={`New homes on the ${shortName} plan, from coming soon to ready to move in.`}
            action={<ArrowLink to="/move-in-ready">All Move In Ready Homes</ArrowLink>}
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {forSale.map((h) => (
              <HomeListingCard key={h.id} home={h} />
            ))}
          </div>
        </Section>
      )}

      {/* The plan as built: photo galleries from View My Home */}
      {built.length > 0 && (
        <Section tone={forSale.length > 0 ? 'tint' : 'white'}>
          <SectionHeading
            eyebrow="View My Home"
            title={`Real ${shortName} homes`}
            description={`Construction and finished-home photos of ${shortName} homes we’ve built or are building now.`}
            action={<ArrowLink to="/view-my-home">All homes on View My Home</ArrowLink>}
          />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {built.map((p) => (
              <li key={p.slug} className="min-w-0">
                <PortfolioCard home={p} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Similar plans */}
      <Section tone={(forSale.length > 0) === (built.length > 0) ? 'white' : 'tint'}>
        <SectionHeading eyebrow="Similar plans" title="You might also like" action={<ArrowLink to="/our-homes/gallery">Browse all {homeModels.length} plans</ArrowLink>} />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {similar.map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
      </Section>

      <CTASection
        title={`Let’s talk about the ${shortName}`}
        description="Tell us about your lot and your must-haves. We’ll prepare schematic sketches of the home on your property, with an estimated price — before you pay any design fees."
      />
    </>
  )
}
