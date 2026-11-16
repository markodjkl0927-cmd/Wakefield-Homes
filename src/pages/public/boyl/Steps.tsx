import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface StepItem {
  title: string
  body: ReactNode
  /** Small uppercase label above the title, e.g. "Phase 1". */
  label?: string
  icon?: ReactNode
}

/**
 * Numbered stepper: a vertical timeline on small screens that becomes a horizontal track on lg+.
 * Best for 3–4 steps.
 */
export function StepTrack({ steps, className }: { steps: StepItem[]; className?: string }) {
  const cols = steps.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
  return (
    <ol className={cn('grid lg:gap-8', cols, className)}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1
        return (
          <li key={s.title} className="relative flex gap-5 pb-10 last:pb-0 lg:block lg:pb-0">
            {!last && (
              <>
                <span className="absolute top-14 bottom-2 left-6 w-px bg-gradient-to-b from-brand-300 to-brand-100 lg:hidden" aria-hidden />
                <span className="absolute top-6 left-16 -right-4 hidden h-px bg-gradient-to-r from-brand-300 to-brand-100 lg:block" aria-hidden />
              </>
            )}
            <span
              className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-900 font-display text-lg font-semibold text-white shadow-sm"
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="min-w-0 pt-1 lg:mt-6 lg:pt-0">
              {s.label && <p className="eyebrow">{s.label}</p>}
              <h3 className={cn('text-lg font-semibold text-ink-900', s.label && 'mt-1.5')}>
                {!s.label && <span className="sr-only">Step {i + 1}: </span>}
                {s.title}
              </h3>
              <div className="mt-2 text-base leading-7 text-ink-600">{s.body}</div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Numbered step cards in a responsive grid: 3 columns (4–6 steps) or 4 columns (8 steps) on large screens. */
export function StepCards({ steps, className, columns = 3 }: { steps: StepItem[]; className?: string; columns?: 3 | 4 }) {
  return (
    <ol className={cn('grid gap-4 sm:grid-cols-2 lg:gap-6', columns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3', className)}>
      {steps.map((s, i) => (
        <li key={s.title} className="flex flex-col rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-200/70">
          <div className="flex items-center justify-between gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-brand-900 text-sm font-semibold text-white tabular-nums" aria-hidden>
              {String(i + 1).padStart(2, '0')}
            </span>
            {s.icon && (
              <span className="text-brand-300 [&>svg]:size-6" aria-hidden>
                {s.icon}
              </span>
            )}
          </div>
          <h3 className="mt-5 text-lg font-semibold text-ink-900">
            <span className="sr-only">Step {i + 1}: </span>
            {s.title}
          </h3>
          <div className="mt-2 text-sm leading-6 text-ink-600">{s.body}</div>
        </li>
      ))}
    </ol>
  )
}
