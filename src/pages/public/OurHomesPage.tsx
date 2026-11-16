import { Link } from 'react-router'
import { ArrowRight, Award, CalendarDays, Gem, HardHat, KeyRound, ListChecks, MessagesSquare, PencilRuler, Receipt, Users } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { photos } from '@/data/images'
import { getModel, homeModels, PRICE_AS_OF } from '@/data/models'
import type { HomeModel } from '@/types'
import { useSettings } from '@/store/hooks'
import { buttonStyles, SmartImage } from '@/components/ui'
import { PageHero } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { ModelCard } from '@/components/site/cards'
import { ArrowLink, ValuePoint } from './homes/parts'

const pillars = [
  {
    icon: <Gem />,
    title: 'Craftsmanship',
    body: 'The same care and craftsmanship that builders brought to homes two centuries ago, in every home we build.',
  },
  {
    icon: <Users />,
    title: 'A team approach',
    body: 'Responsive communication and service you can count on, from conception to completion.',
  },
  {
    icon: <PencilRuler />,
    title: 'An independent architect',
    body: 'A custom home designer who knows our portfolio is available to meet with you as needed, so your plan fits the way you live.',
  },
  {
    icon: <Award />,
    title: 'Award-winning homes',
    body: 'Honored by the Northern Virginia Building Industry Association, Houzz and the Great American Living Awards.',
  },
]

const waysToBuy = [
  {
    title: 'Move In Ready Homes',
    body: 'New homes for sale in our communities, from coming soon to ready to move in.',
    to: '/move-in-ready',
    cta: 'See homes for sale',
    image: photos.hero.summerStreet,
  },
  {
    title: 'Build On Your Lot',
    body: 'Own land already? Choose a proven plan from our portfolio and build it on your property, with a budget prepared before you build.',
    to: '/build-on-your-lot',
    cta: 'How it works',
    image: photos.hero.craftsmanPorch,
  },
  {
    title: 'Fully custom',
    body: 'Start from a blank page with our team and an independent architect to design a home that is entirely your own.',
    to: '/contact?interest=custom-home',
    cta: 'Start a conversation',
    image: photos.hero.porchFireplaceRiver,
  },
]

const process = [
  { icon: <MessagesSquare />, title: 'Consultation', body: 'Talk through plans, lots, budget and timing with our team.' },
  { icon: <PencilRuler />, title: 'Design', body: 'Start from one of our plans or a blank page, and refine it with an independent architect.' },
  { icon: <ListChecks />, title: 'Selections', body: 'Select the finishes for your home with our Sales Representative, and we adjust your contract for any options.' },
  { icon: <HardHat />, title: 'Construction', body: 'We obtain the building permit and build your home, keeping you involved at every phase.' },
  { icon: <KeyRound />, title: 'Keys in hand', body: 'A final walkthrough with you before move-in — then the Home Owner portal for appointments and requests.' },
]

const FEATURED_PLANS = ['stockton', 'hamilton', 'wellington', 'abigail']

export default function OurHomesPage() {
  useDocumentTitle('Our Homes')
  const show3d = useSettings().features.view3d
  const featured = FEATURED_PLANS.map((s) => getModel(s)).filter((m): m is HomeModel => !!m)

  return (
    <>
      <PageHero
        image={photos.hero.kitchenIsland}
        eyebrow="Our Homes"
        title="Homes built with care, from the first sketch to the final walkthrough"
        description="Award-winning design, quality construction and a family team that stays with you long after move-in."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Our Homes' }]}
        size="lg"
        actions={
          <>
            <Link to="/our-homes/gallery" className={buttonStyles('white', 'lg')}>
              Explore {homeModels.length} plans
            </Link>
            <Link to="/move-in-ready" className={buttonStyles('periwinkle', 'lg')}>
              Move In Ready Homes
            </Link>
          </>
        }
      />

      {/* What makes a Wakefield home */}
      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="The Wakefield difference"
              title="What makes a Wakefield home"
              description="Three generations of the Genuario family have built homes in Northern Virginia. Here is what has stayed the same."
            />
            <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2">
              {pillars.map((p) => (
                <ValuePoint key={p.title} icon={p.icon} title={p.title}>
                  {p.body}
                </ValuePoint>
              ))}
            </div>
          </div>
          <div className="hidden h-[600px] grid-cols-5 grid-rows-6 gap-4 lg:grid">
            <SmartImage src={photos.hero.floatingStair} alt="A floating staircase in a Wakefield home" className="col-span-3 row-span-4 rounded-3xl shadow-lift" />
            <SmartImage src={photos.hero.masterBath} alt="A primary bathroom with a freestanding tub" className="col-span-2 row-span-3 rounded-3xl shadow-card" />
            <SmartImage src={photos.hero.mudroom} alt="A mudroom with built-in cubbies" className="col-span-2 row-span-3 rounded-3xl shadow-card" />
            <SmartImage src={photos.hero.laundry} alt="A finished laundry room" className="col-span-3 row-span-2 rounded-3xl shadow-card" />
          </div>
          <SmartImage src={photos.hero.floatingStair} alt="A floating staircase in a Wakefield home" className="aspect-[16/10] w-full rounded-3xl shadow-lift lg:hidden" />
        </div>
      </Section>

      {/* Three ways to buy */}
      <Section tone="tint">
        <SectionHeading
          eyebrow="Three ways to buy"
          title="However you’d like to build, we can help"
          description="Buy a home that’s ready now, build one of our plans on your own land, or design something entirely new."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {waysToBuy.map((w) => (
            <article key={w.title} className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <SmartImage src={w.image} alt="" className="aspect-[16/10] w-full" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-2xl font-semibold text-ink-900">
                  <Link to={w.to} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-3xl focus-visible:after:outline-2 focus-visible:after:outline-brand-500">
                    {w.title}
                  </Link>
                </h3>
                <p className="mt-2 flex-1 text-[15px] leading-7 text-ink-600">{w.body}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800" aria-hidden>
                  {w.cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* Featured plans */}
      <Section>
        <SectionHeading
          eyebrow="Featured plans"
          title="Start with a plan you love"
          description={`Every plan in our portfolio can be customized${show3d ? ' — and explored in 3D before you build' : ' with options packages'}.`}
          action={<ArrowLink to="/our-homes/gallery">Browse all {homeModels.length} plans</ArrowLink>}
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
      </Section>

      {/* Process */}
      <section className="relative isolate overflow-hidden bg-brand-900 py-16 sm:py-24" aria-labelledby="process-title">
        <div className="absolute -top-32 -right-24 -z-10 size-96 rounded-full bg-brand-700/50 blur-3xl" aria-hidden />
        <div className="container-page">
          <SectionHeading
            tone="light"
            eyebrow="How we build"
            title={<span id="process-title">From first conversation to keys in hand</span>}
            description="A clear, step-by-step process — and you approve each phase before we move on."
          />
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0">
            {process.map((step, i) => (
              <li key={step.title} className="relative rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 lg:rounded-none lg:bg-transparent lg:p-0 lg:pr-6 lg:ring-0">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-900 shadow-sm [&>svg]:size-5" aria-hidden>
                    {step.icon}
                  </span>
                  {i < process.length - 1 && <span className="hidden h-px flex-1 bg-gradient-to-r from-white/40 to-white/10 lg:block" aria-hidden />}
                </div>
                <p className="mt-5 text-xs font-semibold tracking-[0.16em] text-brand-200 uppercase">Step {i + 1}</p>
                <h3 className="mt-1.5 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-brand-100">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features and price list */}
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            to="/build-on-your-lot/features"
            className="group flex items-start gap-5 rounded-3xl bg-white p-6 shadow-card ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift sm:p-8"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-800 ring-1 ring-brand-100" aria-hidden>
              <ListChecks className="size-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-semibold text-ink-900">Included features</span>
              <span className="mt-1.5 block text-[15px] leading-7 text-ink-600">What comes standard in a Build On Your Lot home, from the kitchen to energy-saving features.</span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800">
                See what’s included <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </span>
          </Link>
          <Link
            to="/build-on-your-lot/price-list"
            className="group flex items-start gap-5 rounded-3xl bg-white p-6 shadow-card ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift sm:p-8"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-800 ring-1 ring-brand-100" aria-hidden>
              <Receipt className="size-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-semibold text-ink-900">Build On Your Lot price list</span>
              <span className="mt-1.5 block text-[15px] leading-7 text-ink-600">Base prices for the plans in our portfolio, as of {PRICE_AS_OF}.</span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800">
                View the price list <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </span>
          </Link>
        </div>
        <p className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-[15px] text-ink-600">
          <CalendarDays className="size-4 text-brand-700" aria-hidden />
          Looking for a home you can buy now?
          <Link to="/move-in-ready" className="font-semibold text-brand-800 underline-offset-4 hover:underline">
            See our homes for sale
          </Link>
        </p>
      </Section>

      <CTASection />
    </>
  )
}
