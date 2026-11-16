import { Link, useLocation } from 'react-router'
import { ArrowRight, Box, KeyRound, LayoutGrid, LogIn, Mail, Phone, type LucideIcon } from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { homeModels } from '@/data/models'
import { ButtonLink } from '@/components/ui'
import { useAppStore } from '@/store'
import { useOffice } from '@/store/hooks'

function quickLinks(view3d: boolean): { label: string; to: string; description: string; icon: LucideIcon }[] {
  return [
    { label: 'Move In Ready Homes', to: '/move-in-ready', description: 'Homes for sale and coming soon', icon: KeyRound },
    {
      label: 'Home Gallery',
      to: '/our-homes/gallery',
      description: view3d ? `${homeModels.length} floor plans to explore in 3D` : `${homeModels.length} floor plans to browse and compare`,
      icon: view3d ? Box : LayoutGrid,
    },
    { label: 'Contact Us', to: '/contact', description: 'Questions? Send us a note', icon: Mail },
    { label: 'Home Owner login', to: '/access/homeowners', description: 'Agreements, homes, appointments and maintenance', icon: LogIn },
  ]
}

export default function NotFoundPage() {
  const office = useOffice()
  const view3d = useAppStore((s) => s.settings.features.view3d)
  useDocumentTitle('Page not found')
  const { pathname } = useLocation()

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-brand-50 to-white">
      <div className="absolute -top-32 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-lavender-100/60 blur-3xl" aria-hidden />
      <div className="container-page py-16 sm:py-24">
        <div className="mx-auto max-w-2xl animate-fade-up text-center">
          <p className="font-display text-[6.5rem] leading-none font-semibold tracking-tight text-brand-200/80 select-none sm:text-[9rem]" aria-hidden>
            404
          </p>
          <h1 className="display-heading -mt-3 text-4xl sm:-mt-5 sm:text-5xl">Page not found</h1>
          <p className="mt-5 text-lg leading-8 text-ink-600">
            We couldn’t find <span className="font-mono text-base break-all text-ink-800">{pathname}</span>. The page may have moved, or the link may be out of date.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink to="/" size="lg">
              Back to the home page
            </ButtonLink>
          </div>
        </div>

        <nav aria-labelledby="not-found-links" className="mx-auto mt-16 max-w-5xl">
          <h2 id="not-found-links" className="text-center text-sm font-semibold tracking-[0.16em] text-ink-500 uppercase">
            Popular destinations
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks(view3d).map(({ label, to, description, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="group flex h-full items-center gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift hover:ring-brand-200 sm:flex-col sm:items-stretch sm:gap-0 sm:p-5"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-900 group-hover:text-white" aria-hidden>
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1 sm:mt-5">
                    <span className="flex items-center justify-between gap-2 font-semibold text-ink-900">
                      {label}
                      <ArrowRight className="size-4 shrink-0 text-brand-800 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                    <span className="mt-1 block text-sm text-ink-600">{description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mt-12 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-ink-600">
          <Phone className="size-4 text-brand-800" aria-hidden />
          Need a hand? Call us at
          <a href={`tel:${office.phone}`} className="font-semibold text-brand-800 underline-offset-4 hover:underline">
            {office.phoneDisplay}
          </a>
        </p>
      </div>
    </section>
  )
}
