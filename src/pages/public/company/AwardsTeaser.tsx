import { ArrowRight, Trophy } from 'lucide-react'
import { photos } from '@/data/images'
import { ButtonLink, SmartImage } from '@/components/ui'
import { Section, SectionHeading } from '@/components/site/Section'
import { featuredAwards, firstAwardYear } from './awards'

/** "Recognition" band for the Our Story page: the highlighted awards plus a link to the full list. */
export function AwardsTeaser() {
  return (
    <Section tone="tint">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
        <div className="lg:col-span-5">
          <SectionHeading
            eyebrow="Recognition"
            title={`Award-winning since ${firstAwardYear}`}
            description="Builder of the Year honors, Great American Living design awards and seven consecutive Best of Houzz awards — recognition for the homes we build and the way we build them."
          />
          <ButtonLink to="/about/awards" variant="primary" size="lg" className="mt-8" rightIcon={<ArrowRight className="size-4" aria-hidden />}>
            See all awards
          </ButtonLink>
        </div>
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70">
            <div className="px-5 py-6 sm:px-8 sm:py-8">
              <SmartImage
                src={photos.company.awards}
                alt="Award badges: Great American Living Award, Builder of the Year Award, Best of Houzz Design and Best of Houzz Service"
                className="aspect-[1904/303] w-full bg-white"
                imgClassName="object-contain"
              />
            </div>
            <ul className="divide-y divide-ink-100 border-t border-ink-100">
              {featuredAwards.map((award) => (
                <li key={`${award.year}-${award.title}`} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white" aria-hidden>
                    <Trophy className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{award.org}</p>
                    <p className="mt-0.5 font-medium text-ink-900">{award.title}</p>
                  </div>
                  <span className="font-display text-2xl font-semibold text-brand-900 tabular-nums">{award.year}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Section>
  )
}
