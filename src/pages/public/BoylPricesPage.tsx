import { Link } from 'react-router'
import { ArrowRight, CalendarClock, CircleMinus, Landmark, ListChecks, MapPin, MessageCircle } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { formatPrice } from '@/lib/format'
import { boylExclusions, priceListText } from '@/data/content'
import { PRICE_AS_OF, PRICE_NOTE } from '@/data/models'
import { PageHero } from '@/components/site/PageHero'
import { Section } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { IconTile, LinkCard } from './boyl/shared'
import { PriceList } from './boyl/PriceList'
import { lowestPricedPlan, priceListPlans } from './boyl/pricing'

export default function BoylPricesPage() {
  useDocumentTitle('Build On Your Lot Price List')

  return (
    <>
      <PageHero
        size="sm"
        eyebrow="Build On Your Lot"
        title="Build On Your Lot price list"
        description="Base prices for plans in the Wakefield New Home Portfolio, built on your lot in Fairfax County, Arlington County and the City of Alexandria."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Build On Your Lot', to: '/build-on-your-lot' }, { label: 'BOYL Price List' }]}
      >
        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-5 sm:mt-10">
          <div className="flex flex-col-reverse justify-end">
            <dt className="mt-1 text-sm text-ink-600">Plans on the price list</dt>
            <dd className="font-display text-2xl font-semibold text-ink-900 tabular-nums sm:text-3xl">{priceListPlans.length}</dd>
          </div>
          <div className="flex flex-col-reverse justify-end">
            <dt className="mt-1 text-sm text-ink-600">Base prices from</dt>
            <dd className="font-display text-2xl font-semibold text-ink-900 tabular-nums sm:text-3xl">{formatPrice(lowestPricedPlan.priceList.price)}</dd>
          </div>
          <div className="flex flex-col-reverse justify-end">
            <dt className="mt-1 text-sm text-ink-600">Prices as of</dt>
            <dd className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">{PRICE_AS_OF}</dd>
          </div>
        </dl>
      </PageHero>

      <Section className="pt-8 sm:pt-12">
        {/* The price list's own notes, ahead of the prices */}
        <div className="flex gap-4 rounded-2xl bg-brand-50 p-5 ring-1 ring-brand-200 sm:items-center sm:gap-5 sm:p-6">
          <IconTile tone="solid">
            <CalendarClock />
          </IconTile>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-brand-950">{PRICE_NOTE}</h2>
            <p className="mt-1 text-sm leading-6 text-brand-900">{priceListText.basis}</p>
            <Link
              to="/build-on-your-lot/features"
              className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-brand-800 underline-offset-4 hover:underline sm:hidden"
            >
              Included features <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <Link
            to="/build-on-your-lot/features"
            className="hidden min-h-10 shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-800 underline-offset-4 hover:underline sm:inline-flex"
          >
            Included features <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-8">
          <h2 className="sr-only">Base prices by plan</h2>
          <PriceList />
        </div>

        {/* What is not included — the live list, verbatim */}
        <section aria-labelledby="exclusions-title" className="mt-8 rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70">
          <div className="flex items-start gap-4 border-b border-ink-100 p-5 sm:p-6">
            <IconTile>
              <CircleMinus />
            </IconTile>
            <div className="min-w-0">
              <h2 id="exclusions-title" className="text-base font-semibold text-ink-900">
                What base prices don’t include
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-600">{priceListText.exclusionsLead}</p>
            </div>
          </div>
          <div className="px-5 pt-5 pb-6 sm:px-6">
            <ul className="grid gap-x-10 gap-y-3 md:grid-cols-2">
              {boylExclusions.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-ink-700">
                  <span className="mt-2.5 h-px w-3 shrink-0 bg-ink-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-2 border-t border-ink-100 pt-5 text-sm text-ink-600 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <p className="font-medium text-ink-800">{priceListText.closing}</p>
              <p className="flex items-center gap-1.5">
                <MapPin className="size-4 shrink-0 text-ink-400" aria-hidden />
                {priceListText.area}
              </p>
            </div>
          </div>
        </section>
      </Section>

      <Section tone="tint" size="sm">
        <h2 className="sr-only">Next steps</h2>
        <div className="grid gap-4 md:grid-cols-3 lg:gap-6">
          <LinkCard to="/build-on-your-lot/features" icon={<ListChecks />} title="Included features" description="The standard features our base prices are built on." />
          <LinkCard
            to="/finance/build-on-your-lot"
            icon={<Landmark />}
            title="Finance your build"
            description="How a construction-to-permanent loan works, from settlement to mortgage."
          />
          <LinkCard
            to="/contact?interest=build-on-your-lot"
            icon={<MessageCircle />}
            title="Get pricing for your lot"
            description="Tell us about your property and the plan you like."
          />
        </div>
      </Section>

      <CTASection
        title="Found a plan you like?"
        description="We sketch it on your lot with an estimated price during the preliminary phase — before any architectural design fees."
      />
    </>
  )
}
