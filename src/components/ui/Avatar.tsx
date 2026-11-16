import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

const palette = [
  'bg-brand-100 text-brand-900',
  'bg-lavender-100 text-[#3f43a8]',
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-sky-100 text-sky-800',
  'bg-rose-100 text-rose-800',
]

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { xs: 'size-6 text-[10px]', sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg' }[size]
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', s, palette[hash(name) % palette.length], className)} aria-hidden>
      {initials(name)}
    </span>
  )
}
