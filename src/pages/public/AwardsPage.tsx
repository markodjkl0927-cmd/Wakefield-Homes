import { Award, BadgeCheck, Medal, Trophy, type LucideIcon } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { cn } from '@/lib/cn'
import { awardHighlights, awards } from '@/data/content'
import { photos } from '@/data/images'
import { Badge, SmartImage } from '@/components/ui'
import { PageHero } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { AboutNav } from './company/AboutNav'
import { firstAwardYear, splitYearGroups } from './company/awards'

const highlightIcons: LucideIcon[] = [Award, Trophy, Medal, BadgeCheck]
/** Newest-first year groups, split into two balanced columns on large screens. */
const yearColumns = splitYearGroups()

export default function AwardsPage() {
  useDocumentTitle('Awards')

  return (
    <>
      <PageHero
        eyebrow="About us"
        title="Awards & recognition"
        description="More than three decades of industry recognition for the homes we design, the way we build them and the service we provide."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'About Us', to: '/about' }, { label: 'Awards' }]}
      />
      <AboutNav />

      <Section>
        <SectionHeading
          eyebrow="Highlights"
          title="Recognized for design, building and service"
          description="From the Northern Virginia Building Industry Association to Houzz, Wakefield homes and the people who build them have been honored again and again."
        />

        <div className="mt-12 rounded-2xl bg-white px-5 py-6 shadow-card ring-1 ring-ink-200/70 sm:px-10 sm:py-10">
          <SmartImage
            src={photos.company.awards}
            alt="Award badges: Great American Living Award, Builder of the Year Award, Best of Houzz Design and Best of Houzz Service"
            className="mx-auto aspect-[1904/303] w-full max-w-4xl bg-white"
            imgClassName="object-contain"
          />
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-4">
          {awardHighlights.map((item, i) => {
            const Icon = highlightIcons[i % highlightIcons.length]
            return (
              <li key={item.label} className="flex flex-col rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-200/70 sm:p-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-800 ring-1 ring-brand-100 sm:size-11" aria-hidden>
                  <Icon className="size-5" />
                </span>
                <p className="mt-4 font-display text-4xl font-semibold tracking-tight text-brand-900 tabular-nums sm:mt-6 sm:text-5xl">{item.value}</p>
                <p className="mt-2 text-sm font-semibold text-ink-900 sm:mt-3 sm:text-base">{item.label}</p>
                <p className="mt-1 text-sm text-ink-600">{item.note}</p>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section tone="tint">
        <SectionHeading
          eyebrow="Every award"
          title="Recognition by year"
          description={`${awards.length} awards and honors since ${firstAwardYear}, newest first. Featured awards are highlighted.`}
        />

        <div className="mt-12 grid overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70 lg:grid-cols-2">
          {yearColumns.map((groups, col) => (
            <ol key={col} className={cn('divide-y divide-ink-100', col === 1 && 'border-t border-ink-100 lg:border-t-0 lg:border-l')}>
              {groups.map(({ year, items }) => (
                <li key={year} className="grid grid-cols-[4.25rem_1fr] gap-2 px-3 py-4 sm:grid-cols-[6rem_1fr] sm:gap-4 sm:px-6">
                  <h3 className="pt-2 pl-1 font-display text-2xl leading-none font-semibold text-brand-900 tabular-nums sm:pl-0 sm:text-[1.75rem]">{year}</h3>
                  <ul className="space-y-1.5">
                    {items.map((award) => (
                      <li
                        key={`${award.org}-${award.title}`}
                        className={cn('flex items-start gap-3 rounded-xl px-3 py-2.5', award.highlight && 'bg-brand-50 ring-1 ring-brand-100 ring-inset')}
                      >
                        <span
                          aria-hidden
                          className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', award.highlight ? 'bg-brand-900 text-white' : 'bg-ink-100 text-ink-600')}
                        >
                          {award.highlight ? <Trophy className="size-4" /> : <Award className="size-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-[11px] font-semibold tracking-[0.08em] uppercase', award.highlight ? 'text-brand-800' : 'text-ink-500')}>{award.org}</p>
                          <p className={cn('mt-0.5 text-[15px] leading-6 text-ink-900', award.highlight ? 'font-semibold' : 'font-medium')}>{award.title}</p>
                          {award.highlight && (
                            <Badge tone="brand" className="mt-1.5 bg-white sm:hidden">
                              Featured
                            </Badge>
                          )}
                        </div>
                        {award.highlight && (
                          <Badge tone="brand" className="mt-1 hidden bg-white sm:inline-flex">
                            Featured
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ))}
        </div>
      </Section>

      <CTASection title="Build with an award-winning team" />
    </>
  )
}
