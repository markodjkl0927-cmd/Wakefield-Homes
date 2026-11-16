import { Link } from 'react-router'
import { ArrowRight, CalendarCheck, Camera, FileSignature, Home as HomeIcon, KeyRound, Wrench } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { pluralize } from '@/lib/format'
import { portfolioHomes, type PortfolioHome } from '@/data/portfolio'
import { useCurrentUser } from '@/store/hooks'
import { buttonStyles } from '@/components/ui'
import { Breadcrumbs } from '@/components/site/PageHero'
import { Section, SectionHeading } from '@/components/site/Section'
import { CTASection } from '@/components/site/CTASection'
import { portalHomeFor } from '@/components/site/SiteHeader'
import { PortalPreview } from './homes/PortalPreview'
import { PortfolioCard } from './homes/PortfolioCard'

const isCurrent = (h: PortfolioHome) => h.status === 'under-construction' || h.status === 'coming-soon'
const currentBuilds = portfolioHomes.filter(isCurrent)
const completedHomes = portfolioHomes.filter((h) => !isCurrent(h))
const totalPhotos = portfolioHomes.reduce((n, h) => n + h.photos.length, 0)

const portalFeatures = [
  { icon: <FileSignature />, label: 'My Agreements', body: 'The latest versions, updated by our staff — ready to sign online.' },
  { icon: <HomeIcon />, label: 'My Homes', body: 'Every home you own with Wakefield, with its plan, key dates and build progress.' },
  { icon: <CalendarCheck />, label: 'Appointments', body: 'Book a meeting at the Wakefield office or a visit to your home site.' },
  { icon: <Wrench />, label: 'Home maintenance', body: 'Request gardening, road fixing or a house fix, or make a report.' },
]

/** "Building with Wakefield? Sign in to the Home Owner portal" — a compact version for the page header. */
function PortalCallout({ signedInOwner, to }: { signedInOwner: boolean; to: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-brand-100 transition-all hover:-translate-y-0.5 hover:shadow-lift hover:ring-brand-200 sm:p-5"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-white" aria-hidden>
        <KeyRound className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-ink-900">{signedInOwner ? 'Go to my dashboard' : 'Building with Wakefield?'}</span>
        <span className="mt-0.5 block text-sm leading-6 text-ink-600">
          {signedInOwner ? 'Your homes, agreements, appointments and requests.' : 'Sign in to the Home Owner portal to follow your own home.'}
        </span>
      </span>
      <ArrowRight className="size-5 shrink-0 text-brand-800 transition-transform group-hover:translate-x-1" aria-hidden />
    </Link>
  )
}

export default function ViewMyHomePage() {
  useDocumentTitle('View My Home')
  const user = useCurrentUser()
  const signedInOwner = user?.role === 'homeowner'
  const portalTo = signedInOwner ? portalHomeFor(user?.role) : '/access/homeowners'

  return (
    <>
      {/* Header */}
      <section className="relative isolate overflow-hidden border-b border-ink-100 bg-gradient-to-b from-brand-50 to-white">
        <div className="absolute -top-24 -right-24 -z-10 size-[28rem] rounded-full bg-lavender-100/80 blur-3xl" aria-hidden />
        <div className="container-page grid items-end gap-8 pt-8 pb-12 sm:pt-12 sm:pb-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-14 lg:pb-16">
          <div className="animate-fade-up">
            <Breadcrumbs
              items={[
                { label: 'Home', to: '/' },
                { label: 'Our Homes', to: '/our-homes' },
                { label: 'View My Home' },
              ]}
            />
            <p className="eyebrow mt-8">Our Homes</p>
            <h1 className="display-heading mt-3 text-4xl sm:text-5xl lg:text-6xl">View My Home</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-ink-600">
              Photo galleries of the homes we’re building and the homes we’ve completed — from site work to the finished house.
            </p>
            <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-ink-700">
              <span className="inline-flex items-center gap-1.5">
                <HomeIcon className="size-4 text-brand-700" aria-hidden /> {pluralize(portfolioHomes.length, 'home')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Camera className="size-4 text-brand-700" aria-hidden /> {totalPhotos.toLocaleString('en-US')} photos
              </span>
            </p>
          </div>
          <PortalCallout signedInOwner={signedInOwner} to={portalTo} />
        </div>
      </section>

      {/* Current builds */}
      {currentBuilds.length > 0 && (
        <Section>
          <SectionHeading
            eyebrow="Under way"
            title="Current builds"
            description="Follow these homes as they go up. New photos are added as construction moves along."
          />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {currentBuilds.map((h) => (
              <li key={h.slug} className="min-w-0">
                <PortfolioCard home={h} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Completed homes */}
      {completedHomes.length > 0 && (
        <Section tone="tint">
          <SectionHeading eyebrow="Finished" title="Completed homes" description="Homes we’ve built for our customers, many photographed at every stage of construction." />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {completedHomes.map((h) => (
              <li key={h.slug} className="min-w-0">
                <PortfolioCard home={h} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Home Owner portal */}
      <Section>
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="eyebrow">Home Owner portal</p>
            <h2 className="display-heading mt-3 text-3xl sm:text-4xl">Building with Wakefield? Sign in to the Home Owner portal</h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-ink-600">
              Everything about your own home in one place — set up by the Wakefield team for every new Home Owner.
            </p>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2">
              {portalFeatures.map((f) => (
                <li key={f.label} className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800 ring-1 ring-brand-100 [&>svg]:size-5" aria-hidden>
                    {f.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-ink-900">{f.label}</span>
                    <span className="mt-0.5 block text-sm leading-6 text-ink-600">{f.body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={portalTo} className={buttonStyles('primary', 'lg')}>
                <KeyRound className="size-5" aria-hidden /> {signedInOwner ? 'Go to my dashboard' : 'Home Owner login'}
              </Link>
              {!signedInOwner && (
                <Link to="/access/staff" className={buttonStyles('periwinkle', 'lg')}>
                  Staff login
                </Link>
              )}
            </div>
          </div>
          <PortalPreview className="lg:max-w-none" />
        </div>
      </Section>

      <CTASection
        title="Thinking about building with Wakefield?"
        description="Tell us what you’re looking for — a home for sale, a plan for your own lot, or something fully custom — and a Wakefield representative will contact you."
      />
    </>
  )
}
