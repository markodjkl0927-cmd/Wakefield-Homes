import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Box, ExternalLink, Globe, HardHat, Home as HomeIcon, Images, Lock, Mail, Phone, Trash2, TriangleAlert, Undo2, UserRound } from 'lucide-react'
import type { Home, HomeStatus, HouseConfig } from '@/types'
import { homeStatus } from '@/data/labels'
import { getModel, homeModels } from '@/data/models'
import { communities } from '@/data/communities'
import { makeHouse } from '@/data/housePresets'
import { defaultEstimate, marketAnalysisForHome } from '@/data/marketAnalysis'
import { cn } from '@/lib/cn'
import { formatDate, formatNumber, formatPhone, formatPrice, formatRelative, pluralize } from '@/lib/format'
import { useDocumentTitle } from '@/lib/utils'
import { homeFootprint, useAppStore } from '@/store'
import { useCan, useHomeowners, usePersonLookup } from '@/store/hooks'
import { confirmDialog, toast } from '@/store/ui'
import { Alert, Avatar, Badge, Button, ButtonLink, Card, CardBody, CardHeader, EmptyState, Field, Input, Select, StatusBadge, Switch, Textarea, smoothBehavior } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { removeGlb } from '@/three/glbStore'
import { StaffGuard, leadingNumber, optionalTagAA } from './components/common'
import { ConstructionSection, PhotosEditor, View3DSection, editorSectionClass } from './components/HomeEditorSections'
import { EditorSectionNav, jumpToSection, useActiveSection, type EditorSection } from './components/EditorSectionNav'
import { useKeepFocusVisible } from './components/useKeepFocusVisible'

/* ------------------------------------------------------------------ */
/* Draft model                                                          */
/* ------------------------------------------------------------------ */

/** Plan choice for homes that aren't built on a portfolio plan (townhomes, renovations): stored as modelId ''. */
const NO_PLAN = 'none'
/** An owned home is never offered for sale (the store enforces it too). */
const FOR_SALE: HomeStatus[] = ['available', 'coming-soon']
type Spec = 'beds' | 'baths' | 'sqft'
const SPECS: Spec[] = ['beds', 'baths', 'sqft']

interface Draft {
  title: string
  address: string
  city: string
  communityId: string
  lot: string
  modelId: string
  status: HomeStatus
  price: string
  priceNote: string
  delivery: string
  beds: string
  baths: string
  sqft: string
  lotSizeAcres: string
  description: string
  images: string[]
  published: boolean
  featured: boolean
  ownerId: string
  view3dEnabled: boolean
  config: HouseConfig
}

type Errors = Partial<Record<keyof Draft, string>>

function draftFromHome(h: Home): Draft {
  const hidden = new Set(h.unpublishedSpecs ?? [])
  return {
    title: h.title,
    address: h.address,
    city: h.city,
    communityId: h.communityId ?? '',
    lot: h.lot ?? '',
    modelId: h.modelId || NO_PLAN,
    status: h.status,
    price: h.price == null ? '' : String(h.price),
    priceNote: h.priceNote ?? '',
    delivery: h.delivery ?? '',
    // A spec that isn't published shows as blank (the stored number is only a placeholder).
    beds: hidden.has('beds') ? '' : String(h.beds),
    baths: hidden.has('baths') ? '' : String(h.baths),
    sqft: hidden.has('sqft') ? '' : String(h.sqft),
    lotSizeAcres: h.lotSizeAcres == null ? '' : String(h.lotSizeAcres),
    description: h.description,
    images: [...h.images],
    published: h.published,
    featured: h.featured,
    ownerId: h.ownerId ?? '',
    view3dEnabled: h.view3d.enabled,
    config: structuredClone(h.view3d.config),
  }
}

function emptyDraft(): Draft {
  return {
    title: '',
    address: '',
    city: 'Alexandria, VA',
    communityId: '',
    lot: '',
    modelId: '',
    status: 'coming-soon',
    price: '',
    priceNote: '',
    delivery: '',
    beds: '',
    baths: '',
    sqft: '',
    lotSizeAcres: '',
    description: '',
    images: [],
    published: false,
    featured: false,
    ownerId: '',
    view3dEnabled: true,
    config: makeHouse('craftsman', 'classic-white'),
  }
}

const fieldLabels: Record<keyof Draft, string> = {
  title: 'title',
  address: 'address',
  city: 'city',
  communityId: 'community',
  lot: 'lot',
  modelId: 'plan',
  status: 'status',
  price: 'price',
  priceNote: 'price note',
  delivery: 'delivery',
  beds: 'beds',
  baths: 'baths',
  sqft: 'square footage',
  lotSizeAcres: 'lot size',
  description: 'description',
  images: 'photos',
  published: 'website visibility',
  featured: 'featured',
  ownerId: 'owner',
  view3dEnabled: '3D viewing',
  config: '3D design',
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Beds, baths and square feet may be left blank: they're then "not published" and pages leave them out. */
function validate(d: Draft): Errors {
  const e: Errors = {}
  if (!d.title.trim()) e.title = 'Give the home a title, e.g. “Lot 36 · The Stockton”.'
  if (!d.modelId) e.modelId = 'Choose the floor plan, or “Not a portfolio plan”.'
  if (!d.address.trim()) e.address = 'Enter the street address.'
  if (!d.city.trim()) e.city = 'Enter the city, state and ZIP.'
  const int = (v: string) => /^\d+$/.test(v.trim())
  if (d.beds.trim() && (!int(d.beds) || Number(d.beds) < 1 || Number(d.beds) > 12)) e.beds = 'Enter 1–12, or leave blank.'
  if (d.baths.trim() && (!/^\d+(\.5)?$/.test(d.baths.trim()) || Number(d.baths) < 1)) e.baths = 'Use whole or half baths, e.g. 4.5.'
  if (d.sqft.trim() && (!int(d.sqft) || Number(d.sqft) < 500)) e.sqft = 'Enter the finished square footage, or leave blank.'
  if (d.price.trim() && (!/^\d+$/.test(d.price.trim()) || Number(d.price) < 1000)) e.price = 'Enter a whole-dollar price, or leave it blank.'
  if (d.lotSizeAcres.trim() && !(Number(d.lotSizeAcres) > 0 && Number(d.lotSizeAcres) < 100)) e.lotSizeAcres = 'Enter the lot size in acres, e.g. 0.5.'
  return e
}

const fieldOrder: (keyof Draft)[] = ['modelId', 'title', 'address', 'city', 'price', 'beds', 'baths', 'sqft', 'lotSizeAcres']

/** "a, b and c" */
function joinList(items: string[]): string {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/* ------------------------------------------------------------------ */

export default function StaffHomeEditor() {
  const { id } = useParams()
  const isNew = !id
  const home = useAppStore((s) => (id ? s.homes.find((h) => h.id === id) : undefined))
  const canEdit = useCan('homes.edit')
  useDocumentTitle(isNew ? 'Add a home' : home ? `Edit ${home.title}` : 'Home not found')
  return (
    // "Manage 3D viewing" alone opens the editor too: the 3D section is editable, the rest read-only.
    <StaffGuard permission={['homes.edit', 'homes.3d']} title={isNew ? 'Add a home' : 'Edit home'}>
      {isNew && !canEdit ? (
        <>
          <PageHeader title="Add a home" back={{ to: '/staff/homes', label: 'All homes' }} />
          <Card>
            <EmptyState
              icon={<Lock className="size-6" aria-hidden />}
              title="Adding homes needs the “Edit homes” permission"
              description="You can manage 3D viewing for existing homes. A Super Admin can grant “Edit homes” under Roles & permissions."
              action={<ButtonLink to="/staff/homes">Back to homes</ButtonLink>}
            />
          </Card>
        </>
      ) : !isNew && !home ? (
        <>
          <PageHeader title="Home not found" back={{ to: '/staff/homes', label: 'All homes' }} />
          <Card>
            <EmptyState
              icon={<HomeIcon className="size-6" aria-hidden />}
              title="This home doesn’t exist any more"
              description="It may have been deleted, or the demo data was reset."
              action={<ButtonLink to="/staff/homes">Back to homes</ButtonLink>}
            />
          </Card>
        </>
      ) : (
        <HomeEditor key={id ?? 'new'} home={home} canEdit={canEdit} />
      )}
    </StaffGuard>
  )
}

function HomeEditor({ home, canEdit }: { home?: Home; canEdit: boolean }) {
  const navigate = useNavigate()
  const homeowners = useHomeowners()
  const person = usePersonLookup()
  const can3d = useCan('homes.3d')
  const globalOn = useAppStore((s) => s.settings.features.view3d)
  const createHome = useAppStore((s) => s.createHome)
  const updateHome = useAppStore((s) => s.updateHome)
  const updateHome3d = useAppStore((s) => s.updateHome3d)
  const assignHomeOwner = useAppStore((s) => s.assignHomeOwner)
  const deleteHome = useAppStore((s) => s.deleteHome)

  const [base, setBase] = useState<Draft>(() => (home ? draftFromHome(home) : emptyDraft()))
  const [draft, setDraft] = useState<Draft>(base)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [planHint, setPlanHint] = useState<string | null>(null)
  // Homes priced in a market analysis (the Oronoco Street CMA) show its estimate next to the price.
  const market = home && canEdit ? marketAnalysisForHome(home.id) : undefined
  const marketEstimate = market ? defaultEstimate(market.analysis, market.subject) : null
  /** Ignores the second click of a double click; a new home stays locked while the page switches to it. */
  const inFlight = useRef(false)
  const chipNavRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  useKeepFocusVisible(editorRef)
  const dirty = !same(draft, base)

  // When the home changes elsewhere (e.g. a construction update), refresh untouched forms.
  const [seenAt, setSeenAt] = useState(home?.updatedAt)
  if (home && home.updatedAt !== seenAt) {
    setSeenAt(home.updatedAt)
    if (!dirty) {
      const fresh = draftFromHome(home)
      setBase(fresh)
      setDraft(fresh)
    }
  }

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const model = draft.modelId && draft.modelId !== NO_PLAN ? getModel(draft.modelId) : undefined
  const owner = draft.ownerId ? homeowners.find((u) => u.id === draft.ownerId) : undefined
  const showConstruction = draft.status === 'under-construction' || draft.status === 'completed' || !!draft.ownerId
  const statusOptions = (Object.keys(homeStatus) as HomeStatus[]).filter((s) => !draft.ownerId || !FOR_SALE.includes(s) || s === draft.status)

  const applyPlan = (modelId: string) => {
    const m = getModel(modelId)
    if (!m) return
    setDraft((d) => ({
      ...d,
      modelId,
      title: d.title.trim() ? d.title : m.name,
      beds: String(Math.round(leadingNumber(m.beds, 4))),
      baths: String(leadingNumber(m.baths, 3.5)),
      sqft: String(m.sqftMin),
      images: d.images.length ? d.images : [m.image],
      config: structuredClone(m.house3d),
    }))
    setErrors((e) => ({ ...e, modelId: undefined, beds: undefined, baths: undefined, sqft: undefined, title: undefined }))
  }

  const onPlanChange = (modelId: string) => {
    if (modelId === NO_PLAN || !getModel(modelId)) {
      set('modelId', modelId)
      setPlanHint(null)
      return
    }
    if (!home) {
      applyPlan(modelId)
      setPlanHint(null)
      return
    }
    set('modelId', modelId)
    setPlanHint(modelId !== base.modelId ? modelId : null)
  }

  const onOwnerChange = (ownerId: string) => {
    // Assigning a Home Owner takes the home off the market.
    setDraft((d) => ({ ...d, ownerId, status: ownerId && FOR_SALE.includes(d.status) ? 'under-contract' : d.status }))
  }

  const focusField = (key: keyof Draft) => {
    const el = document.getElementById(`home-${key}`)
    el?.scrollIntoView({ behavior: smoothBehavior(), block: 'center' })
    el?.focus({ preventScroll: true })
  }

  const save = () => {
    if (inFlight.current) return
    const errs = validate(draft)
    setErrors(errs)
    const firstBad = fieldOrder.find((k) => errs[k])
    if (firstBad) {
      // The Save bar says how many fields need attention; focus goes to the first one.
      focusField(firstBad)
      return
    }
    inFlight.current = true
    setSaving(true)
    const num = (v: string) => (v.trim() === '' ? undefined : Number(v))
    const hiddenSpecs = SPECS.filter((k) => !draft[k].trim())
    const fields = {
      title: draft.title.trim(),
      address: draft.address.trim(),
      city: draft.city.trim(),
      communityId: draft.communityId || undefined,
      lot: draft.lot.trim() || undefined,
      modelId: draft.modelId === NO_PLAN ? '' : draft.modelId,
      status: draft.status,
      price: draft.price.trim() ? Number(draft.price) : null,
      priceNote: draft.priceNote.trim() || undefined,
      delivery: draft.delivery.trim() || undefined,
      // Blank specs aren't published: 0 is stored as a placeholder and listed in unpublishedSpecs.
      beds: Number(draft.beds.trim() || 0),
      baths: Number(draft.baths.trim() || 0),
      sqft: Number(draft.sqft.trim() || 0),
      lotSizeAcres: num(draft.lotSizeAcres),
      description: draft.description.trim(),
      images: draft.images,
      published: draft.published,
      featured: draft.featured,
    }
    const unlock = () => {
      inFlight.current = false
      setSaving(false)
    }

    if (!home) {
      const { delivery, ...input } = fields
      const created = createHome({ ...input, house3d: draft.config })
      const extra: Partial<Home> = {}
      if (delivery) extra.delivery = delivery
      if (hiddenSpecs.length) extra.unpublishedSpecs = hiddenSpecs
      if (Object.keys(extra).length) updateHome(created.id, extra, 'listing details')
      if (!draft.view3dEnabled) updateHome3d(created.id, { enabled: false })
      if (draft.ownerId) assignHomeOwner(created.id, draft.ownerId)
      setBase(draft)
      toast.success('Home created', draft.published ? `${created.title} is live on the website.` : `${created.title} is saved as a draft.`)
      navigate(`/staff/homes/${created.id}`, { replace: true })
      return
    }

    const changed = (Object.keys(draft) as (keyof Draft)[]).filter((k) => !same(draft[k], base[k]))
    const homeKeys = changed.filter((k) => k in fields) as (keyof typeof fields)[]
    if (homeKeys.length) {
      const patch: Partial<Home> = {}
      for (const k of homeKeys) (patch as Record<string, unknown>)[k] = fields[k]
      if (homeKeys.some((k) => (SPECS as string[]).includes(k)) || !same([...hiddenSpecs].sort(), [...(home.unpublishedSpecs ?? [])].sort())) {
        patch.unpublishedSpecs = hiddenSpecs
      }
      updateHome(home.id, patch, homeKeys.map((k) => fieldLabels[k]).join(', '))
    }
    if (changed.includes('view3dEnabled') || changed.includes('config')) {
      updateHome3d(home.id, {
        ...(changed.includes('view3dEnabled') ? { enabled: draft.view3dEnabled } : {}),
        ...(changed.includes('config') ? { config: draft.config } : {}),
      })
    }
    let offMarket = false
    if (changed.includes('ownerId')) {
      const result = assignHomeOwner(home.id, draft.ownerId || undefined)
      if (!result.ok) toast.error('Couldn’t change the owner', result.error)
      else offMarket = result.tookOffMarket
    }
    const saved = useAppStore.getState().homes.find((h) => h.id === home.id)
    const fresh = saved ? draftFromHome(saved) : draft
    setBase(fresh)
    setDraft(fresh)
    setSeenAt(saved?.updatedAt)
    setPlanHint(null)
    window.setTimeout(unlock, 400)
    const what = changed.map((k) => fieldLabels[k])
    toast.success('Changes saved', `${what.length ? `Updated ${what.slice(0, 4).join(', ')}${what.length > 4 ? '…' : ''}.` : ''}${offMarket ? ' The home is now Under contract.' : ''}`.trim() || undefined)
  }

  const discard = () => {
    setDraft(base)
    setErrors({})
    setPlanHint(null)
    toast.info('Changes discarded')
  }

  const remove = async () => {
    if (!home) return
    const fp = homeFootprint(useAppStore.getState(), home.id)
    const ownerName = fp.ownerId ? person(fp.ownerId)?.name : undefined
    const kept = [fp.agreements && pluralize(fp.agreements, 'agreement'), fp.requests && pluralize(fp.requests, 'request'), fp.appointments && pluralize(fp.appointments, 'appointment')].filter(
      (x): x is string => !!x,
    )
    const ok = await confirmDialog({
      title: `Delete “${home.title}”?`,
      description: [
        `It disappears from the website${ownerName ? ` and from ${ownerName}’s portal` : ''}.`,
        kept.length ? `${joinList(kept)} that mention it are kept and still show its name.` : 'No agreements, requests or appointments mention it.',
        fp.upcomingAppointments ? `${pluralize(fp.upcomingAppointments, 'upcoming appointment')} stay booked.` : '',
        fp.openRequests ? `${pluralize(fp.openRequests, 'open request')} stay open.` : '',
        'This can’t be undone.',
      ]
        .filter(Boolean)
        .join(' '),
      confirmLabel: 'Delete home',
      tone: 'danger',
    })
    if (!ok) return
    const result = deleteHome(home.id)
    if (!result.ok) {
      toast.error('Couldn’t delete the home', result.error)
      return
    }
    if (home.view3d.hasCustomModel) await removeGlb(home.id).catch(() => {})
    setBase(draft) // no unsaved-changes prompt
    toast.success('Home deleted', home.title)
    navigate('/staff/homes')
  }

  const sections: EditorSection[] = [
    { id: 'basics', label: 'Basics' },
    { id: 'photos', label: 'Photos' },
    { id: 'website', label: 'Website' },
    { id: 'ownership', label: 'Ownership' },
    ...(showConstruction ? [{ id: 'construction', label: 'Construction' }] : []),
    { id: 'view3d', label: '3D viewing' },
    ...(home && canEdit ? [{ id: 'danger', label: 'Danger zone', danger: true }] : []),
  ]
  const [active, setActive] = useActiveSection(
    sections.map((s) => s.id),
    () => {
      const header = document.querySelector<HTMLElement>('[data-portal-shell] header')?.getBoundingClientRect().bottom ?? 64
      const chips = chipNavRef.current
      const chipsBottom = chips && chips.getClientRects().length ? chips.getBoundingClientRect().bottom : 0
      return Math.max(header, chipsBottom) + 32
    },
  )
  const select = (id: string) => {
    setActive(id)
    jumpToSection(id)
  }

  const err = (k: keyof Draft) => errors[k] ?? null
  const inputProps = (k: keyof Draft) => ({
    id: `home-${k}`,
    'aria-invalid': !!errors[k],
    'aria-describedby': errors[k] ? `home-${k}-error` : undefined,
  })
  const specHint = (k: Spec) => (!err(k) && !draft[k].trim() ? 'Not published' : undefined)
  const errorCount = Object.values(errors).filter(Boolean).length

  return (
    <>
      <PageHeader
        back={{ to: '/staff/homes', label: 'All homes' }}
        title={<span className="wrap-anywhere">{home ? home.title : 'Add a home'}</span>}
        description={home ? `${home.address}, ${home.city}` : 'Create a website listing or a Home Owner’s home. You can enable 3D viewing right away.'}
        meta={
          home ? (
            <>
              <StatusBadge def={homeStatus[home.status]} />
              <Badge tone={home.published ? 'success' : 'neutral'} icon={<Globe className="size-3" aria-hidden />}>
                {home.published ? 'On the website' : 'Not published'}
              </Badge>
              {home.view3d.enabled && (
                <Badge tone="brand" icon={<Box className="size-3" aria-hidden />}>
                  3D tour on
                </Badge>
              )}
              <span className="text-xs text-ink-500">Updated {formatRelative(home.updatedAt)}</span>
            </>
          ) : undefined
        }
        actions={
          home?.published ? (
            <a href={`/homes/${home.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-ink-800 shadow-sm ring-1 ring-ink-200 ring-inset hover:bg-ink-50">
              <ExternalLink className="size-4" aria-hidden /> View on website<span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : undefined
        }
      />

      {/*
        --editor-top: where content scrolls under the sticky chrome (portal header, plus the section chips from md
        until the side nav takes over at 2xl). Section anchors, the pinned 3D preview and focus scrolling use it.
      */}
      <div
        ref={editorRef}
        className={cn('[--editor-top:calc(var(--portal-top,0px)+4rem)] md:[--editor-top:calc(var(--portal-top,0px)+7.5rem)] 2xl:[--editor-top:calc(var(--portal-top,0px)+4rem)]', optionalTagAA)}
      >
        <div
          ref={chipNavRef}
          data-sticky-chrome
          className="-mx-4 mb-6 border-b border-ink-200/80 bg-ink-50/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 md:sticky md:top-[calc(var(--portal-top,0px)+4rem)] md:z-20 lg:-mx-8 lg:px-8 2xl:hidden"
        >
          <EditorSectionNav variant="chips" sections={sections} active={active} onSelect={select} />
        </div>

        <div className="grid grid-cols-1 gap-8 2xl:grid-cols-[180px_minmax(0,1fr)]">
          <div className="hidden 2xl:block">
            <EditorSectionNav variant="side" sections={sections} active={active} onSelect={select} className="sticky top-[calc(var(--editor-top)+1.5rem)]" />
          </div>

          <div className="min-w-0 space-y-6 [&_:focus]:scroll-mt-[calc(var(--editor-top)+1rem)]">
            {!canEdit && (
              <Alert tone="info" title="You can manage 3D viewing for this home">
                Other details are read-only — changing them needs the “Edit homes” permission, which a Super Admin can grant under Roles &amp; permissions.
              </Alert>
            )}

            <fieldset disabled={!canEdit} className="min-w-0 space-y-6">
              <legend className="sr-only">Home details</legend>
              {/* Basics */}
              <Card id="basics" tabIndex={-1} data-focus-target className={editorSectionClass}>
                <CardHeader title="Basics" description="What buyers and Home Owners see first." icon={<HomeIcon className="size-[18px]" aria-hidden />} />
                <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <Field
                    label="Floor plan"
                    required
                    error={err('modelId')}
                    htmlFor="home-modelId"
                    className="sm:col-span-2"
                    hint={!home ? 'Choosing a plan fills in beds, baths, size, a photo and the 3D design.' : draft.modelId === NO_PLAN ? 'Townhomes and renovations aren’t on a portfolio plan.' : undefined}
                  >
                    <Select {...inputProps('modelId')} value={draft.modelId} onChange={(e) => onPlanChange(e.target.value)}>
                      {!draft.modelId && <option value="">Choose a plan…</option>}
                      {homeModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {m.style}
                        </option>
                      ))}
                      <option value={NO_PLAN}>Not a portfolio plan (townhome / renovation)</option>
                    </Select>
                  </Field>
                  <Field label="Status" htmlFor="home-status" className="sm:col-span-2" hint={draft.ownerId ? 'Owned homes are off the market, so Available and Coming soon aren’t offered.' : undefined}>
                    <Select id="home-status" value={draft.status} onChange={(e) => set('status', e.target.value as HomeStatus)} aria-describedby={draft.ownerId ? 'home-status-hint' : undefined}>
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {homeStatus[s].label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {planHint && (
                    <Alert
                      tone="info"
                      className="sm:col-span-2 lg:col-span-4"
                      title={`Switched to ${getModel(planHint)?.name ?? 'a new plan'}`}
                      action={
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            applyPlan(planHint)
                            setPlanHint(null)
                          }}
                        >
                          Load plan defaults
                        </Button>
                      }
                    >
                      Load its beds, baths, size and 3D design? Your photos and price stay as they are.
                    </Alert>
                  )}
                  <Field label="Title" required error={err('title')} htmlFor="home-title" className="sm:col-span-2 lg:col-span-4">
                    <Input {...inputProps('title')} value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="Lot 36 · The Stockton" />
                  </Field>
                  <Field label="Street address" required error={err('address')} htmlFor="home-address" className="sm:col-span-2">
                    <Input {...inputProps('address')} value={draft.address} onChange={(e) => set('address', e.target.value)} placeholder="Boswell Avenue" autoComplete="off" />
                  </Field>
                  <Field label="City, state & ZIP" required error={err('city')} htmlFor="home-city" className="sm:col-span-2">
                    <Input {...inputProps('city')} value={draft.city} onChange={(e) => set('city', e.target.value)} placeholder="Alexandria, VA 22306" autoComplete="off" />
                  </Field>
                  <Field label="Community" optional htmlFor="home-communityId" className="sm:col-span-2">
                    <Select id="home-communityId" value={draft.communityId} onChange={(e) => set('communityId', e.target.value)}>
                      <option value="">Not in a community</option>
                      {communities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name === c.address ? c.name : `${c.name} — ${c.area}`}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Lot" optional htmlFor="home-lot">
                    <Input id="home-lot" value={draft.lot} onChange={(e) => set('lot', e.target.value)} placeholder="Lot 36" />
                  </Field>
                  <Field label="Delivery" optional htmlFor="home-delivery" hint="For homes not finished yet.">
                    <Input id="home-delivery" value={draft.delivery} onChange={(e) => set('delivery', e.target.value)} placeholder="e.g. Spring 2027" aria-describedby="home-delivery-hint" />
                  </Field>
                  <Field label="Price" optional error={err('price')} htmlFor="home-price" className="sm:col-span-2" hint={!err('price') ? 'Leave blank to show the price note instead, e.g. “Price TBD”.' : undefined}>
                    <Input
                      {...inputProps('price')}
                      inputMode="numeric"
                      value={draft.price}
                      onChange={(e) => set('price', e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="1245000"
                      leftIcon={<span className="text-sm font-medium text-ink-500">$</span>}
                    />
                  </Field>
                  <Field label="Price note" optional htmlFor="home-priceNote" className="sm:col-span-2">
                    <Input id="home-priceNote" value={draft.priceNote} onChange={(e) => set('priceNote', e.target.value)} placeholder="Price TBD" />
                  </Field>
                  {market && marketEstimate && (
                    <Alert tone="info" className="sm:col-span-2 lg:col-span-4" title={`Market analysis estimate: ${formatPrice(marketEstimate.estimate.total)}`}>
                      {formatNumber(market.subject.finishedSqft)} finished sq ft × {formatPrice(marketEstimate.perSqft)} (the average of {marketEstimate.soldCount} sold comparables), plus{' '}
                      {formatPrice(market.subject.garageAdu.value)} for the garage / ADU — from the CMA updated {formatDate(market.analysis.updated)}. Staff only.{' '}
                      <Link to="/staff/market" className="font-semibold underline underline-offset-2">
                        Open the market analysis
                      </Link>
                    </Alert>
                  )}
                  <Field label="Beds" error={err('beds')} htmlFor="home-beds" hint={specHint('beds')}>
                    <Input {...inputProps('beds')} type="number" min={1} max={12} step={1} value={draft.beds} onChange={(e) => set('beds', e.target.value)} placeholder="—" />
                  </Field>
                  <Field label="Baths" error={err('baths')} htmlFor="home-baths" hint={specHint('baths')}>
                    <Input {...inputProps('baths')} type="number" min={1} step={0.5} value={draft.baths} onChange={(e) => set('baths', e.target.value)} placeholder="—" />
                  </Field>
                  <Field label="Square feet" error={err('sqft')} htmlFor="home-sqft" hint={specHint('sqft')}>
                    <Input {...inputProps('sqft')} type="number" min={500} step={10} value={draft.sqft} onChange={(e) => set('sqft', e.target.value)} placeholder="—" />
                  </Field>
                  <Field label="Lot size (acres)" optional error={err('lotSizeAcres')} htmlFor="home-lotSizeAcres">
                    <Input {...inputProps('lotSizeAcres')} type="number" min={0.01} step={0.01} value={draft.lotSizeAcres} onChange={(e) => set('lotSizeAcres', e.target.value)} />
                  </Field>
                  <p className="-mt-2 text-xs text-ink-500 sm:col-span-2 lg:col-span-4">Leave beds, baths or square feet blank when they aren’t published yet — the website leaves them out.</p>
                  <Field label="Description" htmlFor="home-description" className="sm:col-span-2 lg:col-span-4">
                    <Textarea id="home-description" rows={4} value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="What makes this home special — layout, finishes, the lot." />
                  </Field>
                </CardBody>
              </Card>

              {/* Photos */}
              <Card id="photos" tabIndex={-1} data-focus-target className={editorSectionClass}>
                <CardHeader title="Photos" description="Shown in the listing gallery and in the owner’s portal." icon={<Images className="size-[18px]" aria-hidden />} />
                <CardBody>
                  <PhotosEditor images={draft.images} onChange={(imgs) => set('images', imgs)} fallback={model?.image} />
                </CardBody>
              </Card>

              {/* Website */}
              <Card id="website" tabIndex={-1} data-focus-target className={editorSectionClass}>
                <CardHeader title="Website" description="Control where this home appears on the public website." icon={<Globe className="size-[18px]" aria-hidden />} />
                <CardBody className="space-y-5">
                  <Switch
                    label="Published on the website"
                    description={draft.ownerId ? 'Shown on its community page as an example of our work. Owned homes are never listed for sale.' : 'Lists the home under Move In Ready Homes and on its community page.'}
                    checked={draft.published}
                    onChange={(v) => setDraft((d) => ({ ...d, published: v, featured: v ? d.featured : false }))}
                  />
                  <Switch
                    label="Featured on the homepage"
                    description={draft.published ? 'Featured homes are shown first.' : 'Publish the home to feature it.'}
                    checked={draft.featured}
                    onChange={(v) => set('featured', v)}
                    disabled={!draft.published || !canEdit}
                  />
                  {home?.published && (
                    <Link to={`/homes/${home.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-800 hover:underline">
                      <ExternalLink className="size-4" aria-hidden /> View on website<span className="sr-only"> (opens in a new tab)</span>
                    </Link>
                  )}
                </CardBody>
              </Card>

              {/* Ownership */}
              <Card id="ownership" tabIndex={-1} data-focus-target className={editorSectionClass}>
                <CardHeader title="Ownership" description="Home Owners see their homes, construction progress and the 3D tour in their portal." icon={<UserRound className="size-[18px]" aria-hidden />} />
                <CardBody className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-start">
                  <Field label="Home Owner" htmlFor="home-ownerId" hint="They’re notified when you save. A home with an owner is off the market.">
                    <Select id="home-ownerId" value={draft.ownerId} onChange={(e) => onOwnerChange(e.target.value)} aria-describedby="home-ownerId-hint">
                      <option value="">No owner (listing)</option>
                      {homeowners.map((u) => (
                        <option key={u.id} value={u.id} disabled={u.status === 'disabled' && u.id !== draft.ownerId}>
                          {u.name}
                          {u.status === 'invited' ? ' (invited)' : u.status === 'disabled' ? ' (disabled)' : ''}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {owner ? (
                    <div className="flex items-start gap-3 rounded-xl bg-ink-50 p-4">
                      <Avatar name={owner.name} />
                      <div className="min-w-0 text-sm">
                        <p className="font-semibold text-ink-900">{owner.name}</p>
                        {owner.phone && (
                          <a href={`tel:${owner.phone}`} className="mt-1 flex items-center gap-2 text-brand-800 hover:underline">
                            <Phone className="size-3.5 text-ink-400" aria-hidden /> {formatPhone(owner.phone)}
                          </a>
                        )}
                        <a href={`mailto:${owner.email}`} className="mt-1 flex min-w-0 items-center gap-2 text-brand-800 hover:underline">
                          <Mail className="size-3.5 shrink-0 text-ink-400" aria-hidden /> <span className="truncate">{owner.email}</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-500">No Home Owner yet. Assign one when the home is sold or under contract.</p>
                  )}
                </CardBody>
              </Card>

              {/* Construction */}
              {showConstruction && (
                <Card id="construction" tabIndex={-1} data-focus-target className={editorSectionClass}>
                  <CardHeader title="Construction progress" description="Stage updates and photos are shared with the Home Owner right away." icon={<HardHat className="size-[18px]" aria-hidden />} />
                  <CardBody>{home ? <ConstructionSection home={home} /> : <p className="text-sm text-ink-500">Save the home first to post construction updates.</p>}</CardBody>
                </Card>
              )}
            </fieldset>

            {/* 3D */}
            <View3DSection
              home={home}
              title={draft.title}
              published={draft.published}
              owned={!!draft.ownerId}
              enabled={draft.view3dEnabled}
              onEnabledChange={(v) => set('view3dEnabled', v)}
              config={draft.config}
              onConfigChange={(c) => set('config', c)}
              onReset={model ? () => set('config', structuredClone(model.house3d)) : undefined}
              resetLabel={model ? `Reset to ${model.name} default` : undefined}
              globalOn={globalOn}
              canManage={can3d}
            />

            {/* Danger zone */}
            {home && canEdit && (
              <Card id="danger" tabIndex={-1} data-focus-target className={cn(editorSectionClass, 'ring-rose-200')}>
                <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700" aria-hidden>
                      <TriangleAlert className="size-[18px]" />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold text-ink-900">Danger zone</h2>
                      <p className="mt-0.5 text-sm text-ink-500">Deleting removes the home from the website and from its owner’s portal. Records that mention it are kept. This can’t be undone.</p>
                    </div>
                  </div>
                  <Button variant="danger" onClick={remove} leftIcon={<Trash2 className="size-4" aria-hidden />} className="shrink-0">
                    Delete home
                  </Button>
                </CardBody>
              </Card>
            )}

            <SaveBar dirty={dirty} isNew={!home} saving={saving} onSave={save} onDiscard={discard} errorCount={errorCount} />
          </div>
        </div>
      </div>
    </>
  )
}

function SaveBar({ dirty, isNew, saving, onSave, onDiscard, errorCount }: { dirty: boolean; isNew: boolean; saving: boolean; onSave: () => void; onDiscard: () => void; errorCount: number }) {
  let status: ReactNode
  if (errorCount) status = <span className="font-medium text-rose-700">{errorCount === 1 ? '1 field needs attention' : `${errorCount} fields need attention`}</span>
  else if (isNew) status = <span className="text-ink-600">New home — not saved yet</span>
  else if (dirty)
    status = (
      <span className="inline-flex items-center gap-2 font-medium text-amber-800">
        <span className="size-2 shrink-0 rounded-full bg-amber-500" aria-hidden /> Unsaved changes
      </span>
    )
  else status = <span className="text-ink-500">All changes saved</span>
  return (
    // One compact row (also on phones). data-sticky-actions keeps focused fields and toasts clear of the bar.
    <div
      data-sticky-actions
      className="sticky bottom-3 z-20 flex items-center justify-between gap-3 rounded-2xl bg-white/95 px-4 py-2.5 shadow-pop ring-1 ring-ink-200 backdrop-blur sm:bottom-5 sm:px-5 sm:py-3"
    >
      <p className="min-w-0 text-sm" aria-live="polite">
        {status}
      </p>
      <div className="flex shrink-0 gap-2">
        {!isNew && (
          <Button variant="ghost" onClick={onDiscard} disabled={!dirty || saving} aria-label="Discard changes" className="max-sm:px-2.5">
            <Undo2 className="size-4 sm:hidden" aria-hidden />
            <span className="max-sm:sr-only">Discard</span>
          </Button>
        )}
        <Button onClick={onSave} loading={saving} disabled={!isNew && !dirty}>
          {isNew ? 'Create home' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
