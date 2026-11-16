import { useId, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Send } from 'lucide-react'
import type { MaintenanceRequest, RequestCategory, RequestPriority } from '@/types'
import { sleep, toIsoDate } from '@/lib/utils'
import { formatPhone } from '@/lib/format'
import { requestCategories } from '@/data/labels'
import { useAppStore } from '@/store'
import { useCurrentUser, useHomesByOwner, useSettings } from '@/store/hooks'
import { toast } from '@/store/ui'
import { Alert, Button, ChoiceCards, Field, Input, Modal, Select, Textarea } from '@/components/ui'
import { PhotoPicker } from './PhotoPicker'
import { StepError, StepHeading, StepIndicator, useStepFocus } from './ui'
import { useEnabledRequestCategories } from './data'
import { useDialogBack, type HistoryDialog } from './dialogHistory'

const STEPS = ['Category', 'Details']
const HEADINGS = ['What do you need help with?', 'Tell us what’s happening']
const FORM_ID = 'new-maintenance-request'

const priorityOptions: { value: RequestPriority; label: string }[] = [
  { value: 'low', label: 'Low — whenever it’s convenient' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High — needs attention soon' },
  { value: 'urgent', label: 'Urgent — safety issue or active damage' },
]

/**
 * The client's four request types (Gardening, Road fixing, Make a report, House fix), limited to the
 * categories a Super Admin has enabled in Platform settings. The browser or phone Back button goes back
 * to the category step and then closes the form, instead of leaving the page (useDialogBack).
 */
export function NewRequestModal({
  dialog,
  onCreated,
  initialHomeId,
  initialCategory,
}: {
  dialog: HistoryDialog
  onCreated: (request: MaintenanceRequest) => void
  initialHomeId?: string
  initialCategory?: RequestCategory
}) {
  const user = useCurrentUser()
  const homes = useHomesByOwner(user?.id)
  const settings = useSettings()
  const createRequest = useAppStore((s) => s.createRequest)
  const enabled = useEnabledRequestCategories()
  const uid = useId()
  const headingId = `${uid}-heading`
  const errorId = `${uid}-error`
  const headingRef = useRef<HTMLHeadingElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const [category, setCategory] = useState<RequestCategory | null>(() => (initialCategory && enabled.includes(initialCategory) ? initialCategory : null))
  const [currentStep, setStep] = useState(() => (initialCategory && enabled.includes(initialCategory) ? 1 : 0))
  const [homeId, setHomeId] = useState(() => (initialHomeId && homes.some((h) => h.id === initialHomeId) ? initialHomeId : homes.length === 1 ? homes[0].id : ''))
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<RequestPriority>('normal')
  const [preferredDate, setPreferredDate] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [stepError, setStepError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // A category switched off while the form is open can't be submitted any more: back to the choice.
  const activeCategory = category && enabled.includes(category) ? category : null
  const step = activeCategory ? currentStep : 0
  useStepFocus(step, headingRef)
  useDialogBack(dialog, () => {
    if (step === 0) return false
    setStepError(null)
    setStep(0)
    return true
  })
  const goBack = () => {
    setStepError(null)
    setStep(0)
  }

  const def = activeCategory ? requestCategories[activeCategory] : null
  const clearError = (key: string) => setErrors((e) => (e[key] ? { ...e, [key]: '' } : e))

  const goNext = () => {
    if (!activeCategory) {
      setStepError('Choose the type of request to continue.')
      bodyRef.current?.querySelector<HTMLElement>('input[name="request-category"]')?.focus()
      return
    }
    setStepError(null)
    setStep(1)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!homeId) e.home = 'Choose the home this request is about.'
    if (title.trim().length < 3) e.title = 'Add a short title (at least 3 characters).'
    if (description.trim().length < 10) e.description = 'Tell us a little more (at least 10 characters).'
    setErrors(e)
    const first = (['home', 'title', 'description'] as const).find((k) => e[k])
    if (first) document.getElementById(`req-${first}`)?.focus()
    return !first
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !activeCategory || submitting || !validate()) return
    setSubmitting(true)
    let sent = false
    try {
      await sleep(350)
      const request = createRequest({
        homeownerId: user.id,
        homeId,
        category: activeCategory,
        title: title.trim(),
        description: description.trim(),
        priority,
        preferredDate: preferredDate || undefined,
        photos,
      })
      sent = true
      toast.success(`Request #${request.number} submitted`, 'The Wakefield team has been notified and will follow up here.')
      onCreated(request)
    } catch (e) {
      toast.error('We couldn’t submit your request', e instanceof Error ? e.message : 'Please try again, or call the office.')
    } finally {
      // A failed save never leaves the button spinning; a sent one keeps it busy until the dialog closes.
      if (!sent) setSubmitting(false)
    }
  }

  const noHomes = homes.length === 0
  const nothingEnabled = enabled.length === 0 || !settings.features.maintenance

  return (
    <Modal
      open
      onClose={() => dialog.close()}
      size="lg"
      title="New maintenance request"
      description="Tell us what needs attention and we’ll take it from there."
      footer={
        noHomes || nothingEnabled ? (
          <Button variant="secondary" onClick={() => dialog.close()}>
            Close
          </Button>
        ) : (
          <>
            {step > 0 && (
              <Button key="back" variant="ghost" leftIcon={<ArrowLeft className="size-4" aria-hidden />} onClick={goBack} className="mr-auto">
                Back
              </Button>
            )}
            {/* Distinct keys: React must not morph "Continue" into the submit button mid-click
                (the browser would then run the submit default action and validate an empty form). */}
            {step === 0 ? (
              <Button key="continue" onClick={goNext} aria-describedby={stepError ? errorId : undefined} rightIcon={<ArrowRight className="size-4" aria-hidden />}>
                Continue
              </Button>
            ) : (
              <Button key="submit" type="submit" form={FORM_ID} loading={submitting} leftIcon={<Send className="size-4" aria-hidden />}>
                Submit request
              </Button>
            )}
          </>
        )
      }
    >
      {noHomes || nothingEnabled ? (
        <Alert tone="info" title={noHomes ? 'No homes on your account yet' : 'Online requests are paused'}>
          Please call the office at{' '}
          <a href={`tel:${settings.office.phone}`} className="font-semibold underline">
            {formatPhone(settings.office.phone)}
          </a>{' '}
          and we’ll help you right away.
        </Alert>
      ) : (
        <>
          <StepIndicator steps={STEPS} current={step} />
          <div ref={bodyRef} className="mt-6">
            <StepHeading ref={headingRef} id={headingId}>
              {HEADINGS[step]}
            </StepHeading>
            {stepError && step === 0 && <StepError id={errorId}>{stepError}</StepError>}

            <div className="mt-4">
              {step === 0 && (
                <fieldset aria-labelledby={headingId} aria-describedby={stepError ? errorId : undefined}>
                  <ChoiceCards
                    name="request-category"
                    value={category}
                    onChange={(c) => {
                      setCategory(c)
                      setStepError(null)
                    }}
                    columns={2}
                    options={enabled.map((key) => {
                      const c = requestCategories[key]
                      const Icon = c.icon
                      return {
                        value: key,
                        label: c.label,
                        icon: <Icon className="size-5" aria-hidden />,
                        description: (
                          <>
                            {c.description}
                            <span className="mt-1.5 block text-xs leading-5 text-ink-500">e.g. {c.examples.join(' · ')}</span>
                          </>
                        ),
                      }
                    })}
                  />
                </fieldset>
              )}

              {step === 1 && def && (
                <form id={FORM_ID} onSubmit={submit} noValidate className="space-y-5">
                  <div className="flex items-center gap-3 rounded-xl bg-brand-50/70 px-4 py-3 ring-1 ring-brand-100 ring-inset">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-900 text-white">
                      <def.icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-900">{def.label}</p>
                      <p className="truncate text-xs text-ink-600">{def.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={goBack}
                      className="-mr-2 text-brand-800 hover:text-brand-900"
                      aria-label={`Change category (currently ${def.label})`}
                    >
                      Change
                    </Button>
                  </div>

                  <Field label="Home" htmlFor="req-home" required error={errors.home}>
                    <Select
                      id="req-home"
                      value={homeId}
                      onChange={(e) => {
                        setHomeId(e.target.value)
                        clearError('home')
                      }}
                      aria-invalid={!!errors.home}
                      aria-describedby={errors.home ? 'req-home-error' : undefined}
                    >
                      {!homeId && <option value="">Choose a home…</option>}
                      {homes.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.title} — {h.address}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Title" htmlFor="req-title" required error={errors.title}>
                    <Input
                      id="req-title"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value)
                        clearError('title')
                      }}
                      maxLength={100}
                      placeholder={`e.g. ${def.examples[0]}`}
                      aria-invalid={!!errors.title}
                      aria-describedby={errors.title ? 'req-title-error' : undefined}
                    />
                  </Field>

                  <Field label="Description" htmlFor="req-description" required error={errors.description} hint="Where is it, what do you see, and when did it start?">
                    <Textarea
                      id="req-description"
                      rows={4}
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value)
                        clearError('description')
                      }}
                      maxLength={1500}
                      aria-invalid={!!errors.description}
                      aria-describedby={errors.description ? 'req-description-error' : 'req-description-hint'}
                    />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Priority" htmlFor="req-priority">
                      <Select id="req-priority" value={priority} onChange={(e) => setPriority(e.target.value as RequestPriority)}>
                        {priorityOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Preferred date" htmlFor="req-date" optional hint="We’ll try to schedule around it.">
                      <Input id="req-date" type="date" min={toIsoDate(new Date())} value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} aria-describedby="req-date-hint" />
                    </Field>
                  </div>

                  {priority === 'urgent' && (
                    <Alert tone="warning" title="Something unsafe right now?">
                      For anything that puts people or property at immediate risk, please also call the office at{' '}
                      <a href={`tel:${settings.office.phone}`} className="font-semibold underline">
                        {formatPhone(settings.office.phone)}
                      </a>
                      .
                    </Alert>
                  )}

                  <PhotoPicker photos={photos} onChange={setPhotos} />
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
