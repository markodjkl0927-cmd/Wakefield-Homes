import { Check } from 'lucide-react'
import type { RequestStatus } from '@/types'
import { cn } from '@/lib/cn'
import { requestFlow, requestStatus } from '@/data/labels'

/** Horizontal tracker over the request workflow (submitted → … → closed). */
export function RequestTracker({ status }: { status: RequestStatus }) {
  const index = Math.max(0, requestFlow.indexOf(status))
  const finished = status === 'closed'
  return (
    <div>
      <p className="mb-4 text-sm text-ink-600 sm:hidden">
        Step {index + 1} of {requestFlow.length}: <span className="font-semibold text-ink-900">{requestStatus[status].label}</span>
      </p>
      <ol className="flex items-start" aria-label="Request progress">
        {requestFlow.map((s, i) => {
          const state = i < index || (finished && i === index) ? 'done' : i === index ? 'current' : 'upcoming'
          return (
            <li key={s} className="relative flex flex-1 flex-col items-center text-center" aria-current={state === 'current' ? 'step' : undefined}>
              {i > 0 && (
                <span
                  className={cn('absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2', i <= index ? 'bg-brand-700' : 'bg-ink-200')}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  'relative z-10 flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  state === 'done' && 'bg-brand-800 text-white',
                  state === 'current' && 'bg-white text-brand-900 ring-[3px] ring-brand-800 ring-inset shadow-[0_0_0_4px_var(--color-brand-100)]',
                  state === 'upcoming' && 'bg-white text-ink-500 ring-2 ring-ink-200 ring-inset',
                )}
                aria-hidden
              >
                {state === 'done' ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span
                aria-hidden
                className={cn(
                  'mt-2 hidden px-1 text-xs leading-4 font-medium sm:block',
                  state === 'current' ? 'text-brand-900' : state === 'done' ? 'text-ink-800' : 'text-ink-500',
                )}
              >
                {requestStatus[s].label}
              </span>
              <span className="sr-only">
                {requestStatus[s].label}: {state === 'done' ? 'done' : state === 'current' ? 'current status' : 'not yet'}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
