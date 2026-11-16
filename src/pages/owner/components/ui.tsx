import { forwardRef, useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router'
import { format, parseISO } from 'date-fns'
import { AlertCircle, ArrowRight, Check, Flag } from 'lucide-react'
import type { RequestPriority } from '@/types'
import { cn } from '@/lib/cn'
import { requestPriority } from '@/data/labels'
import { ButtonLink, Card } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'

/** Calendar-style date tile (decorative: always pair it with a text date). */
export function DateBlock({ date, size = 'md', muted, className }: { date: string; size?: 'sm' | 'md'; muted?: boolean; className?: string }) {
  const d = parseISO(date)
  return (
    <div
      aria-hidden
      className={cn(
        'flex shrink-0 flex-col items-center justify-center self-start rounded-xl ring-1 ring-inset',
        muted ? 'bg-ink-50 text-ink-600 ring-ink-200' : 'bg-brand-50 text-brand-900 ring-brand-100',
        size === 'md' ? 'w-16 py-2.5' : 'w-12 py-1.5',
        className,
      )}
    >
      <span className="text-[11px] font-semibold tracking-wider uppercase">{format(d, 'MMM')}</span>
      <span className={cn('leading-none font-semibold tabular-nums', size === 'md' ? 'mt-1 text-2xl' : 'mt-0.5 text-lg')}>{format(d, 'd')}</span>
      {size === 'md' && <span className={cn('mt-1 text-[11px] font-medium', muted ? 'text-ink-500' : 'text-brand-700')}>{format(d, 'EEE')}</span>}
    </div>
  )
}

/** Numbered progress indicator for multi-step dialogs. */
export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase sm:sr-only" aria-live="polite">
        Step {current + 1} of {steps.length} · {steps[current]}
      </p>
      <ol className="mt-2 flex items-center gap-2 sm:mt-0">
        {steps.map((label, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'upcoming'
          const last = i === steps.length - 1
          return (
            <li key={label} className={cn('flex min-w-0 items-center gap-2', !last && 'flex-1')} aria-current={state === 'current' ? 'step' : undefined}>
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  state === 'done' && 'bg-brand-800 text-white',
                  state === 'current' && 'bg-brand-900 text-white ring-4 ring-brand-100',
                  state === 'upcoming' && 'bg-ink-100 text-ink-500',
                )}
              >
                {state === 'done' ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn('hidden truncate text-sm font-medium sm:block', state === 'upcoming' ? 'text-ink-500' : 'text-ink-900')}>
                {label}
                <span className="sr-only">{state === 'done' ? ' (done)' : state === 'current' ? ' (current step)' : ''}</span>
              </span>
              {!last && <span className={cn('h-px min-w-3 flex-1', i < current ? 'bg-brand-300' : 'bg-ink-200')} aria-hidden />}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/**
 * Heading of one step in a multi-step dialog. It is where focus goes when the step changes (see
 * useStepFocus) and when the dialog opens (data-autofocus), so keyboard and screen-reader users always
 * hear which step they're on and continue from the top of it. Programmatic focus shows no ring.
 */
export const StepHeading = forwardRef<HTMLHeadingElement, { id: string; children: ReactNode; className?: string }>(function StepHeading(
  { id, children, className },
  ref,
) {
  return (
    <h3 ref={ref} id={id} tabIndex={-1} data-autofocus data-focus-target className={cn('text-base font-semibold text-ink-900 outline-none', className)}>
      {children}
    </h3>
  )
})

/** Inline message for a step that can't continue yet (e.g. "Choose a day and time"). */
export function StepError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-medium text-rose-700">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {children}
    </p>
  )
}

/** Nearest ancestor that scrolls vertically (the dialog body). */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p)
    if (overflowY === 'auto' || overflowY === 'scroll') return p
  }
  return null
}

/**
 * Moves focus to the new step's heading whenever `step` changes (not on mount — the dialog sets the
 * first focus), and scrolls the dialog body back to the top so the step indicator is in view. Without
 * this, focus falls to <body> when Continue turns into Submit or Back disappears.
 */
export function useStepFocus(step: number, headingRef: RefObject<HTMLElement | null>) {
  const shown = useRef(step)
  useEffect(() => {
    // Comparing with the last step shown (instead of a "first run" flag) keeps StrictMode's double effects quiet.
    if (shown.current === step) return
    shown.current = step
    const heading = headingRef.current
    if (!heading) return
    scrollParent(heading)?.scrollTo({ top: 0 })
    heading.focus({ preventScroll: true })
  }, [step, headingRef])
}

const priorityIcon: Record<RequestPriority, string> = {
  low: 'text-ink-400',
  normal: 'text-sky-600',
  high: 'text-amber-600',
  urgent: 'text-rose-600',
}

/** Quiet inline priority marker for lists. */
export function PriorityTag({ priority, className }: { priority: RequestPriority; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap text-ink-600', className)}>
      <Flag className={cn('size-3.5', priorityIcon[priority])} aria-hidden />
      {requestPriority[priority].label} priority
    </span>
  )
}

/** Shown when a detail page is opened for something that doesn't exist or isn't the owner's. */
export function NotFoundPanel({ title, description, backTo, backLabel }: { title: string; description: string; backTo: string; backLabel: string }) {
  return (
    <>
      <PageHeader title={title} back={{ to: backTo, label: backLabel }} />
      <Card className="px-6 py-14 text-center">
        <p className="mx-auto max-w-md text-ink-600">{description}</p>
        <ButtonLink to={backTo} variant="secondary" className="mt-6">
          {backLabel}
        </ButtonLink>
      </Card>
    </>
  )
}

/** Label / value rows for detail sidebars. */
export function DetailList({ items, className }: { items: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn('divide-y divide-ink-100', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-start justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0">
          <dt className="shrink-0 text-ink-500">{item.label}</dt>
          <dd className="min-w-0 text-right font-medium text-ink-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** h2 row used above groups of cards, with an optional "View all" link. */
export function SectionTitle({ title, to, linkLabel = 'View all', description, id }: { title: string; to?: string; linkLabel?: string; description?: string; id?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 id={id} className="text-base font-semibold text-ink-900">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-ink-600">{description}</p>}
      </div>
      {to && (
        <Link to={to} className="inline-flex shrink-0 items-center gap-1 rounded-md text-sm font-semibold text-brand-800 hover:text-brand-900 hover:underline">
          {linkLabel} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  )
}

/** "View all" link for CardHeader actions. */
export function CardLink({ to, children = 'View all' }: { to: string; children?: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-brand-800 hover:text-brand-900 hover:underline">
      {children} <ArrowRight className="size-4" aria-hidden />
    </Link>
  )
}

/** Signature in a handwriting face (system script fonts, no extra download). */
export const signatureFontStyle = {
  fontFamily: "'Segoe Script', 'Snell Roundhand', 'Bradley Hand', 'Apple Chancery', 'Brush Script MT', cursive",
} as const
