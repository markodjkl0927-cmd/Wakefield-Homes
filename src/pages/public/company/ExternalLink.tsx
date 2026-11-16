import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Link to another website: opens in a new tab and says so to screen-reader users. */
export function ExternalLink({
  href,
  children,
  className,
  icon = true,
  ...rest
}: { href: string; children: ReactNode; className?: string; icon?: boolean } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'children'>) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cn('inline-flex items-center gap-1', className)} {...rest}>
      {children}
      {icon && <ArrowUpRight className="size-4 shrink-0" aria-hidden />}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

/** "www.nvbia.com/path" -> "nvbia.com" */
export function displayHost(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '')
  } catch {
    return href
  }
}
