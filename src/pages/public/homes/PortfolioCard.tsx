import { Link } from 'react-router'
import { CalendarClock, Camera, MapPin } from 'lucide-react'
import type { Tone } from '@/data/labels'
import { portfolioStatusLabels, type PortfolioHome, type PortfolioStatus } from '@/data/portfolio'
import { cn } from '@/lib/cn'
import { pluralize } from '@/lib/format'
import { Badge, SmartImage } from '@/components/ui'

export const portfolioTone: Record<PortfolioStatus, Tone> = {
  'under-construction': 'brand',
  'coming-soon': 'info',
  completed: 'success',
  sold: 'neutral',
}

/** "Hybla Valley Farms · Lot 36" — or the city for single-home projects named by their address. */
export function portfolioPlace(home: PortfolioHome): string {
  const community = home.community && home.community !== home.address ? home.community : undefined
  return [community ?? home.city.replace(/\s+\d{5}$/, ''), home.lot].filter(Boolean).join(' · ')
}

/** Card for one home on View My Home: cover photo, address, plan, status and photo count. Links to its gallery. */
export function PortfolioCard({ home, className, headingLevel = 'h3' }: { home: PortfolioHome; className?: string; headingLevel?: 'h2' | 'h3' }) {
  const Heading = headingLevel
  const count = home.photos.length
  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500',
        className,
      )}
    >
      <div className="relative">
        <SmartImage src={home.cover} alt="" className="aspect-[4/3] w-full" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge tone={portfolioTone[home.status]} dot className="bg-white/95 shadow-sm">
            {portfolioStatusLabels[home.status]}
          </Badge>
          {home.buildOnYourLot && (
            <Badge tone="violet" className="bg-white/95 shadow-sm">
              Build On Your Lot
            </Badge>
          )}
        </div>
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-ink-950/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Camera className="size-3.5" aria-hidden />
          {count > 0 ? pluralize(count, 'photo') : 'Photos coming soon'}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium tracking-wide text-ink-600 uppercase">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{portfolioPlace(home)}</span>
        </p>
        <Heading className="mt-2 text-lg font-semibold text-ink-900">
          <Link to={`/view-my-home/${home.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {home.address}
          </Link>
        </Heading>
        {home.planLabel && <p className="mt-1 text-sm text-ink-600">{home.planLabel}</p>}
        {home.statusNote && (
          <p className="mt-auto flex items-center gap-1.5 pt-4 text-sm text-ink-700">
            <CalendarClock className="size-4 shrink-0 text-ink-400" aria-hidden />
            {home.statusNote}
          </p>
        )}
      </div>
    </article>
  )
}
