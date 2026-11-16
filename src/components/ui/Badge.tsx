import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { LabelDef, Tone } from '@/data/labels'

const tones: Record<Tone, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-ink-100 text-ink-700 ring-ink-200', dot: 'bg-ink-400' },
  brand: { badge: 'bg-brand-50 text-brand-800 ring-brand-200', dot: 'bg-brand-600' },
  success: { badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  warning: { badge: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  danger: { badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  info: { badge: 'bg-sky-50 text-sky-800 ring-sky-200', dot: 'bg-sky-500' },
  violet: { badge: 'bg-lavender-100 text-[#3f43a8] ring-lavender-200', dot: 'bg-lavender-500' },
}

export interface BadgeProps {
  tone?: Tone
  dot?: boolean
  size?: 'sm' | 'md'
  className?: string
  children: ReactNode
  icon?: ReactNode
}

export function Badge({ tone = 'neutral', dot, size = 'sm', className, children, icon }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        tones[tone].badge,
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', tones[tone].dot)} aria-hidden />}
      {icon}
      {children}
    </span>
  )
}

/** Badge for a status from src/data/labels (e.g. <StatusBadge def={requestStatus[r.status]} />). */
export function StatusBadge({ def, size, className }: { def: LabelDef; size?: 'sm' | 'md'; className?: string }) {
  return (
    <Badge tone={def.tone} dot size={size} className={className}>
      {def.label}
    </Badge>
  )
}
