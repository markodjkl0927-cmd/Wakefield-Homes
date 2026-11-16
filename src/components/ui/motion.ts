/** True when the visitor has asked their device to reduce motion. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * Scroll behavior for scrollIntoView / scrollTo: 'smooth', or 'auto' when reduced motion is preferred.
 * (A literal `behavior: 'smooth'` overrides the CSS reduced-motion fallback, so always go through this.)
 *   el.scrollIntoView({ behavior: smoothBehavior(), block: 'start' })
 */
export function smoothBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth'
}
