import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { cn } from '@/lib/cn'
import { toIsoDate } from '@/lib/utils'

export interface CalendarProps {
  /** Selected date as yyyy-mm-dd. */
  value: string | null
  onChange: (isoDate: string) => void
  /** Return true to disable a day (e.g. weekends, past days). */
  isDisabled?: (date: Date) => boolean
  /** Small markers under days, e.g. days that already have appointments. */
  markers?: Record<string, number>
  minDate?: Date
  className?: string
}

const WEEKDAYS = [
  ['Su', 'Sunday'],
  ['Mo', 'Monday'],
  ['Tu', 'Tuesday'],
  ['We', 'Wednesday'],
  ['Th', 'Thursday'],
  ['Fr', 'Friday'],
  ['Sa', 'Saturday'],
] as const

const fromIso = (iso: string) => new Date(`${iso}T00:00:00`)

/**
 * Accessible month calendar used for booking appointments and scheduling work.
 * Follows the WAI-ARIA date grid pattern: one tab stop, arrow keys move by day/week,
 * Home/End jump to the start/end of the week and PageUp/PageDown change month.
 * Unavailable days stay focusable (aria-disabled) so keyboard users can move across them.
 */
export function Calendar({ value, onChange, isDisabled, markers, minDate, className }: CalendarProps) {
  const selected = value ? fromIso(value) : null
  const [month, setMonth] = useState(() => startOfMonth(selected ?? minDate ?? new Date()))
  const [focusIso, setFocusIso] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const shouldFocus = useRef(false)

  const weeks = useMemo(() => {
    const days = eachDayOfInterval({ start: startOfWeek(month), end: endOfWeek(endOfMonth(month)) })
    const rows: Date[][] = []
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7))
    return rows
  }, [month])

  const today = startOfDay(new Date())
  const min = minDate ? startOfDay(minDate) : null
  const canGoBack = !min || isBefore(startOfMonth(min), month)
  const dayDisabled = (day: Date) => (min && isBefore(day, min)) || isDisabled?.(day) || false

  // The single tab stop: the day last moved to, else the selected day, else today, else the first available day.
  const tabStopIso = useMemo(() => {
    const inMonth = (d: Date | null) => !!d && isSameMonth(d, month)
    if (focusIso && inMonth(fromIso(focusIso))) return focusIso
    if (inMonth(selected)) return toIsoDate(selected!)
    if (inMonth(today) && !dayDisabled(today)) return toIsoDate(today)
    const firstOpen = weeks.flat().find((d) => isSameMonth(d, month) && !dayDisabled(d))
    return toIsoDate(firstOpen ?? month)
  }, [focusIso, value, month, weeks, minDate, isDisabled])

  useEffect(() => {
    if (!shouldFocus.current) return
    shouldFocus.current = false
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${tabStopIso}"]`)?.focus()
  }, [tabStopIso])

  const moveTo = (next: Date) => {
    let target = next
    if (min && isBefore(target, min)) target = min
    shouldFocus.current = true
    setFocusIso(toIsoDate(target))
    if (!isSameMonth(target, month)) setMonth(startOfMonth(target))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const iso = (e.target as HTMLElement).dataset.iso
    if (!iso) return
    const cur = fromIso(iso)
    const next = {
      ArrowLeft: () => addDays(cur, -1),
      ArrowRight: () => addDays(cur, 1),
      ArrowUp: () => addDays(cur, -7),
      ArrowDown: () => addDays(cur, 7),
      Home: () => startOfWeek(cur),
      End: () => startOfDay(endOfWeek(cur)),
      PageUp: () => addMonths(cur, -1),
      PageDown: () => addMonths(cur, 1),
    }[e.key]
    if (!next) return
    e.preventDefault()
    moveTo(next())
  }

  const changeMonth = (delta: number) => {
    setFocusIso(null)
    setMonth((m) => addMonths(m, delta))
  }

  const monthLabel = format(month, 'MMMM yyyy')

  return (
    <div className={cn('w-full select-none', className)}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900" aria-live="polite">
          {monthLabel}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            disabled={!canGoBack}
            className="inline-flex size-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 hover:text-ink-900"
            aria-label="Next month"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      </div>
      <div ref={gridRef} role="grid" aria-label={monthLabel} onKeyDown={onKeyDown} className="space-y-1">
        <div role="row" className="grid grid-cols-7">
          {WEEKDAYS.map(([short, long]) => (
            <div key={short} role="columnheader" aria-label={long} className="py-1.5 text-center text-xs font-medium text-ink-500">
              {short}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={toIsoDate(week[0])} role="row" className="grid grid-cols-7 gap-1">
            {week.map((day) => {
              const iso = toIsoDate(day)
              const outside = !isSameMonth(day, month)
              const disabled = dayDisabled(day)
              const isSel = selected ? isSameDay(day, selected) : false
              const isToday = isSameDay(day, today)
              const count = markers?.[iso] ?? 0
              const label = [
                format(day, 'EEEE, MMMM d, yyyy'),
                isToday && 'today',
                isSel && 'selected',
                disabled && 'unavailable',
                !disabled && count > 0 && `${count} already booked`,
              ]
                .filter(Boolean)
                .join(', ')
              return (
                <div key={iso} role="gridcell" aria-selected={isSel} className="flex">
                  <button
                    type="button"
                    data-iso={iso}
                    tabIndex={iso === tabStopIso ? 0 : -1}
                    aria-label={label}
                    aria-disabled={disabled || undefined}
                    aria-current={isToday ? 'date' : undefined}
                    onClick={() => {
                      if (disabled) return
                      setFocusIso(iso)
                      onChange(iso)
                    }}
                    className={cn(
                      'relative flex h-10 w-full items-center justify-center rounded-lg text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600',
                      outside && !isSel && 'text-ink-500',
                      !outside && !disabled && !isSel && 'text-ink-800 hover:bg-brand-50',
                      disabled && !isSel && 'cursor-not-allowed text-ink-300 line-through decoration-ink-300',
                      isSel && 'bg-brand-900 font-semibold text-white shadow-sm',
                      isToday && !isSel && !disabled && 'font-semibold text-brand-800 ring-1 ring-brand-200 ring-inset',
                    )}
                  >
                    {format(day, 'd')}
                    {count > 0 && <span className={cn('absolute bottom-1 size-1 rounded-full', isSel ? 'bg-white' : 'bg-brand-500')} aria-hidden />}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
