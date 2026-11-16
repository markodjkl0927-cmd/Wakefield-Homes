import { cn } from '@/lib/cn'

/**
 * "Louis V. Genuario, Jr." -> "LG", "Sarah S." -> "SS": first and last name initials,
 * skipping suffixes and middle initials.
 */
export function monogramInitials(name: string): string {
  const parts = name
    .replace(/,?\s+(Jr|Sr|II|III|IV)\.?$/i, '')
    .split(/\s+/)
    .filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return `${first}${last}`.toUpperCase()
}

/** Serif initials in a soft brand circle — used instead of individual portraits. */
export function Monogram({ name, size = 'md', className }: { name: string; size?: 'md' | 'lg'; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-50 font-display font-semibold text-brand-900 ring-1 ring-brand-100',
        size === 'lg' ? 'size-16 text-xl' : 'size-11 text-base',
        className,
      )}
    >
      {monogramInitials(name)}
    </span>
  )
}
