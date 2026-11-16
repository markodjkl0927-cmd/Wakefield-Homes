import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { ArrowRight, ArrowUpRight, FileText, Mail, MapPin, Phone } from 'lucide-react'
import type { DocumentLink } from '@/types'
import type { Lender } from '@/data/content'
import { cn } from '@/lib/cn'
import { Accordion, buttonStyles, smoothBehavior } from '@/components/ui'
import { SectionHeading } from '@/components/site/Section'
import { useOffice } from '@/store/hooks'
import { Monogram } from '../company/Monogram'

/**
 * Scrolls to the element named by the URL hash once the page has mounted. The global ScrollToTop
 * runs before a lazily loaded page exists, so deep links such as /finance/home-purchase#lenders
 * would otherwise land at the top of the page.
 */
export function useScrollToHash() {
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    let cancelled = false
    let t: number | undefined
    // Wait for web fonts so text reflow does not shift the target after we scroll.
    const fontsReady = document.fonts?.ready ?? Promise.resolve()
    fontsReady.then(() => {
      if (cancelled) return
      t = window.setTimeout(() => {
        document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: smoothBehavior(), block: 'start' })
      }, 60)
    })
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [hash])
}

/** "Alexandria, Fairfax and Arlington" — the office cities of a list of lenders. */
export function lenderCities(lenders: Lender[]): string {
  const cities = [...new Set(lenders.map((l) => l.city.replace(/,\s*[A-Z]{2}$/, '')))]
  return cities.length > 1 ? `${cities.slice(0, -1).join(', ')} and ${cities[cities.length - 1]}` : cities.join('')
}

/* ------------------------------------------------------------------ */
/* Buttons used inside photo heroes and dark bands.                     */
/* White for the main action, the live site's periwinkle (navy text)    */
/* for the second one.                                                  */
/* ------------------------------------------------------------------ */

export const heroPrimaryButton = buttonStyles('white', 'lg', 'w-full sm:w-auto')
export const heroSecondaryButton = buttonStyles('periwinkle', 'lg', 'w-full sm:w-auto')

/* ------------------------------------------------------------------ */
/* Icon tile                                                            */
/* ------------------------------------------------------------------ */

export function IconTile({ children, className, tone = 'brand' }: { children: ReactNode; className?: string; tone?: 'brand' | 'solid' }) {
  return (
    <span
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 [&>svg]:size-5',
        tone === 'brand' ? 'bg-brand-50 text-brand-800 ring-brand-100' : 'bg-brand-900 text-white ring-brand-900',
        className,
      )}
      aria-hidden
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Link card: icon + title + description + arrow, whole card clickable. */
/* ------------------------------------------------------------------ */

export function LinkCard({
  to,
  href,
  icon,
  title,
  description,
  className,
  headingLevel = 'h3',
}: {
  /** In-app route. */
  to?: string
  /** Another website or a document: opens in a new tab. */
  href?: string
  icon: ReactNode
  title: string
  description: ReactNode
  className?: string
  headingLevel?: 'h2' | 'h3'
}) {
  const Heading = headingLevel
  const linkClass = 'after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none'
  const Arrow = to ? ArrowRight : ArrowUpRight
  return (
    <div
      className={cn(
        'group relative flex h-full items-start gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lift has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500 sm:p-6',
        className,
      )}
    >
      <IconTile>{icon}</IconTile>
      <div className="min-w-0 flex-1">
        <Heading className="text-base font-semibold text-ink-900">
          {to ? (
            <Link to={to} className={linkClass}>
              {title}
            </Link>
          ) : (
            <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
              {title}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </Heading>
        <p className="mt-1 text-sm leading-6 text-ink-600">{description}</p>
      </div>
      <Arrow className="mt-0.5 size-5 shrink-0 text-brand-800 transition-transform group-hover:translate-x-1" aria-hidden />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Documents (brochures, included-features lists, site plans — PDFs)    */
/* ------------------------------------------------------------------ */

/** "Included features (PDF, 08/26)" -> { name: "Included features", meta: "PDF · 08/26" } */
function splitDocLabel(label: string): { name: string; meta: string } {
  const m = label.match(/^(.*?)\s*\((PDF)(?:,\s*([^)]+))?\)\s*$/i)
  if (!m) return { name: label, meta: 'PDF' }
  return { name: m[1], meta: m[3] ? `PDF · ${m[3]}` : 'PDF' }
}

/** A list of the client's published documents, each opening in a new tab. */
export function DocumentList({ documents, className }: { documents: DocumentLink[]; className?: string }) {
  return (
    <ul className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {documents.map((doc) => {
        const { name, meta } = splitDocLabel(doc.label)
        return (
          <li key={doc.url}>
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="group flex h-full items-center gap-3 rounded-xl bg-white p-3.5 ring-1 ring-ink-200 transition-colors ring-inset hover:bg-brand-50 hover:ring-brand-200"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800 ring-1 ring-brand-100" aria-hidden>
                <FileText className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink-900 group-hover:underline">{name}</span>
                <span className="block text-xs text-ink-500">{meta}</span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-brand-800" aria-hidden />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* FAQ: heading + call prompt on the left, accordion on the right.      */
/* ------------------------------------------------------------------ */

export interface FaqItem {
  q: string
  a: ReactNode
}

export function FaqSection({
  items,
  eyebrow = 'FAQ',
  title = 'Questions, answered',
  description,
}: {
  items: FaqItem[]
  eyebrow?: string
  title?: string
  description?: ReactNode
}) {
  const office = useOffice()
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-4">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} />
        <div className="mt-8 rounded-2xl bg-brand-50 p-5 ring-1 ring-brand-100">
          <p className="text-sm font-semibold text-brand-950">Still have a question?</p>
          <p className="mt-1 text-sm leading-6 text-brand-900">Our team is happy to talk it through.</p>
          <p className="mt-1 text-xs text-brand-900">{office.hours}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`tel:${office.phone}`} className={buttonStyles('primary', 'md')}>
              <Phone className="size-4" aria-hidden /> {office.phoneDisplay}
            </a>
            <Link to="/contact" className={buttonStyles('secondary', 'md')}>
              Send a message
            </Link>
          </div>
        </div>
      </div>
      <div className="lg:col-span-8">
        <Accordion items={items.map((i) => ({ title: i.q, content: i.a }))} className="shadow-card" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Preferred lenders (as each live finance page lists them)             */
/* ------------------------------------------------------------------ */

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** One preferred lender with the loan officer's published contact details and application link. */
export function LenderCard({ lender, headingLevel = 'h3', className }: { lender: Lender; headingLevel?: 'h2' | 'h3'; className?: string }) {
  const Heading = headingLevel
  const rowClass = 'flex gap-3'
  const termClass = 'mt-0.5 shrink-0 text-ink-400 [&>svg]:size-4'
  return (
    <article className={cn('flex h-full flex-col rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-200/70', className)}>
      <p className="eyebrow">Preferred lender</p>
      <Heading className="mt-2 font-display text-xl leading-snug font-semibold text-ink-900">{lender.company}</Heading>
      <div className="mt-5 flex items-center gap-3">
        <Monogram name={lender.contact} />
        <div className="min-w-0">
          <p className="font-semibold text-ink-900">{lender.contact}</p>
          <p className="text-sm text-ink-600">{lender.title}</p>
          <p className="text-xs text-ink-500 tabular-nums">
            {lender.nmlsLabel} {lender.nmls}
          </p>
        </div>
      </div>
      <dl className="mt-5 space-y-3 border-t border-ink-100 pt-5 text-sm">
        <div className={rowClass}>
          <dt className={termClass}>
            <Phone aria-hidden />
            <span className="sr-only">Cell</span>
          </dt>
          <dd>
            <a href={`tel:${lender.phone}`} className="font-semibold text-brand-800 tabular-nums underline-offset-4 hover:underline">
              {lender.phoneDisplay}
            </a>
          </dd>
        </div>
        <div className={rowClass}>
          <dt className={termClass}>
            <Mail aria-hidden />
            <span className="sr-only">Email</span>
          </dt>
          <dd className="min-w-0">
            <a href={`mailto:${lender.email}`} className="font-semibold break-all text-brand-800 underline-offset-4 hover:underline">
              {lender.email}
            </a>
          </dd>
        </div>
        <div className={rowClass}>
          <dt className={termClass}>
            <MapPin aria-hidden />
            <span className="sr-only">Office</span>
          </dt>
          <dd className="text-ink-700">{lender.address}</dd>
        </div>
      </dl>
      <div className="mt-auto flex flex-wrap gap-2 pt-6">
        {lender.applyUrl && (
          <a href={lender.applyUrl} target="_blank" rel="noreferrer" className={buttonStyles('primary', 'md', 'flex-1 basis-36')}>
            Apply now
            <ArrowUpRight className="size-4" aria-hidden />
            <span className="sr-only">with {lender.company} (opens in a new tab)</span>
          </a>
        )}
        <a
          href={lender.website}
          target="_blank"
          rel="noreferrer"
          title={hostname(lender.website)}
          className={buttonStyles('secondary', 'md', 'flex-1 basis-36')}
        >
          Website
          <ArrowUpRight className="size-4" aria-hidden />
          <span className="sr-only">: {hostname(lender.website)} (opens in a new tab)</span>
        </a>
      </div>
    </article>
  )
}

/** The lenders a finance page lists, as cards. */
export function LenderGrid({ lenders, className }: { lenders: Lender[]; className?: string }) {
  return (
    <ul className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {lenders.map((l) => (
        <li key={l.nmls} className="flex">
          <LenderCard lender={l} className="w-full" />
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Check list                                                           */
/* ------------------------------------------------------------------ */

export function Bullets({ items, className }: { items: ReactNode[]; className?: string }) {
  return (
    <ul className={cn('space-y-2', className)}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
