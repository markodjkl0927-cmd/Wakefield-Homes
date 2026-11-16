import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
/** Gap kept between a popover panel and the edge of the screen. */
const EDGE = 8

/**
 * Click-to-open popover anchored to a trigger (a disclosure, not an ARIA menu).
 * - Opening moves focus to the first control inside; ↑/↓/Home/End move between controls.
 * - Escape, an outside click or tabbing away closes it; Escape returns focus to the trigger
 *   (and doesn't also close a dialog the popover sits in).
 * - The panel is nudged sideways to stay fully on screen (e.g. a right-aligned panel on a phone).
 * `trigger` receives the open state and a toggle function.
 */
export function Popover({
  trigger,
  children,
  align = 'right',
  className,
  panelClassName,
}: {
  trigger: (props: { open: boolean; toggle: () => void; close: () => void }) => ReactNode
  children: (props: { close: () => void }) => ReactNode
  align?: 'left' | 'right'
  className?: string
  panelClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef(false)

  const focusTrigger = () => ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

  useEffect(() => {
    if (!open) {
      if (restoreFocus.current) {
        restoreFocus.current = false
        // Only pull focus back if it was left nowhere (the focused item unmounted with the panel).
        if (!document.activeElement || document.activeElement === document.body) focusTrigger()
      }
      return
    }
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true })
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Captured before dialogs see it, so Escape closes only this popover.
      e.stopPropagation()
      restoreFocus.current = true
      setOpen(false)
      focusTrigger()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  // Keep the panel inside the viewport. Measured from layout boxes (not getBoundingClientRect) so the
  // scale-in animation doesn't skew the numbers.
  useLayoutEffect(() => {
    const panel = panelRef.current
    const wrapper = ref.current
    if (!open || !panel || !wrapper) return
    const place = () => {
      const vw = document.documentElement.clientWidth
      panel.style.maxWidth = `${vw - EDGE * 2}px`
      const left = wrapper.getBoundingClientRect().left + panel.offsetLeft
      const right = left + panel.offsetWidth
      const dx = left < EDGE ? EDGE - left : right > vw - EDGE ? vw - EDGE - right : 0
      panel.style.translate = dx ? `${Math.round(dx)}px 0` : ''
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])

  const onPanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    const items = [...(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((el) => el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT')
    if (!items.length) return
    e.preventDefault()
    const i = items.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[next]?.focus()
  }

  const close = () => {
    restoreFocus.current = true
    setOpen(false)
  }
  return (
    <div
      ref={ref}
      className={cn('relative', className)}
      onBlur={(e) => {
        if (open && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      {trigger({ open, toggle: () => setOpen((o) => !o), close })}
      {open && (
        <div
          ref={panelRef}
          onKeyDown={onPanelKeyDown}
          className={cn(
            'absolute top-full z-50 mt-2 min-w-56 origin-top animate-scale-in rounded-xl bg-white p-1.5 shadow-pop ring-1 ring-ink-200/80',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {children({ close })}
        </div>
      )}
    </div>
  )
}

export function MenuItem({
  children,
  onClick,
  icon,
  tone = 'default',
  className,
}: {
  children: ReactNode
  onClick?: () => void
  icon?: ReactNode
  tone?: 'default' | 'danger'
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600',
        tone === 'danger' ? 'text-rose-700 hover:bg-rose-50' : 'text-ink-700 hover:bg-ink-100 hover:text-ink-900',
        className,
      )}
    >
      {icon && <span className="shrink-0 text-ink-500 [&>svg]:size-4">{icon}</span>}
      {children}
    </button>
  )
}

export function MenuDivider() {
  return <div className="my-1.5 h-px bg-ink-100" role="separator" />
}
