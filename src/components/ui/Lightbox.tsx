import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useModalBehaviour } from './Modal'

export interface LightboxImage {
  src: string
  alt: string
  caption?: string
}

/**
 * Full-screen photo viewer. Controlled by `index` (null = closed).
 * Behaves like a modal dialog: focus moves to Close, Tab stays inside, Escape closes and focus returns
 * to the photo that opened it. ←/→ (or a swipe on touch screens) change photos; each change is announced.
 */
export function Lightbox({ images, index, onClose, onIndexChange }: { images: LightboxImage[]; index: number | null; onClose: () => void; onIndexChange: (i: number) => void }) {
  const open = index !== null && images.length > 0
  const panelRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  useModalBehaviour(open, onClose, panelRef)
  const go = useCallback(
    (dir: number) => {
      if (index === null || images.length < 2) return
      onIndexChange((index + dir + images.length) % images.length)
    },
    [index, images.length, onIndexChange],
  )
  const [loaded, setLoaded] = useState(false)
  useEffect(() => setLoaded(false), [index])
  if (!open || index === null) return null
  const img = images[Math.min(index, images.length - 1)]
  const label = img.caption ?? img.alt

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(-1)
    }
  }

  return createPortal(
    <div
      ref={panelRef}
      className="fixed inset-0 z-[150] flex animate-fade-in flex-col bg-ink-950/95 outline-none"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="flex items-center justify-between px-4 py-3 text-sm text-white/85">
        <span className="tabular-nums" aria-hidden>
          {index + 1} / {images.length}
        </span>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Photo {index + 1} of {images.length}
          {label ? `: ${label}` : ''}
        </p>
        <button type="button" onClick={onClose} data-autofocus className="rounded-lg p-2 text-white/85 hover:bg-white/10 hover:text-white" aria-label="Close photo viewer">
          <X className="size-6" aria-hidden />
        </button>
      </div>
      <div
        className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-4 sm:px-16"
        onTouchStart={(e) => {
          const t = e.touches[0]
          touchStart.current = t ? { x: t.clientX, y: t.clientY } : null
        }}
        onTouchEnd={(e) => {
          const start = touchStart.current
          const t = e.changedTouches[0]
          touchStart.current = null
          if (!start || !t) return
          const dx = t.clientX - start.x
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(t.clientY - start.y) * 1.5) go(dx < 0 ? 1 : -1)
        }}
      >
        <img
          key={img.src}
          src={img.src}
          alt={img.alt}
          onLoad={() => setLoaded(true)}
          className={cn('max-h-full max-w-full rounded-lg object-contain shadow-pop transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        />
        {!loaded && <div className="absolute size-10 animate-spin rounded-full border-2 border-white/20 border-t-white" aria-hidden />}
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:left-4" aria-label="Previous photo">
              <ChevronLeft className="size-6" aria-hidden />
            </button>
            <button type="button" onClick={() => go(1)} className="absolute right-2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:right-4" aria-label="Next photo">
              <ChevronRight className="size-6" aria-hidden />
            </button>
          </>
        )}
      </div>
      <p className="min-h-12 px-4 py-3 text-center text-sm text-white/85" aria-hidden>
        {label}
      </p>
    </div>,
    document.body,
  )
}
