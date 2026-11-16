import { useEffect, type RefObject } from 'react'
import { smoothBehavior } from '@/components/ui'

/**
 * Keeps the focused control clear of sticky chrome inside a long editor (WCAG 2.4.11 Focus Not Obscured).
 *
 * The page's scroll-margin rules (index.css, plus the editors' own `scroll-mt` classes) tell the browser how
 * much sticky chrome covers each edge, but browsers ignore them in one common case: text fields and
 * textareas reveal their caret rather than the whole field, so with Shift+Tab a field can land under the
 * header or the section links, or under the Save bar. After focus moves (and any scrolling settles), this
 * checks the field against its own scroll margins and, if it's covered, scrolls it into view — which does
 * honor them.
 */
export function useKeepFocusVisible(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    let frame = 0

    const check = (el: HTMLElement) => {
      if (document.activeElement !== el || !el.isConnected) return
      const r = el.getBoundingClientRect()
      if (!r.width && !r.height) return
      const cs = getComputedStyle(el)
      const top = parseFloat(cs.scrollMarginTop) || 0
      const bottom = parseFloat(cs.scrollMarginBottom) || 0
      // Only fix real overlaps with the chrome, not the extra breathing room in the margins.
      const coveredTop = r.top < top - 16
      const coveredBottom = r.bottom > window.innerHeight - bottom + 16 && r.height < window.innerHeight - top - bottom
      if (coveredTop || coveredBottom) el.scrollIntoView({ block: 'nearest', behavior: smoothBehavior() })
    }

    const onFocusIn = (e: FocusEvent) => {
      const el = e.target
      if (!(el instanceof HTMLElement)) return
      // Controls inside the sticky chrome itself never need the page to move.
      if (el.closest('[data-sticky-chrome], [data-sticky-actions], [data-preview-band], [role="dialog"]')) return
      cancelAnimationFrame(frame)
      // Wait until any scrolling the browser started for this focus has settled.
      let last = window.scrollY
      let still = 0
      let frames = 0
      const tick = () => {
        frames++
        still = window.scrollY === last ? still + 1 : 0
        last = window.scrollY
        if (still >= 2 || frames > 45) check(el)
        else frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }

    root.addEventListener('focusin', onFocusIn)
    return () => {
      cancelAnimationFrame(frame)
      root.removeEventListener('focusin', onFocusIn)
    }
  }, [ref])
}
