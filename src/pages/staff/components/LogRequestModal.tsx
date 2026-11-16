import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ClipboardPlus } from 'lucide-react'
import type { MaintenanceRequest, RequestCategory, RequestPriority } from '@/types'
import { requestCategories } from '@/data/labels'
import { cn } from '@/lib/cn'
import { todayIso } from '@/lib/utils'
import { useAppStore } from '@/store'
import { useCan, useCurrentUser, useHomeowners, useStaffUsers } from '@/store/hooks'
import { toast } from '@/store/ui'
import { Alert, Button, Field, Input, Modal, Select, Textarea } from '@/components/ui'
import { HomeOwnerSelect, categoryOrder, categoryStyles, firstName, optionalTagAA } from './common'

const FORM_ID = 'staff-log-request'

const priorityOptions: { value: RequestPriority; label: string }[] = [
  { value: 'low', label: 'Low — whenever it’s convenient' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High — needs attention soon' },
  { value: 'urgent', label: 'Urgent — safety issue or active damage' },
]

type ErrorKey = 'owner' | 'home' | 'category' | 'title' | 'description'
const errorOrder: ErrorKey[] = ['owner', 'home', 'category', 'title', 'description']

/**
 * Staff log a maintenance request for a Home Owner who phoned or emailed the office (all four request
 * types, even when online requests are paused for Home Owners). The Home Owner is notified and can
 * follow the request in their portal; it can be assigned straight away.
 */
export function LogRequestModal({
  onClose,
  onCreated,
  initialOwnerId,
}: {
  onClose: () => void
  onCreated: (request: MaintenanceRequest) => void
  initialOwnerId?: string
}) {
  const me = useCurrentUser()
  const owners = useHomeowners()
  const staff = useStaffUsers()
  const homes = useAppStore((s) => s.homes)
  const createRequest = useAppStore((s) => s.createRequest)
  const canEditHomes = useCan('homes.edit')

  const startOwner = initialOwnerId && owners.some((o) => o.id === initialOwnerId && o.status !== 'disabled') ? initialOwnerId : ''
  const homesOf = (ownerId: string) => homes.filter((h) => h.ownerId === ownerId)

  const [ownerId, setOwnerId] = useState(startOwner)
  const [homeId, setHomeId] = useState(() => {
    const hs = homesOf(startOwner)
    return hs.length === 1 ? hs[0].id : ''
  })
  const [category, setCategory] = useState<RequestCategory | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<RequestPriority>('normal')
  const [preferredDate, setPreferredDate] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const inFlight = useRef(false)

  const owner = owners.find((o) => o.id === ownerId)
  const ownerHomes = useMemo(() => homes.filter((h) => h.ownerId === ownerId), [homes, ownerId])
  const def = category ? requestCategories[category] : null
  const staffOptions = useMemo(() => [...staff].sort((a, b) => Number(b.id === me?.id) - Number(a.id === me?.id) || a.name.localeCompare(b.name)), [staff, me?.id])

  const clear = (key: ErrorKey) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))

  const changeOwner = (id: string) => {
    setOwnerId(id)
    const hs = homesOf(id)
    setHomeId(hs.length === 1 ? hs[0].id : '')
    setErrors((e) => ({ ...e, owner: undefined, home: undefined }))
  }

  const validate = () => {
    const e: Partial<Record<ErrorKey, string>> = {}
    if (!ownerId) e.owner = 'Choose the Home Owner who called.'
    else if (!ownerHomes.length) e.home = `${owner ? firstName(owner.name) : 'This Home Owner'} has no homes on the account yet.`
    else if (!homeId) e.home = 'Choose the home this request is about.'
    if (!category) e.category = 'Choose what kind of request this is.'
    if (title.trim().length < 3) e.title = 'Add a short title (at least 3 characters).'
    if (description.trim().length < 10) e.description = 'Describe the problem (at least 10 characters).'
    setErrors(e)
    const first = errorOrder.find((k) => e[k])
    // With no homes on the account the Home select is disabled: send focus to the Home Owner instead.
    if (first) document.getElementById(`logreq-${first === 'home' && !ownerHomes.length ? 'owner' : first}`)?.focus()
    return !first
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (inFlight.current || !validate() || !owner || !category) return
    inFlight.current = true
    setSubmitting(true)
    try {
      const request = createRequest({
        homeownerId: owner.id,
        homeId,
        category,
        title: title.trim(),
        description: description.trim(),
        priority,
        preferredDate: preferredDate || undefined,
        photos: [],
        assignedToId: assigneeId || undefined,
      })
      const assignee = assigneeId ? staff.find((u) => u.id === assigneeId) : undefined
      toast.success(
        `Request #${request.number} logged for ${owner.name}`,
        `${firstName(owner.name)} has been notified and can follow it in the portal.${assignee ? ` Assigned to ${assignee.id === me?.id ? 'you' : assignee.name}.` : ''}`,
      )
      onCreated(request)
    } catch (err) {
      inFlight.current = false
      setSubmitting(false)
      toast.error('The request couldn’t be logged', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Log a request"
      description="For a Home Owner who called or emailed the office. They’re notified and can follow it in their portal."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={submitting} leftIcon={<ClipboardPlus className="size-4" aria-hidden />}>
            Log request
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate className={cn('space-y-5', optionalTagAA)}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Home Owner" required error={errors.owner} htmlFor="logreq-owner">
            <HomeOwnerSelect
              id="logreq-owner"
              value={ownerId}
              onChange={changeOwner}
              owners={owners}
              invalid={!!errors.owner}
              describedBy={errors.owner ? 'logreq-owner-error' : undefined}
              autoFocus={!startOwner}
            />
          </Field>
          <Field label="Home" required error={errors.home} htmlFor="logreq-home" hint={!errors.home && !ownerId ? 'Choose the Home Owner first.' : undefined}>
            <Select
              id="logreq-home"
              value={homeId}
              onChange={(e) => {
                setHomeId(e.target.value)
                clear('home')
              }}
              disabled={!ownerId || ownerHomes.length === 0}
              aria-invalid={!!errors.home || undefined}
              aria-describedby={errors.home ? 'logreq-home-error' : !ownerId ? 'logreq-home-hint' : undefined}
            >
              {!homeId && <option value="">{ownerId && ownerHomes.length === 0 ? 'No homes on this account' : 'Choose a home…'}</option>}
              {ownerHomes.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title} — {h.address}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {owner && ownerHomes.length === 0 && (
          <Alert tone="info" title={`${firstName(owner.name)} has no homes on the account yet`}>
            Requests are filed against a home.{' '}
            {canEditHomes ? (
              <>
                Assign one under{' '}
                <Link to="/staff/homes" className="font-semibold underline underline-offset-2" onClick={onClose}>
                  Homes &amp; 3D
                </Link>{' '}
                first.
              </>
            ) : (
              'Ask a colleague with access to Homes & 3D to assign one first.'
            )}
          </Alert>
        )}

        <fieldset aria-describedby={errors.category ? 'logreq-category-error' : undefined}>
          <legend className="mb-2 text-sm font-medium text-ink-800">
            Category<span className="ml-0.5 text-rose-600" aria-hidden> *</span>
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {categoryOrder.map((c, i) => {
              const cat = requestCategories[c]
              const Icon = cat.icon
              const selected = category === c
              return (
                <label
                  key={c}
                  className={cn(
                    'relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center text-sm font-medium ring-1 transition-colors ring-inset',
                    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600',
                    selected ? 'bg-brand-50/70 text-brand-900 ring-2 ring-brand-700' : 'bg-white text-ink-700 ring-ink-200 hover:bg-ink-25 hover:ring-ink-300',
                    errors.category && !selected && 'ring-rose-300',
                  )}
                >
                  <input
                    id={i === 0 ? 'logreq-category' : undefined}
                    type="radio"
                    name="logreq-category"
                    value={c}
                    checked={selected}
                    onChange={() => {
                      setCategory(c)
                      clear('category')
                    }}
                    className="sr-only"
                    data-autofocus={startOwner && i === 0 ? true : undefined}
                  />
                  <span className={cn('flex size-9 items-center justify-center rounded-lg ring-1 ring-inset', categoryStyles[c].chip)} aria-hidden>
                    <Icon className="size-[18px]" />
                  </span>
                  {cat.label}
                </label>
              )
            })}
          </div>
          {errors.category && (
            <p id="logreq-category-error" className="mt-1.5 text-sm text-rose-600" role="alert">
              {errors.category}
            </p>
          )}
        </fieldset>

        <Field label="Title" required error={errors.title} htmlFor="logreq-title">
          <Input
            id="logreq-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              clear('title')
            }}
            maxLength={100}
            placeholder={def ? `e.g. ${def.examples[0]}` : 'A short summary of the problem'}
            aria-invalid={!!errors.title || undefined}
            aria-describedby={errors.title ? 'logreq-title-error' : undefined}
          />
        </Field>

        <Field label="What did they report?" required error={errors.description} htmlFor="logreq-description" hint="Where it is, what they see and since when. The Home Owner sees this text.">
          <Textarea
            id="logreq-description"
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              clear('description')
            }}
            maxLength={1500}
            aria-invalid={!!errors.description || undefined}
            aria-describedby={errors.description ? 'logreq-description-error' : 'logreq-description-hint'}
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Priority" htmlFor="logreq-priority">
            <Select id="logreq-priority" value={priority} onChange={(e) => setPriority(e.target.value as RequestPriority)}>
              {priorityOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Preferred date" optional htmlFor="logreq-date">
            <Input id="logreq-date" type="date" min={todayIso()} value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
          </Field>
          <Field label="Assign to" optional htmlFor="logreq-assignee">
            <Select id="logreq-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Leave in the queue</option>
              {staffOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.id === me?.id ? ' (you)' : ''}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  )
}
