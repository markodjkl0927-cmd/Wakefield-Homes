import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * - primary: royal blue (#0B1D8A), the main action.
 * - periwinkle: the live site's periwinkle button (#96ACD9) with navy text — secondary calls to action
 *   on the public site and accents.
 * - secondary: white with a hairline ring — neutral secondary actions (Cancel, filters, toolbars).
 * - soft / ghost / danger / white / link as named.
 */
export type ButtonVariant = 'primary' | 'periwinkle' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'white' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,color,box-shadow,border-color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 active:translate-y-px select-none'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-900 text-white shadow-sm hover:bg-brand-800',
  periwinkle: 'bg-brand-300 text-brand-950 shadow-sm hover:bg-brand-200',
  secondary: 'bg-white text-ink-800 ring-1 ring-ink-200 ring-inset shadow-sm hover:bg-ink-50 hover:ring-ink-300',
  soft: 'bg-brand-50 text-brand-800 hover:bg-brand-100',
  ghost: 'text-ink-700 hover:bg-ink-100 hover:text-ink-900',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
  white: 'bg-white text-brand-900 shadow-sm hover:bg-brand-50',
  link: 'text-brand-800 underline-offset-4 hover:underline px-0 h-auto',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10',
  'icon-sm': 'h-8 w-8',
}

export function buttonStyles(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(base, variants[variant], variant !== 'link' && sizes[size], className)
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows a spinner and ignores clicks (and form submission) while true. The button keeps focus. */
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

/**
 * Button. While `loading` — or when it becomes `disabled` while it has focus (e.g. "Save changes"
 * after saving) — it stays focusable with aria-disabled and swallows clicks instead of using the
 * native disabled attribute, so keyboard and screen-reader users don't lose their place. It drops
 * out of the tab order as usual once focus moves on.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leftIcon, rightIcon, className, children, type = 'button', disabled, onClick, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false)
  const softDisabled = !!loading || (!!disabled && focused)
  return (
    <button
      ref={ref}
      type={type}
      disabled={!!disabled && !softDisabled}
      aria-disabled={softDisabled || undefined}
      aria-busy={loading || undefined}
      className={buttonStyles(variant, size, className)}
      onClick={(e) => {
        if (softDisabled) {
          // Also cancels submission, including implicit submission with Enter in a field.
          e.preventDefault()
          return
        }
        onClick?.(e)
      }}
      onFocus={(e) => {
        setFocused(true)
        onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocused(false)
        onBlur?.(e)
      }}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

/** A react-router Link styled as a button. */
export function ButtonLink({ variant = 'primary', size = 'md', leftIcon, rightIcon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonStyles(variant, size, typeof className === 'string' ? className : undefined)} {...rest}>
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  )
}
