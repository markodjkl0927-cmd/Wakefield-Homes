import { Check } from 'lucide-react'
import type { ConstructionStage } from '@/types'
import { cn } from '@/lib/cn'
import { toIsoDate } from '@/lib/utils'
import { formatDate } from '@/lib/format'

function stageDateText(stage: ConstructionStage, estCompletion?: string): string | null {
  // Closing happens at completion, so an upcoming closing follows the home's estimated completion date.
  if (stage.key === 'closing' && stage.status === 'upcoming' && estCompletion) return `Expected ${formatDate(estCompletion)}`
  if (!stage.date) return stage.status === 'upcoming' ? 'Date to be scheduled' : null
  const when = formatDate(stage.date)
  if (stage.status === 'done') return `Completed · ${when}`
  const today = toIsoDate(new Date())
  if (stage.status === 'current') return stage.date <= today ? `In progress since ${when}` : `Starting ${when}`
  // A planned date that has already passed just means the schedule moved — don't show a stale date.
  return stage.date < today ? 'Up next' : `Expected ${when}`
}

/** Vertical construction timeline: done (check), current (pulsing), upcoming (hollow). */
export function StageTimeline({ stages, estCompletion }: { stages: ConstructionStage[]; estCompletion?: string }) {
  return (
    <ol className="relative">
      {stages.map((stage, i) => {
        const last = i === stages.length - 1
        const next = stages[i + 1]
        const dateText = stageDateText(stage, estCompletion)
        return (
          <li key={stage.key} className={cn('relative flex gap-4', !last && 'pb-7')} aria-current={stage.status === 'current' ? 'step' : undefined}>
            {!last && (
              <span
                className={cn('absolute top-9 bottom-1 left-[17px] w-0.5 rounded-full', stage.status === 'done' && next?.status !== 'upcoming' ? 'bg-emerald-300' : stage.status === 'done' ? 'bg-gradient-to-b from-emerald-300 to-ink-200' : 'bg-ink-200')}
                aria-hidden
              />
            )}
            <span className="relative z-10 flex size-9 shrink-0 items-center justify-center" aria-hidden>
              {stage.status === 'done' ? (
                <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-50">
                  <Check className="size-4" strokeWidth={3} />
                </span>
              ) : stage.status === 'current' ? (
                <span className="relative flex size-9 items-center justify-center rounded-full bg-brand-900 ring-4 ring-brand-100">
                  <span className="absolute inline-flex size-4 animate-ping rounded-full bg-brand-400 opacity-60 motion-reduce:hidden" />
                  <span className="relative size-2.5 rounded-full bg-white" />
                </span>
              ) : (
                <span className="flex size-9 items-center justify-center rounded-full bg-white ring-2 ring-ink-200 ring-inset">
                  <span className="size-2 rounded-full bg-ink-300" />
                </span>
              )}
            </span>
            <div className={cn('min-w-0 flex-1 pt-1.5', stage.status === 'current' && '-mt-1 rounded-xl bg-brand-50/70 px-4 pt-2.5 pb-3 ring-1 ring-brand-100 ring-inset')}>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <p className={cn('font-semibold', stage.status === 'upcoming' ? 'text-ink-600' : 'text-ink-900')}>{stage.label}</p>
                {stage.status === 'current' && <span className="rounded-full bg-brand-900 px-2 py-0.5 text-[11px] font-semibold text-white">Current stage</span>}
                <span className="sr-only">
                  {stage.status === 'done' ? '(completed)' : stage.status === 'current' ? '(in progress)' : '(upcoming)'}
                </span>
              </div>
              {dateText && <p className={cn('mt-0.5 text-sm', stage.status === 'current' ? 'text-brand-900' : 'text-ink-500')}>{dateText}</p>}
              {stage.note && <p className="mt-1.5 text-sm text-ink-600">{stage.note}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
