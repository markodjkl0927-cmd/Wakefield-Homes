import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Label + control + inline message for the public inquiry forms (Contact Us and the community pages).
 * Unlike the shared Field, an error here is not a live region: it is tied to its control with
 * aria-describedby, so it is read when the control has focus, and the form announces one summary
 * on submit — screen-reader users aren't interrupted while they move around the form.
 */
export function FormField({
  id,
  label,
  required,
  optional,
  hint,
  error,
  className,
  children,
}: {
  /** id of the control. The message gets `${id}-error` or `${id}-hint`. */
  id: string
  label: ReactNode
  required?: boolean
  /** Adds an AA-contrast "(optional)" after the label. */
  optional?: boolean
  hint?: ReactNode
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink-800">
        {label}
        {required && (
          <span className="ml-0.5 text-rose-600" aria-hidden>
            {' '}
            *
          </span>
        )}
        {optional && <span className="font-normal text-ink-500"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** aria-describedby for a FormField control: its error (or hint) plus any extra ids. */
export function describedBy(id: string, { error, hint, extra }: { error?: string; hint?: boolean; extra?: string } = {}): string | undefined {
  const ids = [error ? `${id}-error` : hint ? `${id}-hint` : '', extra ?? ''].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
}

/** "2 fields need attention" — the one message announced when a form is submitted with errors. */
export function errorSummary(count: number): string {
  return count === 1 ? '1 field needs attention.' : `${count} fields need attention.`
}
