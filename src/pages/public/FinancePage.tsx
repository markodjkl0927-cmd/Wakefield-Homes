import { Link } from 'react-router'
import { ArrowRight, Check, Info } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { financeLenders, financingProgramSince, homePurchaseLenders } from '@/data/content'
import { photos } from '@/data/images'
import { SmartImage } from '@/components/ui'
import { PageHero } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { heroPrimaryButton, heroSecondaryButton, lenderCities, LenderGrid, useScrollToHash } from './boyl/shared'
import { LoanTerms, PaymentEstimator, ProceduresPdfLink } from './boyl/finance'

const paths: { eyebrow: string; title: string; to: string; cta: string; image: string; alt: string; body: string; points: string[] }[] = [
  {
    eyebrow: 'Buying a Wakefield home',
    title: 'Home purchase financing',
    to: '/finance/home-purchase',
    cta: 'Explore home purchase financing',
    image: photos.hero.blueCraftsman,
    alt: 'A finished Wakefield craftsman home',
    body: 'Our preferred local lenders offer fixed-rate and variable-rate mortgages at competitive rates, with a lock-in period — and they are with you every step of the way.',
    points: [`Preferred lenders in ${lenderCities(homePurchaseLenders)}`, 'Fixed-rate and variable-rate mortgages', 'A lock-in period on your rate'],
  },
  {
    eyebrow: 'Building on your lot',
    title: 'Construction-to-permanent loans',
    to: '/finance/build-on-your-lot',
    cta: 'See how BOYL financing works',
    image: photos.construction.framingExterior,
    alt: 'A Wakefield home under construction, framed and sheathed',
    body: 'Lot acquisition, construction financing and your permanent mortgage in one loan — and if you own your lot, your existing mortgage can be paid off within it.',
    points: ['Single settlement / one-time close', 'Interest-only payments while you build', 'Permanent terms guaranteed until completion'],
  },
]

export default function FinancePage() {
  useDocumentTitle('Finance')
  useScrollToHash()

  return (
    <>
      <PageHero
        image={photos.hero.barAndStair}
        eyebrow="Finance"
        title="Financing your Wakefield home"
        description="Two clear paths: a mortgage for a Wakefield home you buy, or a construction-to-permanent loan when you build on your own lot. Here is how each one works."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Finance' }]}
        actions={
          <>
            <a href="#lenders" className={heroPrimaryButton}>
              Meet our lenders
            </a>
            <a href="#estimate" className={heroSecondaryButton}>
              Estimate your payment
            </a>
          </>
        }
      />

      {/* Two paths */}
      <Section>
        <SectionHeading align="center" eyebrow="Choose your path" title="Two ways to finance a Wakefield home" />
        <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-8">
          {paths.map((p) => (
            <article
              key={p.to}
              className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500"
            >
              <SmartImage src={p.image} alt={p.alt} className="aspect-[16/9] w-full" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <p className="eyebrow">{p.eyebrow}</p>
                <h3 className="display-heading mt-2 text-2xl sm:text-3xl">
                  <Link to={p.to} className="after:absolute after:inset-0 focus-visible:outline-none">
                    {p.title}
                  </Link>
                </h3>
                <p className="mt-3 text-base leading-7 text-ink-600">{p.body}</p>
                <ul className="mt-5 space-y-2.5">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex gap-3 text-sm text-ink-700">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-800 ring-1 ring-brand-100" aria-hidden>
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      {pt}
                    </li>
                  ))}
                </ul>
                <span className="mt-auto inline-flex items-center gap-2 pt-8 font-semibold text-brand-800 transition-all group-hover:gap-3" aria-hidden>
                  {p.cta} <ArrowRight className="size-4" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* Program terms */}
      <Section tone="tint" id="program" className="scroll-mt-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-14">
          <div className="lg:col-span-7">
            <SectionHeading
              eyebrow="New home construction / permanent financing"
              title="Benefits and terms, at a glance"
              description={`Our preferred lenders’ financing products offer lot acquisition, construction financing and permanent mortgage financing at competitive rates, with a single settlement. The program has been used in our subdivisions and on individual lots throughout Northern Virginia since ${financingProgramSince}.`}
            />
          </div>
          <div className="flex flex-col gap-3 lg:col-span-5 lg:items-end">
            <ProceduresPdfLink />
            <Link
              to="/finance/home-purchase#how-it-works"
              className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-brand-800 underline-offset-4 hover:underline"
            >
              How the program works, step by step <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
        <LoanTerms className="mt-12" />
      </Section>

      {/* Payment estimator */}
      <Section id="estimate" className="scroll-mt-20">
        <PaymentEstimator lendersLink="#lenders" />
      </Section>

      {/* Preferred lenders */}
      <Section tone="tint" id="lenders" className="scroll-mt-20">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-14">
          <div className="lg:col-span-7">
            <SectionHeading
              eyebrow="Preferred lenders"
              title="Talk with a preferred lender"
              description="Our lenders are available to meet with you and answer any questions you may have — call, email or start your application online."
            />
          </div>
          <div className="lg:col-span-5">
            <div className="flex gap-3 rounded-2xl bg-white p-5 ring-1 ring-ink-200/70">
              <Info className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
              <p className="text-sm leading-6 text-ink-700">
                <span className="font-semibold text-ink-900">Good to know:</span> Wakefield Homes is a builder, not a lender. Rates, terms and loan approval come
                from the lender you choose.
              </p>
            </div>
          </div>
        </div>
        <LenderGrid lenders={financeLenders} className="mt-12" />
      </Section>

      <CTASection
        title="Questions about financing?"
        description="We’re happy to walk you through how buying or building with Wakefield works — and introduce you to a preferred lender."
      />
    </>
  )
}
