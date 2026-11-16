import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Check, SearchX } from 'lucide-react'
import { cn } from '@/lib/cn'
import { buttonStyles } from '@/components/ui'

export interface SpecItem {
  label: string
  value: ReactNode
  icon?: ReactNode
}

/**
 * `columns="auto"`: balanced rows for however many facts a home has — 5 facts sit in one row on wide screens
 * and 3 + 2 below that, 6 facts in two rows of 3 — so no row ends with a lone tile and no tile gets cramped.
 */
function autoColumns(count: number): string {
  if (count <= 1) return 'grid-cols-1'
  if (count <= 4) return ['grid-cols-2', 'grid-cols-2 sm:grid-cols-3', 'grid-cols-2 sm:grid-cols-4'][count - 2]
  if (count === 5) return 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5'
  if (count === 6) return 'grid-cols-2 sm:grid-cols-3'
  return 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4'
}

/**
 * Key facts as calm tiles (beds, baths, sq ft …). Rendered as a description list.
 * Labels stay on one line, so values line up across a row.
 */
export function SpecTiles({ items, className, columns = 4 }: { items: SpecItem[]; className?: string; columns?: 2 | 3 | 4 | 'auto' }) {
  const cols =
    columns === 'auto'
      ? autoColumns(items.length)
      : {
          2: 'grid-cols-2',
          3: 'grid-cols-2 sm:grid-cols-3',
          4: 'grid-cols-2 sm:grid-cols-4',
        }[columns]
  return (
    <dl className={cn('grid gap-3', cols, className)}>
      {items.map((s) => (
        <div key={s.label} className="flex min-w-0 flex-col rounded-xl bg-ink-50 px-4 py-3 ring-1 ring-ink-200/60 ring-inset">
          <dt className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-ink-500">
            {s.icon && (
              <span className="text-brand-700 [&>svg]:size-3.5" aria-hidden>
                {s.icon}
              </span>
            )}
            {s.label}
          </dt>
          <dd className="mt-1 text-base font-semibold wrap-break-word text-ink-900">{s.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Bulleted highlights with check marks. */
export function CheckList({ items, className, columns = 1 }: { items: string[]; className?: string; columns?: 1 | 2 }) {
  return (
    <ul className={cn('grid gap-x-8 gap-y-3', columns === 2 && 'sm:grid-cols-2', className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-[15px] leading-6 text-ink-700">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-800 ring-1 ring-brand-100" aria-hidden>
            <Check className="size-3.5" strokeWidth={2.5} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  )
}

/** Icon + title + short body, used for value points and pillars. */
export function ValuePoint({ icon, title, children, className, tone = 'light' }: { icon: ReactNode; title: string; children: ReactNode; className?: string; tone?: 'light' | 'dark' }) {
  return (
    <div className={cn('flex flex-col', className)}>
      <span
        className={cn(
          'flex size-11 items-center justify-center rounded-xl ring-1 [&>svg]:size-5',
          tone === 'light' ? 'bg-brand-50 text-brand-800 ring-brand-100' : 'bg-white/10 text-white ring-white/15',
        )}
        aria-hidden
      >
        {icon}
      </span>
      <h3 className={cn('mt-4 text-base font-semibold', tone === 'light' ? 'text-ink-900' : '!text-white')}>{title}</h3>
      <p className={cn('mt-2 text-[15px] leading-7', tone === 'light' ? 'text-ink-600' : 'text-brand-100')}>{children}</p>
    </div>
  )
}

/** Friendly "not found" block for a missing home or plan, with useful ways forward. */
export function NotFoundState({
  title,
  description,
  links,
}: {
  title: string
  description: string
  links: { label: string; to: string; primary?: boolean }[]
}) {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-brand-50 to-white">
      <div className="absolute -top-24 -right-24 -z-10 size-96 rounded-full bg-lavender-100/70 blur-3xl" aria-hidden />
      <div className="container-page flex flex-col items-center py-24 text-center sm:py-32">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-brand-800 shadow-card ring-1 ring-brand-100">
          <SearchX className="size-6" aria-hidden />
        </span>
        <p className="eyebrow mt-6">Error 404</p>
        <h1 className="display-heading mt-3 max-w-2xl text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-ink-600">{description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className={buttonStyles(l.primary ? 'primary' : 'secondary', 'lg')}>
              {l.label}
              {l.primary && <ArrowRight className="size-4" aria-hidden />}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Text link with an arrow, used under section headings ("View all homes →"). */
export function ArrowLink({ to, children, className, tone = 'dark' }: { to: string; children: ReactNode; className?: string; tone?: 'dark' | 'light' }) {
  return (
    <Link
      to={to}
      className={cn(
        'group inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline',
        tone === 'dark' ? 'text-brand-800' : 'text-white',
        className,
      )}
    >
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  )
}
