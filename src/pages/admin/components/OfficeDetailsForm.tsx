import { useId, useState, type FormEvent } from 'react'
import { Building2 } from 'lucide-react'
import type { Settings } from '@/types'
import { OFFICE_HOURS } from '@/data/seed'
import { formatPhone } from '@/lib/format'
import { normalizeEmail } from '@/lib/utils'
import { useAppStore } from '@/store'
import { toast } from '@/store/ui'
import { Card, CardBody, CardHeader, Field, Input } from '@/components/ui'
import { FormFooter } from './bits'
import { isValidEmail, isValidPhone, normalizePhone, phoneError } from './meta'

type Office = Settings['office']
type Key = keyof Office
const keys: Key[] = ['name', 'address', 'phone', 'email', 'hours']
/** The email is optional: the live website publishes none. When it's empty, the site and portals hide every email link. */
const optionalKeys: Key[] = ['email']

function toDraft(office: Office): Office {
  return { ...office, phone: formatPhone(office.phone) }
}

function clean(d: Office): Office {
  return {
    name: d.name.trim().replace(/\s+/g, ' '),
    address: d.address.trim().replace(/\s+/g, ' '),
    phone: normalizePhone(d.phone),
    email: normalizeEmail(d.email),
    hours: d.hours.trim(),
  }
}

function validate(d: Office): Partial<Record<Key, string>> {
  const e: Partial<Record<Key, string>> = {}
  if (!d.name.trim()) e.name = 'Enter the office name.'
  if (!d.address.trim()) e.address = 'Enter the office address.'
  if (!d.phone.trim()) e.phone = 'Enter the office phone number.'
  else if (!isValidPhone(d.phone)) e.phone = phoneError(d.phone) ?? 'Enter a 10-digit phone number, like (703) 360-3134.'
  if (d.email.trim() && !isValidEmail(d.email)) e.email = 'Enter an email address like name@example.com, or leave it empty.'
  if (!d.hours.trim()) e.hours = 'Enter the office hours.'
  return e
}

/** Office contact details form. Remount it (key) when the saved settings change so it starts clean. */
export function OfficeDetailsForm({ office, id }: { office: Office; id: string }) {
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [draft, setDraft] = useState<Office>(() => toDraft(office))
  const [submitted, setSubmitted] = useState(false)
  const base = useId()

  const cleaned = clean(draft)
  const dirty = keys.some((k) => cleaned[k] !== office[k])
  const allErrors = validate(draft)
  const errors = submitted ? allErrors : {}
  const set = (key: Key, value: string) => setDraft((d) => ({ ...d, [key]: value }))

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const firstKey = keys.find((k) => allErrors[k])
    if (firstKey) {
      document.getElementById(`${base}-${firstKey}`)?.focus()
      return
    }
    updateSettings({ office: cleaned })
    toast.success(
      'Office details saved',
      cleaned.email ? 'The website and portals show the new details right away.' : 'The website and portals show the new details right away. No email address is shown while it’s empty.',
    )
  }

  const discard = () => {
    setDraft(toDraft(office))
    setSubmitted(false)
  }

  const field = (key: Key, label: string, props: { type?: string; inputMode?: 'tel' | 'email' | 'text'; placeholder?: string; hint?: string; className?: string }) => {
    const optional = optionalKeys.includes(key)
    return (
      <Field
        label={
          optional ? (
            <>
              {label} <span className="font-normal text-ink-500">(optional)</span>
            </>
          ) : (
            label
          )
        }
        htmlFor={`${base}-${key}`}
        required={!optional}
        error={errors[key]}
        hint={props.hint}
        className={props.className}
      >
        <Input
          id={`${base}-${key}`}
          type={props.type ?? 'text'}
          inputMode={props.inputMode}
          autoComplete="off"
          placeholder={props.placeholder}
          value={draft[key]}
          onChange={(e) => set(key, e.target.value)}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `${base}-${key}-error` : props.hint ? `${base}-${key}-hint` : undefined}
          aria-required={!optional || undefined}
        />
      </Field>
    )
  }

  return (
    <Card id={id} className="scroll-mt-24">
      <CardHeader
        icon={<Building2 className="size-[18px]" aria-hidden />}
        title="Office details"
        description="Contact details for the Wakefield Homes office, shown in the website header and footer, on the Contact page and in the portals."
      />
      <form onSubmit={onSubmit} noValidate>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          {field('name', 'Office name', { className: 'sm:col-span-2' })}
          {field('address', 'Address', { className: 'sm:col-span-2', placeholder: 'Street, suite, city, state ZIP' })}
          {field('phone', 'Phone', { type: 'tel', inputMode: 'tel', placeholder: '(703) 360-3134' })}
          {field('email', 'Email', { type: 'email', inputMode: 'email', placeholder: 'name@example.com', hint: 'Leave it empty to hide email links everywhere.' })}
          {field('hours', 'Office hours', { className: 'sm:col-span-2', placeholder: `e.g. ${OFFICE_HOURS}`, hint: 'Shown exactly as written.' })}
        </CardBody>
        <FormFooter dirty={dirty} onDiscard={discard} />
      </form>
    </Card>
  )
}
