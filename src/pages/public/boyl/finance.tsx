import type { ReactNode } from 'react'
import { Link } from 'react-router'
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Hammer,
  HardHat,
  KeyRound,
  Landmark,
  ListChecks,
  Lock,
  Palette,
  Percent,
  RefreshCw,
  Scale,
  Signature,
} from 'lucide-react'
import { MortgageCalculator } from '@/components/site/MortgageCalculator'
import { cn } from '@/lib/cn'
import { financingProceduresPdf, loanToValue, mortgageProducts, newHomeFinancingSteps } from '@/data/content'
import type { StepItem } from './Steps'

/* ------------------------------------------------------------------ */
/* Construction-to-permanent loan timeline                              */
/* ------------------------------------------------------------------ */

function Chips({ items, label }: { items: string[]; label?: string }) {
  return (
    <div>
      {label && <p className="mb-2 text-xs font-medium text-ink-500">{label}</p>}
      <ul className="flex flex-wrap items-center gap-1.5">
        {items.map((item) => (
          <li key={item} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-900 ring-1 ring-brand-100">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function DrawBars() {
  const heights = [16, 30, 44, 60, 78, 100]
  return (
    <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100">
      <div className="flex h-14 items-end gap-1.5" aria-hidden>
        {heights.map((h, i) => (
          <span key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-brand-800 to-brand-500" style={{ height: `${h}%` }} />
        ))}
      </div>
      <p className="mt-2 text-xs font-medium text-brand-900">Monthly interest on the outstanding balance</p>
    </div>
  )
}

const stages: { title: string; timing: string; icon: ReactNode; body: string; visual: ReactNode }[] = [
  {
    title: 'Settlement',
    timing: 'One-time close',
    icon: <Signature />,
    body: 'A single settlement covers lot acquisition, the construction financing and your permanent mortgage.',
    visual: <Chips label="One settlement for" items={['Lot', 'Construction', 'Mortgage']} />,
  },
  {
    title: 'Construction draws',
    timing: 'Typically 12 months',
    icon: <Hammer />,
    body: 'Your lender pays Wakefield Homes according to the draw schedule in your contract. You pay simple interest each month on the outstanding balance.',
    visual: <DrawBars />,
  },
  {
    title: 'Rollover',
    timing: 'At completion',
    icon: <RefreshCw />,
    body: 'Before your home is complete, the bank sets the date your loan rolls over to the permanent mortgage you arranged — usually the first of the month after Substantial Completion.',
    visual: (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
        <Lock className="size-3.5" aria-hidden /> Terms guaranteed until then
      </span>
    ),
  },
  {
    title: 'Permanent mortgage',
    timing: 'After rollover',
    icon: <KeyRound />,
    body: 'Monthly payments begin, amortized over the term of the permanent mortgage you chose.',
    visual: <Chips label="Your choice of" items={mortgageProducts} />,
  },
]

/** Settlement → construction draws → rollover → permanent mortgage, as the live financing pages describe it. */
export function ConstructionLoanTimeline({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <div
        className="absolute top-6 right-[12%] left-[12%] hidden h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-brand-300 via-brand-600 to-brand-300 lg:block"
        aria-hidden
      />
      <ol className="relative grid gap-8 lg:grid-cols-4 lg:gap-6">
        {stages.map((s, i) => (
          <li key={s.title} className="relative flex gap-4 sm:gap-5 lg:flex-col lg:items-center lg:gap-0">
            {i < stages.length - 1 && <span className="absolute top-12 -bottom-8 left-6 w-px bg-brand-200 lg:hidden" aria-hidden />}
            <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white shadow-sm ring-8 ring-white [&>svg]:size-5" aria-hidden>
              {s.icon}
            </span>
            <div className="flex min-w-0 flex-1 flex-col rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-200/70 lg:mt-6 lg:w-full">
              <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
                <span className="sr-only">Stage {i + 1}: </span>
                {s.timing}
              </p>
              <h3 className="mt-1.5 text-lg font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-600">{s.body}</p>
              <div className="mt-auto pt-4">{s.visual}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Program terms (the live Finance page's "benefits and terms")         */
/* ------------------------------------------------------------------ */

function Term({ icon, title, children, className }: { icon: ReactNode; title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-200/70', className)}>
      <dt className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800 ring-1 ring-brand-100 [&>svg]:size-5" aria-hidden>
          {icon}
        </span>
        <span className="text-base font-semibold text-ink-900">{title}</span>
      </dt>
      <dd className="mt-4 text-sm leading-6 text-ink-600">{children}</dd>
    </div>
  )
}

/** The construction/permanent financing program's terms, as published on the live Finance page. */
export function LoanTerms({ className }: { className?: string }) {
  return (
    <dl className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6', className)}>
      <Term icon={<CalendarClock />} title="Construction loan">
        Typically twelve months, and it may be extended if needed. A construction draw schedule is part of your contract with Wakefield Homes.
      </Term>
      <Term icon={<Percent />} title="Construction interest">
        A simple-interest loan calculated monthly: each month you pay the interest accrued on the outstanding balance.
      </Term>
      <Term icon={<Lock />} title="Permanent rate">
        Choose a fixed rate or a 5/1, 7/1 or 10/1 ARM when you settle on your financing; it is locked in for the twelve-month construction period. The rate is
        based on the market when you apply.
      </Term>
      <Term icon={<Scale />} title="Loan to value" className="sm:col-span-2 lg:col-span-1">
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {loanToValue.map((r) => (
            <li key={r} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-900 tabular-nums ring-1 ring-brand-100">
              {r}
            </li>
          ))}
        </ul>
        Based on the lower of the appraised value of the completed home and lot, or the total acquisition cost (lot plus house). Ratios may differ between
        lenders.
      </Term>
      <Term icon={<Landmark />} title="Mortgage products" className="sm:col-span-2">
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {mortgageProducts.map((p) => (
            <li key={p} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-900 ring-1 ring-brand-100">
              {p}
            </li>
          ))}
        </ul>
        All ARM products may be refinanced or modified into a 15- or 30-year fixed rate after construction is complete. Available products may change.
      </Term>
    </dl>
  )
}

/** Link to the live "Financing Program Procedures" PDF. */
export function ProceduresPdfLink({ className }: { className?: string }) {
  return (
    <a
      href={financingProceduresPdf}
      target="_blank"
      rel="noreferrer"
      className={cn('inline-flex min-h-10 items-center gap-2 font-semibold text-brand-800 underline-offset-4 hover:underline', className)}
    >
      <FileText className="size-4 shrink-0" aria-hidden />
      Financing Program Procedures (PDF)
      <ArrowUpRight className="size-4 shrink-0" aria-hidden />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

/* ------------------------------------------------------------------ */
/* How the New Home Financing Program works (8 steps)                   */
/* ------------------------------------------------------------------ */

const stepIcons: ReactNode[] = [<Signature />, <Landmark />, <Palette />, <HardHat />, <Banknote />, <ClipboardCheck />, <ListChecks />, <RefreshCw />]

/** The live program's steps, from the Sales Agreement to the rollover to your permanent mortgage. */
export const financingSteps: StepItem[] = newHomeFinancingSteps.map((s, i) => ({ title: s.title, body: s.body, icon: stepIcons[i] }))

/* ------------------------------------------------------------------ */
/* Payment estimator section                                            */
/* ------------------------------------------------------------------ */

export function PaymentEstimator({
  eyebrow = 'Plan your budget',
  title = 'Estimate your monthly payment',
  description = 'Adjust the price, down payment, rate and term to see an estimated monthly principal and interest payment. For an actual quote, talk with one of our preferred lenders.',
  defaultPrice,
  lendersLink = '/finance/home-purchase#lenders',
}: {
  eyebrow?: string
  title?: string
  description?: string
  defaultPrice?: number
  lendersLink?: string
}) {
  const linkClass = 'mt-6 inline-flex min-h-10 items-center gap-1.5 font-semibold text-brand-800 underline-offset-4 hover:underline'
  return (
    <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
      <div className="lg:col-span-5">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="display-heading mt-3 text-3xl sm:text-4xl">{title}</h2>
        <p className="mt-4 text-lg leading-8 text-ink-600">{description}</p>
        {lendersLink.startsWith('#') ? (
          <a href={lendersLink} className={linkClass}>
            Meet our preferred lenders <ArrowRight className="size-4" aria-hidden />
          </a>
        ) : (
          <Link to={lendersLink} className={linkClass}>
            Meet our preferred lenders <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      <div className="lg:col-span-7">
        <MortgageCalculator compact defaultPrice={defaultPrice} className="shadow-lift" />
      </div>
    </div>
  )
}
