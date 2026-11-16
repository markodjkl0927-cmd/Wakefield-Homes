import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  Box,
  CalendarCheck,
  CalendarDays,
  Eye,
  EyeOff,
  FileSignature,
  Home as HomeIcon,
  Inbox,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { emailError, normalizeEmail, sleep, useDocumentTitle } from '@/lib/utils'
import { photos } from '@/data/images'
import { DEMO_PASSWORD } from '@/data/seed'
import { roleLabels } from '@/data/labels'
import { useAppStore } from '@/store'
import { useCurrentUser, useOffice } from '@/store/hooks'
import { toast } from '@/store/ui'
import { Alert, Button, Input, SmartImage } from '@/components/ui'
import { DemoAccounts } from './components/DemoAccounts'
import { ForgotPasswordModal } from './components/ForgotPasswordModal'
import { destinationFor, firstName, fitsPortal, portalHome, type Portal } from './components/authUtils'

interface PortalCopy {
  /** Page name, as in the site's Access links ("Home Owner login" / "Staff login"). */
  eyebrow: string
  title: string
  description: string
  emailPlaceholder: string
  panelEyebrow: string
  panelTitle: string
  image: string
  /** `body3dOff` replaces `body` while 3D viewing is switched off in Platform settings. */
  features: { icon: LucideIcon; title: string; body: string; body3dOff?: string }[]
}

const copy: Record<Portal, PortalCopy> = {
  homeowner: {
    eyebrow: 'Home Owner login',
    title: 'Welcome home',
    description: 'Sign in to follow your home, review agreements, book appointments and request maintenance.',
    emailPlaceholder: 'name@example.com',
    panelEyebrow: 'Home Owner Portal',
    panelTitle: 'Everything about your Wakefield home, in one place.',
    // The Harrison's kitchen at 8628 Plymouth Road (not the Lot 38 kitchen the listings and Move In Ready banner use).
    image: photos.hero.kitchenNavyIsland,
    features: [
      { icon: FileSignature, title: 'My Agreements', body: 'Review and sign documents your Wakefield team keeps up to date.' },
      { icon: HomeIcon, title: 'My Homes', body: 'Construction progress, photos and a 3D view of your home.', body3dOff: 'Construction progress, photos and documents for your home.' },
      { icon: CalendarDays, title: 'Appointments', body: 'Book time with the Wakefield office in a few taps.' },
      { icon: Wrench, title: 'Maintenance', body: 'Gardening, road fixing, reports and house fixes.' },
    ],
  },
  staff: {
    eyebrow: 'Staff login',
    title: 'Staff workspace',
    description: 'Manage bookings, Home Owner requests, homes and 3D viewing. Super Admins sign in here too.',
    emailPlaceholder: 'name@wakefieldhomeslc.com',
    panelEyebrow: 'Staff Workspace',
    panelTitle: 'Run the day-to-day for every Wakefield home.',
    image: photos.hero.porchFireplaceRiver,
    features: [
      { icon: CalendarCheck, title: 'Bookings', body: 'Confirm, reschedule and assign appointments.' },
      { icon: Inbox, title: 'Requests', body: 'Receive and resolve Home Owner requests.' },
      { icon: Box, title: 'Homes & 3D', body: 'Update homes and enable 3D viewing.' },
      { icon: ShieldCheck, title: 'Super Admin', body: 'Accounts, permissions and platform settings.' },
    ],
  },
}

type FormError = { message: string; switchTo?: Portal }

/** Sent with the redirect after a first sign-in, so the Home Owner overview can say hello properly. */
export interface LoginRedirectState {
  firstSignIn?: boolean
}

export default function LoginPage({ portal }: { portal: Portal }) {
  const isOwner = portal === 'homeowner'
  const c = copy[portal]
  useDocumentTitle(c.eyebrow)

  const user = useCurrentUser()
  const users = useAppStore((s) => s.users)
  const login = useAppStore((s) => s.login)
  const view3dOn = useAppStore((s) => s.settings.features.view3d)
  const office = useOffice()
  const [params] = useSearchParams()
  const next = params.get('next')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState<FormError | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [forgotOpen, setForgotOpen] = useState(false)
  // Set right after login() returns: the redirect below renders in the same tick as the store update.
  const firstSignIn = useRef(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // Already signed in with an account that belongs here (also runs right after a successful sign-in).
  if (user && fitsPortal(user.role, portal)) {
    const state: LoginRedirectState | undefined = firstSignIn.current ? { firstSignIn: true } : undefined
    return <Navigate to={destinationFor(user.role, next)} replace state={state} />
  }

  const signIn = async (em: string, pw: string, source: string) => {
    setError(null)
    setPending(source)
    await sleep(450)
    const result = login(em, pw, portal)
    if (!result.ok) {
      const match = users.find((u) => u.email.toLowerCase() === normalizeEmail(em))
      const wrongPortal = match && match.password === pw && match.status !== 'disabled' && !fitsPortal(match.role, portal)
      setError({ message: result.error, switchTo: wrongPortal ? (isOwner ? 'staff' : 'homeowner') : undefined })
      setPending(null)
      return
    }
    firstSignIn.current = result.firstSignIn
    const role = result.user.role
    const where = role === 'homeowner' ? 'You’re signed in to the Home Owner Portal.' : role === 'admin' ? 'Signed in with Super Admin access.' : 'You’re signed in to the Staff workspace.'
    // A first sign-in (an invited account) is a welcome, not a "welcome back". New Home Owners signed in with the
    // temporary password from their invitation, which they can replace under My profile.
    const detail = result.firstSignIn && role === 'homeowner' ? 'You signed in with a temporary password. You can choose your own under My profile.' : where
    toast.success(`${result.firstSignIn ? 'Welcome' : 'Welcome back'}, ${firstName(result.user.name)}`, detail)
    // The redirect happens on the next render, once the signed-in user fits this portal.
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const fe: typeof fieldErrors = {}
    fe.email = emailError(email)
    if (!password) fe.password = 'Enter your password.'
    setFieldErrors(fe)
    if (fe.email) return emailRef.current?.focus()
    if (fe.password) return passwordRef.current?.focus()
    void signIn(email, password, 'form')
  }

  const onPick = (demoEmail: string) => {
    // One-click demo sign-in uses the account's current password (it may have been changed under My profile).
    const demoPassword = users.find((u) => u.email.toLowerCase() === demoEmail)?.password ?? DEMO_PASSWORD
    setEmail(demoEmail)
    setPassword(demoPassword)
    setFieldErrors({})
    void signIn(demoEmail, demoPassword, demoEmail)
  }

  const trackCaps = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)
  const otherPortal: Portal = isOwner ? 'staff' : 'homeowner'
  const otherHref = isOwner ? '/access/staff' : '/access/homeowners'

  return (
    <section className="bg-white">
      {/* grid-cols-1 (minmax(0, 1fr)) keeps the column at the screen width: long demo emails truncate instead of widening it. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
        {/* Form panel (first in reading order) */}
        <div className="flex min-w-0 justify-center px-4 py-10 sm:px-6 sm:py-14 lg:min-h-[calc(100svh-108px)] lg:items-center lg:px-12 lg:py-16 xl:px-20">
          <div className="w-full max-w-md min-w-0 animate-fade-up">
            <Link to="/access" className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-ink-600 hover:text-brand-800">
              <ArrowLeft className="size-4" aria-hidden /> All sign-in options
            </Link>
            <p className="eyebrow mt-8">{c.eyebrow}</p>
            <h1 className="display-heading mt-2 text-3xl sm:text-4xl">{c.title}</h1>
            <p className="mt-3 text-base leading-7 text-ink-600">{c.description}</p>

            {user && (
              <Alert tone="info" title={`You’re signed in as ${user.name}`} className="mt-6">
                That’s a {roleLabels[user.role]} account. Signing in here switches accounts.{' '}
                <Link to={portalHome(user.role)} className="font-semibold underline underline-offset-2">
                  Go to my dashboard
                </Link>
              </Alert>
            )}

            {error && (
              <Alert tone="danger" title="We couldn’t sign you in" className="mt-6">
                {error.message}
                {error.switchTo && (
                  <>
                    {' '}
                    <Link to={`${error.switchTo === 'staff' ? '/access/staff' : '/access/homeowners'}`} className="font-semibold underline underline-offset-2">
                      Go to the {error.switchTo === 'staff' ? 'Staff' : 'Home Owner'} login
                    </Link>
                  </>
                )}
              </Alert>
            )}

            <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-sm font-medium text-ink-800">
                  Email
                </label>
                <Input
                  ref={emailRef}
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="size-4" aria-hidden />}
                  placeholder={c.emailPlaceholder}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                  className="h-11"
                />
                {fieldErrors.email && (
                  <p id="login-email-error" className="text-sm text-rose-600">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="login-password" className="block text-sm font-medium text-ink-800">
                    Password
                  </label>
                  <button type="button" onClick={() => setForgotOpen(true)} className="-my-2 rounded-md px-1 py-2 text-sm font-semibold text-brand-800 hover:text-brand-900 hover:underline">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    ref={passwordRef}
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={trackCaps}
                    onKeyDown={trackCaps}
                    leftIcon={<Lock className="size-4" aria-hidden />}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={[fieldErrors.password ? 'login-password-error' : '', capsLock ? 'login-caps' : ''].filter(Boolean).join(' ') || undefined}
                    className="h-11 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-ink-500 hover:text-ink-800"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    aria-controls="login-password"
                  >
                    {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="login-password-error" className="text-sm text-rose-600">
                    {fieldErrors.password}
                  </p>
                )}
                {capsLock && (
                  <p id="login-caps" className="text-sm text-amber-800">
                    Caps Lock is on.
                  </p>
                )}
              </div>

              <Button type="submit" size="lg" className="w-full" loading={pending === 'form'} disabled={!!pending && pending !== 'form'} leftIcon={<LogIn className="size-5" aria-hidden />}>
                Sign in
              </Button>
            </form>

            <div className="my-8 flex items-center gap-4" aria-hidden>
              <span className="h-px flex-1 bg-ink-200" />
              <span className="text-xs font-semibold tracking-[0.14em] text-ink-500 uppercase">or</span>
              <span className="h-px flex-1 bg-ink-200" />
            </div>

            <DemoAccounts portal={portal} pendingEmail={pending && pending !== 'form' ? pending : null} onPick={onPick} />

            <div className="mt-8 space-y-2 border-t border-ink-100 pt-6 text-sm text-ink-600">
              <p>
                {isOwner ? 'Are you on the Wakefield team?' : 'Are you a Home Owner?'}{' '}
                <Link to={otherHref} className="inline-flex items-center gap-1 font-semibold text-brand-800 hover:text-brand-900 hover:underline">
                  {otherPortal === 'staff' ? 'Staff login' : 'Home Owner login'} <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </p>
              <p>
                Need help? Call{' '}
                <a href={`tel:${office.phone}`} className="font-semibold whitespace-nowrap text-brand-800 hover:underline">
                  {office.phoneDisplay}
                </a>{' '}
                ({office.hours}).
              </p>
            </div>
          </div>
        </div>

        {/* Photo panel (left on large screens). A neutral shade keeps the photo true-color and the white text readable. */}
        <aside
          className="relative isolate mx-4 mb-12 flex min-h-[420px] min-w-0 overflow-hidden rounded-3xl bg-ink-900 sm:mx-6 lg:sticky lg:top-[72px] lg:order-first lg:mx-0 lg:mb-0 lg:h-[calc(100svh-72px)] lg:min-h-[600px] lg:rounded-none"
          aria-labelledby="login-panel-title"
        >
          <SmartImage src={c.image} alt="" priority className="absolute inset-0 -z-20 bg-ink-900" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950/90 via-ink-950/70 to-ink-950/35 lg:via-ink-950/55 lg:to-ink-950/0" aria-hidden />
          <div className="flex w-full min-w-0 flex-col justify-end px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16 xl:px-16">
            <p className="text-xs font-semibold tracking-[0.18em] text-brand-200 uppercase">{c.panelEyebrow}</p>
            <h2 id="login-panel-title" className="display-heading mt-3 max-w-lg text-3xl !text-white sm:text-4xl">
              {c.panelTitle}
            </h2>
            <ul className="mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
              {c.features.map((f) => (
                <li key={f.title} className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/12 text-white ring-1 ring-white/25 backdrop-blur-sm">
                    <f.icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{f.title}</span>
                    <span className="mt-0.5 block text-sm leading-6 text-white/85">{!view3dOn && f.body3dOff ? f.body3dOff : f.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} portal={portal} />
    </section>
  )
}
