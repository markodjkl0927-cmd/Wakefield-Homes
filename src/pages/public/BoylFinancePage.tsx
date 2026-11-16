import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Landmark, Lock, Percent, Signature, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useDocumentTitle } from '@/lib/utils'
import { boylLenders, constructionLoanPoints } from '@/data/content'
import { photos } from '@/data/images'
import { Card } from '@/components/ui'
import { PageHero } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { FaqSection, heroPrimaryButton, heroSecondaryButton, IconTile, LenderGrid, useScrollToHash } from './boyl/shared'
import { ConstructionLoanTimeline, ProceduresPdfLink } from './boyl/finance'
import { boylFinanceFaq } from './boyl/faqs'

const pointIcons: Record<string, ReactNode> = {
  'One-time close': <Signature />,
  'Fold in your current mortgage': <Landmark />,
  'Rates locked in': <Lock />,
  'Interest-only while you build': <Percent />,
  'Flexible permanent loans': <SlidersHorizontal />,
}

export default function BoylFinancePage() {
  useDocumentTitle('Build On Your Lot Financing')
  useScrollToHash()

  return (
    <>
      <PageHero
        image={photos.construction.framingSide}
        eyebrow="Finance · Build On Your Lot"
        title="Construction-to-permanent financing"
        description="One loan that carries you from settlement, through construction, to your permanent mortgage — with interest-only payments while your home is built."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Finance', to: '/finance' }, { label: 'Build On Your Lot (BOYL)' }]}
        actions={
          <>
            <a href="#lenders" className={heroPrimaryButton}>
              Talk to a lender
            </a>
            <Link to="/build-on-your-lot/price-list" className={heroSecondaryButton}>
              View the price list
            </Link>
          </>
        }
      />

      {/* Timeline */}
      <Section>
        <SectionHeading
          align="center"
          eyebrow="How it works"
          title="From settlement to mortgage, in one loan"
          description="Our preferred lenders offer lot acquisition, construction financing and permanent mortgage financing at competitive rates, with a single settlement."
        />
        <ConstructionLoanTimeline className="mt-14" />
        <div className="mt-10 flex justify-center">
          <ProceduresPdfLink />
        </div>
      </Section>

      {/* Benefits */}
      <Section tone="tint">
        <SectionHeading eyebrow="Benefits" title="The advantages of a construction-to-permanent loan" />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {constructionLoanPoints.map((p, i) => (
            <Card
              key={p.title}
              className={cn('flex flex-col p-6 sm:p-7', i === 0 && 'bg-brand-50 ring-brand-100 md:col-span-2 md:flex-row md:items-center md:gap-6 md:p-8')}
            >
              <IconTile tone={i === 0 ? 'solid' : 'brand'} className={cn(i === 0 && 'md:size-14 md:[&>svg]:size-6')}>
                {pointIcons[p.title] ?? <Signature />}
              </IconTile>
              <div className={cn('mt-5', i === 0 && 'md:mt-0')}>
                <h3 className={cn('font-semibold text-ink-900', i === 0 ? 'text-xl' : 'text-lg')}>{p.title}</h3>
                <p className={cn('mt-2 leading-7 text-ink-600', i === 0 ? 'text-base' : 'text-sm leading-6')}>{p.body}</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section>
        <FaqSection items={boylFinanceFaq} description="Straight answers about financing a home on land you own." />
      </Section>

      {/* Lenders */}
      <Section tone="tint" id="lenders" className="scroll-mt-20">
        <SectionHeading
          eyebrow="Preferred lenders"
          title="Talk to a preferred lender"
          description="Ask about construction-to-permanent options, current terms and what you will need to apply. Each lender’s loan officer and contact details are below."
        />
        <LenderGrid lenders={boylLenders} className="mt-12" />
      </Section>

      <CTASection
        title="Plan your build with confidence"
        description="Start with schematic sketches and an estimated price for your lot — then talk to a lender with clear numbers in hand."
      />
    </>
  )
}
