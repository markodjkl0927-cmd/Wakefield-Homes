import { useCallback, useId, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, Home as HomeIcon, RefreshCw, Tag } from 'lucide-react'
import type { Home, Role, User } from '@/types'
import { homeStatus, roleLabels } from '@/data/labels'
import { formatPhone, pluralize } from '@/lib/format'
import { isValidEmail, normalizeEmail, phoneError } from '@/lib/utils'
import { accountFootprint, useAppStore } from '@/store'
import { isForSale, useCurrentUser } from '@/store/hooks'
import { confirmDialog, toast } from '@/store/ui'
import { Alert, Button, ChoiceCards, EmptyState, Field, Input, Modal, SmartImage, StatusBadge, Switch, type ChoiceOption } from '@/components/ui'
import { cn } from '@/lib/cn'
import { changeSummary, ImpactList, impactSummary, roleChangeImpact } from './accountImpact'
import type { Credentials } from './CredentialsDialog'
import { firstName, generatePassword, isValidPhone, normalizePhone, roleMeta, roleOrder } from './meta'

export type UserFormMode = { kind: 'create'; defaultRole?: Role } | { kind: 'edit'; user: User }

export interface UserFormResult {
  user: User
  created: boolean
  /** Create only: what to hand over (temporary password, invitation, homes) — show it with <CredentialsDialog>. */
  credentials?: Credentials
}

type FieldKey = 'name' | 'email' | 'phone' | 'password'
type Errors = Partial<Record<FieldKey, string>>

/** Statuses that mean "for sale": assigning such a home to a Home Owner makes it Under contract (the store enforces it). */
const SALE_STATUSES: Home['status'][] = ['available', 'coming-soon']

/**
 * Create / edit account dialog. Mounts fresh each time it opens so the form always starts clean.
 * `onClose` receives the saved user when the form was submitted successfully.
 */
export function UserFormModal({ mode, onClose }: { mode: UserFormMode | null; onClose: (result?: UserFormResult) => void }) {
  if (!mode) return null
  return <UserFormDialog key={mode.kind === 'edit' ? mode.user.id : 'new'} mode={mode} onClose={onClose} />
}

function UserFormDialog({ mode, onClose }: { mode: UserFormMode; onClose: (result?: UserFormResult) => void }) {
  const me = useCurrentUser()
  const users = useAppStore((s) => s.users)
  const homes = useAppStore((s) => s.homes)
  const appointments = useAppStore((s) => s.appointments)
  const requests = useAppStore((s) => s.requests)
  const agreements = useAppStore((s) => s.agreements)
  const leads = useAppStore((s) => s.leads)
  const createUser = useAppStore((s) => s.createUser)
  const updateUser = useAppStore((s) => s.updateUser)
  const assignHomeOwner = useAppStore((s) => s.assignHomeOwner)

  const editing = mode.kind === 'edit' ? mode.user : null
  const isSelf = !!editing && editing.id === me?.id
  const lastAdmin = !!editing && editing.role === 'admin' && users.filter((u) => u.role === 'admin').length <= 1

  // Homes this account owned when the dialog opened (edit mode only).
  const [ownedAtOpen] = useState<string[]>(() => (editing ? homes.filter((h) => h.ownerId === editing.id).map((h) => h.id) : []))

  const [role, setRole] = useState<Role>(editing?.role ?? (mode.kind === 'create' ? mode.defaultRole : undefined) ?? 'homeowner')
  const [name, setName] = useState(editing?.name ?? '')
  const [email, setEmail] = useState(editing?.email ?? '')
  const [phone, setPhone] = useState(editing?.phone ? formatPhone(editing.phone) : '')
  const [title, setTitle] = useState(editing?.title ?? '')
  const [address, setAddress] = useState(editing?.address ?? '')
  const [password, setPassword] = useState(() => generatePassword())
  const [invite, setInvite] = useState(true)
  const [homeIds, setHomeIds] = useState<string[]>(ownedAtOpen)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const base = useId()
  const formId = `${base}-form`
  const ids: Record<FieldKey | 'title' | 'address', string> = {
    name: `${base}-name`,
    email: `${base}-email`,
    phone: `${base}-phone`,
    password: `${base}-password`,
    title: `${base}-title`,
    address: `${base}-address`,
  }

  /** Homes without an owner, plus the ones this person already owns. */
  const assignable = useMemo(
    () =>
      homes
        .filter((h) => !h.ownerId || (editing && h.ownerId === editing.id))
        .sort((a, b) => Number(ownedAtOpen.includes(b.id)) - Number(ownedAtOpen.includes(a.id)) || a.title.localeCompare(b.title)),
    [homes, editing, ownedAtOpen],
  )

  /** What changing the account type does to their records (mirrors updateUser in the store). */
  const footprint = useMemo(
    () => (editing ? accountFootprint({ homes, appointments, requests, agreements, leads }, editing.id) : null),
    [editing, homes, appointments, requests, agreements, leads],
  )
  const roleChanging = !!editing && role !== editing.role
  const impact = useMemo(() => (editing && footprint && roleChanging ? roleChangeImpact(footprint, editing.role, role) : []), [editing, footprint, roleChanging, role])

  const validate = useCallback((): Errors => {
    const e: Errors = {}
    if (!name.trim()) e.name = 'Enter their full name.'
    const em = normalizeEmail(email)
    if (!em) e.email = 'Enter an email address.'
    else if (!isValidEmail(em)) e.email = 'Enter an email address like name@example.com.'
    else if (users.some((u) => u.email.toLowerCase() === em && u.id !== editing?.id)) e.email = 'Another account already uses this email address.'
    const pe = phoneError(phone)
    if (pe) e.phone = pe
    if (!editing && password.trim().length < 8) e.password = 'Use at least 8 characters.'
    return e
  }, [name, email, phone, password, users, editing])

  const errors: Errors = submitted ? validate() : {}

  const dismiss = useCallback(() => onClose(), [onClose])

  const toggleHome = (id: string) => setHomeIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  /** Assigns / unassigns homes and reports which ones went off the market. */
  const applyHomes = (userId: string, add: string[], remove: string[]) => {
    const offMarket: { title: string; statusChanged: boolean }[] = []
    remove.forEach((id) => assignHomeOwner(id, undefined))
    for (const id of add) {
      const home = useAppStore.getState().homes.find((h) => h.id === id)
      const wasForSale = !!home && isForSale(home)
      const result = assignHomeOwner(id, userId)
      if (!result.ok) {
        toast.error('Couldn’t assign a home', result.error)
        continue
      }
      if (home && (wasForSale || result.tookOffMarket)) offMarket.push({ title: home.title, statusChanged: result.tookOffMarket })
    }
    return offMarket
  }

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (saving) return
    setSubmitted(true)
    const found = validate()
    const firstInvalid = (['name', 'email', 'phone', 'password'] as FieldKey[]).find((k) => found[k])
    if (firstInvalid) {
      document.getElementById(ids[firstInvalid])?.focus()
      return
    }
    const details = {
      role,
      name: name.trim().replace(/\s+/g, ' '),
      email: normalizeEmail(email),
      phone: phone.trim() ? normalizePhone(phone) : '',
      title: role !== 'homeowner' ? title.trim() || undefined : undefined,
      address: role === 'homeowner' ? address.trim() || undefined : undefined,
    }

    if (editing) {
      const keep = new Set(role === 'homeowner' ? homeIds : [])
      const removed = ownedAtOpen.filter((id) => !keep.has(id))
      const added = [...keep].filter((id) => !ownedAtOpen.includes(id))
      const detailsChanged =
        details.role !== editing.role ||
        details.name !== editing.name ||
        details.email !== editing.email ||
        details.phone !== (editing.phone ?? '') ||
        details.title !== (editing.title || undefined) ||
        details.address !== (editing.address || undefined)
      if (!detailsChanged && !added.length && !removed.length) {
        // Nothing to save: don't add a no-op entry to the activity log.
        toast.info('No changes to save')
        onClose()
        return
      }

      // A type change that removes or hands back records needs an explicit yes.
      if (roleChanging && impact.length) {
        const ownerRecords = editing.role === 'homeowner'
        const ok = await confirmDialog({
          title: `Change ${editing.name} to ${roleLabels[role]}?`,
          description: `${impactSummary(impact).replace(/^./, (c) => c.toUpperCase())}.${ownerRecords ? ' This can’t be undone.' : ''}`,
          confirmLabel: 'Change account type',
          tone: ownerRecords ? 'danger' : 'primary',
        })
        if (!ok) return
      }

      setSaving(true)
      let summary = ''
      if (detailsChanged) {
        const result = updateUser(editing.id, details)
        if (!result.ok) {
          setSaving(false)
          toast.error('Couldn’t save the changes', result.error)
          return
        }
        if (result.removed) summary = changeSummary(result.removed, { owner: editing.role === 'homeowner', staff: role === 'homeowner' })
      }
      // Homes the role change already unassigned don't need a second update.
      const stillOwned = new Set(useAppStore.getState().homes.filter((h) => h.ownerId === editing.id).map((h) => h.id))
      const offMarket = applyHomes(
        editing.id,
        role === 'homeowner' ? added : [],
        removed.filter((id) => stillOwned.has(id)),
      )
      const homeNote = [
        role === 'homeowner' && added.length ? `${pluralize(added.length, 'home')} assigned.` : '',
        role === 'homeowner' && removed.length ? `${pluralize(removed.length, 'home')} removed from their account.` : '',
        offMarketNote(offMarket),
      ]
        .filter(Boolean)
        .join(' ')
      toast.success('Changes saved', [`${details.name}’s account is up to date.`, summary, homeNote].filter(Boolean).join(' '))
      onClose({ user: { ...editing, ...details }, created: false })
      return
    }

    setSaving(true)
    const user = createUser({ ...details, status: invite ? 'invited' : 'active', password: password.trim() })
    const offMarket = role === 'homeowner' ? applyHomes(user.id, homeIds, []) : []
    const assignedHomes = role === 'homeowner' ? homeIds.map((id) => useAppStore.getState().homes.find((h) => h.id === id)).filter((h): h is Home => !!h) : []
    onClose({
      user,
      created: true,
      credentials: {
        mode: invite ? 'invited' : 'created',
        name: user.name,
        email: user.email,
        role: user.role,
        password: password.trim(),
        homes: assignedHomes.map((h) => {
          const o = offMarket.find((x) => x.title === h.title)
          return { title: h.title, offMarket: !!o, underContract: !!o?.statusChanged }
        }),
      },
    })
  }

  const roleOptions: ChoiceOption<Role>[] = roleOrder.map((r) => {
    const Icon = roleMeta[r].icon
    return {
      value: r,
      label: roleLabels[r],
      description: roleMeta[r].description,
      icon: <Icon className="size-5" aria-hidden />,
      disabled: (isSelf || lastAdmin) && r !== editing?.role,
    }
  })

  const describedBy = (key: FieldKey, hasHint = false) => (errors[key] ? `${ids[key]}-error` : hasHint ? `${ids[key]}-hint` : undefined)
  const first = firstName(editing?.name ?? name) || 'they'

  return (
    <Modal
      open
      onClose={dismiss}
      size="xl"
      title={<span className="wrap-anywhere">{editing ? `Edit ${editing.name}` : 'Create account'}</span>}
      description={editing ? 'Update their details, account type or homes.' : 'Add a Home Owner, staff member or Super Admin.'}
      footer={
        <>
          <Button variant="secondary" onClick={dismiss}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {editing ? 'Save changes' : 'Create account'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-8">
        <fieldset>
          <legend className="text-sm font-semibold text-ink-900">Account type</legend>
          <ChoiceCards name={`${base}-role`} value={role} onChange={setRole} options={roleOptions} columns={3} className="mt-3" />
          {isSelf && <p className="mt-2 text-sm text-ink-500">You can’t change the type of your own account.</p>}
          {!isSelf && lastAdmin && (
            <p className="mt-2 text-sm text-ink-500">This is the only Super Admin. Make another account a Super Admin before changing this one.</p>
          )}
          {role === 'admin' && !isSelf && editing?.role !== 'admin' && (
            <Alert tone="warning" className="mt-4">
              Super Admins can create and delete accounts, change permissions and switch platform features on or off.
            </Alert>
          )}
          {editing?.role === 'admin' && role === 'staff' && (
            <Alert tone="info" className="mt-4">
              {first} will lose access to accounts, roles, platform settings and the activity log, and gets the Staff permissions you choose under Roles &amp; permissions.
            </Alert>
          )}
          {roleChanging && impact.length > 0 && (
            <div className="mt-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200 ring-inset" role="status">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden />
                <span className="min-w-0 wrap-anywhere">
                  Changing {editing?.name} to {roleLabels[role]}
                </span>
              </p>
              <p className="mt-1 text-sm text-amber-900">
                {editing?.role === 'homeowner'
                  ? 'Home Owner records don’t carry over to a team account. When you save:'
                  : 'Their team work is handed back so nothing is left with a Home Owner account. When you save:'}
              </p>
              <ImpactList items={impact} className="mt-3 bg-white" />
            </div>
          )}
          {roleChanging && impact.length === 0 && editing && (editing.role === 'homeowner' || role === 'homeowner') && (
            <p className="mt-3 text-sm text-ink-500">
              Nothing else changes: {first} has no {editing.role === 'homeowner' ? 'homes, appointments, requests or agreements' : 'assigned requests, appointments or leads'}.
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-ink-900">Details</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor={ids.name} required error={errors.name}>
              <Input
                id={ids.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                placeholder={role === 'homeowner' ? 'e.g. Jordan Ellis' : 'e.g. Jordan Reyes'}
                aria-invalid={!!errors.name}
                aria-describedby={describedBy('name')}
                aria-required
              />
            </Field>
            <Field label="Email" htmlFor={ids.email} required error={errors.email} hint={editing ? undefined : 'Used to sign in.'}>
              <Input
                id={ids.email}
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                placeholder={role === 'homeowner' ? 'name@example.com' : 'name@wakefieldhomeslc.com'}
                aria-invalid={!!errors.email}
                aria-describedby={describedBy('email', !editing)}
                aria-required
              />
            </Field>
            <Field label={<OptionalLabel>Phone</OptionalLabel>} htmlFor={ids.phone} error={errors.phone}>
              <Input
                id={ids.phone}
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => isValidPhone(phone) && setPhone(formatPhone(normalizePhone(phone)))}
                autoComplete="off"
                placeholder="(703) 555-0100"
                aria-invalid={!!errors.phone}
                aria-describedby={describedBy('phone')}
              />
            </Field>
            {role === 'homeowner' ? (
              <Field label={<OptionalLabel>Mailing address</OptionalLabel>} htmlFor={ids.address}>
                <Input id={ids.address} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="off" placeholder="Street, city, state ZIP" />
              </Field>
            ) : (
              <Field label={<OptionalLabel>Job title</OptionalLabel>} htmlFor={ids.title}>
                <Input
                  id={ids.title}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoComplete="off"
                  placeholder={role === 'admin' ? 'e.g. Operations Director' : 'e.g. Customer Care Manager'}
                />
              </Field>
            )}
          </div>
        </fieldset>

        {!editing && (
          <fieldset>
            <legend className="text-sm font-semibold text-ink-900">Sign-in</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 sm:items-start">
              <Field
                label="Temporary password"
                htmlFor={ids.password}
                required
                error={errors.password}
                hint="At least 8 characters. You’ll see it again on the next screen, ready to copy and share."
              >
                <div className="flex gap-2">
                  <Input
                    id={ids.password}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono"
                    aria-invalid={!!errors.password}
                    aria-describedby={describedBy('password', true)}
                    aria-required
                  />
                  <Button variant="secondary" onClick={() => setPassword(generatePassword())} leftIcon={<RefreshCw className="size-4" aria-hidden />}>
                    Generate
                  </Button>
                </div>
              </Field>
              <div className="rounded-xl bg-ink-25 p-4 ring-1 ring-ink-200/70 ring-inset sm:mt-7">
                <Switch
                  checked={invite}
                  onChange={setInvite}
                  label="Send an invitation"
                  description={
                    invite
                      ? 'They show as Invited until their first sign-in. This demo sends no email: you’ll see the invitation and the sign-in details to share.'
                      : 'The account is active straight away. You’ll get the sign-in details to share with them yourself.'
                  }
                />
              </div>
            </div>
          </fieldset>
        )}

        {role === 'homeowner' && (
          <fieldset>
            <legend className="flex w-full items-baseline justify-between gap-2 text-sm font-semibold text-ink-900">
              <span>{editing ? 'Homes' : 'Assign homes'}</span>
              <span className="text-xs font-normal text-ink-500">{homeIds.length ? `${homeIds.length} selected` : 'Optional'}</span>
            </legend>
            <p className="mt-1 text-sm text-ink-500">
              {editing ? 'Checked homes appear in their portal under My Homes.' : 'Homes without an owner. Checked homes appear in their portal under My Homes.'} A home
              that belongs to a Home Owner is never shown as for sale.
            </p>
            {assignable.length === 0 ? (
              <EmptyState
                compact
                className="mt-3 rounded-xl ring-1 ring-ink-200 ring-inset"
                icon={<HomeIcon className="size-6" aria-hidden />}
                title="Every home already has an owner"
                description="Add a new home in Homes & 3D, then assign it here."
              />
            ) : (
              <ul className="scrollbar-thin mt-3 max-h-80 divide-y divide-ink-100 overflow-y-auto rounded-xl ring-1 ring-ink-200 ring-inset">
                {assignable.map((h) => {
                  const checked = homeIds.includes(h.id)
                  const inputId = `${base}-home-${h.id}`
                  const forSale = isForSale(h)
                  const becomesUnderContract = forSale && SALE_STATUSES.includes(h.status)
                  return (
                    <li key={h.id}>
                      <label
                        htmlFor={inputId}
                        className={cn('flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors', checked ? 'bg-brand-50/60' : 'hover:bg-ink-25')}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleHome(h.id)}
                          aria-describedby={forSale ? `${inputId}-sale` : undefined}
                          className="mt-1 size-4 shrink-0 rounded border-ink-300 accent-brand-800"
                        />
                        <SmartImage src={h.images[0]} alt="" className="hidden size-12 shrink-0 rounded-lg sm:block" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-3">
                            <span className="min-w-0">
                              <span className="block text-sm font-medium wrap-anywhere text-ink-900">{h.title}</span>
                              <span className="block truncate text-sm text-ink-500">
                                {h.address}, {h.city}
                              </span>
                            </span>
                            <StatusBadge def={homeStatus[checked && becomesUnderContract ? 'under-contract' : h.status]} className="hidden shrink-0 sm:inline-flex" />
                          </span>
                          {forSale && (
                            <span id={`${inputId}-sale`} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-amber-800">
                              <Tag className="mt-px size-3.5 shrink-0" aria-hidden />
                              <span>{saleNote(h, checked, becomesUnderContract)}</span>
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </fieldset>
        )}
      </form>
    </Modal>
  )
}

/** Note on a listing in the assign list: assigning a home that is for sale takes it off the market. */
function saleNote(home: Home, checked: boolean, becomesUnderContract: boolean): string {
  if (checked) {
    return becomesUnderContract
      ? `Comes off the market when you save, and changes from ${homeStatus[home.status].label} to Under contract.`
      : 'Comes off the market when you save.'
  }
  return becomesUnderContract
    ? 'Listed for sale on the website. Assigning it makes it Under contract and takes it off the market.'
    : 'Listed for sale on the website. Assigning it takes it off the market.'
}

/** "Lot 36 · The Stockton is off the market now (Under contract)." for the save toast. */
function offMarketNote(items: { title: string; statusChanged: boolean }[]): string {
  if (!items.length) return ''
  if (items.length === 1) return `${items[0].title} is off the market now${items[0].statusChanged ? ' (Under contract)' : ''}.`
  return `${pluralize(items.length, 'home')} are off the market now.`
}

/** "Phone (optional)". The shared Field `optional` hint uses ink-400, which is below AA contrast. */
function OptionalLabel({ children }: { children: string }) {
  return (
    <>
      {children} <span className="font-normal text-ink-500">(optional)</span>
    </>
  )
}
