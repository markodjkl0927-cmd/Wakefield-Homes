import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/**
 * Horizontally scrollable table wrapper. `relative` keeps absolutely positioned content (screen-reader-only
 * labels) inside the scroll box, so a wide table can't make the whole page scroll sideways.
 */
export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="scrollbar-thin relative w-full overflow-x-auto">
      <table className={cn('w-full min-w-[640px] border-collapse text-left text-sm', className)} {...rest} />
    </div>
  )
}

export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-ink-200 bg-ink-25', className)} {...rest} />
}

export function TBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-ink-100', className)} {...rest} />
}

export function TR({ className, interactive, ...rest }: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return <tr className={cn(interactive && 'cursor-pointer transition-colors hover:bg-brand-50/40', className)} {...rest} />
}

export function TH({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn('px-4 py-3 text-xs font-semibold tracking-wide text-ink-500 uppercase first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6', className)} {...rest} />
}

export function TD({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3.5 align-middle text-ink-700 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6', className)} {...rest} />
}
