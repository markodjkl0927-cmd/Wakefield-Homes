import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70', className)} {...rest} />
}

export interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

export function CardHeader({ title, description, action, icon, className }: CardHeaderProps) {
  // A one-line title is centered on the icon and the action; with a description, everything aligns to the top.
  const align = description ? 'items-start' : 'items-center'
  return (
    <div className={cn('flex justify-between gap-4 border-b border-ink-100 px-5 py-4 sm:px-6', align, className)}>
      <div className={cn('flex min-w-0 gap-3', align)}>
        {icon && <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800', description && 'mt-0.5')}>{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-5 sm:px-6', className)} {...rest} />
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-end gap-2 border-t border-ink-100 bg-ink-25 px-5 py-3 sm:px-6 rounded-b-2xl', className)} {...rest} />
}
