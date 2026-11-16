import { ArrowRight, Hammer, HeartHandshake, MapPin, MessagesSquare, Quote, ShieldCheck } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { cn } from '@/lib/cn'
import { buildingSince, leadership, reviews, serviceAreas, storyIntro, storyTimeline, trustStats } from '@/data/content'
import { photos } from '@/data/images'
import { ButtonLink, SmartImage } from '@/components/ui'
import { PageHero } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { AboutNav } from './company/AboutNav'
import { AwardsTeaser } from './company/AwardsTeaser'
import { Monogram } from './company/Monogram'
import { useOffice } from '@/store/hooks'

const values = [
  {
    title: 'Craftsmanship',
    icon: Hammer,
    body: 'The same care and craftsmanship that builders brought to homes two centuries ago, applied to every Wakefield home — from conception to completion.',
  },
  {
    title: 'Communication',
    icon: MessagesSquare,
    body: 'Responsive communication and service you can count on, from the first conversation to the final walkthrough.',
  },
  {
    title: 'Community',
    icon: HeartHandshake,
    body: 'Strong community ties: the Genuario family has been active in their community, their churches and the building industry at the local, state and national levels.',
  },
]

/** The year Wakefield Homes, LC was formed — highlighted on the timeline. */
const WAKEFIELD_YEAR = '1995'

const teamQuote = reviews.find((r) => r.quote.includes('communicated well')) ?? reviews[0]

function listToSentence(items: string[]) {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export default function StoryPage() {
  const office = useOffice()
  useDocumentTitle('Our Story')

  return (
    <>
      <PageHero
        image={photos.hero.craftsmanPorch}
        eyebrow="Our Story"
        title="Three generations of building homes in Northern Virginia"
        description={storyIntro}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Our Story' }]}
        size="lg"
      />
      <AboutNav />

      {/* Who we are */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="lg:col-span-6">
            <p className="eyebrow">Who we are</p>
            <h2 className="display-heading mt-3 text-3xl sm:text-4xl">A family name that stands for careful building</h2>
            <div className="prose-wh mt-6 text-lg leading-8">
              <p>
                Wakefield Homes is part of the Genuario family of building companies, founded by Louis V. Genuario, Sr. — a Corps of Engineers officer who came to
                Northern Virginia in 1964 on assignment to the Pentagon and began building homes here in {buildingSince}.
              </p>
              <p>
                Since 1995, Wakefield has built new homes on individual lots and in small subdivisions across the {listToSentence(serviceAreas)}. Today Rick
                Genuario, Louis V. Genuario, Jr. and Arthur Genuario carry that standard forward.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/our-homes" size="lg" rightIcon={<ArrowRight className="size-4" aria-hidden />}>
                Explore our homes
              </ButtonLink>
              <a href="#history" className="inline-flex h-12 items-center rounded-lg px-4 text-base font-medium text-brand-800 hover:bg-brand-50">
                Read our history
              </a>
            </div>
          </div>
          <div className="relative lg:col-span-6">
            <SmartImage
              src={photos.hero.floatingStair}
              alt="A floating staircase with open risers in a Wakefield home"
              className="aspect-[4/3] w-full rounded-3xl shadow-lift lg:aspect-[5/6]"
            />
            <div className="absolute -bottom-6 left-4 right-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-pop ring-1 ring-ink-200/70 sm:right-auto sm:left-6 sm:max-w-xs">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-white" aria-hidden>
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-900">Virginia Class A contractor</p>
                <p className="text-sm text-ink-500">Licensed in Alexandria, Arlington and Fairfax</p>
              </div>
            </div>
          </div>
        </div>

        <dl className="mt-20 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-ink-200 pt-10 lg:grid-cols-4">
          {trustStats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse justify-end gap-2">
              <dt className="text-sm leading-6 text-ink-600">{stat.label}</dt>
              <dd className="font-display text-4xl font-semibold tracking-tight text-brand-900 tabular-nums sm:text-5xl">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* Values */}
      <Section tone="tint">
        <SectionHeading
          align="center"
          eyebrow="What we stand for"
          title="Craftsmanship, communication and community"
          description="What the Genuario name stands for — on every home we build."
        />
        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {values.map(({ title, icon: Icon, body }) => (
            <li key={title} className="rounded-2xl bg-white p-7 shadow-card ring-1 ring-ink-200/70">
              <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-800 ring-1 ring-brand-100" aria-hidden>
                <Icon className="size-6" />
              </span>
              <h3 className="mt-6 font-display text-2xl font-semibold text-ink-900">{title}</h3>
              <p className="mt-3 leading-7 text-ink-600">{body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Timeline */}
      <Section id="history" className="scroll-mt-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <SectionHeading
                eyebrow="Our history"
                title="From 1964 to today"
                description="How one engineer’s move to Northern Virginia grew into three generations of home building — and Wakefield Homes."
              />
              <figure className="mt-10 hidden lg:block">
                <SmartImage src={photos.hero.framing} alt="A Wakefield home during framing" className="aspect-[4/3] w-full rounded-2xl" />
                <figcaption className="mt-3 text-sm text-ink-500">A Wakefield home during framing.</figcaption>
              </figure>
            </div>
          </div>

          <ol className="relative lg:col-span-7">
            <span aria-hidden className="absolute top-3 bottom-3 left-[7px] w-px bg-gradient-to-b from-brand-200 via-brand-200 to-transparent sm:left-[calc(8rem+7px)]" />
            {storyTimeline.map((item) => {
              const isWakefield = item.year === WAKEFIELD_YEAR
              return (
                <li key={item.year} className="relative grid gap-2 pb-12 pl-10 last:pb-0 sm:grid-cols-[8rem_1fr] sm:gap-0 sm:pl-0">
                  <span
                    aria-hidden
                    className={cn(
                      'absolute top-[0.55rem] left-0 size-[15px] rounded-full border-2 border-brand-800 ring-4 ring-white sm:left-[8rem]',
                      isWakefield ? 'bg-brand-800' : 'bg-white',
                    )}
                  />
                  <p className="font-display text-4xl leading-none font-semibold text-brand-900 tabular-nums sm:pr-8 sm:text-right sm:text-[2.75rem]">{item.year}</p>
                  <div className={isWakefield ? 'sm:pl-7' : 'sm:pl-12'}>
                    <div className={cn(isWakefield && '-ml-5 rounded-2xl bg-brand-50 p-5 ring-1 ring-brand-100 sm:-mt-5 sm:ml-0')}>
                      <h3 className="text-lg font-semibold text-ink-900">{item.title}</h3>
                      <p className="mt-2 leading-7 text-ink-600">{item.body}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </Section>

      {/* Leadership */}
      <Section tone="tint" id="leadership">
        <SectionHeading eyebrow="Leadership" title="The Genuario family" description="The family behind Wakefield Homes and its sister companies today." />
        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {leadership.map((person) => (
            <li key={person.name} className="flex flex-col rounded-2xl bg-white p-7 shadow-card ring-1 ring-ink-200/70">
              <Monogram name={person.name} size="lg" />
              <h3 className="mt-6 text-xl font-semibold text-ink-900">{person.name}</h3>
              <p className="mt-1 font-medium text-brand-800">{person.role}</p>
              <p className="mt-4 border-t border-ink-100 pt-4 text-sm leading-6 text-ink-600">{person.note}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Team photo — the source photo is small (232×300), so it is shown as a framed print rather than stretched. */}
      <Section>
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <SectionHeading
              eyebrow="Our people"
              title="The Wakefield team"
              description="The rest of the GCC / Wakefield Homes team are a legend in their own right: they have worked with Rick and Louis for at least fifteen years each — 70 dedicated years and counting between the four of them."
            />
            <figure className="mt-8 border-l-2 border-brand-200 pl-5">
              <Quote className="size-6 text-brand-300" aria-hidden />
              <blockquote className="mt-2 text-lg leading-8 text-ink-700">“{teamQuote.quote}”</blockquote>
              <figcaption className="mt-3 text-sm text-ink-500">
                <span className="font-semibold text-ink-800">{teamQuote.name}</span> · {teamQuote.context}
              </figcaption>
            </figure>
            <ButtonLink to="/contact" variant="secondary" size="lg" className="mt-8" rightIcon={<ArrowRight className="size-4" aria-hidden />}>
              Talk to our team
            </ButtonLink>
          </div>
          <div className="relative isolate mx-auto w-full max-w-md py-8 lg:col-span-5">
            <div className="absolute inset-x-0 inset-y-0 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-50 to-lavender-50 ring-1 ring-brand-100" aria-hidden />
            <figure className="mx-auto w-full max-w-[17rem] rotate-2 rounded-2xl bg-white p-3 shadow-lift ring-1 ring-ink-200/70 transition-transform duration-500 hover:rotate-0">
              <SmartImage src={photos.company.team} alt="Group photo of the Wakefield Homes team standing together in the office" className="aspect-[232/300] w-full rounded-xl" />
              <figcaption className="px-1 pt-3 pb-1 text-center font-display text-lg font-semibold text-ink-900">The Wakefield team</figcaption>
            </figure>
            <div className="absolute top-4 left-3 flex max-w-[15rem] -rotate-2 items-start gap-3 rounded-2xl bg-white p-4 shadow-pop ring-1 ring-ink-200/70 sm:-left-6">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-900 text-white" aria-hidden>
                <MapPin className="size-4" />
              </span>
              <p className="text-sm leading-5 text-ink-600">
                <span className="block font-semibold text-ink-900">Visit our office</span>
                {office.address}
                <br />
                {office.cityLine}
              </p>
            </div>
          </div>
        </div>
      </Section>

      <AwardsTeaser />
      <CTASection />
    </>
  )
}
