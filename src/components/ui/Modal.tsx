import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

const TABBABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])'

function isVisible(el: HTMLElement) {
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
}

/** Whether Tab can reach this element itself (ignores radio-group rules). */
export function isTabbable(el: HTMLElement): boolean {
  return el.matches(TABBABLE) && el.tabIndex >= 0 && !el.closest('[inert]') && isVisible(el)
}

/** Elements Tab can reach inside `root`, in order (radio groups count once, like the browser does). */
export function tabbableElements(root: HTMLElement): HTMLElement[] {
  const all = [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter((el) => el.tabIndex >= 0 && !el.closest('[inert]') && isVisible(el))
  return all.filter((el) => {
    if (!(el instanceof HTMLInputElement) || el.type !== 'radio' || !el.name) return true
    const group = all.filter((o): o is HTMLInputElement => o instanceof HTMLInputElement && o.type === 'radio' && o.name === el.name && o.form === el.form)
    const checked = group.find((o) => o.checked)
    return checked ? checked === el : group[0] === el
  })
}

/* Open dialogs, innermost last: only the top one reacts to Escape / Tab and owns focus. */
const dialogStack: symbol[] = []
let savedBodyStyle: { overflow: string; paddingRight: string } | null = null

function lockScroll() {
  if (savedBodyStyle) return
  const { body, documentElement } = document
  savedBodyStyle = { overflow: body.style.overflow, paddingRight: body.style.paddingRight }
  const scrollbar = window.innerWidth - documentElement.clientWidth
  body.style.overflow = 'hidden'
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
}

function unlockScroll() {
  if (!savedBodyStyle) return
  document.body.style.overflow = savedBodyStyle.overflow
  document.body.style.paddingRight = savedBodyStyle.paddingRight
  savedBodyStyle = null
}

/**
 * Dialog behavior shared by Modal, Drawer, Lightbox and the portal's mobile navigation:
 * moves focus in (to [data-autofocus], else the first control other than the close button), traps
 * Tab / Shift+Tab, closes on Escape, locks page scroll, and on close returns focus to the control
 * that opened it — or, if that control is gone (a deleted row, a moved card), to the nearest
 * surviving control around where it was, or <main>.
 * The effect depends on `open` only, so parents may pass an inline `onClose`.
 */
export function useModalBehaviour(open: boolean, onClose: () => void, panelRef: RefObject<HTMLElement | null>) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const token = Symbol('dialog')
    dialogStack.push(token)
    const isTop = () => dialogStack[dialogStack.length - 1] === token

    const active = document.activeElement
    const trigger = active instanceof HTMLElement && active !== document.body ? active : null
    // Where focus was, from the inside out — used if the trigger itself disappears while open.
    const surroundings: HTMLElement[] = []
    for (let el = trigger?.parentElement; el && el.tagName !== 'MAIN' && el !== document.body; el = el.parentElement) surroundings.push(el)

    lockScroll()

    const focusFirst = () => {
      const panel = panelRef.current
      if (!panel || panel.contains(document.activeElement)) return
      const target =
        panel.querySelector<HTMLElement>('[data-autofocus]') ??
        tabbableElements(panel).find((el) => !el.hasAttribute('data-modal-close')) ??
        panel
      target.focus({ preventScroll: true })
    }
    const t = window.setTimeout(focusFirst, 20)

    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      const panel = panelRef.current
      if (e.key !== 'Tab' || !panel) return
      const items = tabbableElements(panel)
      if (!items.length) {
        e.preventDefault()
        panel.focus({ preventScroll: true })
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement
      if (e.shiftKey && (current === first || current === panel || !panel.contains(current))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (current === last || !panel.contains(current))) {
        e.preventDefault()
        first.focus()
      }
    }
    // Safety net: if focus still lands behind the dialog (e.g. a click on the page), pull it back in.
    const onFocusIn = (e: FocusEvent) => {
      const panel = panelRef.current
      if (!isTop() || !panel || !(e.target instanceof Node) || panel.contains(e.target)) return
      if (e.target instanceof Element && e.target.closest('[data-toaster]')) return
      ;(tabbableElements(panel)[0] ?? panel).focus({ preventScroll: true })
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('focusin', onFocusIn)

    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('focusin', onFocusIn)
      dialogStack.splice(dialogStack.indexOf(token), 1)
      if (!dialogStack.length) unlockScroll()
      // Leave focus alone if it already moved somewhere meaningful (another dialog, a new page).
      const now = document.activeElement
      const panel = panelRef.current
      if (now && now !== document.body && !panel?.contains(now) && now.isConnected) return
      if (trigger?.isConnected && !trigger.matches(':disabled') && isVisible(trigger)) {
        trigger.focus({ preventScroll: true })
        return
      }
      for (const el of surroundings) {
        if (!el.isConnected) continue
        const next = tabbableElements(el)[0]
        if (next) {
          next.focus({ preventScroll: true })
          return
        }
      }
      document.getElementById('main')?.focus({ preventScroll: true })
    }
    // Depends on `open` only: panelRef is a stable ref object and onClose is read through onCloseRef,
    // so a parent re-rendering while the dialog is open never re-runs the focus logic.
  }, [open])
}

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Hide the default header (for custom layouts such as the 3D viewer). */
  bare?: boolean
  className?: string
  /** Accessible name when there is no visible `title` (e.g. `bare` dialogs). */
  ariaLabel?: string
  /** Id of an element inside the dialog that names it (e.g. a custom heading in a `bare` dialog). */
  ariaLabelledBy?: string
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-[min(1400px,96vw)]' }

export function Modal({ open, onClose, title, description, children, footer, size = 'md', bare, className, ariaLabel, ariaLabelledBy }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useModalBehaviour(open, onClose, panelRef)
  if (!open) return null
  const labelledBy = ariaLabelledBy ?? (title && !bare ? titleId : undefined)
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel}
        aria-describedby={description && !bare ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92vh] w-full animate-scale-in flex-col overflow-hidden rounded-t-2xl bg-white shadow-pop outline-none sm:rounded-2xl',
          sizes[size],
          className,
        )}
      >
        {!bare && (
          <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="text-lg font-semibold text-ink-900">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-ink-500">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              data-modal-close
              onClick={onClose}
              className="-mr-2 rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
              aria-label="Close dialog"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className={cn('min-h-0 flex-1 overflow-y-auto', !bare && 'px-5 py-5 sm:px-6')}>{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 bg-ink-25 px-5 py-3 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  side?: 'right' | 'left'
  width?: 'sm' | 'md' | 'lg' | 'xl'
  /** Accessible name when there is no visible `title` (e.g. a navigation drawer). */
  ariaLabel?: string
  /** Extra classes for the sliding panel (e.g. a dark background). */
  className?: string
}

/** Side sheet for detail panels and mobile navigation. */
export function Drawer({ open, onClose, title, description, children, footer, side = 'right', width = 'md', ariaLabel, className }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useModalBehaviour(open, onClose, panelRef)
  if (!open) return null
  const w = { sm: 'max-w-[18rem]', md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-3xl' }[width]
  const hasTitle = title !== undefined && title !== null
  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/40" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hasTitle ? titleId : undefined}
        aria-label={hasTitle ? undefined : ariaLabel}
        aria-describedby={hasTitle && description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 flex w-full flex-col bg-white shadow-pop outline-none',
          w,
          side === 'right' ? 'right-0 animate-slide-in-right' : 'left-0 animate-slide-in-left',
          className,
        )}
      >
        {hasTitle && (
          <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold text-ink-900">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-ink-500">
                  {description}
                </p>
              )}
            </div>
            <button type="button" data-modal-close onClick={onClose} className="-mr-2 rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800" aria-label="Close panel">
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 bg-ink-25 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
