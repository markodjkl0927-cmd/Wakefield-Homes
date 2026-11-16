import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Section({
  children,
  className,
  tone = 'white',
  id,
  size = 'md',
}: {
  children: ReactNode
  className?: string
  tone?: 'white' | 'tint' | 'dark'
  id?: string
  size?: 'sm' | 'md'
}) {
  const bg = { white: 'bg-white', tint: 'bg-ink-50', dark: 'bg-brand-900 text-white' }[tone]
  return (
    <section id={id} className={cn(bg, size === 'md' ? 'py-16 sm:py-24' : 'py-12 sm:py-16', className)}>
      <div className="container-page">{children}</div>
    </section>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
  tone = 'dark',
  className,
  as: Tag = 'h2',
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  align?: 'left' | 'center'
  tone?: 'dark' | 'light'
  className?: string
  as?: 'h1' | 'h2' | 'h3'
}) {
  return (
    <div className={cn('flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between', align === 'center' && 'items-center text-center sm:flex-col sm:items-center', className)}>
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && <p className={cn('eyebrow', tone === 'light' && '!text-brand-200')}>{eyebrow}</p>}
        <Tag className={cn('display-heading mt-3 text-3xl sm:text-4xl', tone === 'light' && '!text-white')}>{title}</Tag>
        {description && <p className={cn('mt-4 text-lg leading-8', tone === 'light' ? 'text-brand-100' : 'text-ink-600')}>{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
