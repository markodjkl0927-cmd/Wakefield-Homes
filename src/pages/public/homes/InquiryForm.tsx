import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { CheckCircle2, Send } from 'lucide-react'
import type { LeadInterest } from '@/types'
import { cn } from '@/lib/cn'
import { emailError, phoneError, sleep } from '@/lib/utils'
import { useAppStore } from '@/store'
import { Button, Field, Input, Textarea } from '@/components/ui'

type Values = { firstName: string; lastName: string; email: string; phone: string; message: string }
type Errors = Partial<Record<keyof Values, string>>

/** Same rules as every other form on the site (src/lib/utils): email required, phone optional but checked. */
function validate(v: Values): Errors {
  const e: Errors = {}
  if (!v.firstName.trim()) e.firstName = 'Enter your first name.'
  if (!v.lastName.trim()) e.lastName = 'Enter your last name.'
  const email = emailError(v.email)
  if (email) e.email = email
  const phone = phoneError(v.phone)
  if (phone) e.phone = phone
  if (v.message.trim().length < 5) e.message = 'Add a short message so we know how to help.'
  return e
}

/**
 * "Ask a question" form on listing and plan pages. Creates a lead in the demo store
 * (it appears instantly in the Staff portal under Website leads).
 */
export function InquiryForm({
  subject,
  interest,
  homeId,
  modelSlug,
  defaultMessage,
  compact,
  className,
}: {
  /** What the visitor is asking about, e.g. "Lot 36 · The Stockton". */
  subject: string
  interest: LeadInterest
  /** The listing the question is about: the lead records it, so staff see which home it came from. */
  homeId?: string
  modelSlug?: string
  defaultMessage: string
  /** Tighter layout for sidebars: email and phone side by side, shorter message box. */
  compact?: boolean
  className?: string
}) {
  const createLead = useAppStore((s) => s.createLead)
  const formId = useId()
  const fid = (name: keyof Values) => `${formId}-${name}`
  const empty: Values = { firstName: '', lastName: '', email: '', phone: '', message: defaultMessage }
  const [values, setValues] = useState<Values>(empty)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  // Keyboard focus follows the form: onto the thank-you panel once sent, back to the first field for another question.
  const doneRef = useRef<HTMLDivElement>(null)
  const restart = useRef(false)
  useEffect(() => {
    if (sentTo) doneRef.current?.focus({ preventScroll: true })
    else if (restart.current) {
      restart.current = false
      document.getElementById(`${formId}-firstName`)?.focus()
    }
  }, [sentTo, formId])

  const set = (name: keyof Values) => (e: { target: { value: string } }) => {
    const value = e.target.value
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors((x) => ({ ...x, [name]: undefined }))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    const first = (Object.keys(found) as (keyof Values)[])[0]
    if (first) {
      document.getElementById(fid(first))?.focus()
      return
    }
    setSubmitting(true)
    try {
      await sleep(450)
      // The store normalizes email and phone (+1XXXXXXXXXX) and records the listing as the lead's source.
      createLead({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email,
        phone: values.phone,
        interest,
        modelSlug,
        homeId,
        message: values.message.trim(),
      })
      setSentTo(values.firstName.trim())
    } finally {
      setSubmitting(false)
    }
  }

  if (sentTo) {
    return (
      <div
        ref={doneRef}
        tabIndex={-1}
        data-focus-target
        className={cn('animate-fade-in rounded-2xl bg-emerald-50 p-5 text-center ring-1 ring-emerald-200 ring-inset', className)}
        role="status"
      >
        <CheckCircle2 className="mx-auto size-8 text-emerald-600" aria-hidden />
        <p className="mt-3 text-base font-semibold text-emerald-950">Thanks, {sentTo}!</p>
        <p className="mt-1 text-sm leading-6 text-emerald-900">
          Your question about {subject} is on its way to our sales team. We’ll reply by email or phone.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => {
            restart.current = true
            setValues(empty)
            setSentTo(null)
          }}
        >
          Ask another question
        </Button>
      </div>
    )
  }

  const describedBy = (name: keyof Values) => (errors[name] ? `${fid(name)}-error` : undefined)

  return (
    <form noValidate onSubmit={onSubmit} className={cn(compact ? 'space-y-3' : 'space-y-4', className)} aria-label={`Ask a question about ${subject}`}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" htmlFor={fid('firstName')} error={errors.firstName} required>
          <Input
            id={fid('firstName')}
            autoComplete="given-name"
            value={values.firstName}
            onChange={set('firstName')}
            aria-invalid={!!errors.firstName}
            aria-describedby={describedBy('firstName')}
            aria-required
          />
        </Field>
        <Field label="Last name" htmlFor={fid('lastName')} error={errors.lastName} required>
          <Input
            id={fid('lastName')}
            autoComplete="family-name"
            value={values.lastName}
            onChange={set('lastName')}
            aria-invalid={!!errors.lastName}
            aria-describedby={describedBy('lastName')}
            aria-required
          />
        </Field>
      </div>
      <div className={cn('grid', compact ? 'grid-cols-2 gap-3' : 'gap-4')}>
        <Field label="Email" htmlFor={fid('email')} error={errors.email} required>
          <Input
            id={fid('email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={values.email}
            onChange={set('email')}
            aria-invalid={!!errors.email}
            aria-describedby={describedBy('email')}
            aria-required
          />
        </Field>
        <Field
          label={
            <>
              Phone <span className="font-normal text-ink-500">(optional)</span>
            </>
          }
          htmlFor={fid('phone')}
          error={errors.phone}
        >
          <Input
            id={fid('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={set('phone')}
            aria-invalid={!!errors.phone}
            aria-describedby={describedBy('phone')}
          />
        </Field>
      </div>
      <Field label="Message" htmlFor={fid('message')} error={errors.message} required>
        <Textarea
          id={fid('message')}
          rows={compact ? 3 : 4}
          value={values.message}
          onChange={set('message')}
          aria-invalid={!!errors.message}
          aria-describedby={describedBy('message')}
          aria-required
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={submitting} leftIcon={<Send className="size-4" aria-hidden />}>
        {submitting ? 'Sending…' : 'Send message'}
      </Button>
      {!compact && <p className="text-center text-xs leading-5 text-ink-500">We’ll only use your details to answer your question.</p>}
    </form>
  )
}
