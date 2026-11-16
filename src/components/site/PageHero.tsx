import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { SmartImage } from '@/components/ui'

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items, tone = 'dark', className }: { items: Crumb[]; tone?: 'dark' | 'light'; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className={cn('flex flex-wrap items-center gap-1.5 text-sm', tone === 'light' ? 'text-white' : 'text-ink-500')}>
        {items.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3.5 opacity-70" aria-hidden />}
            {c.to && i < items.length - 1 ? (
              <Link to={c.to} className={cn('hover:underline', tone === 'light' ? 'hover:text-white' : 'hover:text-brand-800')}>
                {c.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? 'page' : undefined} className={cn(tone === 'light' ? 'text-white' : 'text-ink-800', 'font-medium')}>
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/**
 * Interior page hero. With `image` it is a photo banner: the photo keeps its true colors and a
 * neutral shade (.hero-shade) keeps the white text legible (AA) at every width. Without an image it
 * is a calm brand-tinted header.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  image,
  crumbs,
  actions,
  size = 'md',
  children,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  image?: string
  crumbs?: Crumb[]
  actions?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  children?: ReactNode
}) {
  const pad = { sm: 'py-12 sm:py-14', md: 'py-16 sm:py-20', lg: 'py-24 sm:py-32' }[size]
  if (image) {
    return (
      <section className="relative isolate overflow-hidden bg-ink-900">
        <SmartImage src={image} alt="" priority className="absolute inset-0 -z-10 bg-ink-800" />
        <div className="hero-shade absolute inset-0 -z-10" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-ink-950/30 to-transparent" aria-hidden />
        <div className={cn('container-page [text-shadow:0_1px_2px_rgb(0_0_0/0.3)]', pad)}>
          {crumbs && <Breadcrumbs items={crumbs} tone="light" className="mb-6" />}
          {eyebrow && <p className="text-xs font-semibold tracking-[0.18em] text-white uppercase">{eyebrow}</p>}
          <h1 className="display-heading mt-3 max-w-3xl text-4xl !text-white sm:text-5xl">{title}</h1>
          {description && <p className="mt-5 max-w-2xl text-lg leading-8 text-white">{description}</p>}
          {actions && <div className="mt-8 flex flex-wrap gap-3 [text-shadow:none]">{actions}</div>}
          {children}
        </div>
      </section>
    )
  }
  return (
    <section className="relative isolate overflow-hidden border-b border-ink-100 bg-gradient-to-b from-brand-50 to-white">
      <div className="absolute -top-24 -right-24 -z-10 size-96 rounded-full bg-lavender-100/70 blur-3xl" aria-hidden />
      <div className={cn('container-page', pad)}>
        {crumbs && <Breadcrumbs items={crumbs} className="mb-6" />}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="display-heading mt-3 max-w-3xl text-4xl sm:text-5xl">{title}</h1>
        {description && <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-600">{description}</p>}
        {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
        {children}
      </div>
    </section>
  )
}
