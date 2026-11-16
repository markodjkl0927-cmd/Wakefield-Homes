import { cn } from '@/lib/cn'

/** Lightweight SVG charts for dashboards (no chart library needed). */

export interface BarDatum {
  label: string
  value: number
  color?: string
}

export function BarChart({ data, height = 180, className, valueFormat = (v: number) => String(v) }: { data: BarDatum[]; height?: number; className?: string; valueFormat?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end gap-2 sm:gap-3" style={{ height }} role="img" aria-label={data.map((d) => `${d.label}: ${valueFormat(d.value)}`).join(', ')}>
        {data.map((d) => (
          <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <span className="mb-1 text-center text-xs font-medium text-ink-600 tabular-nums">{valueFormat(d.value)}</span>
            <div
              className="w-full rounded-t-md transition-[height] duration-700"
              style={{ height: `${Math.max(3, (d.value / max) * 100)}%`, background: d.color ?? 'linear-gradient(180deg, var(--color-brand-500), var(--color-brand-800))' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 border-t border-ink-100 pt-2 sm:gap-3">
        {data.map((d) => (
          <span key={d.label} className="min-w-0 flex-1 truncate text-center text-xs text-ink-500">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export interface DonutDatum {
  label: string
  value: number
  color: string
}

export function Donut({ data, size = 160, thickness = 22, centerLabel, centerValue, className }: { data: DonutDatum[]; size?: number; thickness?: number; centerLabel?: string; centerValue?: string; className?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className={cn('flex flex-col items-center gap-4 sm:flex-row sm:items-center', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join(', ')}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-ink-100)" strokeWidth={thickness} />
          {data.map((d) => {
            const len = (d.value / total) * c
            const el = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            )
            offset += len
            return el
          })}
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && <span className="text-2xl font-semibold text-ink-900 tabular-nums">{centerValue}</span>}
            {centerLabel && <span className="text-xs text-ink-500">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ul className="w-full space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ink-600">
              <span className="size-2.5 rounded-full" style={{ background: d.color }} aria-hidden />
              {d.label}
            </span>
            <span className="font-medium text-ink-900 tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Sparkline({ values, width = 120, height = 36, className, color = 'var(--color-brand-600)' }: { values: number[]; width?: number; height?: number; className?: string; color?: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / span) * (height - 4) - 2}`).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
