import { Link } from 'react-router'
import { cn } from '@/lib/cn'

/**
 * Text wordmark (the client asked for no logo — just "Wakefield Homes").
 * Serif "Wakefield" with letter-spaced "HOMES" on the same baseline, in the brand royal blue.
 * "HOMES" is set large enough to read at every size (11px in the compact sidebar/menu version).
 */
export function Wordmark({
  tone = 'brand',
  size = 'md',
  className,
  to = '/',
  stacked = false,
}: {
  tone?: 'brand' | 'light'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  to?: string | null
  stacked?: boolean
}) {
  // md steps down a little on very narrow phones (< 380px) so the header never overflows.
  const main = { sm: 'text-[1.3rem]', md: 'text-[1.4rem] min-[380px]:text-[1.6rem]', lg: 'text-4xl' }[size]
  const sub = { sm: 'text-[11px] tracking-[0.2em]', md: 'text-[11px] tracking-[0.2em] min-[380px]:text-[12.5px] min-[380px]:tracking-[0.22em]', lg: 'text-[15px] tracking-[0.24em]' }[size]
  const content = (
    <span className={cn('inline-flex items-baseline gap-[0.45em] leading-none whitespace-nowrap', stacked && 'flex-col items-start gap-1.5', className)}>
      <span
        className={cn('font-display font-semibold tracking-tight', main, tone === 'brand' ? 'text-brand-900' : 'text-white')}
        style={{ fontVariationSettings: "'opsz' 72, 'SOFT' 50, 'WONK' 0" }}
      >
        Wakefield
      </span>{' '}
      {/* The space above is not rendered inside the flex row, but keeps the accessible text "Wakefield Homes". */}
      <span className={cn('font-sans font-semibold uppercase', sub, tone === 'brand' ? 'text-brand-700' : 'text-brand-200')}>Homes</span>
    </span>
  )
  if (to === null) return content
  return (
    <Link to={to} className="inline-flex rounded-md focus-visible:outline-offset-4">
      {content}
    </Link>
  )
}
