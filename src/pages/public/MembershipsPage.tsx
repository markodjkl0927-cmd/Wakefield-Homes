import { Link } from 'react-router'
import { ArrowRight, ArrowUpRight, ShieldCheck, Trophy } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { chamberMembership, memberships } from '@/data/content'
import { photos } from '@/data/images'
import { SmartImage } from '@/components/ui'
import { PageHero } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { AboutNav } from './company/AboutNav'
import { displayHost } from './company/ExternalLink'
import { firstAwardYear } from './company/awards'

const logoBox = 'border-b border-ink-100 bg-white px-8 py-5 sm:py-6'
const logoClass = 'mx-auto aspect-[16/9] w-full max-w-[12rem] bg-white sm:max-w-[15rem]'

export default function MembershipsPage() {
  useDocumentTitle('Memberships')

  return (
    <>
      <PageHero
        eyebrow="About us"
        title="Memberships"
        description="Here at Wakefield, we surround ourselves with the best so we can provide you with the best."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'About Us', to: '/about' }, { label: 'Memberships' }]}
      />
      <AboutNav />

      <Section>
        <SectionHeading eyebrow="Professional associations" title="Organizations we belong to" description="The building industry and business associations Wakefield Homes is a member of." />

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map((m) => (
            <li key={m.short}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500">
                <div className={logoBox}>
                  <SmartImage src={photos.memberships[m.logoKey]} alt={`${m.short} logo`} className={logoClass} imgClassName="object-contain" />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="eyebrow">{m.short}</p>
                  <h3 className="mt-2 text-lg leading-snug font-semibold text-ink-900">
                    <a href={m.href} target="_blank" rel="noreferrer" className="after:absolute after:inset-0 focus-visible:outline-none">
                      {m.name}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </h3>
                  <p className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-brand-800" aria-hidden>
                    Visit {displayHost(m.href)}
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </p>
                </div>
              </article>
            </li>
          ))}

          {/* The chamber logo the live site shows, without a link until the current membership is confirmed. */}
          <li>
            <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70">
              <div className={logoBox}>
                <SmartImage src={photos.memberships[chamberMembership.logoKey]} alt={`${chamberMembership.name} logo`} className={logoClass} imgClassName="object-contain" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="eyebrow">{chamberMembership.short}</p>
                <h3 className="mt-2 text-lg leading-snug font-semibold text-ink-900">{chamberMembership.name}</h3>
                <p className="mt-auto pt-5 text-sm text-ink-600">{chamberMembership.note}</p>
              </div>
            </article>
          </li>

          {/* Fills the last grid cell and points to the rest of the credentials. */}
          <li className="flex flex-col justify-between rounded-2xl bg-brand-900 p-7 text-white shadow-card">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-brand-200 uppercase">More credentials</p>
              <h3 className="mt-3 font-display text-2xl font-semibold !text-white">Licensed and award-winning</h3>
              <p className="mt-3 leading-7 text-brand-100">See the licenses we hold and the recognition our homes have earned since {firstAwardYear}.</p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Link
                to="/about/licenses"
                className="inline-flex h-11 items-center justify-between gap-3 rounded-lg bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/20"
              >
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="size-4" aria-hidden /> Our licenses
                </span>
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                to="/about/awards"
                className="inline-flex h-11 items-center justify-between gap-3 rounded-lg bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/20"
              >
                <span className="inline-flex items-center gap-2">
                  <Trophy className="size-4" aria-hidden /> Our awards
                </span>
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </li>
        </ul>
      </Section>

      <CTASection />
    </>
  )
}
