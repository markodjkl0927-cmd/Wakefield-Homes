import { CalendarCheck, Check, FileSignature, HardHat } from 'lucide-react'
import { cn } from '@/lib/cn'
import { photos } from '@/data/images'
import { constructionStages } from '@/data/labels'
import { SmartImage } from '@/components/ui'

/** Stages shown in the mock, with the "current" one in the middle of the list. */
const PREVIEW_STAGES = constructionStages.slice(2, 7)
const CURRENT = 'mep'

/**
 * Illustrative preview of the Home Owner portal for the public "View My Home" page.
 * It is a picture of the product (sample content), so it is exposed to assistive tech as one image.
 */
export function PortalPreview({ className }: { className?: string }) {
  const currentIndex = PREVIEW_STAGES.findIndex((s) => s.key === CURRENT)
  return (
    <div
      role="img"
      aria-label="Preview of the Home Owner portal: construction progress with photos, an agreement ready to sign and a confirmed appointment."
      className={cn('relative mx-auto w-full max-w-xl select-none', className)}
    >
      <div aria-hidden className="relative rounded-3xl bg-white p-5 shadow-pop ring-1 ring-ink-200/70 sm:p-6">
        <div className="min-w-0 sm:pr-48 lg:pr-40">
          <p className="text-xs font-medium text-ink-500">My home</p>
          <p className="mt-0.5 truncate font-display text-xl font-semibold text-ink-900">The Stockton</p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-200 ring-inset">
            <HardHat className="size-3.5" /> Under construction
          </span>
        </div>

        <div className="mt-5 rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-200/60 ring-inset">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-ink-800">Construction progress</span>
            <span className="font-semibold text-brand-900 tabular-nums">61%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-200/70">
            <div className="h-full w-[61%] rounded-full bg-gradient-to-r from-brand-700 to-brand-500" />
          </div>
          <ol className="mt-4 space-y-2.5">
            {PREVIEW_STAGES.map((s, i) => {
              const done = i < currentIndex
              const current = i === currentIndex
              return (
                <li key={s.key} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full',
                      done && 'bg-brand-800 text-white',
                      current && 'bg-white ring-2 ring-brand-700',
                      !done && !current && 'bg-white ring-1 ring-ink-300',
                    )}
                  >
                    {done && <Check className="size-3" strokeWidth={3} />}
                    {current && <span className="size-2 rounded-full bg-brand-700" />}
                  </span>
                  <span className={cn('flex-1', done ? 'text-ink-600' : current ? 'font-semibold text-ink-900' : 'text-ink-500')}>{s.label}</span>
                  {current && <span className="text-xs font-medium text-brand-800">In progress</span>}
                </li>
              )
            })}
          </ol>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[photos.construction.framingExterior, photos.construction.cornice, photos.construction.interiorStair].map((src) => (
            <SmartImage key={src} src={src} alt="" className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      </div>

      <div
        aria-hidden
        className="absolute -top-6 -right-3 hidden w-64 animate-fade-up items-start gap-3 rounded-2xl bg-white p-4 shadow-pop ring-1 ring-ink-200/70 [animation-delay:200ms] sm:flex lg:-right-8"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          <FileSignature className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink-900">Change order ready to sign</span>
          <span className="mt-0.5 block text-xs text-ink-500">Updated by Wakefield staff</span>
        </span>
      </div>

      <div
        aria-hidden
        className="absolute -bottom-7 -left-3 hidden w-64 animate-fade-up items-start gap-3 rounded-2xl bg-white p-4 shadow-pop ring-1 ring-ink-200/70 [animation-delay:350ms] sm:flex lg:-left-10"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
          <CalendarCheck className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink-900">Design selections confirmed</span>
          <span className="mt-0.5 block text-xs text-ink-500">Wakefield office · 10:00 AM</span>
        </span>
      </div>
    </div>
  )
}
