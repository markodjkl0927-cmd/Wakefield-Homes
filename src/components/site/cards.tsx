import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Bath, BedDouble, Box, CalendarClock, Car, CheckCircle2, MapPin, Quote, Ruler, Star } from 'lucide-react'
import type { Community, Home, HomeModel } from '@/types'
import { cn } from '@/lib/cn'
import { formatNumber, formatPrice, formatSqft } from '@/lib/format'
import { homeStatus } from '@/data/labels'
import { communityStatusLabels, getCommunity } from '@/data/communities'
import { getModel } from '@/data/models'
import { Badge, SmartImage, StatusBadge } from '@/components/ui'
import { useAppStore } from '@/store'

export function Spec({ icon, children, className }: { icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm text-ink-600', className)}>
      <span className="text-ink-400 [&>svg]:size-4" aria-hidden>
        {icon}
      </span>
      {children}
    </span>
  )
}

/** Small "3D" chip shown on photos when the 3D viewer is available. */
export function ThreeDChip({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-brand-900 shadow-sm ring-1 ring-black/5', className)}>
      <Box className="size-3.5" aria-hidden /> 3D tour
    </span>
  )
}

/** "Late summer 2027" → "late summer 2027" (mid-sentence); months stay capitalized. */
export function deliveryPhrase(delivery: string): string {
  return delivery.replace(/^(?:(?:late|early|mid)[ -])?(?:spring|summer|fall|autumn|winter)\b/i, (m) => m.toLowerCase())
}

/** Card for a home listing (Move In Ready, featured homes). Links to /homes/:slug. */
export function HomeCard({ home, className }: { home: Home; className?: string }) {
  const model = getModel(home.modelId)
  const community = home.communityId ? getCommunity(home.communityId) : undefined
  const view3dEnabled = useAppStore((s) => s.settings.features.view3d)
  const hidden = new Set(home.unpublishedSpecs ?? [])
  // Single-home projects are named after their address, which the title already shows: name the area instead.
  const location = community ? (community.name === home.address ? community.area : community.name) : home.city
  const delivery = home.delivery && home.status !== 'completed' && home.status !== 'sold' ? home.delivery : undefined
  const showSpecs = !hidden.has('beds') || !hidden.has('baths') || !hidden.has('sqft') || !!delivery
  return (
    <article className={cn('group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500', className)}>
      <div className="relative">
        <SmartImage src={home.images[0] ?? model?.image} alt={`Photo of ${home.title}`} className="aspect-[4/3] w-full" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <StatusBadge def={homeStatus[home.status]} className="bg-white/95 shadow-sm" />
        </div>
        {view3dEnabled && home.view3d.enabled && <ThreeDChip className="absolute top-3 right-3" />}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-ink-500 uppercase">
          <MapPin className="size-3.5" aria-hidden />
          {location}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-ink-900">
          <Link to={`/homes/${home.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {home.title}
          </Link>
        </h3>
        {showSpecs && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {!hidden.has('beds') && <Spec icon={<BedDouble />}>{home.beds} beds</Spec>}
            {!hidden.has('baths') && <Spec icon={<Bath />}>{home.baths} baths</Spec>}
            {!hidden.has('sqft') && <Spec icon={<Ruler />}>{formatNumber(home.sqft)} sq ft</Spec>}
            {delivery && <Spec icon={<CalendarClock />}>Delivery {deliveryPhrase(delivery)}</Spec>}
          </div>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="text-xl font-semibold text-ink-900">{home.price ? formatPrice(home.price) : home.priceNote ?? 'Call for pricing'}</p>
            {home.price && home.priceNote && <p className="text-xs text-ink-500">{home.priceNote}</p>}
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-800 group-hover:gap-2 transition-all">
            View home <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
      </div>
    </article>
  )
}

/** Card for a floor plan in the Home Gallery. Links to /our-homes/models/:slug. */
export function ModelCard({ model, className, showPrice = true }: { model: HomeModel; className?: string; showPrice?: boolean }) {
  const view3dEnabled = useAppStore((s) => s.settings.features.view3d)
  return (
    <article className={cn('group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500', className)}>
      <div className="relative">
        <SmartImage src={model.image} alt={`${model.name} exterior`} className="aspect-[3/2] w-full" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
        <div className="absolute top-3 left-3 flex gap-2">
          {model.isNew && <Badge tone="brand" className="bg-brand-900 text-white ring-brand-900">New</Badge>}
        </div>
        {view3dEnabled && <ThreeDChip className="absolute top-3 right-3" />}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-medium tracking-wide text-ink-500 uppercase">{model.style}</p>
        <h3 className="mt-1.5 font-display text-xl font-semibold text-ink-900">
          <Link to={`/our-homes/models/${model.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {model.name}
          </Link>
        </h3>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          <Spec icon={<BedDouble />}>{model.beds} beds</Spec>
          <Spec icon={<Bath />}>{model.baths} baths</Spec>
          <Spec icon={<Ruler />}>{formatSqft(model.sqftMin, model.sqftMax)}</Spec>
          <Spec icon={<Car />}>{model.garage}</Spec>
        </div>
        {showPrice && (
          <div className="mt-auto flex items-end justify-between gap-3 pt-5">
            <p className="text-sm text-ink-500">
              {model.basePrice ? (
                <>
                  Build On Your Lot from <span className="block text-lg font-semibold text-ink-900">{formatPrice(model.basePrice)}</span>
                </>
              ) : (
                <span className="text-base font-semibold text-ink-900">Call for pricing</span>
              )}
            </p>
            <ArrowRight className="size-5 text-brand-800 transition-transform group-hover:translate-x-1" aria-hidden />
          </div>
        )}
      </div>
    </article>
  )
}

const communityTone = { 'now-selling': 'success', 'coming-soon': 'info', 'under-construction': 'brand', 'sold-out': 'neutral' } as const

/** Card for a community. Links to /communities/:slug. */
export function CommunityCard({ community, className }: { community: Community; className?: string }) {
  const lots = [community.lots, community.lotSize].filter(Boolean).join(' · ')
  // A bare "Sold" only repeats the status badge.
  const statusNote = community.statusNote && community.statusNote.trim().toLowerCase() !== 'sold' ? community.statusNote : undefined
  return (
    <article className={cn('group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500', className)}>
      <div className="relative">
        <SmartImage src={community.image} alt={`${community.name} community`} className="aspect-[16/10] w-full" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <Badge tone={communityTone[community.status]} dot className="bg-white/95 shadow-sm">
            {communityStatusLabels[community.status]}
          </Badge>
          {community.buildOnYourLot && (
            <Badge tone="brand" className="bg-white/95 shadow-sm">
              Build On Your Lot
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-ink-500 uppercase">
          <MapPin className="size-3.5" aria-hidden /> {community.area}
        </p>
        <h3 className="mt-2 font-display text-xl font-semibold text-ink-900">
          <Link to={`/communities/${community.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {community.name}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-600">{community.summary}</p>
        {statusNote && (
          <p className="mt-3 flex items-start gap-1.5 text-sm font-medium text-ink-700">
            {/sold|completed/i.test(statusNote) ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
            ) : (
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
            )}
            {statusNote}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-sm">
          <span className="text-ink-500">{lots}</span>
          <ArrowRight className="size-5 shrink-0 text-brand-800 transition-transform group-hover:translate-x-1" aria-hidden />
        </div>
      </div>
    </article>
  )
}

export function Stars({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <span className={cn('inline-flex gap-0.5 text-amber-400', className)} aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn('size-4', i < count ? 'fill-current' : 'text-ink-200')} aria-hidden />
      ))}
    </span>
  )
}

/** Testimonial excerpt. Stars only render when a real rating is provided (never invent ratings). */
export function TestimonialCard({ quote, name, context, rating, className }: { quote: string; name: string; context?: string; rating?: number; className?: string }) {
  return (
    <figure className={cn('relative flex h-full flex-col rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-200/70', className)}>
      <Quote className="size-8 text-brand-200" aria-hidden />
      {rating !== undefined && <Stars count={rating} className="mt-4" />}
      <blockquote className="mt-4 flex-1 text-base leading-7 text-ink-700">“{quote}”</blockquote>
      <figcaption className="mt-5 border-t border-ink-100 pt-4">
        <p className="font-semibold text-ink-900">{name}</p>
        {context && <p className="text-sm text-ink-500">{context}</p>}
      </figcaption>
    </figure>
  )
}
