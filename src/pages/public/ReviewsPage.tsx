import { useId, useState } from 'react'
import { Award, ChevronDown, Quote } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useDocumentTitle } from '@/lib/utils'
import { awards, reviews, social } from '@/data/content'
import { photos } from '@/data/images'
import { buttonStyles } from '@/components/ui'
import { PageHero } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { ExternalLink } from './company/ExternalLink'
import { Monogram } from './company/Monogram'

type Review = (typeof reviews)[number]

const featured = reviews.find((r) => r.name === 'Evan C.') ?? reviews[0]
const others = reviews.filter((r) => r !== featured)
const houzz = social.find((s) => s.label === 'Houzz')
/** Years Wakefield won Best of Houzz for Service (from the awards list), oldest first. */
const houzzServiceYears = awards
  .filter((a) => a.org === 'Houzz' && /service/i.test(a.title))
  .map((a) => a.year)
  .sort((a, b) => a - b)
const houzzWins = awards.filter((a) => a.org === 'Houzz').length

/** The full review, paragraph by paragraph (some reviews have more than one). */
function FullReview({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {text.split(/\n\s*\n/).map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  )
}

/** "Read full review" toggle; the full text replaces the excerpt in place. */
function useExpander() {
  const [open, setOpen] = useState(false)
  const id = useId()
  const button = (className?: string) => (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={id}
      onClick={() => setOpen((o) => !o)}
      className={cn('inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-brand-800 underline-offset-4 hover:underline', className)}
    >
      {open ? 'Show less' : 'Read full review'}
      <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
    </button>
  )
  return { open, id, button }
}

function ReviewCard({ review }: { review: Review }) {
  const { open, id, button } = useExpander()
  return (
    <figure className="flex flex-col rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-200/70">
      <Quote className="size-8 text-brand-300" aria-hidden />
      <blockquote id={id} className="mt-4 text-base leading-7 text-ink-700">
        {open ? <FullReview text={review.full} /> : <p>“{review.quote}”</p>}
      </blockquote>
      {button('mt-3 self-start')}
      <figcaption className="mt-4 flex items-center gap-3 border-t border-ink-100 pt-4">
        <Monogram name={review.name} />
        <span className="min-w-0">
          <span className="block font-semibold wrap-anywhere text-ink-900">{review.name}</span>
          <span className="block text-sm text-ink-600">{review.context}</span>
        </span>
      </figcaption>
    </figure>
  )
}

export default function ReviewsPage() {
  useDocumentTitle('Our Reviews')
  const featuredExpander = useExpander()

  return (
    <>
      <PageHero
        image={photos.hero.porchFireplaceRiver}
        eyebrow="Our Reviews"
        title="In our Home Owners’ words"
        description="Reviews from Wakefield Home Owners — about their homes, and about the team that built them."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Our Reviews' }]}
      />

      <Section>
        <figure className="mx-auto max-w-4xl text-center">
          <Quote className="mx-auto size-12 text-brand-300" aria-hidden />
          <blockquote id={featuredExpander.id} className="mt-8">
            {featuredExpander.open ? (
              <FullReview text={featured.full} className="mx-auto max-w-3xl text-left text-lg leading-8 text-ink-700" />
            ) : (
              <p className="display-heading text-2xl leading-snug sm:text-4xl sm:leading-[1.25]">“{featured.quote}”</p>
            )}
          </blockquote>
          {featuredExpander.button('mt-6')}
          <figcaption className="mt-8 flex justify-center">
            <span className="inline-flex items-center gap-3 text-left">
              <Monogram name={featured.name} />
              <span>
                <span className="block font-semibold text-ink-900">{featured.name}</span>
                <span className="block text-sm text-ink-600">{featured.context}</span>
              </span>
            </span>
          </figcaption>
        </figure>
      </Section>

      <Section tone="tint">
        <SectionHeading
          eyebrow="Home Owner reviews"
          title="More from our Home Owners"
          description="Reviews of new and custom Wakefield homes. Open any one to read it in full."
        />

        <ul className="mt-12 grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((r) => (
            <li key={r.name} className="flex">
              <ReviewCard review={r} />
            </li>
          ))}

          {houzz && (
            <li className="flex">
              <section aria-labelledby="houzz-reviews" className="relative isolate w-full overflow-hidden rounded-2xl bg-brand-900 p-7 shadow-card">
                <div className="absolute -top-16 -right-16 -z-10 size-48 rounded-full bg-brand-500/40 blur-3xl" aria-hidden />
                <span className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20" aria-hidden>
                  <Award className="size-5" />
                </span>
                <h3 id="houzz-reviews" className="mt-6 font-display text-2xl font-semibold !text-white">
                  More reviews on Houzz
                </h3>
                <p className="mt-3 leading-7 text-brand-100">
                  Wakefield Homes is a {houzzWins}-time Best of Houzz winner
                  {houzzServiceYears.length > 0 && <>, including Best of Houzz for Service in {houzzServiceYears.join(' and ')}</>}.
                </p>
                <ExternalLink href={houzz.href} className={buttonStyles('white', 'lg', 'mt-6 w-full sm:w-auto')}>
                  Read reviews on Houzz
                </ExternalLink>
              </section>
            </li>
          )}
        </ul>
      </Section>

      <CTASection title="Become our next happy Home Owner" />
    </>
  )
}
