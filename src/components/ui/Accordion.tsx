import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

/** FAQ-style disclosure list built on native <details> (keyboard and screen-reader friendly). */
export function Accordion({ items, className }: { items: { title: ReactNode; content: ReactNode }[]; className?: string }) {
  return (
    <div className={cn('divide-y divide-ink-200 rounded-2xl bg-white ring-1 ring-ink-200/70', className)}>
      {items.map((item, i) => (
        <details key={i} className="group px-5 sm:px-6 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-base font-semibold text-ink-900">
            {item.title}
            <ChevronDown className="size-5 shrink-0 text-ink-400 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="-mt-1 pb-5 text-sm leading-6 text-ink-600">{item.content}</div>
        </details>
      ))}
    </div>
  )
}
