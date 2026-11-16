import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

const control =
  'block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-ink-900 shadow-sm ring-1 ring-ink-200 ring-inset placeholder:text-ink-500 transition-shadow focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500 aria-[invalid=true]:ring-rose-400'

export interface FieldProps {
  label: ReactNode
  /** id of the control; generated when omitted and passed to children via render prop. */
  htmlFor?: string
  hint?: ReactNode
  error?: string | null
  required?: boolean
  optional?: boolean
  className?: string
  children: ReactNode | ((id: string) => ReactNode)
}

/** Label + control + hint/error, with correct aria wiring when a render function is used. */
export function Field({ label, htmlFor, hint, error, required, optional, className, children }: FieldProps) {
  const auto = useId()
  const id = htmlFor ?? auto
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-medium text-ink-800">
        <span>
          {label}
          {required && <span className="ml-0.5 text-rose-600" aria-hidden> *</span>}
        </span>
        {optional && <span className="text-xs font-normal text-ink-500">Optional</span>}
      </label>
      {typeof children === 'function' ? children(id) : children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-rose-600" role="alert">
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

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { leftIcon?: ReactNode }>(function Input(
  { className, leftIcon, ...rest },
  ref,
) {
  if (leftIcon) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-500">{leftIcon}</span>
        <input ref={ref} className={cn(control, 'pl-9', className)} {...rest} />
      </div>
    )
  }
  return <input ref={ref} className={cn(control, className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(control, 'resize-y leading-6', className)} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, 'appearance-none pr-9', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-500" aria-hidden />
    </div>
  )
})

export function Checkbox({ label, description, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input id={rest.id ?? id} type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-ink-300 accent-brand-800" {...rest} />
      <label htmlFor={rest.id ?? id} className="text-sm">
        <span className="font-medium text-ink-800">{label}</span>
        {description && <span className="block text-ink-500">{description}</span>}
      </label>
    </div>
  )
}

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
  id?: string
}

/** Accessible on/off toggle (role="switch"). */
export function Switch({ checked, onChange, label, description, disabled, className, id }: SwitchProps) {
  const auto = useId()
  const sid = id ?? auto
  const toggle = (
    <button
      id={sid}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50',
        checked ? 'bg-brand-800' : 'bg-ink-300',
      )}
    >
      <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5.5' : 'translate-x-0.5')} />
    </button>
  )
  if (!label) return toggle
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <label htmlFor={sid} className="min-w-0 text-sm">
        <span className="font-medium text-ink-800">{label}</span>
        {description && <span className="mt-0.5 block text-ink-500">{description}</span>}
      </label>
      {toggle}
    </div>
  )
}

export interface ChoiceOption<T extends string> {
  value: T
  label: ReactNode
  description?: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

/** Card-style radio group (great for picking a category or appointment type). */
export function ChoiceCards<T extends string>({
  name,
  value,
  onChange,
  options,
  columns = 2,
  className,
}: {
  name: string
  value: T | null
  onChange: (v: T) => void
  options: ChoiceOption<T>[]
  columns?: 1 | 2 | 3 | 4
  className?: string
}) {
  const cols = { 1: 'grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[columns]
  return (
    <div role="radiogroup" className={cn('grid gap-3', cols, className)}>
      {options.map((o) => {
        const selected = o.value === value
        return (
          <label
            key={o.value}
            className={cn(
              // Focus adds an outer ring (like every other control) on top of the selected state, never replacing it.
              'relative flex cursor-pointer items-start gap-3 rounded-xl bg-white p-4 ring-1 transition-all ring-inset has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600',
              selected ? 'ring-2 ring-brand-700 bg-brand-50/60' : 'ring-ink-200 hover:ring-ink-300 hover:bg-ink-25',
              o.disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={selected}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.icon && (
              <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', selected ? 'bg-brand-800 text-white' : 'bg-ink-100 text-ink-600')}>
                {o.icon}
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink-900">{o.label}</span>
              {o.description && <span className="mt-0.5 block text-sm text-ink-500">{o.description}</span>}
            </span>
          </label>
        )
      })}
    </div>
  )
}
