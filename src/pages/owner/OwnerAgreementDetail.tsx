import { useEffect, useMemo, useRef, useState, type FormEvent, type Ref } from 'react'
import { Link, useParams } from 'react-router'
import { CheckCircle2, Eye, FileText, History, Home as HomeIcon, PenLine, Phone, Printer, Sparkles } from 'lucide-react'
import type { Agreement, AgreementType, User } from '@/types'
import { cn } from '@/lib/cn'
import { collapseSpaces, sleep, useDocumentTitle } from '@/lib/utils'
import { formatDate, formatDateTime, formatPrice } from '@/lib/format'
import { agreementStatus, agreementTypes } from '@/data/labels'
import { useAppStore } from '@/store'
import { useCurrentUser, useHomeLookup, useImpersonator, useOffice, usePersonLookup, useSettings } from '@/store/hooks'
import { toast } from '@/store/ui'
import { Alert, Badge, Button, Card, CardBody, CardHeader, Checkbox, Field, Input, StatusBadge, smoothBehavior } from '@/components/ui'
import { PageHeader } from '@/components/portal/PageHeader'
import { DetailList, NotFoundPanel, signatureFontStyle } from './components/ui'
import { firstName } from './components/data'

const amountLabels: Partial<Record<AgreementType, string>> = {
  purchase: 'Purchase price',
  construction: 'Contract price',
  'change-order': 'Change to contract price',
}

/** Print only the document: hide the portal chrome, the sidebar and on-screen notices. */
const printCss = `@media print {
  @page { margin: 14mm; }
  body { background: #fff !important; }
  aside, header, [data-print-hide], [data-impersonating] { display: none !important; }
  main { padding: 0 !important; max-width: none !important; }
}`

export default function OwnerAgreementDetail() {
  const { id } = useParams()
  const user = useCurrentUser()
  const agreement = useAppStore((s) => s.agreements.find((a) => a.id === id))
  const visible = agreement && user && agreement.homeownerId === user.id && agreement.status !== 'draft' ? agreement : undefined
  useDocumentTitle(visible?.title ?? 'Agreement not found')

  if (!user) return null
  if (!visible) {
    return (
      <NotFoundPanel
        title="Agreement not found"
        description="This agreement doesn’t exist or isn’t shared with your account. If you were expecting a document, please contact your Wakefield team."
        backTo="/owner/agreements"
        backLabel="All agreements"
      />
    )
  }
  // Keyed so the "was updated" banner and the signing form reset per document.
  return <AgreementView key={visible.id} agreement={visible} owner={user} />
}

function AgreementView({ agreement, owner }: { agreement: Agreement; owner: User }) {
  const person = usePersonLookup()
  const homeRef = useHomeLookup()(agreement.homeId)
  const settings = useSettings()
  const office = useOffice()
  const impersonator = useImpersonator()
  const markSeen = useAppStore((s) => s.markAgreementSeen)

  // What the owner had seen before this visit (captured before it's marked as seen).
  const [seenBefore] = useState(() => agreement.seenVersion ?? (agreement.seenByOwner ? agreement.version : 0))
  const [justSigned, setJustSigned] = useState(false)
  useEffect(() => {
    // The store ignores this while a Super Admin is viewing as the owner.
    markSeen(agreement.id)
  }, [agreement.id, markSeen])

  const type = agreementTypes[agreement.type]
  const TypeIcon = type.icon
  const latest = agreement.history[agreement.history.length - 1]
  const issuer = person(agreement.history[0]?.byUserId ?? agreement.updatedByUserId)
  const nameOf = (userId: string) => person(userId)?.name ?? 'Wakefield Homes'
  const awaiting = agreement.status === 'awaiting-signature'
  const esignOn = settings.features.agreementsEsign
  const canSign = awaiting && esignOn
  // "View as" shows the owner's page, but only the owner can sign (the store refuses it too).
  const ownerSigns = canSign && !impersonator
  const wasNew = seenBefore === 0
  const wasUpdated = seenBefore > 0 && seenBefore < agreement.version

  const signRef = useRef<HTMLDivElement>(null)
  const goToSignature = () => {
    signRef.current?.scrollIntoView({ behavior: smoothBehavior(), block: 'start' })
    window.setTimeout(() => document.getElementById('signature-name')?.focus({ preventScroll: true }), 350)
  }

  // After signing, the form is replaced by the confirmation at the top: take focus there.
  const signedRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!justSigned) return
    window.scrollTo({ top: 0, behavior: smoothBehavior() })
    signedRef.current?.focus({ preventScroll: true })
  }, [justSigned])

  const events = useMemo(() => {
    const list = agreement.history.map((h) => ({
      key: `v${h.version}-${h.at}`,
      title: `Version ${h.version}`,
      note: h.note,
      by: person(h.byUserId)?.name ?? 'Wakefield Homes',
      at: h.at,
      current: false,
    }))
    if (agreement.signedAt) {
      const signer = agreement.signatureName ?? owner.name
      list.push({ key: 'signed', title: 'Signed', note: `Signed electronically by ${signer}`, by: signer, at: agreement.signedAt, current: false })
    }
    const sorted = list.sort((a, b) => b.at.localeCompare(a.at))
    const newestVersion = sorted.find((e) => e.title === `Version ${agreement.version}`)
    if (newestVersion) newestVersion.current = true
    return sorted
  }, [agreement, person, owner.name])

  const property = homeRef ? (
    <>
      <span className="wrap-anywhere">{homeRef.title}</span>
      <br />
      {homeRef.address}, {homeRef.city}
      {homeRef.removed && <span className="mt-1 block text-xs text-ink-500">This home is no longer listed in the portal.</span>}
    </>
  ) : (
    'All homes on this account'
  )

  return (
    <>
      <style>{printCss}</style>
      <div data-print-hide>
        <PageHeader
          back={{ to: '/owner/agreements', label: 'All agreements' }}
          title={<span className="wrap-anywhere">{agreement.title}</span>}
          meta={
            <>
              <StatusBadge def={agreementStatus[agreement.status]} size="md" />
              <Badge size="md" tone="neutral">
                Version {agreement.version}
              </Badge>
              <span className="text-sm text-ink-600 tabular-nums">Ref. {agreement.reference}</span>
            </>
          }
          actions={
            <>
              {/* On phones and tablets the signature box is far below: offer the jump at the top (the side card does it on desktop). */}
              {ownerSigns && (
                <Button onClick={goToSignature} leftIcon={<PenLine className="size-4" aria-hidden />} className="lg:hidden">
                  Review &amp; sign
                </Button>
              )}
              <Button variant="secondary" leftIcon={<Printer className="size-4" aria-hidden />} onClick={() => window.print()}>
                Print
              </Button>
            </>
          }
        />
      </div>

      {justSigned && (
        <div ref={signedRef} tabIndex={-1} data-focus-target className="mb-6 outline-none print:hidden">
          <Alert tone="success" title="Signed — thank you">
            Your signature was added on {formatDateTime(agreement.signedAt ?? new Date().toISOString())}. The Wakefield team has been notified and a copy stays in My Agreements.
          </Alert>
        </div>
      )}

      {(wasNew || wasUpdated) && latest && !justSigned && (
        <div data-print-hide className="mb-6 flex gap-3 rounded-2xl bg-lavender-50 p-4 ring-1 ring-lavender-200 ring-inset sm:p-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#3f43a8] ring-1 ring-lavender-200" aria-hidden>
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-ink-900">
              {wasUpdated ? 'Updated' : 'Shared'} by {nameOf(latest.byUserId)} on {formatDate(latest.at)}: <span className="font-normal wrap-anywhere text-ink-800">{latest.note}</span>
            </p>
            <p className="mt-1 text-ink-600">
              You’re viewing version {agreement.version}
              {awaiting
                ? ownerSigns
                  ? ' — please review it and sign below.'
                  : canSign
                    ? ` — ${firstName(owner.name)} signs it from their own account.`
                    : ' — please review it; the office will arrange your signature.'
                : ', the current version.'}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-6">
          {/* The document */}
          <article className="rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70 print:rounded-none print:shadow-none print:ring-0" aria-labelledby="doc-title">
            <div className="border-b border-ink-100 px-6 py-6 sm:px-10 sm:py-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-xl font-semibold text-brand-900" style={{ fontVariationSettings: "'opsz' 72, 'SOFT' 50" }}>
                    Wakefield Homes
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">{settings.office.address}</p>
                </div>
                <div className="text-left text-xs text-ink-500 sm:text-right">
                  <p>Reference</p>
                  <p className="text-sm font-semibold text-ink-900 tabular-nums">{agreement.reference}</p>
                  <p className="mt-1">
                    Version {agreement.version} · {formatDate(latest?.at ?? agreement.updatedAt)}
                  </p>
                </div>
              </div>
              <p className="mt-8 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-brand-700 uppercase">
                <TypeIcon className="size-4" aria-hidden /> {type.label}
              </p>
              <h2 id="doc-title" className="display-heading mt-2 text-2xl wrap-anywhere sm:text-3xl">
                {agreement.title}
              </h2>
              <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium tracking-wide text-ink-500 uppercase">Between</dt>
                  <dd className="mt-1 text-ink-800">
                    {settings.office.name}
                    <br />
                    and {owner.name}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs font-medium tracking-wide text-ink-500 uppercase">Property</dt>
                  <dd className="mt-1 text-ink-800">{property}</dd>
                </div>
              </dl>
            </div>

            <div className="px-6 py-6 sm:px-10 sm:py-8">
              <p className="text-base leading-7 text-user text-ink-700">{agreement.summary}</p>
              <ol className="mt-8 space-y-6">
                {agreement.sections.map((section, i) => (
                  <li key={`${i}-${section.heading}`} className="flex gap-4 break-inside-avoid">
                    <span className="w-6 shrink-0 pt-px text-sm font-semibold text-brand-800 tabular-nums">{i + 1}.</span>
                    <div className="min-w-0">
                      <h3 className="font-semibold wrap-anywhere text-ink-900">{section.heading}</h3>
                      <p className="mt-1.5 leading-7 text-user text-ink-700">{section.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {agreement.amount != null && (
                <div className="mt-8 flex break-inside-avoid flex-wrap items-center justify-between gap-2 rounded-xl bg-ink-50 px-5 py-4 ring-1 ring-ink-200/70 ring-inset">
                  <span className="text-sm font-medium text-ink-700">{amountLabels[agreement.type] ?? 'Amount'}</span>
                  <span className="text-xl font-semibold text-ink-900 tabular-nums">
                    {agreement.type === 'change-order' && agreement.amount > 0 ? '+' : ''}
                    {formatPrice(agreement.amount)}
                  </span>
                </div>
              )}
            </div>

            <div className="grid break-inside-avoid gap-8 border-t border-ink-100 px-6 py-6 sm:grid-cols-2 sm:px-10 sm:py-8">
              <div className="min-w-0">
                <div className="flex h-16 items-end border-b border-ink-300 pb-1.5">
                  {agreement.signatureName ? (
                    <span style={signatureFontStyle} className="truncate text-[1.75rem] leading-none text-brand-950">
                      {agreement.signatureName}
                    </span>
                  ) : (
                    <span className="text-sm text-ink-500 italic">
                      {awaiting ? 'Awaiting your signature' : agreement.status === 'void' ? 'Void — not to be signed' : 'No signature required'}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-ink-900">{owner.name}</p>
                <p className="text-xs text-ink-500">
                  Home Owner{agreement.signedAt ? ` · Signed electronically ${formatDateTime(agreement.signedAt)}` : ''}
                </p>
              </div>
              <div className="min-w-0">
                <div className="flex h-16 items-end border-b border-ink-300 pb-1.5">
                  <span className="font-display text-lg font-semibold text-brand-900">{settings.office.name}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-ink-900">Issued by {issuer?.name ?? 'Wakefield Homes'}</p>
                <p className="text-xs text-ink-500">
                  {issuer?.user?.title ? `${issuer.user.title} · ` : ''}
                  {formatDate(agreement.createdAt)}
                </p>
              </div>
            </div>
          </article>

          {canSign && (
            <SigningCard
              ref={signRef}
              agreement={agreement}
              owner={owner}
              viewingAs={impersonator ? { admin: impersonator.name } : null}
              onSigned={() => setJustSigned(true)}
            />
          )}

          {awaiting && !esignOn && (
            <Alert tone="info" title="Sign with the Wakefield office" className="print:hidden">
              Electronic signing is turned off right now. Call{' '}
              <a href={`tel:${office.phone}`} className="font-semibold underline">
                {office.phoneDisplay}
              </a>{' '}
              to arrange your signature.
            </Alert>
          )}
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24" aria-label="Agreement details">
          {ownerSigns && (
            <div className="hidden rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200 ring-inset lg:block">
              <p className="flex items-center gap-2 font-semibold text-amber-950">
                <PenLine className="size-4 text-amber-700" aria-hidden /> Your signature is needed
              </p>
              <p className="mt-1 text-sm text-amber-900">Read the document, then sign with your full legal name.</p>
              <Button className="mt-4 w-full" onClick={goToSignature} leftIcon={<PenLine className="size-4" aria-hidden />}>
                Review &amp; sign
              </Button>
            </div>
          )}
          {canSign && impersonator && (
            <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200 ring-inset">
              <p className="flex items-center gap-2 font-semibold text-amber-950">
                <Eye className="size-4 text-amber-700" aria-hidden /> Waiting for {firstName(owner.name)}’s signature
              </p>
              <p className="mt-1 text-sm text-amber-900">Only {owner.name} can sign this agreement. Signing is turned off while you view the portal as someone else.</p>
            </div>
          )}

          <Card>
            <CardHeader title="Details" icon={<FileText className="size-[18px]" aria-hidden />} />
            <CardBody>
              <DetailList
                items={[
                  { label: 'Status', value: <StatusBadge def={agreementStatus[agreement.status]} /> },
                  { label: 'Type', value: type.label },
                  { label: 'Reference', value: <span className="tabular-nums">{agreement.reference}</span> },
                  { label: 'Version', value: agreement.version },
                  ...(agreement.amount != null ? [{ label: amountLabels[agreement.type] ?? 'Amount', value: <span className="tabular-nums">{formatPrice(agreement.amount)}</span> }] : []),
                  {
                    label: 'Home',
                    value: homeRef?.home ? (
                      <Link to={`/owner/homes/${homeRef.home.id}`} className="inline-flex items-center gap-1 text-brand-800 hover:underline">
                        <HomeIcon className="size-3.5 shrink-0" aria-hidden />
                        <span className="wrap-anywhere">{homeRef.title}</span>
                      </Link>
                    ) : homeRef ? (
                      <span className="wrap-anywhere">{homeRef.title} (no longer listed)</span>
                    ) : (
                      'All homes'
                    ),
                  },
                  { label: 'Issued', value: formatDate(agreement.createdAt) },
                  { label: 'Last updated', value: `${formatDate(latest?.at ?? agreement.updatedAt)} by ${nameOf(latest?.byUserId ?? agreement.updatedByUserId)}` },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Version history" icon={<History className="size-[18px]" aria-hidden />} />
            <CardBody>
              <ol className="relative space-y-5 border-l border-ink-200 pl-5">
                {events.map((ev) => (
                  <li key={ev.key} className="relative">
                    <span
                      className={cn('absolute top-1.5 -left-[25.5px] size-2.5 rounded-full ring-4 ring-white', ev.title === 'Signed' ? 'bg-emerald-500' : ev.current ? 'bg-brand-700' : 'bg-ink-300')}
                      aria-hidden
                    />
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
                      {ev.title}
                      {ev.current && <Badge tone="brand">Current</Badge>}
                    </p>
                    <p className="mt-0.5 text-sm text-user text-ink-700">{ev.note}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {ev.title === 'Signed' ? '' : `${ev.by} · `}
                      {formatDateTime(ev.at)}
                    </p>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  )
}

function SigningCard({
  ref,
  agreement,
  owner,
  viewingAs,
  onSigned,
}: {
  ref: Ref<HTMLDivElement>
  agreement: Agreement
  owner: User
  /** Set while a Super Admin is viewing as the owner: the form is shown as the owner sees it, but can't be used. */
  viewingAs: { admin: string } | null
  onSigned: () => void
}) {
  const signAgreement = useAppStore((s) => s.signAgreement)
  const type = agreementTypes[agreement.type]
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [consentError, setConsentError] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const typed = collapseSpaces(name)
  const legalName = collapseSpaces(owner.name)
  const locked = !!viewingAs

  const sign = async (e: FormEvent) => {
    e.preventDefault()
    if (signing || locked) return
    if (!typed) {
      setNameError('Type your full legal name to sign.')
      document.getElementById('signature-name')?.focus()
      return
    }
    if (typed.toLowerCase() !== legalName.toLowerCase()) {
      setNameError(`Please type your full legal name exactly as it appears on the agreement: ${owner.name}.`)
      document.getElementById('signature-name')?.focus()
      return
    }
    if (!consent) {
      setConsentError('Please confirm you agree to sign electronically.')
      document.getElementById('signature-consent')?.focus()
      return
    }
    setSigning(true)
    await sleep(500)
    // The typed name matched; the signature uses the name exactly as it is on the account ("daniel  ellis" signs as "Daniel Ellis").
    const result = signAgreement(agreement.id, legalName)
    if (!result.ok) {
      setSigning(false)
      toast.error('The agreement wasn’t signed', result.error)
      return
    }
    onSigned()
    toast.success('Agreement signed', `${agreement.title} — your Wakefield team has been notified.`)
  }

  return (
    <div ref={ref} id="sign" data-print-hide className="scroll-mt-24">
      <Card className={cn('ring-2', locked ? 'ring-ink-200' : 'ring-amber-300/80')}>
        <CardHeader
          icon={<PenLine className="size-[18px]" aria-hidden />}
          title="Review and sign"
          description={`Type your full legal name to sign this ${type.label.toLowerCase()} (version ${agreement.version}) electronically.`}
        />
        <CardBody>
          {viewingAs && (
            <Alert tone="warning" title={`Only ${owner.name} can sign this agreement`} className="mb-5">
              You’re viewing the portal as {firstName(owner.name)}, so this is the form {firstName(owner.name)} sees. E-signing is turned off while you view as someone else — {firstName(owner.name)} signs from their own account.
            </Alert>
          )}
          <form onSubmit={sign} noValidate>
            <fieldset disabled={locked} className="space-y-5 disabled:opacity-60">
              <legend className="sr-only">Sign {agreement.title}</legend>
              <Field label="Full legal name" htmlFor="signature-name" required error={nameError} hint={`As it appears on the agreement: ${owner.name}`}>
                <Input
                  id="signature-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (nameError) setNameError(null)
                  }}
                  autoComplete="name"
                  placeholder={owner.name}
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? 'signature-name-error' : 'signature-name-hint'}
                  className="h-11 text-base"
                />
              </Field>

              <div className="rounded-xl border border-dashed border-ink-300 bg-ink-25 px-5 pt-3 pb-4">
                <p className="text-xs font-medium text-ink-500">Signature preview</p>
                <div className="mt-2 flex min-h-12 items-end border-b border-ink-300 pb-1">
                  {typed ? (
                    <p style={signatureFontStyle} className="truncate text-[2rem] leading-tight text-brand-950">
                      {typed.toLowerCase() === legalName.toLowerCase() ? legalName : typed}
                    </p>
                  ) : (
                    <p className="pb-1 text-sm text-ink-500 italic">Your signature appears here as you type.</p>
                  )}
                </div>
              </div>

              <div>
                <Checkbox
                  id="signature-consent"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked)
                    if (consentError) setConsentError(null)
                  }}
                  aria-invalid={!!consentError}
                  aria-describedby={consentError ? 'signature-consent-error' : undefined}
                  label="I agree to sign electronically"
                  description={`I have read ${agreement.title} (version ${agreement.version}) and agree to its terms. My typed name is my signature.`}
                />
                {consentError && (
                  <p id="signature-consent-error" role="alert" className="mt-1.5 ml-7 text-sm text-rose-600">
                    {consentError}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-ink-500">
                  Signing as {owner.email} · {formatDate(new Date())}
                </p>
                <Button type="submit" size="lg" loading={signing} leftIcon={<CheckCircle2 className="size-5" aria-hidden />}>
                  Sign {type.label.toLowerCase()}
                </Button>
              </div>
            </fieldset>
          </form>
        </CardBody>
      </Card>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
        <Phone className="size-3.5" aria-hidden /> Questions before you sign? Your Wakefield team is happy to walk you through it.
      </p>
    </div>
  )
}
