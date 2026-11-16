import { useMemo, useState } from 'react'
import { Box, Images } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Lightbox, SmartImage, type LightboxImage } from '@/components/ui'

/**
 * Listing photo gallery: one large photo plus supporting tiles (adapts to 1–5+ photos).
 * Every tile opens the full-screen Lightbox; on phones only the main photo shows, with a "view all" button.
 * Tiles draw their keyboard focus ring on a layer above the photo (a white ring inside a navy one), so it
 * shows on light and dark photos alike and never covers the buttons over the mosaic.
 */
export function PhotoMosaic({ images, title, on3d }: { images: string[]; title: string; on3d?: () => void }) {
  const [index, setIndex] = useState<number | null>(null)
  const n = images.length
  const lightboxImages = useMemo<LightboxImage[]>(
    () => images.map((src, i) => ({ src, alt: `${title} — photo ${i + 1} of ${images.length}` })),
    [images, title],
  )
  if (n === 0) return null

  const visible = images.slice(0, 5)
  const extra = n - visible.length

  const grid = {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-3',
    3: 'sm:grid-cols-3 sm:grid-rows-2',
    4: 'sm:grid-cols-4 sm:grid-rows-2',
    5: 'sm:grid-cols-4 sm:grid-rows-2',
  }[Math.min(n, 5) as 1 | 2 | 3 | 4 | 5]

  const tileClass = (i: number) => {
    if (i === 0) return n === 1 ? '' : n === 2 ? 'sm:col-span-2' : 'sm:col-span-2 sm:row-span-2'
    if (n === 4 && i === 3) return 'hidden sm:block sm:col-span-2'
    return 'hidden sm:block'
  }

  return (
    <div className="relative">
      <div className={cn('grid gap-2 overflow-hidden rounded-3xl sm:h-[400px] lg:h-[500px]', grid)}>
        {visible.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => setIndex(i)}
            className={cn('group relative block overflow-hidden bg-ink-100 focus-visible:outline-hidden', tileClass(i))}
            aria-label={`${i === visible.length - 1 && extra > 0 ? `+${extra} more — ` : ''}Open photo ${i + 1} of ${n} in the photo viewer`}
          >
            <SmartImage
              src={src}
              alt={i === 0 ? `${title} — main photo` : ''}
              priority={i === 0}
              className={cn('w-full sm:h-full', i === 0 ? 'aspect-[4/3] sm:aspect-auto' : 'h-full')}
              imgClassName="transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <span className="absolute inset-0 bg-ink-950/0 transition-colors group-hover:bg-ink-950/10" aria-hidden />
            {i === visible.length - 1 && extra > 0 && (
              <span className="absolute inset-0 flex items-center justify-center bg-ink-950/45 text-lg font-semibold text-white" aria-hidden>
                +{extra} more
              </span>
            )}
            {/* Focus ring above the photo: navy outer band + white inner line, visible on any photo. */}
            <span
              className="pointer-events-none absolute inset-0 hidden shadow-[inset_0_0_0_4px_var(--color-brand-800),inset_0_0_0_7px_white] group-focus-visible:block"
              aria-hidden
            />
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex items-end justify-between gap-2 sm:inset-x-4 sm:bottom-4">
        {on3d ? (
          <button
            type="button"
            onClick={on3d}
            className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full bg-brand-900 px-4 text-sm font-semibold text-white shadow-pop transition-colors hover:bg-brand-800"
          >
            <Box className="size-4" aria-hidden /> Explore in 3D
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setIndex(0)}
          className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full bg-white/95 px-4 text-sm font-semibold text-ink-900 shadow-pop ring-1 ring-black/5 transition-colors hover:bg-white"
        >
          <Images className="size-4 text-brand-800" aria-hidden /> View all {n} photos
        </button>
      </div>

      <Lightbox images={lightboxImages} index={index} onClose={() => setIndex(null)} onIndexChange={setIndex} />
    </div>
  )
}
