import { ArrowRight, Clock, FileText, Mail, Megaphone, Newspaper, Phone, Share2 } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { news, social } from '@/data/content'
import { communities } from '@/data/communities'
import { getModel } from '@/data/models'
import { photos } from '@/data/images'
import { Badge, buttonStyles, SmartImage } from '@/components/ui'
import { PageHero } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { ArrowLink } from './homes/parts'
import { AboutNav } from './company/AboutNav'
import { ExternalLink, displayHost } from './company/ExternalLink'
import { useOffice } from '@/store/hooks'

/** Pairs a press item with the community it mentions (for a photo and a link), when there is one. */
function pressContext(item: (typeof news)[number]) {
  const community = communities.find((c) => item.summary.includes(c.name) || item.title.includes(c.name))
  if (!community) return { image: photos.hero.twoHomesStreet, alt: 'Two Wakefield homes on a tree-lined street', community: undefined }
  const model = community.modelSlugs[0] ? getModel(community.modelSlugs[0]) : undefined
  return {
    image: community.image,
    alt: model ? `${model.name}, the home plan offered at ${community.name}` : `A home at ${community.name}`,
    community,
  }
}

export default function NewsPage() {
  const office = useOffice()
  useDocumentTitle('In the News')

  return (
    <>
      <PageHero
        eyebrow="About us"
        title="In the News"
        description="Press coverage and features about Wakefield Homes, our communities and three generations of the Genuario family."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'About Us', to: '/about' }, { label: 'In the News' }]}
      />
      <AboutNav />

      <Section>
        <SectionHeading eyebrow="Press" title="Featured coverage" />
        <ul className="mt-10 space-y-8">
          {news.map((item) => {
            const ctx = pressContext(item)
            return (
              <li key={item.title}>
                <article className="grid overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-ink-200/70 lg:grid-cols-[1fr_1.15fr]">
                  <SmartImage src={ctx.image} alt={ctx.alt} className="aspect-[16/10] w-full lg:aspect-auto lg:h-full lg:min-h-[24rem]" />
                  <div className="flex flex-col p-6 sm:p-10 lg:p-12">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <Badge tone="brand" size="md" icon={<Newspaper className="size-3.5" aria-hidden />}>
                        {item.outlet}
                      </Badge>
                      <span className="text-sm text-ink-500">{item.issue ?? item.date}</span>
                    </div>
                    <h3 className="display-heading mt-6 text-3xl sm:text-4xl">{item.title}</h3>
                    <p className="mt-4 text-lg leading-8 text-ink-600">{item.summary}</p>
                    <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
                      {item.pdfUrl && (
                        <a href={item.pdfUrl} target="_blank" rel="noreferrer" className={buttonStyles('primary', 'lg')}>
                          <FileText className="size-5" aria-hidden />
                          Read the article (PDF)
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      )}
                      {ctx.community && <ArrowLink to={`/communities/${ctx.community.slug}`}>About {ctx.community.name}</ArrowLink>}
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section tone="tint">
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="press-inquiries" className="flex flex-col rounded-2xl bg-white p-7 shadow-card ring-1 ring-ink-200/70 sm:p-8">
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-800 ring-1 ring-brand-100" aria-hidden>
              <Megaphone className="size-6" />
            </span>
            <h2 id="press-inquiries" className="mt-6 font-display text-2xl font-semibold text-ink-900">
              Press &amp; media inquiries
            </h2>
            <p className="mt-2 leading-7 text-ink-600">For interviews, photography or information about our homes and communities, please contact our office.</p>
            <ul className="mt-6 space-y-3">
              {office.email && (
                <li>
                  <a
                    href={`mailto:${office.email}?subject=${encodeURIComponent('Press inquiry')}`}
                    className="group flex items-center gap-3 rounded-xl p-3 ring-1 ring-ink-200 ring-inset transition-colors hover:bg-brand-50 hover:ring-brand-200"
                  >
                    <Mail className="size-5 shrink-0 text-brand-800" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-ink-500">Email</span>
                      <span className="block truncate font-semibold text-brand-800 group-hover:underline">{office.email}</span>
                    </span>
                  </a>
                </li>
              )}
              <li>
                <a href={`tel:${office.phone}`} className="group flex items-center gap-3 rounded-xl p-3 ring-1 ring-ink-200 ring-inset transition-colors hover:bg-brand-50 hover:ring-brand-200">
                  <Phone className="size-5 shrink-0 text-brand-800" aria-hidden />
                  <span>
                    <span className="block text-xs font-medium text-ink-500">Phone</span>
                    <span className="block font-semibold text-brand-800 group-hover:underline">{office.phoneDisplay}</span>
                  </span>
                </a>
              </li>
            </ul>
            <p className="mt-5 flex items-center gap-2 text-sm text-ink-500">
              <Clock className="size-4 shrink-0" aria-hidden /> {office.hours}
            </p>
          </section>

          <section aria-labelledby="follow-us" className="flex flex-col rounded-2xl bg-white p-7 shadow-card ring-1 ring-ink-200/70 sm:p-8">
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-800 ring-1 ring-brand-100" aria-hidden>
              <Share2 className="size-6" />
            </span>
            <h2 id="follow-us" className="mt-6 font-display text-2xl font-semibold text-ink-900">
              Follow Wakefield Homes
            </h2>
            <p className="mt-2 leading-7 text-ink-600">See new homes, finished projects and community news as they happen.</p>
            <ul className="mt-6 space-y-3">
              {social.map((s) => (
                <li key={s.label}>
                  <ExternalLink
                    href={s.href}
                    icon={false}
                    className="group flex w-full items-center gap-3 rounded-xl p-3 ring-1 ring-ink-200 ring-inset transition-colors hover:bg-brand-50 hover:ring-brand-200"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-900 font-display text-base font-semibold text-white" aria-hidden>
                      {s.label[0]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink-900">{s.label}</span>
                      <span className="block truncate text-xs text-ink-500">{displayHost(s.href)}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 -rotate-45 text-brand-800 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </ExternalLink>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </Section>

      <CTASection />
    </>
  )
}
