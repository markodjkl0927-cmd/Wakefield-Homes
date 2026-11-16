import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { smoothBehavior, useScrollFade } from '@/components/ui'

export interface EditorSection {
  id: string
  label: string
  /** Shown in red (e.g. "Danger zone"). */
  danger?: boolean
}

/**
 * The section the reader is in: the last one whose top has passed `threshold()` (just under the sticky
 * chrome), or the last section once the page is scrolled to the bottom. Same rule as Platform settings.
 */
export function useActiveSection(ids: string[], threshold: () => number) {
  const [active, setActive] = useState(ids[0])
  const key = ids.join('|')
  const thresholdRef = useRef(threshold)
  useEffect(() => {
    thresholdRef.current = threshold
  })
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const limit = thresholdRef.current()
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= limit) current = id
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      setActive(atBottom ? ids[ids.length - 1] : current)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
    // `ids` is compared by value through `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return [active, setActive] as const
}

/** Scrolls to a section and moves keyboard focus there (the section element needs tabIndex={-1}). */
export function jumpToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: smoothBehavior(), block: 'start' })
  el.focus({ preventScroll: true })
}

/**
 * Section links for a long editor, with the current section highlighted (aria-current="location").
 * - variant "side": a vertical list for a left column (wide screens).
 * - variant "chips": a horizontal row of pills that scrolls sideways (narrower screens).
 */
export function EditorSectionNav({
  sections,
  active,
  onSelect,
  variant,
  className,
  label = 'Editor sections',
}: {
  sections: EditorSection[]
  active: string
  onSelect: (id: string) => void
  variant: 'side' | 'chips'
  className?: string
  label?: string
}) {
  const rowRef = useRef<HTMLUListElement>(null)
  useScrollFade(rowRef)
  // Keep the active chip visible in its row (never scrolls the page).
  useEffect(() => {
    if (variant !== 'chips') return
    const row = rowRef.current
    const item = row?.querySelector<HTMLElement>('[aria-current="location"]')
    if (!row || !item || row.scrollWidth <= row.clientWidth) return
    const left = item.offsetLeft - row.offsetLeft
    const target = left < row.scrollLeft + 24 ? left - 24 : left + item.offsetWidth > row.scrollLeft + row.clientWidth - 24 ? left + item.offsetWidth - row.clientWidth + 24 : null
    if (target !== null) row.scrollTo({ left: Math.max(0, target), behavior: smoothBehavior() })
  }, [active, variant])

  return (
    <nav aria-label={label} className={className}>
      <ul ref={rowRef} className={variant === 'side' ? 'space-y-1 border-l border-ink-200' : 'scrollbar-thin scroll-fade-x flex gap-1.5 overflow-x-auto py-0.5'}>
        {sections.map((s) => {
          const current = s.id === active
          return (
            <li key={s.id} className={variant === 'chips' ? 'shrink-0' : undefined}>
              <a
                href={`#${s.id}`}
                aria-current={current ? 'location' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  onSelect(s.id)
                }}
                className={cn(
                  variant === 'side'
                    ? cn(
                        '-ml-px flex min-h-10 items-center border-l-2 py-2 pl-4 text-sm font-medium transition-colors',
                        current ? 'border-brand-800 text-brand-900' : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-900',
                        s.danger && !current && 'text-rose-700 hover:text-rose-800',
                        s.danger && current && 'border-rose-600 text-rose-800',
                      )
                    : cn(
                        'inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium whitespace-nowrap ring-1 transition-colors ring-inset',
                        current ? 'bg-brand-900 text-white ring-brand-900' : 'bg-white text-ink-700 ring-ink-200 hover:bg-ink-50 hover:text-ink-900',
                        s.danger && !current && 'text-rose-700',
                        s.danger && current && 'bg-rose-700 ring-rose-700',
                      ),
                )}
              >
                {s.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
