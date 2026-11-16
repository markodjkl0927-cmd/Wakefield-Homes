import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Bath, BedDouble, Car, Images, MapPin, Move3d, Ruler, Trees } from 'lucide-react'
import type { Home, HomeModel, HomeStatus, HouseConfig } from '@/types'
import { cn } from '@/lib/cn'
import { formatNumber, formatPrice, formatPriceShort } from '@/lib/format'
import { useHomesForSale, useSettings } from '@/store/hooks'
import { getModel, homeModels, PRICE_NOTE } from '@/data/models'
import { getCommunity } from '@/data/communities'
import { homeStatus } from '@/data/labels'
import { Badge, ButtonLink, SmartImage, StatusBadge, useScrollFade } from '@/components/ui'
import { SectionHeading } from '@/components/site/Section'
import { preloadViewer3D, Viewer3D } from '@/three/Viewer3D'
import { ArrowLink, CheckList, SpecTiles, type SpecItem } from './parts'
import {
  deliveryLabel,
  formatAcres,
  hasListedPrice,
  homePriceLabel,
  homePriceNote,
  listingPlace,
  onIdle,
  POPULAR_PLAN_SLUGS,
  shortTitle,
  specValue,
  tourLabel,
  type SpecKey,
} from './utils'

interface ExplorerItem {
  key: string
  kind: 'home' | 'model'
  /** Full name for the details panel. */
  name: string
  /** Short name on the selector chip. */
  chipName: string
  /** Second line on the selector chip: status and price. */
  meta: string
  /** Line under the name: where the home is, or the plan's style. */
  context: string
  status?: HomeStatus
  isNew?: boolean
  specs: SpecItem[]
  priceLead?: string
  price: string
  /** True for a dollar amount (shown larger). */
  priced: boolean
  /** Small print under the price: price note, delivery timing, "as of" date. */
  notes: string[]
  highlights: string[]
  image?: string
  config: HouseConfig
  customModelId?: string
  detailsTo: string
  detailsLabel: string
  tourTo: string
  tourLabel: string
}

const SPEC_LABELS: Record<SpecKey, { label: string; icon: ReactNode }> = {
  beds: { label: 'Bedrooms', icon: <BedDouble /> },
  baths: { label: 'Bathrooms', icon: <Bath /> },
  sqft: { label: 'Square feet', icon: <Ruler /> },
}

function homeItem(home: Home): ExplorerItem {
  const model = getModel(home.modelId)
  const community = home.communityId ? getCommunity(home.communityId) : undefined
  const place = listingPlace(home, community)
  const acres = formatAcres(home.lotSizeAcres)
  const specs: SpecItem[] = (['beds', 'baths', 'sqft'] as const).flatMap((key) => {
    const value = specValue(home, key)
    return value ? [{ ...SPEC_LABELS[key], value }] : []
  })
  if (acres) specs.push({ label: 'Lot size', value: acres, icon: <Trees /> })
  else if (model) specs.push({ label: 'Garage', value: model.garage, icon: <Car /> })
  const priced = hasListedPrice(home)
  return {
    key: `home:${home.id}`,
    kind: 'home',
    name: home.title,
    chipName: shortTitle(home.title),
    meta: `${homeStatus[home.status].label} · ${homePriceLabel(home)}`,
    context: home.city.startsWith(place) ? home.city : `${place} · ${home.city}`,
    status: home.status,
    specs,
    price: homePriceLabel(home),
    priced,
    notes: [homePriceNote(home), deliveryLabel(home)].filter((n): n is string => !!n),
    highlights: model?.highlights.slice(0, 3) ?? [],
    image: home.images[0] ?? model?.image,
    config: home.view3d.config,
    customModelId: home.view3d.hasCustomModel ? home.id : undefined,
    detailsTo: `/homes/${home.slug}`,
    detailsLabel: 'View home details',
    tourTo: `/contact?home=${encodeURIComponent(home.slug)}`,
    tourLabel: tourLabel(home.status),
  }
}

function modelItem(model: HomeModel): ExplorerItem {
  const priced = model.basePrice != null
  return {
    key: `model:${model.slug}`,
    kind: 'model',
    name: model.name,
    chipName: model.name,
    meta: priced ? `From ${formatPriceShort(model.basePrice)}` : 'Call for pricing',
    context: [model.style, model.levels].filter(Boolean).join(' · '),
    isNew: model.isNew,
    specs: [
      { ...SPEC_LABELS.beds, value: model.beds },
      { ...SPEC_LABELS.baths, value: model.baths },
      { ...SPEC_LABELS.sqft, value: model.sqftMax ? `${formatNumber(model.sqftMin)}–${formatNumber(model.sqftMax)}` : formatNumber(model.sqftMin) },
      { label: 'Garage', value: model.garage, icon: <Car /> },
    ],
    priceLead: priced ? 'Build On Your Lot from' : 'Build On Your Lot',
    price: priced ? formatPrice(model.basePrice) : 'Call for pricing',
    priced,
    notes: priced ? [PRICE_NOTE] : [],
    highlights: model.highlights.slice(0, 3),
    image: model.image,
    config: model.house3d,
    detailsTo: `/our-homes/models/${model.slug}`,
    detailsLabel: 'View plan details',
    tourTo: `/contact?model=${encodeURIComponent(model.slug)}`,
    tourLabel: 'Schedule a consultation',
  }
}

/** One row of selector chips: a swipeable row with edge fades on phones, a tidy grid from lg up. */
function ChipRow({ label, gridClass, children }: { label: string; gridClass: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useScrollFade(ref)
  return (
    <div className="min-w-0">
      <p className="mb-2.5 text-xs font-semibold tracking-[0.14em] text-ink-600 uppercase" aria-hidden>
        {label}
      </p>
      {/* tabIndex -1: the radio group already has one Tab stop (the selected chip); arrow keys scroll the row. */}
      <div
        ref={ref}
        tabIndex={-1}
        className={cn(
          'scroll-fade-x scrollbar-thin -mx-4 -my-1.5 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 py-1.5 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:overflow-visible lg:px-0 lg:[mask-image:none]!',
          gridClass,
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** Height of the stage at lg: tall enough for the details card, short enough to fit under the header at 1280×720. */
const STAGE_MIN_H = 'lg:min-h-[clamp(24rem,calc(100svh-7.5rem),35rem)]'

/**
 * The home page's showpiece: a live 3D viewer with a selector of featured homes for sale and floor plans.
 * The "stage" (viewer + details) is what the hero's "Explore homes in 3D" button lands on, so the whole viewer
 * is in view; the selector sits right under it. The 3D engine starts downloading as soon as the page is idle.
 * When the Super Admin turns 3D off (settings.features.view3d), it falls back to photos.
 */
export function HomeExplorer3D({ id = 'explore-3d' }: { id?: string }) {
  const forSale = useHomesForSale()
  const show3d = useSettings().features.view3d
  const titleId = `${id}-title`

  // Fetch the 3D engine while the visitor reads the hero, so the house is ready when they get here.
  useEffect(() => (show3d ? onIdle(preloadViewer3D) : undefined), [show3d])

  const groups = useMemo(() => {
    const homes = forSale.filter((h) => h.featured && (!show3d || h.view3d.enabled)).map(homeItem)
    const plans = POPULAR_PLAN_SLUGS.map((slug) => getModel(slug))
      .filter((m): m is HomeModel => !!m)
      .map(modelItem)
    return [
      { key: 'homes', label: 'Featured homes', grid: 'lg:grid-cols-3', items: homes },
      { key: 'plans', label: 'Floor plans', grid: 'lg:grid-cols-3 xl:grid-cols-6', items: plans },
    ].filter((g) => g.items.length > 0)
  }, [forSale, show3d])

  const items = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selected = items.find((i) => i.key === selectedKey) ?? items[0]
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  if (!selected) return null

  const onChipKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % items.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    if (next < 0) return
    e.preventDefault()
    const item = items[next]
    setSelectedKey(item.key)
    chipRefs.current[item.key]?.focus()
  }

  const stageMedia = 'aspect-[4/3] w-full rounded-3xl shadow-lift ring-1 ring-ink-200/70 sm:aspect-[16/10] lg:col-start-1 lg:row-start-1 lg:aspect-auto lg:h-auto'

  return (
    <section id={id} aria-labelledby={titleId} className="scroll-mt-20 bg-gradient-to-b from-white via-brand-50/50 to-white pt-16 pb-10 sm:pt-24 sm:pb-14">
      <div className="container-page">
        <SectionHeading
          eyebrow={show3d ? 'Live 3D tours' : 'Explore our homes'}
          title={<span id={titleId}>{show3d ? 'Walk around every home — live in 3D' : 'Find the home that fits your life'}</span>}
          description={
            show3d
              ? 'Choose a featured home or a floor plan, then drag to walk around it and see it by day, at dusk or at night.'
              : 'Choose a featured home or one of our floor plans to see the details.'
          }
          action={<ArrowLink to="/our-homes/gallery">Browse all {homeModels.length} plans</ArrowLink>}
        />

        {/* The stage: where the hero's "Explore homes in 3D" lands (88px = the sticky header + breathing room). */}
        <div
          id={`${id}-stage`}
          role="group"
          aria-labelledby={titleId}
          className="mt-8 grid scroll-mt-22 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-x-8"
        >
          {show3d ? (
            <Viewer3D
              config={selected.config}
              customModelId={selected.customModelId}
              className={cn(stageMedia, STAGE_MIN_H)}
              ariaLabel={`Interactive 3D model of ${selected.name}. Drag to rotate.`}
            />
          ) : (
            <SmartImage key={selected.key} src={selected.image} alt={`Photo of ${selected.name}`} className={cn(stageMedia, STAGE_MIN_H)} />
          )}

          <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-600 lg:col-start-1 lg:row-start-2">
            {show3d ? (
              <>
                <Move3d className="size-4 shrink-0 text-brand-700" aria-hidden /> 3D models are illustrative; colors, options and details vary by home.
              </>
            ) : (
              <>
                <Images className="size-4 shrink-0 text-brand-700" aria-hidden /> {selected.kind === 'home' ? 'Photo of this home.' : 'Photo of a completed home on this plan.'}
              </>
            )}
          </p>

          {/* Selector: one radio group across both rows; arrow keys move the selection. */}
          <div role="radiogroup" aria-label={show3d ? 'Choose a home or plan to view in 3D' : 'Choose a home or plan'} className="mt-7 grid gap-5 lg:col-span-2 lg:row-start-3 lg:mt-8">
            {groups.map((group) => (
              <ChipRow key={group.key} label={group.label} gridClass={group.grid}>
                {group.items.map((item) => {
                  const index = items.indexOf(item)
                  const active = item.key === selected.key
                  return (
                    <button
                      key={item.key}
                      ref={(el) => {
                        chipRefs.current[item.key] = el
                      }}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      tabIndex={active ? 0 : -1}
                      onClick={() => setSelectedKey(item.key)}
                      onKeyDown={(e) => onChipKeyDown(e, index)}
                      className={cn(
                        'group flex min-w-0 shrink-0 snap-start items-center gap-3 rounded-xl py-2 pr-4 pl-2 text-left ring-1 transition-[background-color,box-shadow,color] duration-200 ring-inset',
                        active ? 'bg-brand-900 text-white shadow-lift ring-brand-900' : 'bg-white text-ink-900 shadow-card ring-ink-200 hover:bg-brand-50/60 hover:ring-brand-300',
                      )}
                    >
                      <SmartImage src={item.image} alt="" className="size-11 shrink-0 rounded-lg" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold whitespace-nowrap">{item.chipName}</span>
                        <span className={cn('mt-0.5 block truncate text-xs whitespace-nowrap', active ? 'text-brand-100' : 'text-ink-600')}>{item.meta}</span>
                      </span>
                    </button>
                  )
                })}
              </ChipRow>
            ))}
          </div>

          <p className="sr-only" aria-live="polite">
            Now showing {selected.name}
          </p>
          <article
            key={selected.key}
            className="mt-6 flex min-w-0 animate-fade-in flex-col rounded-3xl bg-white p-6 shadow-card ring-1 ring-ink-200/70 sm:p-7 lg:col-start-2 lg:row-start-1 lg:mt-0 lg:p-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              {selected.status ? <StatusBadge def={homeStatus[selected.status]} /> : <Badge tone="brand">Floor plan</Badge>}
              {selected.isNew && (
                <Badge tone="brand" className="bg-brand-900 text-white ring-brand-900">
                  New plan
                </Badge>
              )}
            </div>
            <h3 className="mt-3 min-w-0 font-display text-2xl font-semibold wrap-anywhere text-ink-900 sm:text-[1.7rem] sm:leading-tight">{selected.name}</h3>
            {selected.context && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-600">
                {selected.kind === 'home' && <MapPin className="size-4 shrink-0 text-ink-400" aria-hidden />}
                {selected.context}
              </p>
            )}

            <SpecTiles items={selected.specs} columns={2} className="mt-5" />

            <div className="mt-5">
              {selected.priceLead && <p className="text-sm text-ink-600">{selected.priceLead}</p>}
              <p className={cn('font-semibold text-ink-900', selected.priced ? 'text-2xl tabular-nums' : 'text-xl')}>{selected.price}</p>
              {selected.notes.length > 0 && <p className="mt-0.5 text-xs leading-5 text-ink-600">{selected.notes.join(' · ')}</p>}
            </div>

            {selected.highlights.length > 0 && <CheckList items={selected.highlights} className="mt-5 gap-y-2 lg:hidden" />}

            <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:mt-auto lg:grid-cols-1 lg:pt-5">
              <ButtonLink to={selected.detailsTo} size="lg" className="w-full">
                {selected.detailsLabel}
              </ButtonLink>
              <ButtonLink to={selected.tourTo} variant="periwinkle" size="lg" className="w-full">
                {selected.tourLabel}
              </ButtonLink>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
