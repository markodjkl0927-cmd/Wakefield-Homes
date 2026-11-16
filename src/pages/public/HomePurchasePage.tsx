import { Link } from 'react-router'
import { Info, KeyRound } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { financingProgramSince, homePurchaseLenders } from '@/data/content'
import { photos } from '@/data/images'
import { PageHero } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { heroPrimaryButton, heroSecondaryButton, lenderCities, LenderGrid, useScrollToHash } from './boyl/shared'
import { StepCards } from './boyl/Steps'
import { financingSteps, PaymentEstimator, ProceduresPdfLink } from './boyl/finance'

export default function HomePurchasePage() {
  useDocumentTitle('Home Purchase Financing')
  useScrollToHash()

  return (
    <>
      <PageHero
        image={photos.models.woodlawn}
        eyebrow="Finance"
        title="Financing a home purchase"
        description="We have established relationships with local lenders whose programs are available to meet your financial needs — fixed-rate and variable-rate mortgages at competitive rates, with a lock-in period."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Finance', to: '/finance' }, { label: 'Home Purchase' }]}
        actions={
          <>
            <a href="#lenders" className={heroPrimaryButton}>
              Meet our lenders
            </a>
            <Link to="/move-in-ready" className={heroSecondaryButton}>
              Browse move-in ready homes
            </Link>
          </>
        }
      />

      {/* Intro + lenders */}
      <Section id="lenders" className="scroll-mt-20">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-14">
          <div className="lg:col-span-7">
            <SectionHeading
              eyebrow="Preferred lenders"
              title="Local lenders, with you every step of the way"
              description={`Our preferred lenders, in ${lenderCities(homePurchaseLenders)}, can answer any questions you have and will be with you every step of the way. Each one’s contact details and online application are below.`}
            />
          </div>
          <div className="lg:col-span-5">
            <div className="flex gap-3 rounded-2xl bg-brand-50 p-5 ring-1 ring-brand-100">
              <Info className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
              <p className="text-sm leading-6 text-brand-950">
                <span className="font-semibold">Good to know:</span> Wakefield Homes is a builder, not a lender. Rates, terms and loan approval come from the lender you
                choose.
              </p>
            </div>
          </div>
        </div>
        <LenderGrid lenders={homePurchaseLenders} className="mt-12" />
      </Section>

      {/* How the New Home Financing Program works */}
      <Section tone="tint" id="how-it-works" className="scroll-mt-20">
        <SectionHeading
          align="center"
          eyebrow="Step by step"
          title="How our New Home Financing Program works"
          description={`From your Sales Agreement to your permanent mortgage — the program has been used successfully since ${financingProgramSince}.`}
        />
        <StepCards steps={financingSteps} columns={4} className="mt-12" />
        <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-4 text-center">
          <p className="flex items-start gap-2.5 text-sm leading-6 text-ink-600 sm:items-center">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-brand-700 sm:mt-0" aria-hidden />
            <span>
              Buying a home that is already complete? The construction steps don’t apply — your lender guides you from loan approval to settlement.
            </span>
          </p>
          <ProceduresPdfLink />
        </div>
      </Section>

      {/* Payment estimator */}
      <Section>
        <PaymentEstimator lendersLink="#lenders" />
      </Section>

      <CTASection
        title="Found a home you love?"
        description="Talk with our team about availability, timing and next steps — and we’ll connect you with a preferred lender."
      />
    </>
  )
}
