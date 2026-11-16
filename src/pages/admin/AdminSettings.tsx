import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AlertTriangle, PowerOff, RotateCcw, ToggleRight, Wrench } from 'lucide-react'
import type { RequestCategory } from '@/types'
import { requestCategories, roleLabels } from '@/data/labels'
import { createSeed, demoAccounts } from '@/data/seed'
import { useDocumentTitle } from '@/lib/utils'
import { cn } from '@/lib/cn'
import { useAppStore } from '@/store'
import { useCurrentUser, useImpersonator, useSettings } from '@/store/hooks'
import { confirmDialog, toast } from '@/store/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { portalHomeFor } from '@/components/site/SiteHeader'
import { Alert, Button, Card, CardBody, CardHeader, Switch } from '@/components/ui'
import { BookingHoursForm } from './components/BookingHoursForm'
import { OfficeDetailsForm } from './components/OfficeDetailsForm'
import { featureMeta, featureOrder, type FeatureKey } from './components/meta'

const sections = [
  { id: 'features', label: 'Features' },
  { id: 'request-types', label: 'Request types' },
  { id: 'booking', label: 'Booking hours' },
  { id: 'office', label: 'Office details' },
  { id: 'danger-zone', label: 'Danger zone' },
] as const

const categoryOrder: RequestCategory[] = ['gardening', 'road-fixing', 'report', 'house-fix']

/** Highlights the last section whose top has scrolled past the sticky header (the last one at the very bottom). */
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string>(ids[0])
  useEffect(() => {
    const update = () => {
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 140) current = id
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      setActive(atBottom ? ids[ids.length - 1] : current)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [ids])
  return [active, setActive] as const
}

export default function AdminSettings() {
  useDocumentTitle('Platform settings')
  const settings = useSettings()
  const [active, setActive] = useActiveSection(sectionIds)
  const { hash } = useLocation()

  // Deep links (e.g. /admin/settings#request-types from the overview): the app-wide scroll handler runs
  // before this lazily loaded page exists, so jump to the section once it has rendered.
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <PageHeader title="Platform settings" description="Control features across the website and portals, the request types Home Owners can choose, booking hours and office details." />

      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <nav aria-label="Settings sections" className="sticky top-24 hidden lg:block">
          <ul className="space-y-1 border-l border-ink-200">
            {sections.map((s) => (
              <li key={s.id}>
                <Link
                  to={{ hash: `#${s.id}` }}
                  onClick={() => setActive(s.id)}
                  aria-current={active === s.id ? 'location' : undefined}
                  className={cn(
                    '-ml-px flex min-h-10 items-center border-l-2 py-2 pl-4 text-sm font-medium transition-colors',
                    active === s.id ? 'border-brand-800 text-brand-900' : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-900',
                  )}
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          <FeaturesCard />
          <RequestTypesCard />
          <BookingHoursForm id="booking" key={JSON.stringify(settings.booking)} booking={settings.booking} />
          <OfficeDetailsForm id="office" key={JSON.stringify(settings.office)} office={settings.office} />
          <DangerZoneCard />
        </div>
      </div>
    </>
  )
}

const sectionIds = sections.map((s) => s.id)

function FeaturesCard() {
  const features = useAppStore((s) => s.settings.features)
  const setFeature = useAppStore((s) => s.setFeature)
  const toggle = (key: FeatureKey, on: boolean) => {
    setFeature(key, on)
    toast.success(`${featureMeta[key].label} ${on ? 'turned on' : 'turned off'}`, on ? 'It’s live for everyone right away.' : featureMeta[key].whenOff)
  }
  return (
    <Card id="features" className="scroll-mt-24">
      <CardHeader icon={<ToggleRight className="size-[18px]" aria-hidden />} title="Features" description="Turn parts of the website and portals on or off. Changes apply immediately." />
      <ul className="divide-y divide-ink-100">
        {featureOrder.map((key) => {
          const meta = featureMeta[key]
          const on = features[key]
          return (
            <li key={key} className="flex items-start gap-4 px-5 py-4 sm:px-6">
              <span className={cn('mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors', on ? 'bg-brand-50 text-brand-800' : 'bg-ink-100 text-ink-500')} aria-hidden>
                <meta.icon className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <Switch checked={on} onChange={(v) => toggle(key, v)} label={meta.label} description={meta.description} />
                {!on && (
                  <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200 ring-inset">
                    <PowerOff className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
                    <span>
                      <span className="font-semibold">Off now. </span>
                      {meta.whenOff}
                    </span>
                  </p>
                )}
                <p className="mt-2 text-xs font-medium text-ink-500">
                  <span className="sr-only">Applies to: </span>
                  {meta.where}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function RequestTypesCard() {
  const categories = useAppStore((s) => s.settings.categories)
  const maintenanceOn = useAppStore((s) => s.settings.features.maintenance)
  const setCategoryEnabled = useAppStore((s) => s.setCategoryEnabled)
  const setFeature = useAppStore((s) => s.setFeature)
  const enabledCount = categoryOrder.filter((c) => categories[c]).length

  const toggle = (key: RequestCategory, on: boolean) => {
    if (!on && enabledCount <= 1) {
      toast.error('Keep at least one request type', 'To stop all requests, turn off “Maintenance requests” in Features instead.')
      return
    }
    setCategoryEnabled(key, on)
    const label = requestCategories[key].label
    toast.success(
      on ? `${label} is available` : `${label} is hidden`,
      on ? 'Home Owners can choose it again.' : 'Home Owners can no longer choose it for new requests. Requests already sent stay as they are.',
    )
  }

  return (
    <Card id="request-types" className="scroll-mt-24">
      <CardHeader
        icon={<Wrench className="size-[18px]" aria-hidden />}
        title="Maintenance request types"
        description="Choose which types Home Owners can pick when they ask for maintenance. Changes apply immediately."
      />
      <CardBody className="space-y-4">
        {!maintenanceOn && (
          <Alert
            tone="warning"
            title="Maintenance requests are off"
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setFeature('maintenance', true)
                  toast.success('Maintenance requests turned on')
                }}
              >
                Turn on
              </Button>
            }
          >
            Home Owners are asked to call the office until the feature is back on. These types apply once it is.
          </Alert>
        )}
        <ul className="grid gap-3 md:grid-cols-2">
          {categoryOrder.map((key) => {
            const c = requestCategories[key]
            const on = categories[key]
            const isLast = on && enabledCount === 1
            return (
              <li key={key} className={cn('rounded-xl p-4 ring-1 transition-colors ring-inset', on ? 'bg-white ring-ink-200' : 'bg-ink-25 ring-ink-200/70')}>
                <div className="flex items-start gap-3">
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors', on ? 'bg-brand-800 text-white' : 'bg-ink-100 text-ink-500')} aria-hidden>
                    <c.icon className="size-5" />
                  </span>
                  <Switch className="min-w-0 flex-1" checked={on} disabled={isLast} onChange={(v) => toggle(key, v)} label={c.label} description={c.description} />
                </div>
              </li>
            )
          })}
        </ul>
        <p className="text-sm text-ink-500" aria-live="polite">
          {enabledCount === 1
            ? 'At least one request type must stay available, so the last one can’t be turned off.'
            : `${enabledCount} of ${categoryOrder.length} request types are available to Home Owners.`}
        </p>
      </CardBody>
    </Card>
  )
}

/** Ids of the accounts in the sample data (computed once, on first use). */
let sampleAccountIds: Set<string> | null = null
function isSampleAccount(id: string): boolean {
  sampleAccountIds ??= new Set(createSeed().users.map((u) => u.id))
  return sampleAccountIds.has(id)
}

function DangerZoneCard() {
  const resetDemo = useAppStore((s) => s.resetDemo)
  const me = useCurrentUser()
  const impersonator = useImpersonator()
  const navigate = useNavigate()

  const reset = async () => {
    // The store keeps the signed-in Super Admin; an account created during the demo isn't in the sample data,
    // so the sample Super Admin takes its place. Say so up front.
    const keeper = impersonator ?? me
    const standIn = demoAccounts.find((d) => d.role === (keeper?.role ?? 'admin'))
    const staysSignedIn = !keeper || isSampleAccount(keeper.id)
    const ok = await confirmDialog({
      title: 'Reset all demo data?',
      description: `Accounts, homes, agreements, bookings, requests, leads and settings go back to the original sample data, and anything changed during this demo is lost. ${
        staysSignedIn
          ? 'You stay signed in.'
          : `Your account was created during the demo, so you’ll be signed in as ${standIn?.name ?? 'the sample Super Admin'} (${standIn ? roleLabels[standIn.role] : 'Super Admin'}) instead.`
      }`,
      confirmLabel: 'Reset demo data',
      tone: 'danger',
    })
    if (!ok) return
    const { user, switched } = resetDemo()
    if (!user) {
      navigate('/', { replace: true })
      toast.success('Demo data reset', 'Everything is back to the original sample data.')
      return
    }
    if (user.role !== 'admin') navigate(portalHomeFor(user.role), { replace: true })
    toast.success(
      'Demo data reset',
      switched ? `You’re signed in as ${user.name}, because your account wasn’t part of the sample data.` : 'Everything is back to the original sample data.',
    )
  }
  return (
    <Card id="danger-zone" className="scroll-mt-24 ring-rose-200">
      <CardHeader
        icon={<AlertTriangle className="size-[18px] text-rose-700" aria-hidden />}
        title="Danger zone"
        description="Actions here affect the whole platform and can’t be undone."
      />
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900">Reset demo data</p>
          <p className="mt-0.5 max-w-xl text-sm text-ink-500">
            Restores every account, home, agreement, booking, request, lead and setting to the original sample data. You stay signed in. Handy before a presentation.
          </p>
        </div>
        <Button variant="danger" onClick={() => void reset()} leftIcon={<RotateCcw className="size-4" aria-hidden />} className="shrink-0">
          Reset demo data
        </Button>
      </CardBody>
    </Card>
  )
}
