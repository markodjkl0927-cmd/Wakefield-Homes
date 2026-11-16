import { useMemo } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Box, CalendarCheck, FileSignature, HardHat, Images, KeyRound, Phone, Wrench } from 'lucide-react'
import type { Community } from '@/types'
import { cn } from '@/lib/cn'
import { useDocumentTitle } from '@/lib/utils'
import { photos } from '@/data/images'
import { awardHighlights, chamberMembership, memberships, reviews, storyIntro, storyTimeline, trustStats } from '@/data/content'
import { communityStatusLabels, currentCommunities } from '@/data/communities'
import { homeModels } from '@/data/models'
import { useCurrentUser, useHomesForSale, useOffice, useSettings } from '@/store/hooks'
import { Badge, buttonStyles, EmptyState, SmartImage } from '@/components/ui'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { TestimonialCard } from '@/components/site/cards'
import { portalHomeFor } from '@/components/site/SiteHeader'
import { preloadViewer3D } from '@/three/Viewer3D'
import { HomeExplorer3D } from './homes/HomeExplorer3D'
import { HomeListingCard } from './homes/HomeListingCard'
import { ArrowLink } from './homes/parts'
import { scrollToSection } from './homes/utils'

const EXPLORER_ID = 'explore-3d'

/* ------------------------------------------------------------------ */
/* Hero                                                                 */
/* ------------------------------------------------------------------ */

function Hero({ show3d }: { show3d: boolean }) {
  const office = useOffice()
  // Hovering or focusing the 3D button starts the engine download, so the house is ready when the scroll lands.
  const warm3d = show3d ? preloadViewer3D : undefined
  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink-900">
        <SmartImage src={photos.hero.exteriorWhiteFarmhouse} alt="" priority className="absolute inset-0 -z-10 bg-ink-800" />
        <div className="hero-shade absolute inset-0 -z-10" aria-hidden />
        {/* Below lg the text spans the whole photo, including the bright white siding: a little extra shade keeps it AA. */}
        <div className="absolute inset-0 -z-10 bg-ink-950/15 lg:hidden" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-ink-950/40 to-transparent" aria-hidden />

        <div className="container-page flex min-h-[600px] flex-col justify-center pt-16 pb-40 [text-shadow:0_1px_2px_rgb(0_0_0/0.3)] sm:min-h-[660px] lg:min-h-[720px] lg:pb-44">
          <div className="max-w-3xl animate-fade-up">
            <p className="text-xs font-semibold tracking-[0.22em] text-white uppercase">Alexandria · Fairfax · Arlington</p>
            <h1 className="display-heading mt-5 text-5xl leading-[1.02] !text-white sm:text-6xl lg:text-7xl">Don’t settle for ordinary.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white sm:text-xl sm:leading-9">
              Award-winning custom homes in Northern Virginia, built by three generations of the Genuario family for more than 50 years.
            </p>
            <div className="mt-10 flex flex-col gap-3 [text-shadow:none] sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href={`#${EXPLORER_ID}-stage`}
                onPointerEnter={warm3d}
                onFocus={warm3d}
                onTouchStart={warm3d}
                onClick={(e) => {
                  e.preventDefault()
                  warm3d?.()
                  scrollToSection(`${EXPLORER_ID}-stage`, { focus: 'self' })
                }}
                className={buttonStyles('white', 'lg')}
              >
                {show3d ? <Box className="size-5" aria-hidden /> : <Images className="size-5" aria-hidden />}
                {show3d ? 'Explore homes in 3D' : 'Explore our homes'}
              </a>
              <Link to="/move-in-ready" className={buttonStyles('periwinkle', 'lg')}>
                Move In Ready Homes
              </Link>
              <a href={`tel:${office.phone}`} className={buttonStyles('ghost', 'lg', 'text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.35)] hover:bg-white/10 hover:text-white')}>
                <Phone className="size-5" aria-hidden />
                <span>
                  <span className="sr-only">Call </span>
                  {office.phoneDisplay}
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip overlapping the photo */}
      <div className="relative z-10 -mt-24 lg:-mt-20">
        <div className="container-page">
          <dl className="grid grid-cols-2 overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-ink-200/70 lg:grid-cols-4">
            {trustStats.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  'flex flex-col-reverse justify-end gap-1 border-ink-100 px-5 py-5 sm:px-7 sm:py-6',
                  i === 1 && 'border-l',
                  i === 2 && 'border-t lg:border-t-0 lg:border-l',
                  i === 3 && 'border-t border-l lg:border-t-0',
                )}
              >
                <dt className="text-sm leading-5 text-ink-600">{s.label}</dt>
                <dd className="font-display text-3xl font-semibold tracking-tight text-brand-900 sm:text-4xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Three paths                                                          */
/* ------------------------------------------------------------------ */

interface PathDef {
  title: string
  body: string
  to: string
  cta: string
  image: string
  focus: string
}

function PathCard({ path, index, className }: { path: PathDef; index: number; className?: string }) {
  return (
    <article
      className={cn(
        'group relative isolate flex min-h-[340px] flex-col justify-end overflow-hidden rounded-3xl bg-ink-900 p-6 shadow-card transition-shadow hover:shadow-lift sm:min-h-[400px] sm:p-8 lg:min-h-[420px]',
        className,
      )}
    >
      <SmartImage src={path.image} alt="" className="absolute inset-0 -z-10 bg-ink-800" imgClassName={cn(path.focus, 'transition-transform duration-700 group-hover:scale-105')} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950/90 via-ink-950/45 to-ink-950/0" aria-hidden />
      <p className="text-xs font-semibold tracking-[0.18em] text-white/85 tabular-nums" aria-hidden>
        0{index + 1}
      </p>
      <h3 className="mt-2 font-display text-2xl font-semibold !text-white sm:text-[1.7rem]">
        <Link to={path.to} className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand-500">
          {path.title}
        </Link>
      </h3>
      <p className="mt-2 max-w-sm text-[15px] leading-6 text-white/90">{path.body}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white" aria-hidden>
        {path.cta}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </span>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* Current projects                                                     */
/* ------------------------------------------------------------------ */

const communityTone = { 'now-selling': 'success', 'coming-soon': 'info', 'under-construction': 'brand', 'sold-out': 'neutral' } as const

/** Compact card for one of the live "Current Projects": photo, area, name, published status. */
function ProjectCard({ community }: { community: Community }) {
  const sold = community.status === 'sold-out'
  // Sold projects show their own wording ("All lots sold"); the rest show the status plus its detail line.
  const status = sold ? (community.statusNote ?? communityStatusLabels['sold-out']) : communityStatusLabels[community.status]
  const detail = sold ? undefined : community.statusNote
  return (
    <li className="min-w-0">
      <article className="group relative flex h-full items-center gap-4 rounded-2xl bg-white p-3 pr-4 shadow-card ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500">
        <SmartImage src={community.image} alt="" className="size-24 shrink-0 rounded-xl sm:size-28" imgClassName="transition-transform duration-700 group-hover:scale-105" />
        <div className="min-w-0 flex-1 py-1">
          <p className="text-xs font-medium tracking-wide text-ink-600 uppercase">{community.area}</p>
          <h3 className="mt-1 text-base leading-6 font-semibold text-ink-900">
            <Link to={`/communities/${community.slug}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
              {community.name}
            </Link>
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone={communityTone[community.status]} dot>
              {status}
            </Badge>
            {community.buildOnYourLot && <Badge tone="violet">Build On Your Lot</Badge>}
          </div>
          {detail && <p className="mt-1.5 text-xs leading-5 text-ink-600">{detail}</p>}
        </div>
        <ArrowRight className="size-4 shrink-0 text-ink-400 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-brand-800" aria-hidden />
      </article>
    </li>
  )
}

/* ------------------------------------------------------------------ */
/* Home Owner portal teaser                                             */
/* ------------------------------------------------------------------ */

const portalFeatures = [
  { icon: <HardHat />, label: 'Follow your build' },
  { icon: <FileSignature />, label: 'Review agreements' },
  { icon: <CalendarCheck />, label: 'Book appointments' },
  { icon: <Wrench />, label: 'Request maintenance' },
]

function PortalTeaser() {
  const user = useCurrentUser()
  const signedInOwner = user?.role === 'homeowner'
  return (
    <Section size="sm">
      <div className="relative isolate overflow-hidden rounded-3xl bg-brand-50 px-6 py-8 ring-1 ring-brand-100 sm:px-10 sm:py-10">
        <div className="absolute -top-16 -right-10 -z-10 size-64 rounded-full bg-lavender-200/60 blur-3xl" aria-hidden />
        <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow">Home Owner portal</p>
            <h2 className="display-heading mt-3 text-2xl sm:text-3xl">Building with Wakefield?</h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-ink-600">
              Follow your home’s progress photos on View My Home, and sign in to the Home Owner portal for your agreements, your homes, appointments with
              our office and maintenance requests — all in one place.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to={signedInOwner ? portalHomeFor(user?.role) : '/access/homeowners'} className={buttonStyles('primary', 'lg')}>
                <KeyRound className="size-4" aria-hidden /> {signedInOwner ? 'Go to my dashboard' : 'Home Owner login'}
              </Link>
              <Link to="/view-my-home" className={buttonStyles('periwinkle', 'lg')}>
                <Images className="size-4" aria-hidden /> View My Home
              </Link>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {portalFeatures.map((f) => (
              <li key={f.label} className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm font-semibold text-ink-800 shadow-card ring-1 ring-ink-200/70">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-900 text-white [&>svg]:size-4" aria-hidden>
                  {f.icon}
                </span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

const MILESTONE_YEARS = ['1970', '1978', '1995', '2022']
/** The three reviews on the live homepage ("What Our Customers Say"). */
const FEATURED_REVIEW_NAMES = ['Sarah S.', 'Chris K.', 'K DC']

export default function HomePage() {
  useDocumentTitle('Custom homes in Northern Virginia')
  const forSaleAll = useHomesForSale()
  const show3d = useSettings().features.view3d

  const forSale = useMemo(() => forSaleAll.slice(0, 3), [forSaleAll])
  const milestones = storyTimeline.filter((m) => MILESTONE_YEARS.includes(m.year))
  const featuredReviews = FEATURED_REVIEW_NAMES.map((n) => reviews.find((r) => r.name === n)).filter((r): r is (typeof reviews)[number] => !!r)

  const paths: PathDef[] = [
    {
      title: 'Move In Ready Homes',
      body: 'New Wakefield homes for sale, from coming soon to ready to move in.',
      to: '/move-in-ready',
      cta: 'See homes for sale',
      image: photos.hero.summerStreet,
      focus: 'object-[center_70%]',
    },
    {
      title: 'Build On Your Lot',
      body: 'Own land already? Build a proven Wakefield plan on it.',
      to: '/build-on-your-lot',
      cta: 'How it works',
      image: photos.hero.framing,
      focus: 'object-center',
    },
    {
      title: 'Home Gallery',
      body: `${homeModels.length} floor plans to compare by size, style and price${show3d ? ' — in 3D' : ''}.`,
      to: '/our-homes/gallery',
      cta: 'Browse the plans',
      image: photos.hero.kitchenIsland,
      focus: 'object-center',
    },
  ]

  return (
    <>
      <Hero show3d={show3d} />

      <HomeExplorer3D id={EXPLORER_ID} />

      {/* Three ways to a Wakefield home */}
      <Section>
        <SectionHeading
          eyebrow="Ways to buy"
          title="Your path to a Wakefield home"
          description="Move into a new Wakefield home, build one of our plans on land you already own, or browse the full portfolio for inspiration."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {paths.map((p, i) => (
            <PathCard key={p.to} path={p} index={i} className={i === paths.length - 1 ? 'sm:col-span-2 sm:min-h-[300px] lg:col-span-1 lg:min-h-[420px]' : undefined} />
          ))}
        </div>
      </Section>

      {/* Homes for sale */}
      <Section tone="tint">
        <SectionHeading
          eyebrow="Move In Ready Homes"
          title="Homes for sale"
          description={`New Wakefield homes, from coming soon to ready to move in.${show3d ? ' Homes marked “3D tour” can be explored online first.' : ''}`}
          action={<ArrowLink to="/move-in-ready">View all homes</ArrowLink>}
        />
        {forSale.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {forSale.map((h) => (
              <HomeListingCard key={h.id} home={h} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl bg-white ring-1 ring-ink-200/70">
            <EmptyState
              icon={<KeyRound className="size-6" aria-hidden />}
              title="New homes are on the way"
              description="Our next homes will be listed here. Tell us what you’re looking for and our team will be in touch."
              action={
                <Link to="/contact?interest=move-in-ready" className={buttonStyles('primary')}>
                  Tell us what you need
                </Link>
              }
            />
          </div>
        )}
      </Section>

      {/* A builder for generations */}
      <Section>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div className="relative pb-16 sm:pb-12 lg:pr-8 lg:pb-10">
            <SmartImage src={photos.hero.floatingStair} alt="A floating staircase in a Wakefield home" className="aspect-[4/3] w-full rounded-3xl shadow-lift" />
            <div className="absolute top-5 left-5 rounded-2xl bg-white/95 px-4 py-3 shadow-lift ring-1 ring-black/5 backdrop-blur sm:px-5 sm:py-4">
              <p className="font-display text-2xl font-semibold text-brand-900 sm:text-3xl">Since 1970</p>
              <p className="mt-0.5 text-xs text-ink-600 sm:text-sm">Three generations of the Genuario family</p>
            </div>
            <figure className="absolute right-4 bottom-0 w-36 rounded-2xl bg-white p-2 shadow-lift ring-1 ring-ink-200/70 sm:right-8 sm:w-44 lg:right-0">
              <SmartImage src={photos.company.team} alt="The Wakefield Homes team" className="aspect-[232/300] w-full rounded-xl" />
              <figcaption className="px-1 pt-2 pb-0.5 text-xs font-medium text-ink-700">The Wakefield team</figcaption>
            </figure>
          </div>
          <div>
            <p className="eyebrow">Our story</p>
            <h2 className="display-heading mt-3 text-3xl sm:text-4xl">A builder for generations</h2>
            <p className="mt-5 text-lg leading-8 text-ink-600">{storyIntro}</p>
            <ol className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2" aria-label="Milestones">
              {milestones.map((m) => (
                <li key={m.year} className="border-t-2 border-brand-100 pt-4">
                  <p className="font-display text-2xl font-semibold text-brand-800 tabular-nums">{m.year}</p>
                  <p className="mt-1 text-[15px] font-medium text-ink-800">{m.title}</p>
                </li>
              ))}
            </ol>
            <ArrowLink to="/about" className="mt-7">
              Read our story
            </ArrowLink>
          </div>
        </div>
      </Section>

      {/* Awards (the live site's royal blue band) */}
      <section className="relative isolate overflow-hidden bg-brand-900 py-16 sm:py-24" aria-labelledby="awards-title">
        <div className="absolute -top-32 -left-24 -z-10 size-96 rounded-full bg-brand-700/50 blur-3xl" aria-hidden />
        <div className="absolute -right-24 -bottom-32 -z-10 size-96 rounded-full bg-lavender-400/20 blur-3xl" aria-hidden />
        <div className="container-page">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-16">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-brand-200 uppercase">Awards</p>
              <h2 id="awards-title" className="display-heading mt-3 text-3xl !text-white sm:text-4xl">
                Recognized by our peers and our clients
              </h2>
              <p className="mt-4 text-lg leading-8 text-brand-100">
                From the Northern Virginia Building Industry Association to Houzz, our homes and our service have been honored since 1992.
              </p>
              <ArrowLink to="/about/awards" tone="light" className="mt-6">
                See all awards
              </ArrowLink>
            </div>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/15">
              {awardHighlights.map((a) => (
                <div key={a.label} className="flex flex-col-reverse justify-end bg-brand-900 p-5 sm:p-7">
                  <dt className="mt-1 text-sm font-semibold text-white sm:text-base">
                    {a.label}
                    <span className="mt-0.5 block text-xs font-normal text-brand-200 sm:text-sm">{a.note}</span>
                  </dt>
                  <dd className="font-display text-4xl font-semibold text-white tabular-nums sm:text-5xl">{a.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <SmartImage
            src={photos.company.awards}
            alt="Award badges including Best of Houzz and Builder of the Year"
            className="mt-12 aspect-[1904/303] w-full rounded-2xl bg-white shadow-pop ring-1 ring-white/10"
            imgClassName="object-contain"
          />
        </div>
      </section>

      {/* Testimonials — the same three reviews as the live homepage */}
      <Section>
        <SectionHeading eyebrow="Reviews" title="What our customers say" action={<ArrowLink to="/reviews">Read all reviews</ArrowLink>} />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {featuredReviews.map((r) => (
            <TestimonialCard key={r.name} quote={r.quote} name={r.name} context={r.context} />
          ))}
        </div>
      </Section>

      {/* Current projects (the live "Our Communities" list, in its order) */}
      <Section tone="tint">
        <SectionHeading
          eyebrow="Our communities"
          title="Current projects"
          description="New homes and small communities across Alexandria — from Old Town to Mount Vernon."
          action={<ArrowLink to="/communities">All communities</ArrowLink>}
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {currentCommunities.map((c) => (
            <ProjectCard key={c.id} community={c} />
          ))}
        </ul>
      </Section>

      <PortalTeaser />

      {/* Memberships */}
      <section className="border-t border-ink-100 bg-white py-12 sm:py-14" aria-labelledby="memberships-title">
        <div className="container-page">
          <h2 id="memberships-title" className="text-center text-xs font-semibold tracking-[0.18em] text-ink-600 uppercase">
            Proud members of
          </h2>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:gap-x-10">
            {memberships.map((m) => (
              <li key={m.short}>
                <a
                  href={m.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-xl p-2 transition-colors hover:bg-ink-50"
                  title={m.name}
                >
                  <SmartImage
                    src={photos.memberships[m.logoKey]}
                    alt={m.name}
                    className="h-16 w-24 bg-transparent sm:h-20 sm:w-32"
                    imgClassName="object-contain opacity-70 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0"
                  />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
            {/* Shown on the live homepage too; no link until the chamber's current site is confirmed. */}
            <li className="p-2" title={`${chamberMembership.name} — ${chamberMembership.note}`}>
              <SmartImage
                src={photos.memberships[chamberMembership.logoKey]}
                alt={`${chamberMembership.name} (${chamberMembership.note})`}
                className="h-16 w-24 bg-transparent sm:h-20 sm:w-32"
                imgClassName="object-contain opacity-70 grayscale"
              />
            </li>
          </ul>
          <p className="mt-6 text-center">
            <ArrowLink to="/about/memberships">About our memberships</ArrowLink>
          </p>
        </div>
      </section>

      <CTASection />
    </>
  )
}
