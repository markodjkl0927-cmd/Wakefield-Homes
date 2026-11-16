import { useState, type FormEvent } from 'react'
import { Bell, KeyRound, Save, UserRound } from 'lucide-react'
import type { User } from '@/types'
import { collapseSpaces, normalizePhone, phoneError, sleep, useDocumentTitle } from '@/lib/utils'
import { formatDate, formatPhone, pluralize } from '@/lib/format'
import { roleLabels } from '@/data/labels'
import { DEMO_PASSWORD } from '@/data/seed'
import { useAppStore } from '@/store'
import { useCurrentUser, useHomesByOwner } from '@/store/hooks'
import { toast } from '@/store/ui'
import { Avatar, Button, Card, CardBody, CardFooter, CardHeader, Field, Input, Switch, Textarea } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { CustomerCareCard } from './components/CustomerCareCard'
import { DetailList } from './components/ui'

export default function OwnerProfile() {
  useDocumentTitle('Profile')
  const user = useCurrentUser()
  if (!user) return null
  return <ProfileView key={user.id} user={user} />
}

function ProfileView({ user }: { user: User }) {
  const homes = useHomesByOwner(user.id)
  return (
    <>
      <PageHeader title="Profile" description="Your contact details, password and notification preferences." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div className="min-w-0 space-y-6">
          <DetailsForm user={user} />
          <PasswordForm user={user} />
          <NotificationPrefs />
        </div>
        <div className="min-w-0 space-y-6">
          <Card>
            <CardBody>
              <div className="flex items-center gap-4">
                <Avatar name={user.name} size="lg" />
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-ink-900">{user.name}</h2>
                  <p className="truncate text-sm text-ink-600">{user.email}</p>
                </div>
              </div>
              <DetailList
                className="mt-6"
                items={[
                  { label: 'Account', value: roleLabels[user.role] },
                  { label: 'Homes', value: pluralize(homes.length, 'home') },
                  { label: 'Member since', value: formatDate(user.createdAt) },
                  ...(user.lastLoginAt ? [{ label: 'Last sign-in', value: formatDate(user.lastLoginAt) }] : []),
                ]}
              />
            </CardBody>
          </Card>
          <CustomerCareCard />
        </div>
      </div>
    </>
  )
}

function DetailsForm({ user }: { user: User }) {
  const updateUser = useAppStore((s) => s.updateUser)
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone ? formatPhone(user.phone) : '')
  const [address, setAddress] = useState(user.address ?? '')
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})
  const [saving, setSaving] = useState(false)
  const normalizedPhone = phone.trim() ? normalizePhone(phone) : ''
  const cleanName = collapseSpaces(name)
  const dirty = cleanName !== user.name || normalizedPhone !== (user.phone ?? '') || address.trim() !== (user.address ?? '')

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    const errs: typeof errors = {}
    if (cleanName.length < 2) errs.name = 'Enter your full name.'
    const phoneProblem = phoneError(phone)
    if (phoneProblem) errs.phone = phoneProblem
    setErrors(errs)
    if (errs.name) return document.getElementById('profile-name')?.focus()
    if (errs.phone) return document.getElementById('profile-phone')?.focus()
    setSaving(true)
    await sleep(350)
    const result = updateUser(user.id, { name: cleanName, phone: normalizedPhone, address: address.trim() || undefined })
    setSaving(false)
    if (!result.ok) {
      toast.error('Your details weren’t saved', result.error)
      return
    }
    setPhone(normalizedPhone ? formatPhone(normalizedPhone) : '')
    setName(cleanName)
    setAddress(address.trim())
    toast.success('Profile updated', 'Your contact details are saved.')
  }

  return (
    <Card>
      <CardHeader title="Personal details" description="We use these to reach you about your home and appointments." icon={<UserRound className="size-[18px]" aria-hidden />} />
      <form onSubmit={save} noValidate>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="profile-name" required error={errors.name} className="sm:col-span-2">
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'profile-name-error' : undefined} />
          </Field>
          <Field label="Email" htmlFor="profile-email" hint="Your sign-in email. Contact the office to change it.">
            <Input id="profile-email" type="email" value={user.email} readOnly aria-describedby="profile-email-hint" className="bg-ink-50 text-ink-600" />
          </Field>
          <Field label="Phone" htmlFor="profile-phone" error={errors.phone}>
            <Input
              id="profile-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => {
                const n = phone.trim() ? normalizePhone(phone) : ''
                if (/^\+1\d{10}$/.test(n)) setPhone(formatPhone(n))
              }}
              placeholder="(703) 555-0144"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'profile-phone-error' : undefined}
            />
          </Field>
          <Field label="Mailing address" htmlFor="profile-address" optional className="sm:col-span-2">
            <Textarea id="profile-address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" placeholder="Street, city, state and ZIP" />
          </Field>
        </CardBody>
        <CardFooter>
          <Button type="submit" loading={saving} disabled={!dirty} leftIcon={<Save className="size-4" aria-hidden />}>
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function PasswordForm({ user }: { user: User }) {
  const updateUser = useAppStore((s) => s.updateUser)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    const errs: typeof errors = {}
    if (!current) errs.current = 'Enter your current password.'
    else if (current !== user.password) errs.current = 'That isn’t your current password.'
    if (next.length < 8) errs.next = 'Use at least 8 characters.'
    else if (next === current) errs.next = 'Choose a password that’s different from your current one.'
    if (!errs.next && confirm !== next) errs.confirm = 'The passwords don’t match.'
    setErrors(errs)
    const first = (['current', 'next', 'confirm'] as const).find((k) => errs[k])
    if (first) return document.getElementById(`pw-${first}`)?.focus()
    setSaving(true)
    await sleep(400)
    const result = updateUser(user.id, { password: next })
    setSaving(false)
    if (!result.ok) {
      toast.error('Your password wasn’t changed', result.error)
      return
    }
    setCurrent('')
    setNext('')
    setConfirm('')
    toast.success('Password changed', 'Use your new password the next time you sign in.')
  }

  const describedBy = (key: 'current' | 'next' | 'confirm', hint?: boolean) => (errors[key] ? `pw-${key}-error` : hint ? `pw-${key}-hint` : undefined)
  // Only the sample accounts still use the demo password; accounts the office set up have their own.
  const usesDemoPassword = user.password === DEMO_PASSWORD

  return (
    <Card id="password" className="scroll-mt-24">
      <CardHeader
        title="Change password"
        description={
          usesDemoPassword
            ? `Presentation demo: your current password is ${DEMO_PASSWORD}.`
            : 'Use the password you signed in with. For a new account, that’s the temporary password from your invitation.'
        }
        icon={<KeyRound className="size-[18px]" aria-hidden />}
      />
      <form onSubmit={submit} noValidate>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Field label="Current password" htmlFor="pw-current" error={errors.current} className="sm:col-span-2 sm:max-w-[calc(50%-10px)]">
            <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} aria-invalid={!!errors.current} aria-describedby={describedBy('current')} />
          </Field>
          <Field label="New password" htmlFor="pw-next" error={errors.next} hint="At least 8 characters.">
            <Input id="pw-next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} aria-invalid={!!errors.next} aria-describedby={describedBy('next', true)} />
          </Field>
          <Field label="Confirm new password" htmlFor="pw-confirm" error={errors.confirm}>
            <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={!!errors.confirm} aria-describedby={describedBy('confirm')} />
          </Field>
        </CardBody>
        <CardFooter>
          <Button type="submit" variant="secondary" loading={saving} disabled={!current && !next && !confirm}>
            Update password
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

const prefDefs = [
  { key: 'agreements', label: 'Agreement updates', description: 'When your team shares or updates a document, or one is ready to sign.' },
  { key: 'appointments', label: 'Appointment reminders', description: 'Confirmations, changes and a reminder the day before.' },
  { key: 'requests', label: 'Maintenance request updates', description: 'Status changes and new messages from the Wakefield team.' },
  { key: 'construction', label: 'Construction progress', description: 'New stages and progress photos for homes being built.' },
  { key: 'sms', label: 'Text message alerts', description: 'Time-sensitive updates by text, in addition to email.' },
] as const

type PrefKey = (typeof prefDefs)[number]['key']

function NotificationPrefs() {
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({ agreements: true, appointments: true, requests: true, construction: true, sms: false })
  return (
    <Card>
      <CardHeader title="Notifications" description="Choose what we email you about. You’ll always see updates in the portal." icon={<Bell className="size-[18px]" aria-hidden />} />
      <CardBody>
        <ul className="divide-y divide-ink-100">
          {prefDefs.map((p) => (
            <li key={p.key} className="py-4 first:pt-0 last:pb-0">
              <Switch
                label={p.label}
                description={p.description}
                checked={prefs[p.key]}
                onChange={(v) => {
                  setPrefs((s) => ({ ...s, [p.key]: v }))
                  toast.info(`${p.label} ${v ? 'on' : 'off'}`, 'Demo only — preferences aren’t saved in this prototype.')
                }}
              />
            </li>
          ))}
        </ul>
        <p className="mt-5 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">Presentation demo: these switches show the experience but aren’t saved.</p>
      </CardBody>
    </Card>
  )
}
