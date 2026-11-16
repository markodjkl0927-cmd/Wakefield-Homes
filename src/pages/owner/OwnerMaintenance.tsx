import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { ArrowRight, Plus, Wrench } from 'lucide-react'
import type { RequestCategory } from '@/types'
import { useDocumentTitle } from '@/lib/utils'
import { requestCategories } from '@/data/labels'
import { useCurrentUser, useOffice, useSettings } from '@/store/hooks'
import { Alert, Button, Card, EmptyState, Segmented } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { NewRequestModal } from './components/NewRequestModal'
import { RequestRow } from './components/rows'
import { isRequestOpen, requestActionPhrase, requestTypesPhrase, useEnabledRequestCategories, useHomesById, useOwnerRequests } from './components/data'
import { useHistoryDialog } from './components/dialogHistory'

type Filter = 'open' | 'done' | 'all'

export default function OwnerMaintenance() {
  useDocumentTitle('Maintenance')
  const user = useCurrentUser()
  const requests = useOwnerRequests(user?.id)
  const homesById = useHomesById()
  const settings = useSettings()
  const office = useOffice()
  const navigate = useNavigate()
  const { pathname, key: locationKey } = useLocation()
  const [params] = useSearchParams()
  const dialog = useHistoryDialog<{ homeId?: string; category?: string }>('new-request')
  const [filter, setFilter] = useState<Filter>(() => (requests.some(isRequestOpen) || !requests.length ? 'open' : 'all'))
  const enabledFeature = settings.features.maintenance
  const enabledCategories = useEnabledRequestCategories()
  const canRequest = enabledFeature && enabledCategories.length > 0
  const typesPhrase = requestTypesPhrase(enabledCategories)

  // Deep link: /owner/maintenance?new=1&home=<id>&category=<key> opens the form (and drops the parameters).
  const deepLinkHandled = useRef<string | null>(null)
  useEffect(() => {
    if (params.get('new') !== '1' || deepLinkHandled.current === locationKey) return
    deepLinkHandled.current = locationKey
    const next = new URLSearchParams(params)
    next.delete('new')
    next.delete('home')
    next.delete('category')
    void navigate({ pathname, search: next.toString() ? `?${next}` : '' }, { replace: true })
    if (canRequest) {
      const category = params.get('category')
      dialog.open({ homeId: params.get('home') ?? undefined, category: category && category in requestCategories ? category : undefined })
    }
  }, [params, locationKey, canRequest, pathname, dialog, navigate])

  const openForm = (category?: RequestCategory) => dialog.open(category ? { category } : undefined)

  const groups = useMemo(
    () => ({ open: requests.filter(isRequestOpen), done: requests.filter((r) => !isRequestOpen(r)), all: requests }),
    [requests],
  )
  const visible = groups[filter]

  const emptyCopy: Record<Filter, { title: string; description: string }> = {
    open: {
      title: 'No open requests',
      description: canRequest
        ? 'Everything’s taken care of. If something needs attention, start a new request and we’ll take it from there.'
        : `Everything’s taken care of. If something needs attention, call the office at ${office.phoneDisplay}.`,
    },
    done: { title: 'Nothing resolved yet', description: 'Requests move here once our team resolves them and you confirm the fix.' },
    all: {
      title: 'No requests yet',
      description: canRequest ? `${typesPhrase} — request it here and follow it through to done.` : `Online requests are paused — call the office at ${office.phoneDisplay}.`,
    },
  }

  return (
    <>
      <PageHeader
        title="Maintenance"
        description={
          canRequest
            ? `${requestActionPhrase(enabledCategories)} — then follow each request through to resolution.`
            : 'Follow your requests through to resolution. For anything new, the Wakefield office is a phone call away.'
        }
        actions={
          canRequest ? (
            <Button leftIcon={<Plus className="size-4" aria-hidden />} onClick={() => openForm()}>
              New request
            </Button>
          ) : undefined
        }
      />

      {!canRequest && (
        <Alert tone="info" title="Online maintenance requests are paused" className="mb-6">
          Please call the office at{' '}
          <a href={`tel:${office.phone}`} className="font-semibold underline">
            {office.phoneDisplay}
          </a>
          {office.email && (
            <>
              {' '}
              or email{' '}
              <a href={`mailto:${office.email}`} className="font-semibold wrap-anywhere underline">
                {office.email}
              </a>
            </>
          )}{' '}
          and we’ll help you right away.{requests.length > 0 ? ' Your existing requests are listed below.' : ''}
        </Alert>
      )}

      {canRequest && (
        <section aria-labelledby="help-title" className="mb-10">
          <h2 id="help-title" className="mb-3 text-base font-semibold text-ink-900">
            What do you need help with?
          </h2>
          <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {enabledCategories.map((key) => {
              const c = requestCategories[key]
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => openForm(key)}
                    className="group flex h-full w-full flex-col items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift hover:ring-brand-200 sm:flex-row sm:gap-4 sm:p-5"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-900 group-hover:text-white group-hover:ring-brand-900">
                      <c.icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 font-semibold text-ink-900">
                        {c.label}
                        <ArrowRight className="hidden size-4 shrink-0 text-ink-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-700 sm:block" aria-hidden />
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-ink-600 sm:text-sm">{c.description}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="requests-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="requests-title" className="text-base font-semibold text-ink-900">
            Your requests
          </h2>
          <Segmented<Filter>
            ariaLabel="Filter requests"
            value={filter}
            onChange={setFilter}
            items={[
              { value: 'open', label: 'Open', count: groups.open.length },
              { value: 'done', label: 'Resolved & closed', count: groups.done.length },
              { value: 'all', label: 'All', count: groups.all.length },
            ]}
          />
        </div>
        <Card>
          {visible.length === 0 ? (
            <EmptyState
              icon={<Wrench className="size-6" aria-hidden />}
              title={emptyCopy[filter].title}
              description={emptyCopy[filter].description}
              action={
                canRequest && filter !== 'done' ? (
                  <Button leftIcon={<Plus className="size-4" aria-hidden />} onClick={() => openForm()}>
                    New request
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {visible.map((r) => (
                <RequestRow key={r.id} request={r} home={homesById[r.homeId]} />
              ))}
            </ul>
          )}
        </Card>
      </section>

      {dialog.isOpen && canRequest && (
        <NewRequestModal
          dialog={dialog}
          initialHomeId={dialog.params?.homeId}
          initialCategory={dialog.params?.category as RequestCategory | undefined}
          onCreated={(r) => dialog.close(`/owner/maintenance/${r.id}`)}
        />
      )}
    </>
  )
}
