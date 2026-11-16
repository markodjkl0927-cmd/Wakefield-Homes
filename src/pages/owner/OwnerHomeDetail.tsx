import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import {
  ArrowRight,
  Bath,
  BedDouble,
  Box,
  CalendarCheck,
  CalendarPlus,
  Camera,
  Construction,
  FileText,
  Hammer,
  Images,
  LandPlot,
  LayoutDashboard,
  Ruler,
  Wrench,
  ZoomIn,
} from 'lucide-react'
import type { Home, User } from '@/types'
import { useDocumentTitle } from '@/lib/utils'
import { formatDate, formatNumber, pluralize } from '@/lib/format'
import { getModel } from '@/data/models'
import { useCan3d, useCurrentUser, useHome, useSettings, useUsersById } from '@/store/hooks'
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Lightbox,
  ProgressBar,
  SmartImage,
  StatusBadge,
  Tabs,
  type LightboxImage,
  type TabItem,
} from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { Viewer3D } from '@/three/Viewer3D'
import { View3DButton } from '@/three/View3DButton'
import { StageTimeline } from './components/StageTimeline'
import { NewRequestModal } from './components/NewRequestModal'
import { AgreementRow, RequestRow } from './components/rows'
import { DetailList, NotFoundPanel } from './components/ui'
import { ColorSwatches, Home3DDetails, HomeStatusSummary, currentStage, hasSpec, isBuilding, ownerHomeStatus, planName, warrantyInfo } from './components/homeBits'
import { isRequestOpen, useOwnerAgreements, useOwnerRequests } from './components/data'
import { useHistoryDialog } from './components/dialogHistory'

type TabKey = 'overview' | 'construction' | 'photos' | '3d' | 'documents' | 'service'

export default function OwnerHomeDetail() {
  const { id } = useParams()
  const user = useCurrentUser()
  const home = useHome(id)
  const mine = home && user && home.ownerId === user.id ? home : undefined
  useDocumentTitle(mine?.title ?? 'Home not found')

  if (!user) return null
  if (!mine) {
    return (
      <NotFoundPanel
        title="Home not found"
        description="This home isn’t on your account. If you think that’s a mistake, please contact the Wakefield office."
        backTo="/owner/homes"
        backLabel="My homes"
      />
    )
  }
  return <HomeView key={mine.id} home={mine} owner={user} />
}

function HomeView({ home, owner }: { home: Home; owner: User }) {
  const model = getModel(home.modelId)
  const can3d = useCan3d(home)
  const settings = useSettings()
  const usersById = useUsersById()
  const allAgreements = useOwnerAgreements(owner.id)
  const allRequests = useOwnerRequests(owner.id)
  const [params, setParams] = useSearchParams()
  const requestDialog = useHistoryDialog('new-request')
  const [lightbox, setLightbox] = useState<number | null>(null)

  const agreements = useMemo(() => allAgreements.filter((a) => a.homeId === home.id), [allAgreements, home.id])
  const requests = useMemo(() => allRequests.filter((r) => r.homeId === home.id), [allRequests, home.id])
  const openCount = requests.filter(isRequestOpen).length
  const view3dOn = settings.features.view3d
  const maintenanceOn = settings.features.maintenance && Object.values(settings.categories).some(Boolean)
  // Switched-off features disappear: no 3D tab while 3D viewing is off, no Service tab when there's nothing to show or request.
  const showService = maintenanceOn || requests.length > 0

  // Photos grouped by construction stage (first-appearance order); the lightbox follows the same order.
  const photoGroups = useMemo(() => {
    const source = home.construction?.photos?.length ? home.construction.photos : home.images.map((url) => ({ stage: 'Home', url, caption: undefined as string | undefined }))
    const groups: { stage: string; items: { url: string; caption?: string; index: number }[] }[] = []
    let index = 0
    const byStage = new Map<string, { url: string; caption?: string }[]>()
    for (const p of source) {
      if (!byStage.has(p.stage)) byStage.set(p.stage, [])
      byStage.get(p.stage)!.push(p)
    }
    for (const [stage, items] of byStage) groups.push({ stage, items: items.map((p) => ({ ...p, index: index++ })) })
    return groups
  }, [home.construction?.photos, home.images])
  const lightboxImages: LightboxImage[] = useMemo(
    () => photoGroups.flatMap((g) => g.items.map((p) => ({ src: p.url, alt: p.caption ? `${g.stage}: ${p.caption}` : `${g.stage} photo`, caption: p.caption ? `${g.stage} · ${p.caption}` : g.stage }))),
    [photoGroups],
  )
  const photoCount = lightboxImages.length

  const tabs: TabItem<TabKey>[] = [
    { value: 'overview', label: 'Overview', icon: <LayoutDashboard className="size-4" aria-hidden /> },
    { value: 'construction', label: 'Construction', icon: <Construction className="size-4" aria-hidden /> },
    { value: 'photos', label: 'Photos', count: photoCount, icon: <Images className="size-4" aria-hidden /> },
    ...(view3dOn ? [{ value: '3d' as const, label: '3D view', icon: <Box className="size-4" aria-hidden /> }] : []),
    { value: 'documents', label: 'Documents', count: agreements.length, icon: <FileText className="size-4" aria-hidden /> },
    ...(showService ? [{ value: 'service' as const, label: 'Service', count: requests.length, icon: <Wrench className="size-4" aria-hidden /> }] : []),
  ]
  const tabParam = params.get('tab')
  const tab: TabKey = tabs.find((t) => t.value === tabParam)?.value ?? 'overview'
  const setTab = (t: TabKey) => {
    const next = new URLSearchParams(params)
    if (t === 'overview') next.delete('tab')
    else next.set('tab', t)
    setParams(next, { replace: true })
  }
  const tabLabel = tabs.find((t) => t.value === tab)?.label as string

  const customModelId = home.view3d.hasCustomModel ? home.id : null
  const contractStage = home.construction?.stages.find((s) => s.key === 'contract')
  const warranty = warrantyInfo(home)
  const keyDates = [
    contractStage?.date && contractStage.status === 'done' ? { label: 'Contract signed', value: formatDate(contractStage.date) } : null,
    isBuilding(home) && home.construction?.estCompletion ? { label: 'Estimated completion', value: formatDate(home.construction.estCompletion) } : null,
    home.closingDate ? { label: 'Closing', value: formatDate(home.closingDate) } : null,
    warranty.workmanshipEnds
      ? { label: warranty.workmanshipActive ? 'Workmanship warranty ends' : 'Workmanship warranty ended', value: formatDate(warranty.workmanshipEnds) }
      : null,
    warranty.structuralEnds ? { label: warranty.structuralActive ? 'Structural coverage ends' : 'Structural coverage ended', value: formatDate(warranty.structuralEnds) } : null,
  ].filter((x): x is { label: string; value: string } => !!x)

  return (
    <>
      <PageHeader
        back={{ to: '/owner/homes', label: 'My homes' }}
        title={<span className="wrap-anywhere">{home.title}</span>}
        description={`${home.address}, ${home.city}`}
        meta={
          <>
            <StatusBadge def={ownerHomeStatus(home)} size="md" />
            {model && <span className="text-sm text-ink-600">{model.name} plan · {model.style}</span>}
          </>
        }
        actions={
          <>
            {can3d && (
              <View3DButton title={home.title} subtitle={`${model?.name ?? 'Your home'} · ${home.address}, ${home.city}`} config={home.view3d.config} customModelId={customModelId} details={<Home3DDetails home={home} />} />
            )}
            {maintenanceOn && (
              <Button variant="secondary" leftIcon={<Wrench className="size-4" aria-hidden />} onClick={() => requestDialog.open({ homeId: home.id })}>
                Request maintenance
              </Button>
            )}
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="relative aspect-[16/10] w-full lg:aspect-auto lg:min-h-[360px]">
            <SmartImage
              src={home.images[0] ?? model?.image}
              alt={`${home.title} — ${isBuilding(home) ? 'latest construction photo' : 'exterior photo'}`}
              priority
              className="absolute inset-0"
            />
          </div>
          <div className="flex flex-col justify-center p-5 sm:p-7 lg:p-8">
            <p className="eyebrow">{isBuilding(home) ? 'Your build' : 'Your home'}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-[1.75rem]">{model?.name ?? home.title}</p>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <Fact icon={<BedDouble />} label="Bedrooms" value={hasSpec(home, 'beds') ? String(home.beds) : '—'} />
              <Fact icon={<Bath />} label="Bathrooms" value={hasSpec(home, 'baths') ? String(home.baths) : '—'} />
              <Fact icon={<Ruler />} label="Living area" value={hasSpec(home, 'sqft') ? `${formatNumber(home.sqft)} sq ft` : '—'} />
              <Fact icon={<LandPlot />} label="Lot" value={home.lotSizeAcres ? `${home.lotSizeAcres} acre` : '—'} />
            </dl>
            <HomeStatusSummary home={home} className="mt-6 border-t border-ink-100 pt-5" />
          </div>
        </div>
      </Card>

      <Tabs<TabKey> items={tabs} value={tab} onChange={setTab} ariaLabel="Home sections" className="mt-8" />

      <div role="tabpanel" aria-label={tabLabel} className="mt-6">
        {tab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-6">
              <Card>
                <CardHeader title="About this home" />
                <CardBody>
                  <p className="leading-7 text-user text-ink-700">{home.description}</p>
                  {model && (
                    <div className="mt-6 flex flex-col gap-5 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-200/60 ring-inset sm:flex-row sm:items-center">
                      <SmartImage src={model.image} alt="" className="aspect-[3/2] w-full shrink-0 rounded-lg sm:w-44" />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-ink-900">
                          {model.name} <span className="font-normal text-ink-500">· {model.style}</span>
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-ink-600">{model.summary}</p>
                        <Link to={`/our-homes/models/${model.slug}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-800 hover:text-brand-900 hover:underline">
                          View this plan on our website <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
              {model && model.highlights.length > 0 && (
                <Card>
                  <CardHeader title="Plan highlights" />
                  <CardBody>
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {model.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2.5 text-sm text-ink-700">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              )}
            </div>
            <div className="min-w-0 space-y-6">
              <Card>
                <CardHeader title="Key dates" icon={<CalendarCheck className="size-[18px]" aria-hidden />} />
                <CardBody>
                  {keyDates.length ? <DetailList items={keyDates} /> : <p className="text-sm text-ink-600">Dates will appear here as your build is scheduled.</p>}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="At a glance" />
                <CardBody>
                  <DetailList
                    items={[
                      { label: 'Documents', value: <button type="button" onClick={() => setTab('documents')} className="text-brand-800 hover:underline">{pluralize(agreements.length, 'agreement')}</button> },
                      ...(showService
                        ? [{ label: 'Open requests', value: <button type="button" onClick={() => setTab('service')} className="text-brand-800 hover:underline">{openCount}</button> }]
                        : []),
                      { label: 'Photos', value: <button type="button" onClick={() => setTab('photos')} className="text-brand-800 hover:underline">{photoCount}</button> },
                      ...(view3dOn
                        ? [{ label: '3D view', value: can3d ? <button type="button" onClick={() => setTab('3d')} className="text-brand-800 hover:underline">Available</button> : 'Not yet available' }]
                        : []),
                    ]}
                  />
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {tab === 'construction' &&
          (home.construction && home.construction.stages.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <Card className="min-w-0">
                <CardHeader title="Construction timeline" description={isBuilding(home) ? 'Where your home is in the build, stage by stage.' : 'Your home’s build, from contract to keys.'} icon={<Hammer className="size-[18px]" aria-hidden />} />
                <CardBody>
                  <div className="mb-8 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-200/60 ring-inset">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm text-ink-600">
                        {isBuilding(home) ? (
                          <>
                            Now: <span className="font-semibold text-ink-900">{currentStage(home)?.label ?? 'Getting started'}</span>
                          </>
                        ) : (
                          <span className="font-semibold text-emerald-800">Build complete</span>
                        )}
                      </p>
                      <p className="text-2xl font-semibold text-brand-900 tabular-nums">{home.construction.progress}%</p>
                    </div>
                    <ProgressBar value={home.construction.progress} tone={home.construction.progress >= 100 ? 'success' : 'brand'} className="mt-2.5" label={`Construction ${home.construction.progress}% complete`} />
                    {isBuilding(home) && home.construction.estCompletion && (
                      <p className="mt-2.5 text-sm text-ink-600">
                        Estimated completion <span className="font-medium text-ink-900">{formatDate(home.construction.estCompletion)}</span>
                      </p>
                    )}
                  </div>
                  <StageTimeline stages={home.construction.stages} estCompletion={isBuilding(home) ? home.construction.estCompletion : undefined} />
                </CardBody>
              </Card>
              <div className="min-w-0 space-y-6">
                {photoCount > 0 && (
                  <Card className="overflow-hidden">
                    <button type="button" onClick={() => setLightbox(photoCount - 1)} className="group relative block w-full text-left">
                      <SmartImage src={lightboxImages[photoCount - 1].src} alt="" className="aspect-[4/3] w-full" imgClassName="transition-transform duration-500 group-hover:scale-[1.03]" />
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/80 to-transparent px-4 pt-10 pb-3 text-sm font-medium text-white">
                        Latest photo · {lightboxImages[photoCount - 1].caption}
                        <span className="sr-only"> (open full size)</span>
                      </span>
                    </button>
                    <div className="px-5 py-3.5">
                      <button type="button" onClick={() => setTab('photos')} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-800 hover:underline">
                        See all {photoCount} photos <ArrowRight className="size-4" aria-hidden />
                      </button>
                    </div>
                  </Card>
                )}
                {settings.features.booking && (
                  <Card className="p-5">
                    <h2 className="font-semibold text-ink-900">Want to see it in person?</h2>
                    <p className="mt-1 text-sm text-ink-600">Book a site visit or walkthrough with your construction manager.</p>
                    <ButtonLink to="/owner/appointments?book=1" variant="soft" className="mt-4 w-full" leftIcon={<CalendarPlus className="size-4" aria-hidden />}>
                      Book a visit
                    </ButtonLink>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <Card>
              <EmptyState icon={<Construction className="size-6" aria-hidden />} title="No construction schedule yet" description="Your construction timeline will appear here once your build is scheduled." />
            </Card>
          ))}

        {tab === 'photos' &&
          (photoCount === 0 ? (
            <Card>
              <EmptyState icon={<Camera className="size-6" aria-hidden />} title="No photos yet" description="Your Wakefield team adds progress photos as your home is built." />
            </Card>
          ) : (
            <div className="space-y-8">
              {photoGroups.map((group) => (
                <section key={group.stage} aria-labelledby={`stage-${group.stage}`}>
                  <h2 id={`stage-${group.stage}`} className="mb-3 flex items-baseline gap-2 text-base font-semibold text-ink-900">
                    {group.stage}
                    <span className="text-sm font-normal text-ink-500">{pluralize(group.items.length, 'photo')}</span>
                  </h2>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {group.items.map((p) => (
                      <li key={`${p.index}-${p.url}`}>
                        <button
                          type="button"
                          onClick={() => setLightbox(p.index)}
                          className="group relative block w-full overflow-hidden rounded-xl text-left shadow-card ring-1 ring-ink-200/70"
                          aria-label={`Open photo: ${p.caption ?? group.stage}`}
                        >
                          <SmartImage src={p.url} alt="" className="aspect-[4/3] w-full" imgClassName="transition-transform duration-500 group-hover:scale-[1.04]" />
                          <span className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-ink-950/50 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
                            <ZoomIn className="size-4" />
                          </span>
                          {p.caption && <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink-950/80 to-transparent px-3 pt-8 pb-2 text-xs font-medium text-white">{p.caption}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ))}

        {tab === '3d' &&
          (can3d ? (
            <Card className="overflow-hidden">
              <Viewer3D config={home.view3d.config} customModelId={customModelId} className="aspect-[4/3] max-h-[620px] w-full rounded-none sm:aspect-[16/9]" ariaLabel={`3D model of ${home.title}`} eager />
              <CardBody className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-xl">
                  <h2 className="font-semibold text-ink-900">Your home in 3D</h2>
                  <p className="mt-1 text-sm leading-6 text-ink-600">
                    Drag to turn the house, scroll or pinch to zoom. The model shows the exterior of {model ? `the ${planName(model.name)} plan` : 'your home'} with your selected colors — final construction may differ in detail.
                  </p>
                </div>
                <ColorSwatches colors={home.view3d.config.colors} showShutters={home.view3d.config.shutters} className="shrink-0" />
              </CardBody>
            </Card>
          ) : (
            <Card>
              <EmptyState icon={<Box className="size-6" aria-hidden />} title="3D view isn’t available yet" description="Your Wakefield team will turn on the 3D view for this home when its model is ready." />
            </Card>
          ))}

        {tab === 'documents' && (
          <Card>
            <CardHeader title="Documents for this home" description="Agreements, change orders and warranties." icon={<FileText className="size-[18px]" aria-hidden />} action={<Link to="/owner/agreements" className="text-sm font-semibold text-brand-800 hover:underline">All agreements</Link>} />
            {agreements.length === 0 ? (
              <EmptyState compact title="No documents yet" description="Documents for this home appear here as soon as your Wakefield team shares them." />
            ) : (
              <ul className="divide-y divide-ink-100">
                {agreements.map((a) => (
                  <AgreementRow key={a.id} agreement={a} home={home} usersById={usersById} showHome={false} />
                ))}
              </ul>
            )}
          </Card>
        )}

        {tab === 'service' && (
          <Card>
            <CardHeader
              title="Service requests"
              description="Maintenance and warranty requests for this home."
              icon={<Wrench className="size-[18px]" aria-hidden />}
              action={
                maintenanceOn ? (
                  <Button size="sm" onClick={() => requestDialog.open({ homeId: home.id })} leftIcon={<Wrench className="size-4" aria-hidden />}>
                    <span className="hidden sm:inline">Request maintenance</span>
                    <span className="sm:hidden">New</span>
                  </Button>
                ) : undefined
              }
            />
            {requests.length === 0 ? (
              <EmptyState compact title="No requests for this home" description="Need something looked at? Request it here and follow it through to done." />
            ) : (
              <ul className="divide-y divide-ink-100">
                {requests.map((r) => (
                  <RequestRow key={r.id} request={r} />
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      <Lightbox images={lightboxImages} index={lightbox} onClose={() => setLightbox(null)} onIndexChange={setLightbox} />
      {requestDialog.isOpen && maintenanceOn && (
        <NewRequestModal dialog={requestDialog} initialHomeId={requestDialog.params?.homeId ?? home.id} onCreated={(r) => requestDialog.close(`/owner/maintenance/${r.id}`)} />
      )}
    </>
  )
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
        <span className="text-ink-400 [&>svg]:size-3.5" aria-hidden>
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-0.5 font-semibold text-ink-900">{value}</dd>
    </div>
  )
}
