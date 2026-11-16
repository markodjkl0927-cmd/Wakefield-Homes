import { Link } from 'react-router'
import { ArrowRight, Calculator, DraftingCompass, FileText, Lock, Percent, PiggyBank, SlidersHorizontal } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { formatPrice } from '@/lib/format'
import { boylBenefits, boylIntro, boylPhases, buildingSince } from '@/data/content'
import { getModel, homeModels, PRICE_AS_OF } from '@/data/models'
import { photos } from '@/data/images'
import type { HomeModel } from '@/types'
import { useAppStore } from '@/store'
import { ButtonLink, Card, SmartImage } from '@/components/ui'
import { PageHero } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { ModelCard } from '@/components/site/cards'
import { ArrowLink } from './homes/parts'
import { FaqSection, heroPrimaryButton, heroSecondaryButton, IconTile } from './boyl/shared'
import { StepTrack } from './boyl/Steps'
import { boylFaq } from './boyl/faqs'
import { lowestPricedPlan, pricedPlans } from './boyl/pricing'

const benefitIcons = [<SlidersHorizontal key="a" />, <PiggyBank key="b" />, <Calculator key="c" />, <DraftingCompass key="d" />]

/** A varied selection of price-list plans for the "Choose your plan" strip. */
const featuredPlans = ['stockton', 'fort-hunt', 'wellington', 'hamilton'].map((slug) => getModel(slug)).filter((m): m is HomeModel => !!m)

const lowestThree = [...pricedPlans].sort((a, b) => a.priceList.price - b.priceList.price).slice(0, 3)

export default function BoylHowPage() {
  useDocumentTitle('Build On Your Lot')
  const view3d = useAppStore((s) => s.settings.features.view3d)

  return (
    <>
      <PageHero
        image={photos.hero.framing}
        size="lg"
        eyebrow="Build On Your Lot"
        title="Your lot. A proven Wakefield plan."
        description={boylIntro}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Our Homes', to: '/our-homes' }, { label: 'Build On Your Lot' }]}
        actions={
          <>
            <Link to="/contact?interest=build-on-your-lot" className={heroPrimaryButton}>
              Tell us about your lot
            </Link>
            <Link to="/build-on-your-lot/price-list" className={heroSecondaryButton}>
              View the price list
            </Link>
          </>
        }
      />

      {/* Intro */}
      <Section>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="eyebrow">The program</p>
            <h2 className="display-heading mt-3 text-3xl sm:text-4xl">A custom home, without starting from a blank page</h2>
            <div className="prose-wh mt-5 text-lg leading-8">
              <p>
                Start from a plan in the Wakefield New Home Portfolio and make it yours. We sketch the home on your lot with an estimated price first, then develop the
                construction plans — and you decide when to move on to each next phase.
              </p>
              <p>One source of accountability from design to construction: Wakefield Homes.</p>
            </div>
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-ink-200 pt-8">
              <div className="flex flex-col-reverse justify-end">
                <dt className="mt-1 text-sm text-ink-600">Building homes in Northern Virginia</dt>
                <dd className="font-display text-3xl font-semibold text-ink-900 tabular-nums sm:text-4xl">
                  <span className="mr-1.5 align-middle font-sans text-sm font-semibold tracking-[0.14em] text-brand-700 uppercase">Since</span>
                  {buildingSince}
                </dd>
              </div>
              <div className="flex flex-col-reverse justify-end">
                <dt className="mt-1 text-sm text-ink-600">Base prices from, as of {PRICE_AS_OF}</dt>
                <dd className="font-display text-3xl font-semibold text-ink-900 tabular-nums sm:text-4xl">{formatPrice(lowestPricedPlan.priceList.price)}</dd>
              </div>
              <div className="flex flex-col-reverse justify-end">
                <dt className="mt-1 text-sm text-ink-600">Plans in our portfolio</dt>
                <dd className="font-display text-3xl font-semibold text-ink-900 tabular-nums sm:text-4xl">{homeModels.length}</dd>
              </div>
              <div className="flex flex-col-reverse justify-end">
                <dt className="mt-1 text-sm text-ink-600">Phases, each with your approval</dt>
                <dd className="font-display text-3xl font-semibold text-ink-900 tabular-nums sm:text-4xl">{boylPhases.length}</dd>
              </div>
            </dl>
          </div>
          <div className="relative pb-8 lg:pb-0">
            <SmartImage
              src={photos.construction.completedFront}
              alt="Front elevation of a completed Wakefield home"
              className="aspect-[4/3] w-full rounded-3xl shadow-lift lg:aspect-[4/5]"
            />
            <div className="absolute right-4 bottom-0 left-4 rounded-2xl bg-white p-5 shadow-pop ring-1 ring-ink-200/70 sm:right-8 sm:left-auto sm:w-80 lg:-bottom-8 lg:-left-8 lg:right-auto">
              <div className="flex items-start gap-3">
                <IconTile>
                  <FileText />
                </IconTile>
                <div>
                  <p className="text-sm font-semibold text-ink-900">No costly design fees up front</p>
                  <p className="mt-1 text-sm leading-6 text-ink-600">Explore feasibility with schematic sketches of your home on your lot and an estimated price.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Phases */}
      <Section tone="tint">
        <SectionHeading
          align="center"
          eyebrow="How it works"
          title="Three phases. You approve each one."
          description="Each phase ends with something concrete to review — sketches and an estimated price, then construction plans, specifications and a proposal — and you can pause or stop the design process if needed."
        />
        <StepTrack
          className="mx-auto mt-14 max-w-5xl"
          steps={boylPhases.map((p) => ({ label: `Phase ${p.step}`, title: p.title, body: p.body }))}
        />
      </Section>

      {/* Benefits */}
      <Section>
        <SectionHeading
          eyebrow="Why build on your lot with us"
          title="Proven plans, realistic budgets"
          description="Our team approach keeps you involved in every phase of design and construction, with clear and constructive communication from the start."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {boylBenefits.map((b, i) => (
            <Card key={b.title} className="flex gap-4 p-5 sm:block sm:p-6">
              <IconTile>{benefitIcons[i % benefitIcons.length]}</IconTile>
              <div>
                <h3 className="text-lg font-semibold text-ink-900 sm:mt-5">{b.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-600 sm:mt-2">{b.body}</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Choose your plan */}
      <Section tone="tint">
        <SectionHeading
          eyebrow="Choose your plan"
          title="Start from a plan you love"
          description={
            view3d
              ? 'Compare sizes and base prices, explore each plan in 3D on its page, then make it your own.'
              : 'Compare sizes and base prices on each plan’s page, then make it your own.'
          }
          action={<ArrowLink to="/our-homes/gallery">Browse all {homeModels.length} plans</ArrowLink>}
        />
        <ul className="-mx-4 mt-10 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          {featuredPlans.map((m) => (
            <li key={m.id} className="w-[82%] shrink-0 snap-start sm:w-auto">
              <ModelCard model={m} className="h-full" />
            </li>
          ))}
        </ul>
      </Section>

      {/* Price list + financing teasers */}
      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="relative isolate flex flex-col overflow-hidden rounded-3xl bg-brand-900 p-8 sm:p-10">
            <div className="absolute -top-24 -right-20 -z-10 size-72 rounded-full bg-brand-500/40 blur-3xl" aria-hidden />
            <p className="eyebrow !text-brand-200">Price list</p>
            <h2 className="display-heading mt-3 text-3xl !text-white sm:text-4xl">Base prices from {formatPrice(lowestPricedPlan.priceList.price)}</h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-brand-100">
              Base prices for {pricedPlans.length} plans as of {PRICE_AS_OF}, subject to change without notice. Costs that depend on your lot — such as permit fees,
              sitework and utility connections — are not included.
            </p>
            <ul className="mt-6 divide-y divide-white/10 rounded-2xl bg-white/5 px-5 ring-1 ring-white/10">
              {lowestThree.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span className="min-w-0">
                    <Link to={`/our-homes/models/${m.slug}`} className="block font-medium text-white underline-offset-4 hover:underline">
                      {m.name}
                    </Link>
                    <span className="block text-xs text-brand-200">
                      {m.priceList.style} · {m.priceList.sqft.toLocaleString('en-US')} sq ft
                    </span>
                  </span>
                  <span className="font-semibold text-white tabular-nums">{formatPrice(m.priceList.price)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-wrap gap-3 pt-8">
              <Link to="/build-on-your-lot/price-list" className={heroPrimaryButton}>
                View the price list
              </Link>
              <Link to="/build-on-your-lot/features" className={heroSecondaryButton}>
                Included features
              </Link>
            </div>
          </article>
          <article className="flex flex-col rounded-3xl bg-brand-50 p-8 ring-1 ring-brand-100 sm:p-10">
            <p className="eyebrow">Financing</p>
            <h2 className="display-heading mt-3 text-3xl sm:text-4xl">One loan, from lot to mortgage</h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-ink-700">
              Our preferred lenders’ construction-to-permanent loans combine lot acquisition, construction financing and your permanent mortgage in a single
              settlement — and while you build, you pay interest on the outstanding balance.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {[
                { icon: <FileText className="size-4" aria-hidden />, label: 'One-time close' },
                { icon: <Percent className="size-4" aria-hidden />, label: 'Interest-only while you build' },
                { icon: <Lock className="size-4" aria-hidden />, label: 'Permanent terms guaranteed' },
              ].map((c) => (
                <li key={c.label} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-brand-900 ring-1 ring-brand-100">
                  {c.icon}
                  {c.label}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              <ButtonLink to="/finance/build-on-your-lot" size="lg" rightIcon={<ArrowRight className="size-4" aria-hidden />}>
                How BOYL financing works
              </ButtonLink>
            </div>
          </article>
        </div>
      </Section>

      {/* FAQ */}
      <Section tone="tint">
        <FaqSection items={boylFaq} description="Short answers to common questions about building on your own land." />
      </Section>

      <CTASection
        title="Ready to build on your lot?"
        description="Tell us about your property and the plan you have in mind. We start with schematic sketches and an estimated price — before any architectural design fees."
      />
    </>
  )
}
