import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface StatCardProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  hint?: ReactNode
  delta?: { value: string; direction: 'up' | 'down'; good?: boolean }
  to?: string
  tone?: 'brand' | 'amber' | 'emerald' | 'rose' | 'lavender'
  className?: string
}

const toneIcon = {
  brand: 'bg-brand-50 text-brand-800 ring-brand-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  lavender: 'bg-lavender-100 text-[#3f43a8] ring-lavender-200',
}

/** KPI tile for dashboards. Pass `to` to make the whole tile a link. */
export function StatCard({ label, value, icon, hint, delta, to, tone = 'brand', className }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        {icon && <span className={cn('flex size-9 items-center justify-center rounded-lg ring-1 [&>svg]:size-[18px]', toneIcon[tone])}>{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink-900 tabular-nums">{value}</p>
      {(hint || delta) && (
        <div className="mt-2 flex items-center gap-2 text-sm text-ink-500">
          {delta && (
            <span className={cn('inline-flex items-center gap-0.5 font-medium', (delta.good ?? delta.direction === 'up') ? 'text-emerald-700' : 'text-rose-700')}>
              {delta.direction === 'up' ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
              {delta.value}
            </span>
          )}
          {hint}
        </div>
      )}
    </>
  )
  const cls = cn('block rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-200/70', to && 'transition-shadow hover:shadow-lift hover:ring-brand-200', className)
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
