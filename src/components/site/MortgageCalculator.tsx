import { useId, useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'
import { Field, Input, Select } from '@/components/ui'

const groupDigits = (n: number) => n.toLocaleString('en-US')

/** Estimated monthly principal & interest. Purely illustrative — not a loan offer. Uses the site's standard form controls. */
export function MortgageCalculator({ defaultPrice = 1_000_000, className, compact }: { defaultPrice?: number; className?: string; compact?: boolean }) {
  const id = useId()
  const [price, setPrice] = useState(defaultPrice)
  const [priceText, setPriceText] = useState(() => groupDigits(defaultPrice))
  const [downPct, setDownPct] = useState(20)
  const [rate, setRate] = useState(6.25)
  const [years, setYears] = useState(30)
  const { monthly, loan } = useMemo(() => {
    const loanAmount = Math.max(0, price * (1 - downPct / 100))
    const r = rate / 100 / 12
    const n = years * 12
    const m = r === 0 ? loanAmount / n : (loanAmount * r) / (1 - Math.pow(1 + r, -n))
    return { monthly: Number.isFinite(m) ? m : 0, loan: loanAmount }
  }, [price, downPct, rate, years])

  const onPriceChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9)
    const value = Number(digits) || 0
    setPrice(value)
    setPriceText(digits ? groupDigits(value) : '')
  }

  return (
    <div className={cn('rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-200/70 sm:p-6', className)}>
      <div className="flex items-center gap-2">
        <Calculator className="size-5 text-brand-700" aria-hidden />
        <h3 className="text-base font-semibold text-ink-900">Payment estimator</h3>
      </div>
      <div className={cn('mt-5 grid gap-4', compact ? 'grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4')}>
        <Field label="Home price" htmlFor={`${id}-price`}>
          <Input
            id={`${id}-price`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={priceText}
            onChange={(e) => onPriceChange(e.target.value)}
            onBlur={() => !priceText && setPriceText('0')}
            leftIcon={<span className="text-sm font-medium text-ink-500">$</span>}
            className="pl-7 tabular-nums"
          />
        </Field>
        <Field label="Down payment (%)" htmlFor={`${id}-down`} hint={<span className="tabular-nums">{formatPrice(Math.round((price * downPct) / 100))} down</span>}>
          <Input
            id={`${id}-down`}
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            value={downPct}
            onChange={(e) => setDownPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            aria-describedby={`${id}-down-hint`}
            className="tabular-nums"
          />
        </Field>
        <Field label="Interest rate (%)" htmlFor={`${id}-rate`}>
          <Input
            id={`${id}-rate`}
            type="number"
            inputMode="decimal"
            min={0}
            max={20}
            step={0.125}
            value={rate}
            onChange={(e) => setRate(Math.max(0, Number(e.target.value) || 0))}
            className="tabular-nums"
          />
        </Field>
        <Field label="Term" htmlFor={`${id}-term`}>
          <Select id={`${id}-term`} value={years} onChange={(e) => setYears(Number(e.target.value))}>
            <option value={30}>30 years</option>
            <option value={20}>20 years</option>
            <option value={15}>15 years</option>
          </Select>
        </Field>
      </div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 rounded-xl bg-brand-50 p-4">
        <div>
          <p className="text-sm text-brand-900">Estimated principal &amp; interest</p>
          <p className="text-3xl font-semibold text-brand-950 tabular-nums" aria-live="polite">
            {formatPrice(Math.round(monthly))}
            <span className="text-base font-medium text-brand-800">/mo</span>
          </p>
        </div>
        <p className="text-sm text-brand-900 tabular-nums">Loan amount {formatPrice(Math.round(loan))}</p>
      </div>
      <p className="mt-3 text-xs text-ink-500">Illustration only. Taxes, insurance and HOA fees are not included. Talk to one of our preferred lenders for a quote.</p>
    </div>
  )
}
