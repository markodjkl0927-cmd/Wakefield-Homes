import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { Loader2 } from 'lucide-react'
import { smoothBehavior } from '@/components/ui/motion'
import { isTabbable, tabbableElements } from '@/components/ui/Modal'

/** Shown while a lazily loaded page chunk downloads. */
export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" data-page-loader>
      <Loader2 className="size-6 animate-spin text-brand-600" aria-hidden />
      <span className="sr-only">Loading page</span>
    </div>
  )
}

/**
 * Scroll to the top on route changes. For #hash links, wait (up to ~1.5 s) for the lazily loaded
 * page to render the target, then scroll to it.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
      return
    }
    const id = decodeURIComponent(hash.slice(1))
    let frame = 0
    let tries = 0
    const tryScroll = () => {
      const el = document.getElementById(id)
      if (el) {
        // Smooth only when the target is already on screen (and motion is welcome); a late jump after a page load is instant.
        el.scrollIntoView({ behavior: tries === 0 ? smoothBehavior() : 'auto', block: 'start' })
        return
      }
      if (tries === 0) window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
      if (++tries < 90) frame = requestAnimationFrame(tryScroll)
    }
    tryScroll()
    return () => cancelAnimationFrame(frame)
  }, [pathname, hash])
  return null
}

/**
 * Moves focus to the new page's heading after a route change (not on first load, not for #hash
 * links), so keyboard and screen-reader users start at the content and hear which page opened —
 * e.g. after signing in, or after picking a link in the header or sidebar. Waits for a lazily loaded
 * page to render; leaves focus alone if the page (or the user) has already moved it into the content.
 */
export function RouteFocus() {
  const { pathname } = useLocation()
  // The path focus was last handled for (null before the first render). Comparing paths instead of
  // using a "first run" flag keeps StrictMode's double-invoked effects from treating load as a change.
  const handledPath = useRef<string | null>(null)
  useEffect(() => {
    const previous = handledPath.current
    handledPath.current = pathname
    if (previous === null || previous === pathname) return
    if (window.location.hash) return
    const focusedAtNavigation = document.activeElement
    let frame = 0
    let tries = 0
    const tick = () => {
      const main = document.getElementById('main')
      const ready = !!main && !main.querySelector('[data-page-loader]')
      const heading = ready ? main.querySelector<HTMLElement>('h1') : null
      // Wait up to ~2 s for the page to render its heading, then settle for <main>.
      if (!heading && ++tries < 120) {
        frame = requestAnimationFrame(tick)
        return
      }
      if (!main) return
      const active = document.activeElement
      const movedIntoContent = active && active !== focusedAtNavigation && active !== main && main.contains(active)
      if (movedIntoContent || document.querySelector('[aria-modal="true"]')) return
      const target = heading ?? main
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
      target.setAttribute('data-focus-target', '')
      target.focus({ preventScroll: true })
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [pathname])
  return null
}

/**
 * Safety net for "focus fell to <body>": when the focused control is removed (a row deleted, a card
 * moved to another column, a form replaced by its success message) or disabled/hidden, focus moves to
 * the first control in the nearest part of the page that still exists — so the next Tab continues from
 * there instead of the top of the document. Page changes and closing dialogs are left to RouteFocus and
 * the dialog's own focus return.
 */
export function FocusRescue() {
  useEffect(() => {
    let last: HTMLElement | null = null
    // From the focused control outwards: each container and the sibling that came after it.
    let trail: { parent: HTMLElement; next: Element | null; prev: Element | null }[] = []
    let frame = 0
    const usable = (el: HTMLElement) => el.isConnected && !el.matches(':disabled') && el.getClientRects().length > 0
    const onFocusIn = (e: FocusEvent) => {
      if (!(e.target instanceof HTMLElement)) return
      last = e.target
      trail = []
      for (let el: HTMLElement = last; el.parentElement && el.parentElement !== document.body; el = el.parentElement) {
        trail.push({ parent: el.parentElement, next: el.nextElementSibling, prev: el.previousElementSibling })
      }
    }
    // Focus left on purpose (e.g. a click on the page background): nothing to rescue later.
    const onFocusOut = (e: FocusEvent) => {
      const target = e.target
      if (e.relatedTarget || !(target instanceof HTMLElement) || target !== last) return
      requestAnimationFrame(() => {
        if (last === target && document.activeElement === document.body && usable(target)) last = null
      })
    }
    /** The control to move to inside a surviving container: the next one in reading order, else the previous one, else the first. */
    const pick = ({ parent, next, prev }: (typeof trail)[number]): HTMLElement | undefined => {
      for (let n = next; n && n.parentElement === parent; n = n.nextElementSibling) {
        const found = n instanceof HTMLElement ? withSelf(n)[0] : undefined
        if (found) return found
      }
      for (let n = prev; n && n.parentElement === parent; n = n.previousElementSibling) {
        const found = n instanceof HTMLElement ? withSelf(n).at(-1) : undefined
        if (found) return found
      }
      return tabbableElements(parent)[0]
    }
    const check = () => {
      frame = 0
      const active = document.activeElement
      if (!last || (active && active !== document.body)) return
      if (usable(last)) return
      for (const step of trail) {
        if (!step.parent.isConnected) continue
        if (step.parent.tagName === 'MAIN' || step.parent.id === 'root') return
        const target = pick(step)
        if (target) {
          target.focus({ preventScroll: true })
          return
        }
      }
    }
    const observer = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(check)
    })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'hidden', 'class'] })
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      observer.disconnect()
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      cancelAnimationFrame(frame)
    }
  }, [])
  return null
}

/** Tabbable elements in el, including el itself. */
function withSelf(el: HTMLElement): HTMLElement[] {
  const inside = tabbableElements(el)
  return isTabbable(el) ? [el, ...inside] : inside
}
