import { Link } from 'react-router'
import {
  ArrowRight,
  Box,
  CalendarCheck,
  CalendarDays,
  FileSignature,
  HardHat,
  Home as HomeIcon,
  Inbox,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useDocumentTitle } from '@/lib/utils'
import { photos } from '@/data/images'
import { roleLabels } from '@/data/labels'
import { useCurrentUser, useOffice, useSettings } from '@/store/hooks'
import { Alert, ButtonLink, SmartImage, buttonStyles } from '@/components/ui'
import { Breadcrumbs } from '@/components/site/PageHero'
import { portalHome } from './components/authUtils'

interface AccessOption {
  to: string
  kicker: string
  kickerIcon: LucideIcon
  title: string
  description: string
  image: string
  imageAlt: string
  cta: string
  footnote: string
  /** `body3dOff` replaces `body` while 3D viewing is switched off in Platform settings. */
  features: { icon: LucideIcon; title: string; body: string; body3dOff?: string }[]
}

const options: AccessOption[] = [
  {
    to: '/access/homeowners',
    kicker: 'For Wakefield Home Owners',
    kickerIcon: KeyRound,
    title: 'Home Owners',
    description: 'Follow your home from contract to keys, and stay in touch with the Wakefield team long after move-in.',
    image: photos.hero.exteriorWhiteFarmhouse,
    imageAlt: 'A white Wakefield farmhouse-style home with a front porch',
    cta: 'Home Owner login',
    footnote: 'Your agreements, homes and requests',
    features: [
      { icon: FileSignature, title: 'My Agreements', body: 'Review and e-sign documents' },
      { icon: HomeIcon, title: 'My Homes', body: 'Progress, photos and 3D view', body3dOff: 'Progress, photos and documents' },
      { icon: CalendarDays, title: 'Appointments', body: 'Book time with the office' },
      { icon: Wrench, title: 'Maintenance', body: 'Gardening, roads, reports, fixes' },
    ],
  },
  {
    to: '/access/staff',
    kicker: 'For the Wakefield team',
    kickerIcon: HardHat,
    title: 'Staff',
    description: 'One workspace for bookings, Home Owner requests, homes and 3D viewing. Super Admins sign in here too.',
    image: photos.hero.framing,
    imageAlt: 'A Wakefield home being framed on site',
    cta: 'Staff login',
    footnote: 'Staff and Super Admins',
    features: [
      { icon: CalendarCheck, title: 'Bookings', body: 'Confirm and reschedule' },
      { icon: Inbox, title: 'Requests', body: 'Receive and resolve' },
      { icon: Box, title: 'Homes & 3D', body: 'Update homes, enable 3D' },
      { icon: ShieldCheck, title: 'Super Admin', body: 'Accounts and settings' },
    ],
  },
]

function AccessCard({ option, view3dOn }: { option: AccessOption; view3dOn: boolean }) {
  const Kicker = option.kickerIcon
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-ink-200/70 transition-all duration-300 focus-within:ring-2 focus-within:ring-brand-500 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative">
        <SmartImage src={option.image} alt={option.imageAlt} className="aspect-[16/9] w-full" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/75 via-ink-950/15 to-transparent" aria-hidden />
        <p className="absolute bottom-4 left-5 flex items-center gap-2.5 text-sm font-semibold text-white sm:left-7">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 backdrop-blur-sm">
            <Kicker className="size-[18px]" aria-hidden />
          </span>
          {option.kicker}
        </p>
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <h2 className="display-heading text-3xl">
          <Link to={option.to} className="after:absolute after:inset-0 focus-visible:outline-none">
            {option.title}
          </Link>
        </h2>
        <p className="mt-3 leading-7 text-ink-600">{option.description}</p>
        <ul className="mt-6 grid gap-x-5 gap-y-4 sm:grid-cols-2">
          {option.features.map((f) => (
            <li key={f.title} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800 ring-1 ring-brand-100">
                <f.icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink-900">{f.title}</span>
                <span className="block text-sm text-ink-600">{!view3dOn && f.body3dOff ? f.body3dOff : f.body}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-col gap-4 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-500">{option.footnote}</p>
          <span className={buttonStyles('primary', 'lg', 'w-full sm:w-auto group-hover:bg-brand-800')} aria-hidden>
            {option.cta}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  )
}

export default function AccessPage() {
  useDocumentTitle('Access')
  const user = useCurrentUser()
  const office = useOffice()
  const view3dOn = useSettings().features.view3d

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
      <div className="absolute -top-32 -right-24 -z-10 size-[28rem] rounded-full bg-lavender-100/70 blur-3xl" aria-hidden />
      <div className="absolute top-72 -left-40 -z-10 size-96 rounded-full bg-brand-100/50 blur-3xl" aria-hidden />
      <div className="container-page pt-10 pb-16 sm:pt-12 sm:pb-24">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Access' }]} />
        <div className="mt-8 max-w-2xl animate-fade-up">
          <p className="eyebrow">Access</p>
          <h1 className="display-heading mt-3 text-4xl sm:text-5xl">Sign in to Wakefield Homes</h1>
          <p className="mt-5 text-lg leading-8 text-ink-600">
            Choose your portal. Home Owners follow their home and stay in touch with our team; the Wakefield team manages bookings, requests and homes.
          </p>
        </div>

        {user && (
          <Alert
            tone="info"
            className="mt-8 max-w-3xl"
            title={`You’re signed in as ${user.name}`}
            action={
              <ButtonLink to={portalHome(user.role)} size="sm" leftIcon={<LayoutDashboard className="size-4" aria-hidden />} className="hidden sm:inline-flex">
                My dashboard
              </ButtonLink>
            }
          >
            {roleLabels[user.role]} account.{' '}
            <Link to={portalHome(user.role)} className="font-semibold underline underline-offset-2 sm:hidden">
              Go to my dashboard
            </Link>
          </Alert>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:mt-12 lg:gap-8">
          {options.map((o) => (
            <AccessCard key={o.to} option={o} view3dOn={view3dOn} />
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-ink-600">
          Trouble signing in? Call{' '}
          <a href={`tel:${office.phone}`} className="font-semibold whitespace-nowrap text-brand-800 hover:underline">
            {office.phoneDisplay}
          </a>{' '}
          · <span className="whitespace-nowrap">{office.hours}</span>
        </p>
      </div>
    </section>
  )
}
