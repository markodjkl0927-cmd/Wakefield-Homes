import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useConfirmStore, useToastStore } from '@/store/ui'
import { Button } from './Button'
import { Modal } from './Modal'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      {icon && <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">{icon}</div>}
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} aria-hidden />
}

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-sm text-ink-500', className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function ProgressBar({ value, className, tone = 'brand', label }: { value: number; className?: string; tone?: 'brand' | 'success'; label?: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-ink-100', className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn('h-full rounded-full transition-[width] duration-700', tone === 'brand' ? 'bg-gradient-to-r from-brand-700 to-brand-500' : 'bg-emerald-500')} style={{ width: `${v}%` }} />
    </div>
  )
}

export function Alert({ tone = 'info', title, children, className, action }: { tone?: 'info' | 'success' | 'warning' | 'danger'; title?: ReactNode; children?: ReactNode; className?: string; action?: ReactNode }) {
  const styles = {
    info: { box: 'bg-brand-50 ring-brand-200 text-brand-950', icon: <Info className="size-5 text-brand-700" /> },
    success: { box: 'bg-emerald-50 ring-emerald-200 text-emerald-950', icon: <CheckCircle2 className="size-5 text-emerald-600" /> },
    warning: { box: 'bg-amber-50 ring-amber-200 text-amber-950', icon: <AlertTriangle className="size-5 text-amber-600" /> },
    danger: { box: 'bg-rose-50 ring-rose-200 text-rose-950', icon: <XCircle className="size-5 text-rose-600" /> },
  }[tone]
  return (
    <div className={cn('flex items-start gap-3 rounded-xl p-4 ring-1 ring-inset', styles.box, className)} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="mt-0.5 shrink-0" aria-hidden>
        {styles.icon}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-1', 'opacity-90')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** How long a toast stays up (paused while hovered or focused). */
const TOAST_MS = { success: 5000, info: 5000, error: 7000 } as const

/**
 * Height to keep clear at the bottom of the screen under the toaster: sticky / fixed action bars
 * (e.g. an editor's Save bar, a phone action bar). Elements marked [data-sticky-actions] always count;
 * anything else sticky or fixed that sits at the bottom edge under the toasts is found by hit-testing.
 */
function bottomObstruction(region: HTMLElement): number {
  const vh = window.innerHeight
  const box = region.getBoundingClientRect()
  let top = vh
  const consider = (el: Element) => {
    const r = el.getBoundingClientRect()
    if (r.height === 0 || r.height > vh * 0.45 || r.bottom < vh - 48 || r.top >= vh) return
    if (r.right < box.left || r.left > box.right) return
    top = Math.min(top, r.top)
  }
  document.querySelectorAll('[data-sticky-actions]').forEach(consider)
  const xs = [box.right - 24, (box.left + box.right) / 2, box.left + 24]
  const ys = [vh - 8, vh - 36, vh - 72]
  const seen = new Set<Element>()
  for (const x of xs)
    for (const y of ys)
      for (const hit of document.elementsFromPoint(x, y)) {
        if (region.contains(hit)) continue
        for (let el: Element | null = hit; el && el !== document.body; el = el.parentElement) {
          if (seen.has(el)) break
          seen.add(el)
          const { position } = getComputedStyle(el)
          if (position === 'sticky' || position === 'fixed') {
            consider(el)
            break
          }
        }
      }
  return top < vh ? Math.ceil(vh - top) + 8 : 0
}

/**
 * Renders queued toasts. Mounted once in App.
 * - Desktop: bottom-right, lifted above any sticky action bar so it never covers Save / Create.
 * - Phones: top of the screen, newest only, so it doesn't sit on the controls being used.
 * - Auto-dismiss pauses while the pointer is over a toast or focus is inside it.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  const regionRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [lift, setLift] = useState(0)
  const paused = hovered || focused
  const timers = useRef(new Map<string, { remaining: number; startedAt: number; handle: number | null }>())

  // Pausable auto-dismiss.
  useEffect(() => {
    const map = timers.current
    const live = new Set(toasts.map((t) => t.id))
    for (const [id, t] of map) {
      if (live.has(id)) continue
      if (t.handle !== null) window.clearTimeout(t.handle)
      map.delete(id)
    }
    const now = Date.now()
    for (const toast of toasts) {
      let t = map.get(toast.id)
      if (!t) {
        t = { remaining: TOAST_MS[toast.tone], startedAt: now, handle: null }
        map.set(toast.id, t)
      }
      if (paused && t.handle !== null) {
        window.clearTimeout(t.handle)
        t.remaining = Math.max(1500, t.remaining - (now - t.startedAt))
        t.handle = null
      } else if (!paused && t.handle === null) {
        t.startedAt = now
        t.handle = window.setTimeout(() => dismiss(toast.id), t.remaining)
      }
    }
  }, [toasts, paused, dismiss])
  useEffect(() => () => timers.current.forEach((t) => t.handle !== null && window.clearTimeout(t.handle)), [])
  // A toast that disappears while hovered/focused must not leave the queue paused.
  useEffect(() => {
    if (toasts.length) return
    setHovered(false)
    setFocused(false)
  }, [toasts.length])

  // Keep clear of sticky bottom bars while toasts are showing.
  const showing = toasts.length > 0
  useLayoutEffect(() => {
    const region = regionRef.current
    if (!showing || !region) return
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setLift(window.matchMedia('(min-width: 640px)').matches ? bottomObstruction(region) : 0))
    }
    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [showing])

  return (
    <div
      ref={regionRef}
      data-toaster
      aria-live="polite"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
      }}
      style={{ bottom: lift ? `${lift}px` : undefined }}
      className={cn(
        'pointer-events-none fixed z-[200] flex flex-col gap-2 transition-[bottom] duration-200',
        // Phones: top, full width, newest toast only.
        'inset-x-0 top-0 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] max-sm:[&>*:not(:last-child)]:hidden',
        // Larger screens: bottom-right stack.
        'sm:inset-x-auto sm:top-auto sm:right-0 sm:bottom-0 sm:w-full sm:max-w-sm sm:p-6',
      )}
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex animate-fade-up items-start gap-3 rounded-xl bg-ink-900 p-4 text-white shadow-pop ring-1 ring-white/10">
          {t.tone === 'success' ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" aria-hidden />
          ) : t.tone === 'error' ? (
            <XCircle className="mt-0.5 size-5 shrink-0 text-rose-400" aria-hidden />
          ) : (
            <Info className="mt-0.5 size-5 shrink-0 text-brand-300" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold [overflow-wrap:anywhere]">{t.title}</p>
            {t.description && <p className="mt-0.5 text-sm text-ink-300 [overflow-wrap:anywhere]">{t.description}</p>}
          </div>
          <button type="button" onClick={() => dismiss(t.id)} className="-m-1 rounded-md p-1.5 text-ink-300 hover:bg-white/10 hover:text-white" aria-label="Dismiss notification">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}

/** Global confirm dialog driven by confirmDialog(). Mounted once in App. */
export function ConfirmHost() {
  const { open, options, close } = useConfirmStore()
  if (!options) return null
  return (
    <Modal
      open={open}
      onClose={() => close(false)}
      title={options.title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => close(false)}>
            {options.cancelLabel ?? 'Cancel'}
          </Button>
          <Button variant={options.tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)} data-autofocus>
            {options.confirmLabel ?? 'Confirm'}
          </Button>
        </>
      }
    >
      {options.description && <p className="text-sm text-ink-600">{options.description}</p>}
    </Modal>
  )
}
