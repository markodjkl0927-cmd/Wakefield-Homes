import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ArrowUpRight, Bath, Check, ClipboardList, CookingPot, FileText, Frame, House, Leaf, MessageCircle, Sofa, Sparkles } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { includedFeatures, includedFeaturesDoc } from '@/data/content'
import { PRICE_AS_OF } from '@/data/models'
import { photos } from '@/data/images'
import { SmartImage } from '@/components/ui'
import { PageHero } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { heroPrimaryButton, heroSecondaryButton, IconTile, LinkCard } from './boyl/shared'
import { pricedPlans } from './boyl/pricing'

const groupIcons: Record<string, ReactNode> = {
  Exterior: <House />,
  Interior: <Sofa />,
  Trim: <Frame />,
  Bathrooms: <Bath />,
  Kitchen: <CookingPot />,
  'Energy saving': <Leaf />,
}

const details = [
  { src: photos.hero.kitchenChandelier, alt: 'Kitchen with a large island in a Wakefield home' },
  { src: photos.hero.masterBath, alt: 'Primary bathroom in a Wakefield home' },
  { src: photos.hero.floatingStair, alt: 'Open staircase in a Wakefield home' },
  { src: photos.hero.mudroom, alt: 'Mudroom in a Wakefield home' },
  { src: photos.hero.laundry, alt: 'Laundry room in a Wakefield home' },
]

const featureCount = includedFeatures.reduce((n, g) => n + g.items.length, 0)
const groupCount = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'][includedFeatures.length] ?? String(includedFeatures.length)

/** "75-gallon gas water heater*" -> the item and whether the PDF's footnote applies to it. */
function splitFootnote(item: string): { text: string; footnote: boolean } {
  return item.endsWith('*') ? { text: item.slice(0, -1), footnote: true } : { text: item, footnote: false }
}

/** The PDF's two columns. */
const half = Math.ceil(includedFeatures.length / 2)
const featureColumns = [includedFeatures.slice(0, half), includedFeatures.slice(half)]

function FeatureGroup({ group: g }: { group: (typeof includedFeatures)[number] }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-200/70 sm:p-7">
      <div className="flex items-center gap-4">
        <IconTile>{groupIcons[g.group] ?? <Sparkles />}</IconTile>
        <h3 className="text-lg font-semibold text-ink-900">
          {g.group}
          <span className="ml-2 text-sm font-normal text-ink-500 tabular-nums">
            <span className="sr-only">, </span>
            {g.items.length}
            <span className="sr-only"> features</span>
          </span>
        </h3>
      </div>
      <ul className="mt-6 space-y-3.5">
        {g.items.map((item) => {
          const { text, footnote } = splitFootnote(item)
          return (
            <li key={item} className="flex gap-3 text-[15px] leading-6 text-ink-700">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-800 ring-1 ring-brand-100" aria-hidden>
                <Check className="size-3" strokeWidth={3} />
              </span>
              <span>
                {text}
                {footnote && (
                  <>
                    <span aria-hidden className="font-semibold text-brand-800">
                      *
                    </span>
                    <span className="sr-only"> (if natural gas or propane is available)</span>
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PdfButton({ className }: { className: string }) {
  return (
    <a href={includedFeaturesDoc.pdfUrl} target="_blank" rel="noreferrer" className={className}>
      <FileText className="size-5" aria-hidden />
      View the PDF ({includedFeaturesDoc.date})
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

export default function BoylFeaturesPage() {
  useDocumentTitle('Included Features')

  return (
    <>
      <PageHero
        image={photos.hero.kitchenIsland}
        eyebrow="Build On Your Lot"
        title="Included features"
        description={`The standard features behind our Build On Your Lot base prices, as published in our Included Features list (${includedFeaturesDoc.date}).`}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Build On Your Lot', to: '/build-on-your-lot' }, { label: 'Included Features' }]}
        actions={
          <>
            <PdfButton className={heroPrimaryButton} />
            <Link to="/build-on-your-lot/price-list" className={heroSecondaryButton}>
              See base prices
            </Link>
          </>
        }
      />

      <Section>
        <SectionHeading
          eyebrow={`Included features list · ${includedFeaturesDoc.date}`}
          title="What comes standard"
          description={`The list our Build On Your Lot base prices are built on — ${featureCount} features in ${groupCount} groups, in the list’s own words.`}
          action={
            <a
              href={includedFeaturesDoc.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-brand-800 underline-offset-4 hover:underline"
            >
              Download the PDF
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          }
        />
        {/* Two columns, as on the PDF itself: exterior, interior and trim; then bathrooms, kitchen and energy saving. */}
        <div className="mt-12 grid items-start gap-5 md:grid-cols-2 lg:gap-6">
          {featureColumns.map((column, i) => (
            <div key={i} className="grid gap-5 lg:gap-6">
              {column.map((g) => (
                <FeatureGroup key={g.group} group={g} />
              ))}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-5 rounded-2xl bg-brand-50 p-5 ring-1 ring-brand-100 sm:flex-row sm:items-center sm:p-6">
          <IconTile tone="solid">
            <ClipboardList />
          </IconTile>
          <div className="min-w-0 flex-1 text-sm leading-6 text-brand-950">
            <p className="font-semibold">{includedFeaturesDoc.footnote}</p>
            <p className="mt-1 text-brand-900">
              Base prices (as of {PRICE_AS_OF}) are based on Wakefield Homes, LC’s General &amp; Technical Provisions for construction and these standard features.
              Options and costs that depend on your lot are priced separately.
            </p>
          </div>
          <Link
            to="/build-on-your-lot/price-list"
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-800 underline-offset-4 hover:underline"
          >
            See the price list <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </Section>

      <Section tone="tint">
        <SectionHeading eyebrow="In the details" title="Craftsmanship you can see" description="A few rooms from homes we have built. Photos may show options and upgrades." />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2">
          {details.map((p, i) => (
            <SmartImage
              key={p.src}
              src={p.src}
              alt={p.alt}
              imgClassName="absolute inset-0"
              className={
                i === 0
                  ? 'col-span-2 aspect-[4/3] rounded-2xl lg:row-span-2 lg:aspect-auto lg:h-full'
                  : 'aspect-square rounded-2xl sm:aspect-[4/3]'
              }
            />
          ))}
        </div>
      </Section>

      <Section size="sm" className="pb-0 sm:pb-0">
        <h2 className="sr-only">Next steps</h2>
        <div className="grid gap-4 md:grid-cols-3 lg:gap-6">
          <LinkCard
            to="/build-on-your-lot/price-list"
            icon={<ClipboardList />}
            title="Build On Your Lot price list"
            description={`Base prices for ${pricedPlans.length} plans, as of ${PRICE_AS_OF}.`}
          />
          <LinkCard to="/build-on-your-lot" icon={<House />} title="How the program works" description="Three phases, each one moving ahead only with your approval." />
          <LinkCard
            to="/contact?interest=build-on-your-lot"
            icon={<MessageCircle />}
            title="Ask about a feature"
            description="Questions about a finish, an option or an upgrade? We’re happy to help."
          />
        </div>
      </Section>

      <CTASection
        title="Questions about a feature?"
        description="Talk with us about the features, options and finishes for your plan — give us a call or send us a note."
      />
    </>
  )
}
