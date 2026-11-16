import { Link } from 'react-router'
import { ArrowRight, Bath, BedDouble, CalendarClock, MapPin, Ruler } from 'lucide-react'
import type { Home } from '@/types'
import { cn } from '@/lib/cn'
import { homeStatus } from '@/data/labels'
import { getCommunity } from '@/data/communities'
import { getModel } from '@/data/models'
import { useSettings } from '@/store/hooks'
import { SmartImage, StatusBadge } from '@/components/ui'
import { Spec, ThreeDChip } from '@/components/site/cards'
import { deliveryLabel, hasListedPrice, homePriceLabel, homePriceNote, isUnbuilt, listingPlace, specValue } from './utils'

/**
 * Card for a home listing (Move In Ready, homepage, plan pages, "You might also like"). Links to /homes/:slug.
 * Shows only the specs published for the home, its delivery timing while it is being built, and one price line
 * whose size depends on whether it is a dollar price — so footers line up across a row at every width.
 */
export function HomeListingCard({ home, className }: { home: Home; className?: string }) {
  const model = getModel(home.modelId)
  const community = home.communityId ? getCommunity(home.communityId) : undefined
  const show3d = useSettings().features.view3d && home.view3d.enabled
  const specs = [
    { key: 'beds', icon: <BedDouble />, value: specValue(home, 'beds'), unit: home.beds === 1 ? 'bed' : 'beds' },
    { key: 'baths', icon: <Bath />, value: specValue(home, 'baths'), unit: home.baths === 1 ? 'bath' : 'baths' },
    { key: 'sqft', icon: <Ruler />, value: specValue(home, 'sqft'), unit: 'sq ft' },
  ].filter((s) => s.value && s.value !== 'TBD')
  const delivery = deliveryLabel(home)
  const priced = hasListedPrice(home)
  const note = homePriceNote(home)

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500',
        className,
      )}
    >
      <div className="relative">
        <SmartImage src={home.images[0] ?? model?.image} alt="" className="aspect-[4/3] w-full" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <StatusBadge def={homeStatus[home.status]} className="bg-white/95 shadow-sm" />
        </div>
        {show3d && <ThreeDChip className="absolute top-3 right-3" />}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium tracking-wide text-ink-500 uppercase">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{listingPlace(home, community)}</span>
        </p>
        <h3 className="mt-2 min-w-0 text-lg font-semibold wrap-anywhere text-ink-900">
          <Link to={`/homes/${home.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {home.title}
          </Link>
        </h3>
        {specs.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {specs.map((s) => (
              <Spec key={s.key} icon={s.icon}>
                {s.value} {s.unit}
              </Spec>
            ))}
          </div>
        ) : (
          isUnbuilt(home) && <p className="mt-3 text-sm text-ink-500">Bedrooms, baths and size to be announced</p>
        )}
        {delivery && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-600">
            <CalendarClock className="size-4 shrink-0 text-ink-400" aria-hidden />
            {delivery}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div className="min-w-0">
            <p className={cn('font-semibold text-ink-900', priced ? 'text-xl tabular-nums' : 'text-base leading-6')}>{homePriceLabel(home)}</p>
            {note && <p className="text-xs text-ink-500">{note}</p>}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold whitespace-nowrap text-brand-800 transition-all group-hover:gap-2" aria-hidden>
            View home <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </article>
  )
}
