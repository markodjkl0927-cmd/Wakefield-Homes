import type { AgreementSection, AgreementStatus, AgreementType } from '@/types'
import { agreementStatus, agreementTypes } from '@/data/labels'
import { formatDate, formatPrice } from '@/lib/format'
import { StatusBadge } from '@/components/ui'

/** How the agreement reads in the Home Owner portal — rendered live from the editor's form state. */
export function AgreementPreview({
  type,
  title,
  reference,
  amount,
  summary,
  sections,
  ownerName,
  homeTitle,
  status,
  version,
  signatureName,
  signedAt,
}: {
  type: AgreementType
  title: string
  reference?: string
  amount?: number
  summary: string
  sections: AgreementSection[]
  ownerName?: string
  homeTitle?: string
  status: AgreementStatus
  version: number
  signatureName?: string
  signedAt?: string
}) {
  const TypeIcon = agreementTypes[type].icon
  const filled = sections.filter((s) => s.heading.trim() || s.body.trim())
  return (
    <article className="overflow-hidden rounded-xl bg-white text-ink-800 shadow-card ring-1 ring-ink-200" aria-label="Home Owner preview of the agreement">
      <header className="border-b border-ink-100 bg-gradient-to-b from-brand-50 to-white px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-lg leading-none font-semibold text-brand-900">
            Wakefield <span className="font-sans text-[10px] font-semibold tracking-[0.3em] text-brand-700 uppercase">Homes</span>
          </p>
          <StatusBadge def={agreementStatus[status]} />
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-xs font-medium tracking-wide text-ink-500 uppercase">
          <TypeIcon className="size-3.5" aria-hidden /> {agreementTypes[type].label}
          {reference && <span className="normal-case"> · {reference}</span>}
          <span className="normal-case"> · v{version}</span>
        </p>
      </header>
      <div className="space-y-4 px-5 py-5 text-sm leading-6">
        <h3 className="font-display text-xl leading-snug font-semibold text-ink-900 wrap-anywhere">{title.trim() || 'Untitled agreement'}</h3>
        <dl className="grid grid-cols-2 gap-3 rounded-lg bg-ink-50 p-3 text-xs">
          <div className="min-w-0">
            <dt className="text-ink-500">Prepared for</dt>
            <dd className="mt-0.5 font-medium text-ink-900">{ownerName || '—'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-ink-500">Home</dt>
            <dd className="mt-0.5 font-medium text-ink-900">{homeTitle || '—'}</dd>
          </div>
          {amount != null && (
            <div className="col-span-2">
              <dt className="text-ink-500">Amount</dt>
              <dd className="mt-0.5 text-base font-semibold text-ink-900 tabular-nums">{formatPrice(amount)}</dd>
            </div>
          )}
        </dl>
        {summary.trim() ? <p className="text-user text-ink-700">{summary}</p> : <p className="text-ink-500 italic">The summary appears here.</p>}
        {filled.length > 0 && (
          <ol className="space-y-4 border-t border-ink-100 pt-4">
            {filled.map((s, i) => (
              <li key={i} className="min-w-0">
                <h4 className="font-semibold text-ink-900 wrap-anywhere">
                  {i + 1}. {s.heading.trim() || <span className="font-normal text-rose-700 italic">Heading needed</span>}
                </h4>
                {s.body.trim() ? <p className="text-user mt-1 text-ink-600">{s.body}</p> : <p className="mt-1 text-rose-700 italic">Text needed before sharing</p>}
              </li>
            ))}
          </ol>
        )}
        <div className="border-t border-ink-100 pt-4">
          <p className="text-xs font-medium tracking-wide text-ink-500 uppercase">Home Owner signature</p>
          {signatureName ? (
            <p className="mt-2 font-display text-2xl text-brand-900 italic wrap-anywhere">
              {signatureName}
              {signedAt && <span className="ml-2 font-sans text-xs text-ink-500 not-italic">signed {formatDate(signedAt)}</span>}
            </p>
          ) : (
            <p className="mt-6 border-b border-dashed border-ink-300 pb-1 text-xs text-ink-500">
              {status === 'draft' ? 'Not shared yet' : status === 'active' ? 'No signature required' : status === 'void' ? 'Void — can’t be signed' : 'Awaiting signature'}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
