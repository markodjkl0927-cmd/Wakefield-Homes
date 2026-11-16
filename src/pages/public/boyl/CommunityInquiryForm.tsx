import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { BellRing, CircleCheck, Mail, MessageCircle, MessageSquareOff, Phone, Ruler } from 'lucide-react'
import type { Community, LeadInterest } from '@/types'
import { emailError, normalizePhone, phoneError, sleep } from '@/lib/utils'
import { useAppStore } from '@/store'
import { toast } from '@/store/ui'
import { Button, buttonStyles, Input, Textarea } from '@/components/ui'
import { useOffice } from '@/store/hooks'
import { describedBy, errorSummary, FormField } from '../company/contact/FormField'
import { IconTile } from './shared'

type Values = { firstName: string; lastName: string; email: string; phone: string; message: string }
type FieldKey = keyof Values
const empty: Values = { firstName: '', lastName: '', email: '', phone: '', message: '' }
const order: FieldKey[] = ['firstName', 'lastName', 'email', 'phone', 'message']
const MESSAGE_MAX = 1000

function validateField(k: FieldKey, v: Values): string | undefined {
  switch (k) {
    case 'firstName':
      return v.firstName.trim() ? undefined : 'Enter your first name.'
    case 'lastName':
      return v.lastName.trim() ? undefined : 'Enter your last name.'
    case 'email':
      return emailError(v.email)
    case 'phone':
      return phoneError(v.phone)
    case 'message':
      return v.message.length > MESSAGE_MAX ? 'Please keep your note under 1,000 characters.' : undefined
  }
}

function validate(v: Values): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {}
  for (const k of order) {
    const msg = validateField(k, v)
    if (msg) e[k] = msg
  }
  return e
}

/** What the form offers, by kind of project. */
function formCopy(c: Community): { updates: boolean; title: string; intro: string; cta: string; interest: LeadInterest; message: string } {
  if (c.buildOnYourLot) {
    return {
      updates: false,
      title: 'Build a home like this on your lot',
      intro: `${c.name} is a Build On Your Lot home, built on its owner’s land. Tell us about your property and a Wakefield representative will contact you.`,
      cta: 'Send message',
      interest: 'build-on-your-lot',
      message: `I’m interested in building a home like ${c.name} on my own lot.`,
    }
  }
  if (c.status === 'sold-out') {
    return {
      updates: false,
      title: `Homes like ${c.name}`,
      intro: 'No homes here are for sale right now. Tell us what you’re looking for and a Wakefield representative will contact you about similar homes.',
      cta: 'Get in touch',
      interest: 'move-in-ready',
      message: `I’m looking for a home similar to those at ${c.name} (${c.area}).`,
    }
  }
  return {
    updates: true,
    title: `Get updates about ${c.name}`,
    intro: c.status === 'under-construction' ? 'Follow construction and hear about availability and pricing.' : 'Hear about pricing, progress and availability.',
    cta: 'Get updates',
    interest: 'move-in-ready',
    message: `Please send me updates about ${c.name} (${c.area}).`,
  }
}

/**
 * The inquiry card on a community page. Submits a lead to the demo store (staff see it under Website leads,
 * with the community as its source). When a Super Admin turns the website contact form off, it shows how to
 * reach the office instead.
 */
export function CommunityInquiryForm({ community }: { community: Community }) {
  const office = useOffice()
  const formEnabled = useAppStore((s) => s.settings.features.contactForm)
  const createLead = useAppStore((s) => s.createLead)
  const baseId = useId()
  const id = (k: FieldKey) => `${baseId}-${k}`
  const [values, setValues] = useState<Values>(empty)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [summary, setSummary] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState<{ firstName: string; email: string } | null>(null)
  const successHeading = useRef<HTMLHeadingElement>(null)
  const copy = formCopy(community)

  useEffect(() => {
    if (sent) successHeading.current?.focus()
  }, [sent])

  const set = (k: FieldKey) => (e: { target: { value: string } }) => {
    const next = { ...values, [k]: e.target.value }
    setValues(next)
    // Once a field shows an error, re-check it as it's corrected.
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: validateField(k, next) }))
  }

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (submitting) return
    const e = validate(values)
    setErrors(e)
    const invalid = order.filter((k) => e[k])
    if (invalid.length) {
      // Clear first so the same summary is announced again on a repeat attempt.
      setSummary('')
      window.setTimeout(() => setSummary(errorSummary(invalid.length)), 60)
      document.getElementById(id(invalid[0]))?.focus()
      return
    }
    setSummary('')
    setSubmitting(true)
    try {
      await sleep(450)
      const note = values.message.trim()
      createLead({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() ? normalizePhone(values.phone) : '',
        interest: copy.interest,
        message: `${copy.message}${note ? `\n\n${note}` : ''}`,
        source: `Community page: ${community.name}`,
      })
      setSent({ firstName: values.firstName.trim(), email: values.email.trim() })
      if (copy.updates) toast.success('You’re on the list', `We’ll keep you posted about ${community.name}.`)
      else toast.success('Message sent', 'A Wakefield representative will contact you.')
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setValues(empty)
    setErrors({})
    setSummary('')
    setSent(null)
  }

  if (!formEnabled) {
    return (
      <section aria-labelledby={`${baseId}-paused`} className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-200/70">
        <span className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200" aria-hidden>
          <MessageSquareOff className="size-5" />
        </span>
        <h2 id={`${baseId}-paused`} className="mt-5 text-lg leading-snug font-semibold text-ink-900">
          Ask about {community.name}
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-600">
          Online inquiries are paused right now. Call us{office.email ? ' or send an email' : ''} and a Wakefield representative will be happy to help.
        </p>
        <div className="mt-5 grid gap-2">
          <a href={`tel:${office.phone}`} className={buttonStyles('primary', 'lg', 'w-full')}>
            <Phone className="size-5" aria-hidden /> Call {office.phoneDisplay}
          </a>
          {office.email && (
            <a
              href={`mailto:${office.email}?subject=${encodeURIComponent(community.name)}`}
              className={buttonStyles('secondary', 'lg', 'w-full min-w-0')}
            >
              <Mail className="size-5 shrink-0" aria-hidden />
              <span className="truncate">{office.email}</span>
            </a>
          )}
        </div>
        <p className="mt-4 text-xs text-ink-500">Office hours: {office.hours}</p>
      </section>
    )
  }

  return (
    <div className="rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70">
      {sent ? (
        <div className="px-6 py-10 text-center" role="status">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100" aria-hidden>
            <CircleCheck className="size-6" />
          </span>
          <h2 ref={successHeading} tabIndex={-1} className="mt-4 text-lg font-semibold wrap-anywhere text-ink-900 focus:outline-none">
            Thanks, {sent.firstName}
            {copy.updates ? ' — you’re on the list' : ' — we’ll be in touch'}
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-600">
            A Wakefield representative will contact you at <span className="font-medium break-all text-ink-800">{sent.email}</span>. Questions in the meantime?
            Call{' '}
            <a href={`tel:${office.phone}`} className="font-semibold whitespace-nowrap text-brand-800 underline-offset-4 hover:underline">
              {office.phoneDisplay}
            </a>
            .
          </p>
          <Button variant="secondary" className="mt-6" onClick={reset}>
            Send another message
          </Button>
        </div>
      ) : (
        <form noValidate onSubmit={onSubmit} aria-labelledby={`${baseId}-title`}>
          <div className="flex items-start gap-4 border-b border-ink-100 px-5 py-5 sm:px-6">
            <IconTile>{community.buildOnYourLot ? <Ruler /> : copy.updates ? <BellRing /> : <MessageCircle />}</IconTile>
            <div className="min-w-0">
              <h2 id={`${baseId}-title`} className="text-lg leading-snug font-semibold text-ink-900">
                {copy.title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-600">{copy.intro}</p>
            </div>
          </div>
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <FormField id={id('firstName')} label="First name" error={errors.firstName} required>
                <Input
                  id={id('firstName')}
                  value={values.firstName}
                  onChange={set('firstName')}
                  autoComplete="given-name"
                  maxLength={60}
                  aria-invalid={!!errors.firstName}
                  aria-describedby={describedBy(id('firstName'), { error: errors.firstName })}
                  aria-required
                />
              </FormField>
              <FormField id={id('lastName')} label="Last name" error={errors.lastName} required>
                <Input
                  id={id('lastName')}
                  value={values.lastName}
                  onChange={set('lastName')}
                  autoComplete="family-name"
                  maxLength={60}
                  aria-invalid={!!errors.lastName}
                  aria-describedby={describedBy(id('lastName'), { error: errors.lastName })}
                  aria-required
                />
              </FormField>
            </div>
            <FormField id={id('email')} label="Email" error={errors.email} required>
              <Input
                id={id('email')}
                type="email"
                inputMode="email"
                value={values.email}
                onChange={set('email')}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="name@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={describedBy(id('email'), { error: errors.email })}
                aria-required
              />
            </FormField>
            <FormField id={id('phone')} label="Phone" error={errors.phone} optional>
              <Input
                id={id('phone')}
                type="tel"
                inputMode="tel"
                value={values.phone}
                onChange={set('phone')}
                autoComplete="tel"
                maxLength={25}
                placeholder="(703) 555-0123"
                aria-invalid={!!errors.phone}
                aria-describedby={describedBy(id('phone'), { error: errors.phone })}
              />
            </FormField>
            <FormField id={id('message')} label={community.buildOnYourLot ? 'About your lot' : 'Anything we should know?'} error={errors.message} optional>
              <Textarea
                id={id('message')}
                rows={3}
                value={values.message}
                onChange={set('message')}
                maxLength={MESSAGE_MAX}
                placeholder={community.buildOnYourLot ? 'Where it is, its size, your timing' : 'Timing, must-haves or questions'}
                aria-invalid={!!errors.message}
                aria-describedby={describedBy(id('message'), { error: errors.message })}
              />
            </FormField>
            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              {submitting ? 'Sending…' : copy.cta}
            </Button>
            <p role="status" className={summary ? 'text-center text-sm font-medium text-rose-600' : 'sr-only'}>
              {summary}
            </p>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink-500">
              <Phone className="size-3.5" aria-hidden /> Prefer to talk?{' '}
              <a href={`tel:${office.phone}`} className="font-semibold text-brand-800 underline-offset-4 hover:underline">
                {office.phoneDisplay}
              </a>
            </p>
          </div>
        </form>
      )}
    </div>
  )
}
