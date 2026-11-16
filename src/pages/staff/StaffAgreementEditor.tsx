import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowDown, ArrowUp, Ban, BellRing, Eye, EyeOff, FileSignature, History, Lock, PenLine, Plus, Send, Trash2 } from 'lucide-react'
import type { Agreement, AgreementSection, AgreementType } from '@/types'
import { agreementStatus, agreementTypes } from '@/data/labels'
import { cn } from '@/lib/cn'
import { formatDate, formatDateTime, formatPrice, formatRelative } from '@/lib/format'
import { uid, useDocumentTitle } from '@/lib/utils'
import { useAppStore } from '@/store'
import { useCurrentUser, useHomeLookup, useHomeowners, usePersonLookup } from '@/store/hooks'
import { confirmDialog, toast } from '@/store/ui'
import { Alert, Avatar, Button, ButtonLink, Card, CardBody, CardHeader, EmptyState, Field, Input, Modal, Select, StatusBadge, Textarea, smoothBehavior } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { AgreementPreview } from './components/AgreementPreview'
import { HomeOwnerSelect, StaffGuard, firstName, optionalTagAA, tapIcon } from './components/common'
import { useKeepFocusVisible } from './components/useKeepFocusVisible'

/* ------------------------------------------------------------------ */
/* Draft                                                                */
/* ------------------------------------------------------------------ */

interface SectionDraft extends AgreementSection {
  key: string
}

interface Draft {
  homeownerId: string
  homeId: string
  type: AgreementType
  title: string
  amount: string
  summary: string
  sections: SectionDraft[]
}

type FieldKey = 'homeownerId' | 'title' | 'amount' | 'summary' | 'sections'
type Errors = Partial<Record<FieldKey, string>>
/** Per-section problems when sharing, keyed by the section's React key. */
type SectionErrors = Record<string, { field: 'heading' | 'body'; message: string }>

/** Section headings used by Wakefield's existing documents, offered as a starting point for new agreements. */
const sectionTemplates: Record<AgreementType, string[]> = {
  purchase: ['Property', 'Purchase price', 'Deposit', 'Settlement'],
  construction: ['Scope of work', 'Contract price', 'Draw schedule', 'Schedule'],
  'change-order': ['Change description', 'Price adjustment', 'Schedule impact'],
  warranty: ['Workmanship', 'Systems', 'Structural', 'How to file'],
  addendum: ['Changes', 'Effect on the agreement'],
  hoa: ['Association', 'Dues', 'Rules'],
}

/** Warranty and HOA documents are shared as active documents; everything else needs a signature. */
const shareStatusFor = (type: AgreementType): 'active' | 'awaiting-signature' => (type === 'warranty' || type === 'hoa' ? 'active' : 'awaiting-signature')

const toSections = (xs: AgreementSection[]): SectionDraft[] => xs.map((s) => ({ ...s, key: uid('sec') }))
const templateSections = (type: AgreementType) => sectionTemplates[type].map((heading) => ({ key: uid('sec'), heading, body: '' }))
const stripSections = (xs: SectionDraft[]): AgreementSection[] => xs.map(({ heading, body }) => ({ heading: heading.trim(), body: body.trim() })).filter((s) => s.heading || s.body)
/** True while the sections are still the type's untouched template (headings only, no text). */
const isUntouchedTemplate = (xs: SectionDraft[], type: AgreementType) => xs.every((s) => !s.body.trim()) && xs.map((s) => s.heading.trim()).join('|') === sectionTemplates[type].join('|')

function draftFromAgreement(a: Agreement): Draft {
  return {
    homeownerId: a.homeownerId,
    homeId: a.homeId ?? '',
    type: a.type,
    title: a.title,
    amount: a.amount == null ? '' : String(a.amount),
    summary: a.summary,
    sections: toSections(a.sections),
  }
}

function emptyDraft(ownerId = '', homeId = ''): Draft {
  return { homeownerId: ownerId, homeId, type: 'change-order', title: '', amount: '', summary: '', sections: templateSections('change-order') }
}

/** Comparable form of a draft (ignores React keys and whitespace). */
const fingerprint = (d: Draft) => JSON.stringify({ ...d, title: d.title.trim(), summary: d.summary.trim(), amount: d.amount.trim(), sections: stripSections(d.sections) })

function validate(d: Draft, sharing: boolean): { errors: Errors; sectionErrors: SectionErrors } {
  const errors: Errors = {}
  const sectionErrors: SectionErrors = {}
  if (!d.homeownerId) errors.homeownerId = 'Choose the Home Owner this agreement is for.'
  if (!d.title.trim()) errors.title = 'Give the agreement a title.'
  if (d.amount.trim() && !/^\d+(\.\d{1,2})?$/.test(d.amount.trim())) errors.amount = 'Enter an amount in dollars, e.g. 28435.'
  if (sharing) {
    if (!d.summary.trim()) errors.summary = 'Add a short summary — it’s the first thing the Home Owner reads.'
    // What the Home Owner sees must be complete: no heading without text, no text without a heading.
    for (const s of d.sections) {
      const heading = s.heading.trim()
      const body = s.body.trim()
      if (heading && !body) sectionErrors[s.key] = { field: 'body', message: `Add the text for “${heading}”, or remove the section.` }
      else if (body && !heading) sectionErrors[s.key] = { field: 'heading', message: 'Give this section a heading.' }
    }
    if (!Object.keys(sectionErrors).length && stripSections(d.sections).length === 0) errors.sections = 'Add at least one section with a heading and text before sharing.'
  }
  return { errors, sectionErrors }
}

/* ------------------------------------------------------------------ */

export default function StaffAgreementEditor() {
  const { id } = useParams()
  const agreement = useAppStore((s) => (id ? s.agreements.find((a) => a.id === id) : undefined))
  useDocumentTitle(!id ? 'New agreement' : agreement ? agreement.title : 'Agreement not found')
  return (
    <StaffGuard permission="agreements.edit" title={id ? 'Agreement' : 'New agreement'}>
      {id && !agreement ? (
        <>
          <PageHeader title="Agreement not found" back={{ to: '/staff/agreements', label: 'All agreements' }} />
          <Card>
            <EmptyState
              icon={<FileSignature className="size-6" aria-hidden />}
              title="This agreement doesn’t exist any more"
              description="It may have been deleted, or the demo data was reset."
              action={<ButtonLink to="/staff/agreements">Back to agreements</ButtonLink>}
            />
          </Card>
        </>
      ) : (
        <AgreementEditor key={id ?? 'new'} agreement={agreement} />
      )}
    </StaffGuard>
  )
}

type Pending = 'create-draft' | 'create-share' | 'save-draft' | 'share' | 'save-version' | 'send' | 'void' | 'delete' | null

function AgreementEditor({ agreement }: { agreement?: Agreement }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const homeowners = useHomeowners()
  const person = usePersonLookup()
  const homeRef = useHomeLookup()
  const homes = useAppStore((s) => s.homes)
  const createAgreement = useAppStore((s) => s.createAgreement)
  const updateAgreement = useAppStore((s) => s.updateAgreement)
  const sendAgreementForSignature = useAppStore((s) => s.sendAgreementForSignature)
  const voidAgreement = useAppStore((s) => s.voidAgreement)
  const deleteAgreement = useAppStore((s) => s.deleteAgreement)

  const [base, setBase] = useState<Draft>(() => {
    if (agreement) return draftFromAgreement(agreement)
    // /staff/agreements/new?owner=… (from a Home Owner's profile) starts with that Home Owner.
    const ownerParam = params.get('owner') ?? ''
    const owner = homeowners.find((u) => u.id === ownerParam && u.status !== 'disabled')
    const theirHomes = owner ? homes.filter((h) => h.ownerId === owner.id) : []
    return emptyDraft(owner?.id ?? '', theirHomes.length === 1 ? theirHomes[0].id : '')
  })
  const [draft, setDraft] = useState<Draft>(base)
  const [errors, setErrors] = useState<Errors>({})
  const [sectionErrors, setSectionErrors] = useState<SectionErrors>({})
  const [noteOpen, setNoteOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
  const [pending, setPending] = useState<Pending>(null)
  /** Guards every action against double clicks: the "new" form stays on screen until the new route renders. */
  const inFlight = useRef(false)
  const formRef = useRef<HTMLDivElement>(null)
  useKeepFocusVisible(formRef)
  const dirty = fingerprint(draft) !== fingerprint(base)

  // Refresh an untouched form when the agreement changes elsewhere (e.g. the Home Owner signs it).
  const [seenAt, setSeenAt] = useState(agreement?.updatedAt)
  if (agreement && agreement.updatedAt !== seenAt) {
    setSeenAt(agreement.updatedAt)
    if (!dirty) {
      const fresh = draftFromAgreement(agreement)
      setBase(fresh)
      setDraft(fresh)
    }
  }

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const status = agreement?.status ?? 'draft'
  const isVoid = status === 'void'
  const isDraft = !agreement || agreement.status === 'draft'
  const ownerRef = person(draft.homeownerId)
  const ownerName = ownerRef?.name ?? 'the Home Owner'
  const ownerFirst = ownerRef ? firstName(ownerRef.name) : 'The Home Owner'
  const ownerHomes = useMemo(() => homes.filter((h) => h.ownerId === draft.homeownerId), [homes, draft.homeownerId])
  const home = homeRef(draft.homeId)
  const shareStatus = shareStatusFor(draft.type)

  /** Home choices for a new agreement or a draft: the owner's homes, plus the linked one if it isn't theirs any more. */
  const homeOptions = useMemo(() => {
    const opts = ownerHomes.map((h) => ({ id: h.id, label: h.title }))
    if (draft.homeId && !opts.some((o) => o.id === draft.homeId)) {
      const ref = homeRef(draft.homeId)
      if (ref) opts.push({ id: ref.id, label: `${ref.title} (${ref.removed ? 'removed' : 'not on this account any more'})` })
    }
    return opts
  }, [ownerHomes, draft.homeId, homeRef])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const setSections = (fn: (xs: SectionDraft[]) => SectionDraft[]) => {
    setDraft((d) => ({ ...d, sections: fn(d.sections) }))
    if (errors.sections) setErrors((e) => ({ ...e, sections: undefined }))
  }

  const editSection = (key: string, patch: Partial<AgreementSection>) => {
    setSections((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)))
    if (sectionErrors[key]) setSectionErrors(({ [key]: _gone, ...rest }) => rest)
  }

  const changeOwner = (ownerId: string) => {
    const theirHomes = homes.filter((h) => h.ownerId === ownerId)
    setDraft((d) => ({ ...d, homeownerId: ownerId, homeId: theirHomes.length === 1 ? theirHomes[0].id : theirHomes.some((h) => h.id === d.homeId) ? d.homeId : '' }))
    setErrors((e) => ({ ...e, homeownerId: undefined }))
  }

  const changeType = (type: AgreementType) => {
    // Only the untouched template of a draft follows the type; shared documents and real text are kept.
    setDraft((d) => ({ ...d, type, sections: isDraft && isUntouchedTemplate(d.sections, d.type) ? templateSections(type) : d.sections }))
    setSectionErrors({})
  }

  const fail = (result: { errors: Errors; sectionErrors: SectionErrors }) => {
    setErrors(result.errors)
    setSectionErrors(result.sectionErrors)
    const firstField = (['homeownerId', 'title', 'amount', 'summary'] as const).find((k) => result.errors[k])
    const firstSection = draft.sections.find((s) => result.sectionErrors[s.key])
    const targetId = firstField
      ? `agr-${firstField}`
      : firstSection
        ? `sec-${firstSection.key}-${result.sectionErrors[firstSection.key].field}`
        : result.errors.sections
          ? 'agr-sections'
          : null
    if (!targetId) return false
    // Wait for the error messages to render before moving focus to the first one.
    window.setTimeout(() => {
      const el = document.getElementById(targetId)
      el?.scrollIntoView({ behavior: smoothBehavior(), block: 'center' })
      el?.focus({ preventScroll: true })
    }, 30)
    return true
  }

  /**
   * Runs one action at a time. `fn` returns false when it did nothing (e.g. validation failed): the lock is
   * released at once. Otherwise the button shows its spinner briefly and the second click of a double click
   * is ignored; an action that navigates away (`navigates`) stays locked until this form unmounts.
   */
  const guarded = (kind: Exclude<Pending, null>, fn: () => boolean | void, { navigates = false } = {}) => {
    if (inFlight.current) return
    inFlight.current = true
    setPending(kind)
    let acted = false
    try {
      acted = fn() !== false
    } finally {
      const unlock = () => {
        inFlight.current = false
        setPending(null)
      }
      if (!acted) unlock()
      else if (!navigates) window.setTimeout(unlock, 400)
    }
  }

  const patch = () => ({
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    sections: stripSections(draft.sections),
    amount: draft.amount.trim() ? Number(draft.amount) : undefined,
    type: draft.type,
    homeId: draft.homeId || undefined,
  })

  /* ----- new agreement ----- */
  const create = (share: boolean) =>
    guarded(
      share ? 'create-share' : 'create-draft',
      () => {
        if (fail(validate(draft, share))) return false
        const { homeId, ...rest } = patch()
        const created = createAgreement({ homeownerId: draft.homeownerId, homeId, ...rest, status: share ? shareStatus : 'draft' })
        setBase(draft)
        toast.success(
          share ? `Shared with ${ownerName}` : 'Draft saved',
          share ? (shareStatus === 'awaiting-signature' ? 'They’ve been notified and asked to sign version 1.' : 'They’ve been notified.') : 'Only staff can see drafts. Share it when it’s ready.',
        )
        navigate(`/staff/agreements/${created.id}`, { replace: true })
        return true
      },
      { navigates: true },
    )

  /* ----- existing agreement ----- */
  const saveDraft = () =>
    guarded('save-draft', () => {
      if (!agreement || fail(validate(draft, false))) return false
      updateAgreement(agreement.id, patch(), '')
      setBase(draft)
      toast.success('Draft saved', 'Still private — share it when it’s ready.')
    })

  const shareDraft = () =>
    guarded('share', () => {
      if (!agreement || fail(validate(draft, true))) return false
      // The first share issues version 1 with an owner-facing note ("Issued for your signature" / "Shared with you").
      updateAgreement(agreement.id, { ...patch(), status: shareStatus }, '')
      setBase(draft)
      toast.success(`Shared with ${ownerName}`, shareStatus === 'awaiting-signature' ? 'They’ve been notified and asked to sign version 1.' : 'They’ve been notified.')
    })

  const openSaveChanges = () => {
    if (!agreement || fail(validate(draft, true))) return
    setNoteOpen(true)
  }

  const saveWithNote = (note: string) =>
    guarded('save-version', () => {
      if (!agreement) return false
      const wasSigned = agreement.status === 'signed'
      updateAgreement(agreement.id, patch(), note)
      setBase(draft)
      setNoteOpen(false)
      toast.success(`Saved as version ${agreement.version + 1}`, wasSigned ? `${ownerFirst} has been notified and asked to sign again.` : `${ownerFirst} has been notified.`)
    })

  const sendForSignature = () =>
    guarded('send', () => {
      if (!agreement) return false
      sendAgreementForSignature(agreement.id)
      toast.success(agreement.status === 'awaiting-signature' ? 'Reminder sent' : 'Sent for signature', `${ownerName} has been notified.`)
    })

  const doVoid = (note: string) =>
    guarded('void', () => {
      if (!agreement) return false
      voidAgreement(agreement.id, note || undefined)
      setVoidOpen(false)
      toast.success('Agreement voided', `${ownerName} has been notified.`)
    })

  const remove = async () => {
    if (!agreement || inFlight.current) return
    const ok = await confirmDialog({ title: 'Delete this draft?', description: `“${agreement.title}” will be removed. It was never shared, so ${ownerName} won’t notice.`, confirmLabel: 'Delete draft', tone: 'danger' })
    if (!ok) return
    guarded(
      'delete',
      () => {
        const result = deleteAgreement(agreement.id)
        if (!result.ok) {
          toast.error('Couldn’t delete the draft', result.error)
          return false
        }
        setBase(draft)
        toast.success('Draft deleted', agreement.title)
        navigate('/staff/agreements')
        return true
      },
      { navigates: true },
    )
  }

  const discard = () => {
    setDraft(base)
    setErrors({})
    setSectionErrors({})
    toast.info('Changes discarded')
  }

  const TypeIcon = agreementTypes[draft.type].icon
  const titlePlaceholder = `${agreementTypes[draft.type].label}${home ? ` — ${home.title}` : ''}`
  const ownerHasNoHomes = !!draft.homeownerId && ownerHomes.length === 0

  return (
    <>
      <PageHeader
        back={{ to: '/staff/agreements', label: 'All agreements' }}
        title={<span className="wrap-anywhere">{agreement ? agreement.title : 'New agreement'}</span>}
        description={
          agreement
            ? `${person(agreement.homeownerId)?.label ?? 'Home Owner'}${home ? ` · ${home.title}` : ''}`
            : 'Draft a document for a Home Owner. Drafts stay private until you share them.'
        }
        meta={
          agreement ? (
            <>
              <StatusBadge def={agreementStatus[agreement.status]} size="md" />
              <span className="font-mono text-xs text-ink-500">{agreement.reference}</span>
              {agreement.status === 'draft' ? (
                <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                  <Lock className="size-3.5" aria-hidden /> Private to staff
                </span>
              ) : (
                <span className="text-xs text-ink-500">· Version {agreement.version}</span>
              )}
            </>
          ) : undefined
        }
      />

      {isVoid && (
        <Alert tone="danger" title="This agreement is void" className="mb-6">
          It stays visible to the Home Owner for their records but can no longer be edited or signed. Create a new agreement if something needs to replace it.
        </Alert>
      )}

      <div ref={formRef} className={cn('grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]', optionalTagAA)}>
        <div className="min-w-0 space-y-6">
          <fieldset disabled={isVoid} className="min-w-0 space-y-6">
            <legend className="sr-only">Agreement details</legend>
            <Card>
              <CardHeader
                title="Details"
                icon={<TypeIcon className="size-[18px]" aria-hidden />}
                description={!agreement ? 'Who it’s for and what it covers.' : isDraft ? 'The Home Owner is set when the draft is created.' : 'The Home Owner and home can’t change once the agreement is shared.'}
              />
              <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {agreement ? (
                  <ReadOnlyField label="Home Owner">
                    {ownerRef ? (
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar name={ownerRef.name} size="xs" />
                        <span className="truncate">{ownerRef.label}</span>
                      </span>
                    ) : (
                      'Deleted account'
                    )}
                  </ReadOnlyField>
                ) : (
                  <Field label="Home Owner" required error={errors.homeownerId ?? null} htmlFor="agr-homeownerId">
                    <HomeOwnerSelect
                      id="agr-homeownerId"
                      value={draft.homeownerId}
                      onChange={changeOwner}
                      owners={homeowners}
                      invalid={!!errors.homeownerId}
                      describedBy={errors.homeownerId ? 'agr-homeownerId-error' : undefined}
                    />
                  </Field>
                )}
                {isDraft ? (
                  <Field label="Home" optional htmlFor="agr-homeId" hint={ownerHasNoHomes && !draft.homeId ? 'This Home Owner has no homes yet.' : undefined}>
                    <Select id="agr-homeId" value={draft.homeId} onChange={(e) => set('homeId', e.target.value)} disabled={!draft.homeownerId || homeOptions.length === 0}>
                      <option value="">{draft.homeownerId ? 'Not linked to a home' : 'Choose a Home Owner first'}</option>
                      {homeOptions.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : (
                  <ReadOnlyField label="Home">
                    {home ? (
                      <span className="block truncate">
                        {home.title}
                        {home.removed && <span className="font-normal text-ink-500"> · no longer listed</span>}
                      </span>
                    ) : (
                      <span className="font-normal text-ink-500">Not linked to a home</span>
                    )}
                  </ReadOnlyField>
                )}
                <Field
                  label="Type"
                  htmlFor="agr-type"
                  hint={shareStatus === 'active' ? 'Shared as an active document — no signature needed.' : 'The Home Owner is asked to sign it in their portal.'}
                >
                  <Select id="agr-type" value={draft.type} onChange={(e) => changeType(e.target.value as AgreementType)}>
                    {(Object.keys(agreementTypes) as AgreementType[]).map((t) => (
                      <option key={t} value={t}>
                        {agreementTypes[t].label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Amount" optional error={errors.amount ?? null} htmlFor="agr-amount" hint={!errors.amount && draft.amount && /^\d+(\.\d{1,2})?$/.test(draft.amount) ? formatPrice(Number(draft.amount)) : undefined}>
                  <Input
                    id="agr-amount"
                    inputMode="decimal"
                    value={draft.amount}
                    onChange={(e) => set('amount', e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="28435"
                    leftIcon={<span className="text-sm font-medium text-ink-500">$</span>}
                    aria-invalid={!!errors.amount}
                    aria-describedby={errors.amount ? 'agr-amount-error' : undefined}
                  />
                </Field>
                <Field label="Title" required error={errors.title ?? null} htmlFor="agr-title" className="sm:col-span-2">
                  <Input
                    id="agr-title"
                    value={draft.title}
                    onChange={(e) => set('title', e.target.value)}
                    placeholder={titlePlaceholder}
                    aria-invalid={!!errors.title}
                    aria-describedby={errors.title ? 'agr-title-error' : undefined}
                  />
                </Field>
                <Field label="Summary" error={errors.summary ?? null} htmlFor="agr-summary" className="sm:col-span-2" hint={!errors.summary ? 'One or two sentences in plain language — needed before sharing.' : undefined}>
                  <Textarea
                    id="agr-summary"
                    rows={3}
                    value={draft.summary}
                    onChange={(e) => set('summary', e.target.value)}
                    placeholder="Finish the third-floor loft with a full bath and two skylights."
                    aria-invalid={!!errors.summary}
                    aria-describedby={errors.summary ? 'agr-summary-error' : 'agr-summary-hint'}
                  />
                </Field>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Sections" description="The body of the document, in order. Every shared section needs a heading and text." />
              <CardBody className="space-y-4">
                {draft.sections.length === 0 && <p className="rounded-xl border border-dashed border-ink-300 px-4 py-6 text-center text-sm text-ink-500">No sections yet.</p>}
                <ol className="space-y-4">
                  {draft.sections.map((s, i) => {
                    const problem = sectionErrors[s.key]
                    return (
                      <li key={s.key} className={cn('rounded-xl bg-ink-25 p-4 ring-1 ring-inset sm:p-5', problem ? 'ring-rose-300' : 'ring-ink-200')}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold tracking-wider text-ink-500 uppercase">Section {i + 1}</span>
                          <div className="flex gap-1">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className={tapIcon}
                              disabled={i === 0}
                              onClick={() => setSections((xs) => swap(xs, i, i - 1))}
                              aria-label={`Move section ${i + 1} up`}
                            >
                              <ArrowUp className="size-4" aria-hidden />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className={tapIcon}
                              disabled={i === draft.sections.length - 1}
                              onClick={() => setSections((xs) => swap(xs, i, i + 1))}
                              aria-label={`Move section ${i + 1} down`}
                            >
                              <ArrowDown className="size-4" aria-hidden />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className={cn(tapIcon, 'text-rose-700 hover:bg-rose-50 hover:text-rose-800')}
                              onClick={() => {
                                setSections((xs) => xs.filter((x) => x.key !== s.key))
                                if (problem) setSectionErrors(({ [s.key]: _gone, ...rest }) => rest)
                              }}
                              aria-label={`Remove section ${i + 1}${s.heading ? `, ${s.heading}` : ''}`}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Field label="Heading" htmlFor={`sec-${s.key}-heading`} error={problem?.field === 'heading' ? problem.message : null}>
                            <Input
                              id={`sec-${s.key}-heading`}
                              value={s.heading}
                              onChange={(e) => editSection(s.key, { heading: e.target.value })}
                              placeholder="e.g. Price adjustment"
                              aria-invalid={problem?.field === 'heading' || undefined}
                              aria-describedby={problem?.field === 'heading' ? `sec-${s.key}-heading-error` : undefined}
                            />
                          </Field>
                          <Field label="Text" htmlFor={`sec-${s.key}-body`} error={problem?.field === 'body' ? problem.message : null}>
                            <Textarea
                              id={`sec-${s.key}-body`}
                              rows={3}
                              value={s.body}
                              onChange={(e) => editSection(s.key, { body: e.target.value })}
                              aria-invalid={problem?.field === 'body' || undefined}
                              aria-describedby={problem?.field === 'body' ? `sec-${s.key}-body-error` : undefined}
                            />
                          </Field>
                        </div>
                      </li>
                    )
                  })}
                </ol>
                {errors.sections && (
                  <p id="agr-sections" tabIndex={-1} className="text-sm text-rose-600" role="alert">
                    {errors.sections}
                  </p>
                )}
                <Button
                  variant="secondary"
                  leftIcon={<Plus className="size-4" aria-hidden />}
                  onClick={() => {
                    const key = uid('sec')
                    setSections((xs) => [...xs, { key, heading: '', body: '' }])
                    window.setTimeout(() => document.getElementById(`sec-${key}-heading`)?.focus(), 30)
                  }}
                >
                  Add section
                </Button>
              </CardBody>
            </Card>
          </fieldset>

          {!isVoid && (
            <ActionBar
              agreement={agreement}
              dirty={dirty}
              pending={pending}
              shareStatus={shareStatus}
              errorCount={Object.values(errors).filter(Boolean).length + Object.keys(sectionErrors).length}
              onCreateDraft={() => create(false)}
              onCreateShare={() => create(true)}
              onSaveDraft={saveDraft}
              onShareDraft={shareDraft}
              onSaveChanges={openSaveChanges}
              onSend={sendForSignature}
              onVoid={() => setVoidOpen(true)}
              onDelete={remove}
              onDiscard={discard}
            />
          )}
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Agreement status and preview">
          {agreement && <StatusCard agreement={agreement} />}
          {agreement && agreement.status !== 'draft' && <HistoryCard agreement={agreement} />}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Eye className="size-4 text-ink-400" aria-hidden /> Home Owner preview
            </h2>
            <AgreementPreview
              type={draft.type}
              title={draft.title || titlePlaceholder}
              reference={agreement?.reference}
              amount={draft.amount.trim() && !Number.isNaN(Number(draft.amount)) ? Number(draft.amount) : undefined}
              summary={draft.summary}
              sections={draft.sections}
              ownerName={ownerRef?.name}
              homeTitle={home?.title}
              status={agreement ? (dirty && agreement.status === 'signed' ? 'awaiting-signature' : agreement.status) : 'draft'}
              version={agreement && agreement.status !== 'draft' ? agreement.version + (dirty ? 1 : 0) : 1}
              signatureName={!dirty ? agreement?.signatureName : undefined}
              signedAt={!dirty ? agreement?.signedAt : undefined}
            />
            {isDraft ? (
              <p className="mt-2 text-xs text-ink-500">Drafts are private. The Home Owner first sees it as version 1 when you share it.</p>
            ) : (
              dirty && agreement && <p className="mt-2 text-xs text-ink-500">Showing your unsaved edits as version {agreement.version + 1}.</p>
            )}
          </div>
        </aside>
      </div>

      {noteOpen && agreement && <ChangeNoteModal agreement={agreement} ownerName={ownerName} saving={pending === 'save-version'} onClose={() => setNoteOpen(false)} onSave={saveWithNote} />}
      {voidOpen && agreement && <VoidModal ownerName={ownerName} saving={pending === 'void'} onClose={() => setVoidOpen(false)} onVoid={doVoid} />}
    </>
  )
}

function swap<T>(xs: T[], i: number, j: number): T[] {
  if (j < 0 || j >= xs.length) return xs
  const next = [...xs]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

/** A value shown like a form field but not editable (e.g. the Home Owner of an existing agreement). */
function ReadOnlyField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-sm font-medium text-ink-800">{label}</p>
      <div className="flex min-h-[42px] min-w-0 items-center rounded-lg bg-ink-50 px-3 py-2 text-sm font-medium text-ink-900 ring-1 ring-ink-200 ring-inset">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Action bar                                                           */
/* ------------------------------------------------------------------ */

function ActionBar({
  agreement,
  dirty,
  pending,
  shareStatus,
  errorCount,
  onCreateDraft,
  onCreateShare,
  onSaveDraft,
  onShareDraft,
  onSaveChanges,
  onSend,
  onVoid,
  onDelete,
  onDiscard,
}: {
  agreement?: Agreement
  dirty: boolean
  pending: Pending
  shareStatus: 'active' | 'awaiting-signature'
  errorCount: number
  onCreateDraft: () => void
  onCreateShare: () => void
  onSaveDraft: () => void
  onShareDraft: () => void
  onSaveChanges: () => void
  onSend: () => void
  onVoid: () => void
  onDelete: () => void
  onDiscard: () => void
}) {
  const shareLabel = shareStatus === 'awaiting-signature' ? 'Send for signature' : 'Share with Home Owner'
  const status = agreement?.status
  const busy = pending !== null
  /** Spinner on the button that's running; every other action waits. */
  const act = (kind: Exclude<Pending, null>) => ({ loading: pending === kind, disabled: busy && pending !== kind })

  let left: ReactNode = null
  let right: ReactNode
  if (!agreement) {
    left = <p className="text-sm text-ink-600">Not saved yet — drafts are private.</p>
    right = (
      <>
        <Button variant="secondary" onClick={onCreateDraft} {...act('create-draft')}>
          Save draft
        </Button>
        <Button onClick={onCreateShare} leftIcon={<Send className="size-4" aria-hidden />} {...act('create-share')}>
          {shareLabel}
        </Button>
      </>
    )
  } else if (status === 'draft') {
    left = (
      <Button variant="ghost" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={onDelete} leftIcon={<Trash2 className="size-4" aria-hidden />} {...act('delete')}>
        Delete draft
      </Button>
    )
    right = (
      <>
        <Button variant="secondary" onClick={onSaveDraft} loading={pending === 'save-draft'} disabled={!dirty || (busy && pending !== 'save-draft')}>
          Save draft
        </Button>
        <Button onClick={onShareDraft} leftIcon={<Send className="size-4" aria-hidden />} {...act('share')}>
          {shareLabel}
        </Button>
      </>
    )
  } else {
    left = (
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={onVoid} disabled={dirty || busy} leftIcon={<Ban className="size-4" aria-hidden />}>
          Void
        </Button>
        {(status === 'awaiting-signature' || status === 'active') && (
          <Button variant="ghost" onClick={onSend} loading={pending === 'send'} disabled={dirty || (busy && pending !== 'send')} leftIcon={<BellRing className="size-4" aria-hidden />}>
            {status === 'awaiting-signature' ? 'Send reminder' : 'Request signature'}
          </Button>
        )}
      </div>
    )
    right = (
      <>
        {dirty && (
          <Button variant="ghost" onClick={onDiscard} disabled={busy}>
            Discard
          </Button>
        )}
        <Button onClick={onSaveChanges} disabled={!dirty || busy}>
          Save changes
        </Button>
      </>
    )
  }

  let message: ReactNode = left
  if (errorCount) message = <p className="text-sm font-medium text-rose-700">{errorCount === 1 ? '1 field needs attention' : `${errorCount} fields need attention`}</p>
  else if (dirty && agreement)
    message = (
      <p className="inline-flex items-center gap-2 text-sm font-medium text-amber-800">
        <span className="size-2 rounded-full bg-amber-500" aria-hidden /> Unsaved changes
      </p>
    )

  return (
    <div data-sticky-actions className="sticky bottom-3 z-20 rounded-2xl bg-white/95 px-4 py-3 shadow-pop ring-1 ring-ink-200 backdrop-blur sm:bottom-5 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0" aria-live="polite">
          {message}
        </div>
        <div className="flex flex-wrap gap-2 [&>button]:max-sm:flex-1">{right}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Side panel                                                           */
/* ------------------------------------------------------------------ */

function StatusCard({ agreement: a }: { agreement: Agreement }) {
  const person = usePersonLookup()
  const me = useCurrentUser()
  const owner = person(a.homeownerId)
  const ownerName = owner?.name ?? 'The Home Owner'
  const byId = a.status === 'draft' ? a.history[0]?.byUserId ?? a.updatedByUserId : a.updatedByUserId
  const name = (id: string) => (id === me?.id ? 'you' : person(id)?.label ?? 'someone')
  const seen = a.seenVersion ?? 0

  return (
    <Card>
      <CardHeader title="Status" />
      <CardBody className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge def={agreementStatus[a.status]} size="md" />
          {a.status !== 'draft' && <span className="text-ink-600">Version {a.version}</span>}
        </div>

        {a.status === 'signed' && a.signatureName ? (
          <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200 ring-inset">
            <p className="text-xs font-semibold tracking-wider text-emerald-800 uppercase">Signed by {person(a.signedByUserId ?? a.homeownerId)?.label ?? ownerName}</p>
            <p className="mt-1 font-display text-2xl text-ink-900 italic wrap-anywhere">{a.signatureName}</p>
            {a.signedAt && (
              <p className="mt-1 text-xs text-emerald-900">
                <time dateTime={a.signedAt} title={formatDateTime(a.signedAt)}>
                  {formatDateTime(a.signedAt)} · {formatRelative(a.signedAt)}
                </time>
              </p>
            )}
          </div>
        ) : a.status === 'draft' ? (
          <>
            <p className="text-ink-600">
              Started by <span className="font-medium text-ink-900">{name(byId)}</span> {formatRelative(a.createdAt)}
              {a.updatedAt !== a.createdAt && <> · last saved {formatRelative(a.updatedAt)}</>}.
            </p>
            <p className="flex items-center gap-2 text-ink-600">
              <Lock className="size-4 shrink-0 text-ink-400" aria-hidden /> Private — not shared with {ownerName} yet.
            </p>
          </>
        ) : (
          <>
            <p className="flex items-start gap-2 text-ink-600">
              <PenLine className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
              <span>
                Last {a.status === 'void' ? 'changed' : 'updated'} by <span className="font-medium text-ink-900">{name(byId)}</span> {formatRelative(a.updatedAt)}.
              </span>
            </p>
            {a.status !== 'void' && (
              <p className="flex items-start gap-2 text-ink-600">
                {seen >= a.version ? <Eye className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden /> : <EyeOff className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />}
                <span>
                  {seen >= a.version
                    ? `${ownerName} has seen version ${a.version}.`
                    : seen > 0
                      ? `${ownerName} last opened version ${seen} — not version ${a.version} yet.`
                      : `${ownerName} hasn’t opened it yet.`}
                </span>
              </p>
            )}
          </>
        )}
        {a.amount != null && (
          <p className="flex items-baseline justify-between border-t border-ink-100 pt-4">
            <span className="text-ink-500">Amount</span>
            <span className="text-base font-semibold text-ink-900 tabular-nums">{formatPrice(a.amount)}</span>
          </p>
        )}
      </CardBody>
    </Card>
  )
}

function HistoryCard({ agreement: a }: { agreement: Agreement }) {
  const person = usePersonLookup()
  const entries = [...a.history].reverse()
  return (
    <Card>
      <CardHeader title="Version history" description="What the Home Owner sees in their portal." icon={<History className="size-[18px]" aria-hidden />} />
      <CardBody>
        <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-ink-200">
          {entries.map((h, i) => {
            const by = person(h.byUserId)
            return (
              <li key={`${h.version}-${h.at}-${i}`} className="relative flex gap-3">
                <span
                  className={cn(
                    'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ring-4 ring-white',
                    i === 0 ? 'bg-brand-900 text-white' : 'bg-ink-100 text-ink-700',
                  )}
                >
                  v{h.version}
                </span>
                <div className="min-w-0 pt-1 text-sm">
                  <p className="font-medium text-ink-900 wrap-anywhere">{h.note}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                    <Avatar name={by?.name ?? '?'} size="xs" className="size-4 text-[8px]" />
                    {by?.label ?? 'Someone'} · <time dateTime={h.at}>{formatDate(h.at)}</time>
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Dialogs                                                              */
/* ------------------------------------------------------------------ */

function ChangeNoteModal({ agreement: a, ownerName, saving, onClose, onSave }: { agreement: Agreement; ownerName: string; saving: boolean; onClose: () => void; onSave: (note: string) => void }) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const next = a.version + 1
  const submit = () => {
    if (!note.trim()) {
      setError('Describe the change so the Home Owner knows what’s different.')
      return
    }
    onSave(note.trim())
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={`Save as version ${next}`}
      description={`${ownerName} will be notified and will see version ${next} in their portal.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep editing
          </Button>
          <Button onClick={submit} loading={saving}>
            Save version {next}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {a.status === 'signed' && (
          <Alert tone="warning" title="This agreement is already signed">
            Saving changes moves it back to “Awaiting signature” — {firstName(ownerName)} will need to sign version {next}.
          </Alert>
        )}
        {a.status === 'awaiting-signature' && <Alert tone="info">The signature request stays open and now applies to version {next}.</Alert>}
        <Field label="What changed?" required error={error} htmlFor="agr-change-note" hint={!error ? 'Shown in the version history and in the Home Owner’s notification.' : undefined}>
          <Textarea
            id="agr-change-note"
            rows={3}
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              if (error) setError(null)
            }}
            placeholder="Added skylights and updated the price"
            aria-invalid={!!error}
            aria-describedby={error ? 'agr-change-note-error' : 'agr-change-note-hint'}
            data-autofocus
          />
        </Field>
      </div>
    </Modal>
  )
}

function VoidModal({ ownerName, saving, onClose, onVoid }: { ownerName: string; saving: boolean; onClose: () => void; onVoid: (note: string) => void }) {
  const [note, setNote] = useState('')
  return (
    <Modal
      open
      onClose={onClose}
      title="Void this agreement?"
      description={`It stays in ${ownerName}’s portal marked as void, and can’t be signed or edited again.`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => onVoid(note.trim())} loading={saving} leftIcon={<Ban className="size-4" aria-hidden />}>
            Void agreement
          </Button>
        </>
      }
    >
      <Field label="Reason" optional htmlFor="agr-void-note" hint="Shared with the Home Owner and kept in the version history." className={optionalTagAA}>
        <Textarea id="agr-void-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Replaced by Change Order #4" aria-describedby="agr-void-note-hint" data-autofocus />
      </Field>
    </Modal>
  )
}
