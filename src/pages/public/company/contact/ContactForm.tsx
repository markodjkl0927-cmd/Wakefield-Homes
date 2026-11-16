import { useEffect, useRef, useState, type FormEvent, type Ref } from 'react'
import { Box, CircleCheck, Clock, House, Lock, MapPin, Moon, Phone, Send, Sun, Sunrise, type LucideIcon } from 'lucide-react'
import type { Home, Lead } from '@/types'
import { cn } from '@/lib/cn'
import { sleep } from '@/lib/utils'
import { formatPhone, formatSqft } from '@/lib/format'
import { contactFollowUp } from '@/data/content'
import { leadInterest } from '@/data/labels'
import { getModel, homeModels } from '@/data/models'
import { getCommunity } from '@/data/communities'
import { useAppStore } from '@/store'
import { Button, ButtonLink, buttonStyles, Input, Select, SmartImage, smoothBehavior, Textarea } from '@/components/ui'
import { homePriceLabel } from '../../homes/utils'
import { describedBy, errorSummary, FormField } from './FormField'
import {
  BEST_TIMES,
  EMPTY_CONTACT,
  MESSAGE_MAX,
  NAME_MAX,
  VALIDATED_FIELDS,
  normalizePhone,
  validateAll,
  validateField,
  type BestTime,
  type ContactErrors,
  type ContactField,
  type ContactValues,
} from './validation'

const bestTimeIcons: Record<BestTime, LucideIcon> = { Anytime: Clock, Morning: Sunrise, Afternoon: Sun, Evening: Moon }
const interestOptions = Object.entries(leadInterest) as [keyof typeof leadInterest, string][]
const fieldId = (name: ContactField) => `contact-${name}`
const COUNTER_ID = 'contact-message-count'

/** Moves focus to a control and keeps it clear of the sticky site header. */
function revealAndFocus(el: HTMLElement | null) {
  if (!el) return
  el.focus({ preventScroll: true })
  el.scrollIntoView({ block: 'center', behavior: smoothBehavior() })
}

/** Where a home is: its community, or the area for a single-home project named after its own address. */
function homePlace(home: Home) {
  const community = home.communityId ? getCommunity(home.communityId) : undefined
  if (!community) return home.city
  return community.name === home.address ? community.area : community.name
}

export interface ContactFormProps {
  /** Values prefilled from the URL (?model=, ?home=, ?interest=). */
  initial?: Partial<ContactValues>
  /** A published home the visitor came from (?home=slug). */
  home?: Home
  /** Office phone (E.164) for the success panel. */
  officePhone: string
}

export function ContactForm({ initial, home, officePhone }: ContactFormProps) {
  const createLead = useAppStore((s) => s.createLead)
  const [values, setValues] = useState<ContactValues>(() => ({ ...EMPTY_CONTACT, ...initial }))
  const [errors, setErrors] = useState<ContactErrors>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [summary, setSummary] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState<Lead | null>(null)
  const successRef = useRef<HTMLElement>(null)

  // After sending, move focus to the confirmation heading so keyboard and screen-reader users land on it.
  useEffect(() => {
    const panel = successRef.current
    if (!sent || !panel) return
    panel.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
    panel.scrollIntoView({ block: 'start', behavior: smoothBehavior() })
  }, [sent])

  /** Update a value; once a field shows an error it is re-checked as the visitor fixes it. */
  function setField<K extends ContactField>(name: K, value: ContactValues[K]) {
    const next = { ...values, [name]: value }
    setValues(next)
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: validateField(name, next) }))
  }

  /**
   * Check a field when the visitor leaves it — but only once they have typed something (or tried to send):
   * tabbing through an empty form never raises errors.
   */
  function onBlur(name: ContactField) {
    if (!submitAttempted && !String(values[name]).trim()) return
    setErrors((prev) => ({ ...prev, [name]: validateField(name, values) }))
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setSubmitAttempted(true)
    const found = validateAll(values)
    setErrors(found)
    const invalid = VALIDATED_FIELDS.filter((f) => found[f])
    if (invalid.length) {
      // One polite summary (cleared first so a repeat attempt is announced again); focus goes to the first problem.
      setSummary('')
      window.setTimeout(() => setSummary(errorSummary(invalid.length)), 60)
      revealAndFocus(document.getElementById(fieldId(invalid[0])))
      return
    }

    setSummary('')
    setSubmitting(true)
    try {
      await sleep(650) // a short, honest pause so the confirmation doesn't feel abrupt
      let message = values.message.trim()
      if (home && !message.includes(home.title)) message += `\n\nRe: ${home.title}`
      const lead = createLead({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim().toLowerCase(),
        phone: normalizePhone(values.phone),
        interest: values.interest || 'general',
        modelSlug: values.modelSlug || undefined,
        bestTime: values.bestTime,
        message,
        source: 'Website contact form',
        ...(home ? { homeId: home.id } : {}),
      })
      setSent(lead)
    } finally {
      setSubmitting(false)
    }
  }

  function startOver() {
    setValues((prev) => ({ ...EMPTY_CONTACT, firstName: prev.firstName, lastName: prev.lastName, email: prev.email, phone: prev.phone }))
    setErrors({})
    setSubmitAttempted(false)
    setSummary('')
    setSent(null)
    window.setTimeout(() => revealAndFocus(document.getElementById(fieldId('interest'))), 0)
  }

  if (sent) return <SuccessPanel ref={successRef} lead={sent} officePhone={officePhone} onStartOver={startOver} />

  const selectedModel = values.modelSlug ? getModel(values.modelSlug) : undefined

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby="contact-form-title" className="p-6 sm:p-8">
      <h2 id="contact-form-title" className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
        Send us a message
      </h2>
      <p className="mt-2 text-ink-600">
        Tell us what you’re looking for and how to reach you. Required fields are marked <span className="text-rose-600">*</span>
      </p>

      {home && <HomeContext home={home} />}

      <div className="mt-8 grid gap-x-5 gap-y-6 sm:grid-cols-2">
        <FormField id={fieldId('firstName')} label="First name" required error={errors.firstName}>
          <Input
            id={fieldId('firstName')}
            name="firstName"
            autoComplete="given-name"
            autoCapitalize="words"
            placeholder="e.g. Jordan"
            maxLength={NAME_MAX}
            required
            value={values.firstName}
            onChange={(e) => setField('firstName', e.target.value)}
            onBlur={() => onBlur('firstName')}
            aria-invalid={!!errors.firstName}
            aria-describedby={describedBy(fieldId('firstName'), { error: errors.firstName })}
          />
        </FormField>

        <FormField id={fieldId('lastName')} label="Last name" required error={errors.lastName}>
          <Input
            id={fieldId('lastName')}
            name="lastName"
            autoComplete="family-name"
            autoCapitalize="words"
            placeholder="e.g. Smith"
            maxLength={NAME_MAX}
            required
            value={values.lastName}
            onChange={(e) => setField('lastName', e.target.value)}
            onBlur={() => onBlur('lastName')}
            aria-invalid={!!errors.lastName}
            aria-describedby={describedBy(fieldId('lastName'), { error: errors.lastName })}
          />
        </FormField>

        <FormField id={fieldId('email')} label="Email" required error={errors.email}>
          <Input
            id={fieldId('email')}
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="name@example.com"
            required
            value={values.email}
            onChange={(e) => setField('email', e.target.value)}
            onBlur={() => onBlur('email')}
            aria-invalid={!!errors.email}
            aria-describedby={describedBy(fieldId('email'), { error: errors.email })}
          />
        </FormField>

        <FormField id={fieldId('phone')} label="Phone" required error={errors.phone}>
          <Input
            id={fieldId('phone')}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(703) 555-0123"
            maxLength={25}
            required
            value={values.phone}
            onChange={(e) => setField('phone', e.target.value)}
            onBlur={() => onBlur('phone')}
            aria-invalid={!!errors.phone}
            aria-describedby={describedBy(fieldId('phone'), { error: errors.phone })}
          />
        </FormField>

        <FormField id={fieldId('interest')} label="I’m interested in" required error={errors.interest}>
          <Select
            id={fieldId('interest')}
            name="interest"
            required
            value={values.interest}
            onChange={(e) => setField('interest', e.target.value as ContactValues['interest'])}
            onBlur={() => onBlur('interest')}
            aria-invalid={!!errors.interest}
            aria-describedby={describedBy(fieldId('interest'), { error: errors.interest })}
            className={cn(!values.interest && 'text-ink-500')}
          >
            <option value="" disabled>
              Choose one
            </option>
            {interestOptions.map(([value, label]) => (
              <option key={value} value={value} className="text-ink-900">
                {label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField id={fieldId('modelSlug')} label="Home plan" optional hint="Have a plan from our Home Gallery in mind?">
          <Select
            id={fieldId('modelSlug')}
            name="modelSlug"
            value={values.modelSlug}
            onChange={(e) => setField('modelSlug', e.target.value)}
            aria-describedby={describedBy(fieldId('modelSlug'), { hint: true })}
          >
            <option value="">No specific plan</option>
            {homeModels.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name} · {m.style}
              </option>
            ))}
          </Select>
        </FormField>

        {selectedModel && (
          <div className="flex items-center gap-4 rounded-xl bg-ink-50 p-3 ring-1 ring-ink-200/70 ring-inset sm:col-span-2">
            <SmartImage src={selectedModel.image} alt="" className="h-14 w-20 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <p className="font-semibold text-ink-900">
                {selectedModel.name} <span className="font-normal text-ink-500">· {selectedModel.style}</span>
              </p>
              <p className="text-sm text-ink-600">
                {selectedModel.beds} beds · {selectedModel.baths} baths · {formatSqft(selectedModel.sqftMin, selectedModel.sqftMax)}
              </p>
            </div>
          </div>
        )}

        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium text-ink-800">Best time to call</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {BEST_TIMES.map((time) => {
              const Icon = bestTimeIcons[time]
              const checked = values.bestTime === time
              return (
                <label
                  key={time}
                  className={cn(
                    'inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium ring-1 transition-colors ring-inset select-none',
                    'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 has-[:focus-visible]:ring-offset-2',
                    checked ? 'bg-brand-900 text-white ring-brand-900' : 'bg-white text-ink-700 ring-ink-200 hover:bg-ink-50 hover:ring-ink-300',
                  )}
                >
                  <input type="radio" name="bestTime" value={time} checked={checked} onChange={() => setField('bestTime', time)} className="sr-only" />
                  <Icon className={cn('size-4', checked ? 'text-white' : 'text-ink-500')} aria-hidden />
                  {time}
                </label>
              )
            })}
          </div>
        </fieldset>

        <FormField id={fieldId('message')} label="Message" required error={errors.message} className="sm:col-span-2">
          <Textarea
            id={fieldId('message')}
            name="message"
            rows={5}
            maxLength={MESSAGE_MAX}
            placeholder="Tell us about your plans: timing, location, must-haves…"
            required
            value={values.message}
            onChange={(e) => setField('message', e.target.value)}
            onBlur={() => onBlur('message')}
            aria-invalid={!!errors.message}
            aria-describedby={describedBy(fieldId('message'), { error: errors.message, extra: COUNTER_ID })}
          />
          <p id={COUNTER_ID} className={cn('text-right text-xs tabular-nums', values.message.length >= MESSAGE_MAX - 100 ? 'font-medium text-amber-700' : 'text-ink-500')}>
            {values.message.length.toLocaleString('en-US')} / {MESSAGE_MAX.toLocaleString('en-US')} characters
          </p>
        </FormField>
      </div>

      <div className="mt-8 flex flex-col gap-5 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm text-ink-600 sm:max-w-xs">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          We’ll only use your details to reply to your inquiry.
        </p>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Button type="submit" size="lg" loading={submitting} leftIcon={<Send className="size-4" aria-hidden />} className="w-full sm:w-auto">
            {submitting ? 'Sending…' : 'Send message'}
          </Button>
          <p role="status" className={summary ? 'text-center text-sm font-medium text-rose-600 sm:text-right' : 'sr-only'}>
            {summary}
          </p>
        </div>
      </div>
    </form>
  )
}

/** "You're asking about…" card shown when the visitor arrives from a home listing (?home=slug). */
function HomeContext({ home }: { home: Home }) {
  const model = getModel(home.modelId)
  return (
    <div className="mt-6 flex items-center gap-4 rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100 ring-inset">
      <SmartImage src={home.images[0] ?? model?.image} alt="" className="size-16 shrink-0 rounded-lg sm:h-16 sm:w-24" />
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-brand-800 uppercase">You’re asking about</p>
        <p className="mt-0.5 font-semibold wrap-anywhere text-ink-900">{home.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-ink-600">
          <MapPin className="size-3.5 text-ink-400" aria-hidden />
          {homePlace(home)}
          <span aria-hidden>·</span>
          {/* The same price wording as the listing itself: "$2,445,000", "Price TBD" or "Sold". */}
          {homePriceLabel(home)}
        </p>
      </div>
    </div>
  )
}

function SuccessPanel({ ref, lead, officePhone, onStartOver }: { ref: Ref<HTMLElement>; lead: Lead; officePhone: string; onStartOver: () => void }) {
  const view3d = useAppStore((s) => s.settings.features.view3d)
  const plan = lead.modelSlug ? getModel(lead.modelSlug) : undefined
  const rows: { label: string; value: string }[] = [
    { label: 'Interested in', value: leadInterest[lead.interest] },
    ...(lead.homeTitle ? [{ label: 'Home', value: lead.homeTitle }] : []),
    { label: 'Home plan', value: plan ? plan.name : 'No specific plan' },
    { label: 'Best time to call', value: lead.bestTime ?? 'Anytime' },
    { label: 'We’ll contact you at', value: `${lead.email} · ${formatPhone(lead.phone)}` },
  ]
  return (
    <section ref={ref} aria-labelledby="contact-success-title" className="scroll-mt-28 animate-fade-up p-6 sm:p-10">
      <span className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100" aria-hidden>
        <CircleCheck className="size-7" />
      </span>
      <h2 id="contact-success-title" tabIndex={-1} className="display-heading mt-6 text-3xl wrap-anywhere focus:outline-none sm:text-4xl">
        Thanks, {lead.firstName}!
      </h2>
      <p className="mt-3 text-lg leading-8 text-ink-600">{contactFollowUp}</p>

      <dl className="mt-8 divide-y divide-ink-100 rounded-xl bg-ink-25 ring-1 ring-ink-200/70">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <dt className="shrink-0 text-sm text-ink-500">{row.label}</dt>
            <dd className="min-w-0 text-sm font-medium wrap-anywhere text-ink-900 sm:text-right">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink to="/our-homes/gallery" size="lg" leftIcon={view3d ? <Box className="size-5" aria-hidden /> : <House className="size-5" aria-hidden />}>
          {view3d ? 'Explore homes in 3D' : 'Browse our homes'}
        </ButtonLink>
        <a href={`tel:${officePhone}`} className={buttonStyles('secondary', 'lg')}>
          <Phone className="size-5" aria-hidden /> Call us · {formatPhone(officePhone)}
        </a>
      </div>

      <div className="mt-8 flex flex-col gap-2 border-t border-ink-100 pt-6 text-sm text-ink-600 sm:flex-row sm:items-center sm:justify-between">
        <p>Demo: your inquiry now appears in the Staff portal under Website leads.</p>
        <button type="button" onClick={onStartOver} className="shrink-0 self-start py-2 font-semibold whitespace-nowrap text-brand-800 underline-offset-4 hover:underline sm:self-auto">
          Send another message
        </button>
      </div>
    </section>
  )
}
