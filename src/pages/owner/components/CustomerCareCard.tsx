import { Clock, Headset, Mail, MapPin, Phone, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useOffice } from '@/store/hooks'
import { Card } from '@/components/ui'

/**
 * Wakefield office contact details (live from Platform settings, so admin edits show up here).
 * The email row only appears once a Super Admin adds an office email.
 */
export function CustomerCareCard({ className, title = 'Customer Care' }: { className?: string; title?: string }) {
  const office = useOffice()
  const rows: { icon: LucideIcon; label: string; value: string; href?: string }[] = [
    { icon: Phone, label: 'Call the office', value: office.phoneDisplay, href: `tel:${office.phone}` },
    ...(office.email ? [{ icon: Mail, label: 'Email', value: office.email, href: `mailto:${office.email}` }] : []),
    { icon: Clock, label: 'Office hours', value: office.hours },
    { icon: MapPin, label: 'Visit', value: office.fullAddress },
  ]
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="relative isolate overflow-hidden bg-brand-900 px-5 py-5 sm:px-6">
        <div className="absolute -top-16 -right-10 -z-10 size-44 rounded-full bg-brand-500/40 blur-2xl" aria-hidden />
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20">
            <Headset className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="text-sm text-brand-100">Questions about your home, a document or a visit?</p>
          </div>
        </div>
      </div>
      <ul className="divide-y divide-ink-100">
        {rows.map((row) => {
          const body = (
            <>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
                <row.icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-ink-500">{row.label}</span>
                <span className={cn('block text-sm font-semibold wrap-anywhere', row.href ? 'text-brand-800' : 'text-ink-900')}>{row.value}</span>
              </span>
            </>
          )
          return (
            <li key={row.label}>
              {row.href ? (
                <a href={row.href} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-brand-50/50 focus-visible:-outline-offset-2 sm:px-6">
                  {body}
                </a>
              ) : (
                <div className="flex items-center gap-3 px-5 py-3.5 sm:px-6">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
