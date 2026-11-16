import { useEffect, useId, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { cn } from '@/lib/cn'
import { smoothBehavior } from './motion'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  count?: number
  icon?: ReactNode
}

/**
 * Edge fades for a horizontal scroller: toggles data-fade-start / data-fade-end (styled by the
 * .scroll-fade-x class in index.css) so a cut-off row visibly continues instead of ending mid-word.
 */
export function useScrollFade(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      el.toggleAttribute('data-fade-start', max > 1 && el.scrollLeft > 1)
      el.toggleAttribute('data-fade-end', max > 1 && el.scrollLeft < max - 1)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    for (const child of el.children) ro.observe(child)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [ref])
}

/** Scrolls `item` into view inside its horizontal scroller only — never the page. */
function revealInRow(row: HTMLElement | null, item: HTMLElement | null | undefined, smooth: boolean) {
  if (!row || !item || row.scrollWidth <= row.clientWidth) return
  const pad = 40
  const left = item.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft
  const right = left + item.offsetWidth
  let target = row.scrollLeft
  if (left - pad < row.scrollLeft) target = left - pad
  else if (right + pad > row.scrollLeft + row.clientWidth) target = right + pad - row.clientWidth
  if (target === row.scrollLeft) return
  row.scrollTo({ left: Math.max(0, target), behavior: smooth ? smoothBehavior() : 'auto' })
}

/**
 * Index of the item an arrow / Home / End key moves to, or null for other keys.
 * Left/Up go back, Right/Down go forward, wrapping around.
 */
function keyTarget(key: string, index: number, length: number): number | null {
  if (key === 'Home') return 0
  if (key === 'End') return length - 1
  if (key === 'ArrowRight' || key === 'ArrowDown') return (index + 1) % length
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (index - 1 + length) % length
  return null
}

/**
 * Underlined tabs (role=tablist) with arrow-key, Home and End navigation. Render the active panel
 * yourself. On narrow screens the row scrolls sideways with edge fades, and the active tab is kept
 * in view.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  items: TabItem<T>[]
  value: T
  onChange: (v: T) => void
  className?: string
  ariaLabel?: string
}) {
  const id = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const mounted = useRef(false)
  useScrollFade(listRef)
  const activeIndex = items.findIndex((i) => i.value === value)
  useLayoutEffect(() => {
    revealInRow(listRef.current, refs.current[activeIndex], mounted.current)
    mounted.current = true
  }, [activeIndex])

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const next = keyTarget(e.key, index, items.length)
    if (next === null || e.key === 'ArrowUp' || e.key === 'ArrowDown') return
    e.preventDefault()
    refs.current[next]?.focus()
    onChange(items[next].value)
  }
  return (
    <div ref={listRef} role="tablist" aria-label={ariaLabel} className={cn('scrollbar-thin scroll-fade-x flex gap-1 overflow-x-auto border-b border-ink-200', className)}>
      {items.map((item, i) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            id={`${id}-${item.value}`}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              '-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              active ? 'border-brand-800 text-brand-900' : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-800',
            )}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && (
              <span className={cn('rounded-full px-1.5 py-0.5 text-xs tabular-nums', active ? 'bg-brand-100 text-brand-900' : 'bg-ink-100 text-ink-600')}>{item.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Compact pill switcher for filters and view modes (role=radiogroup).
 * Keyboard: one Tab stop (the selected option); ←/→/↑/↓ move and select, Home/End jump to the ends.
 * When the options don't fit (phones), they wrap onto more rows instead of hiding off-screen.
 * Pass `scroll` to keep a single sideways-scrolling row (with edge fades) instead.
 */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  className,
  size = 'md',
  ariaLabel,
  scroll = false,
}: {
  items: TabItem<T>[]
  value: T
  onChange: (v: T) => void
  className?: string
  size?: 'sm' | 'md'
  ariaLabel?: string
  /** Keep one row that scrolls sideways (with edge fades) instead of wrapping. */
  scroll?: boolean
}) {
  const groupRef = useRef<HTMLDivElement>(null)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const mounted = useRef(false)
  useScrollFade(groupRef)
  const activeIndex = items.findIndex((i) => i.value === value)
  // If the value matches no option, the first option is the group's Tab stop.
  const tabStop = activeIndex >= 0 ? activeIndex : 0
  useLayoutEffect(() => {
    if (scroll) revealInRow(groupRef.current, refs.current[tabStop], mounted.current)
    mounted.current = true
  }, [tabStop, scroll])

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const next = keyTarget(e.key, index, items.length)
    if (next === null) return
    e.preventDefault()
    refs.current[next]?.focus()
    if (items[next].value !== value) onChange(items[next].value)
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex max-w-full gap-1 rounded-xl bg-ink-100 p-1',
        scroll ? 'scrollbar-thin scroll-fade-x overflow-x-auto' : 'flex-wrap',
        className,
      )}
    >
      {items.map((item, i) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={i === tabStop ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-all focus-visible:outline-offset-0',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm max-sm:min-h-10',
              active ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900',
            )}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && <span className={cn('tabular-nums', active ? 'text-brand-800' : 'text-ink-600')}>{item.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
