import { addYears, parseISO } from 'date-fns'
import { CalendarCheck, ShieldCheck } from 'lucide-react'
import type { Home, HouseColors } from '@/types'
import { cn } from '@/lib/cn'
import { toIsoDate } from '@/lib/utils'
import { formatDate, formatNumber } from '@/lib/format'
import { homeStatus, type LabelDef } from '@/data/labels'
import { getModel } from '@/data/models'
import { ProgressBar, StatusBadge } from '@/components/ui'

/** "The Stockton" -> "Stockton" (for sentences like "the Stockton plan"). */
export function planName(name: string | undefined): string {
  return name ? name.replace(/^The\s+/i, '') : ''
}

export function isBuilding(home: Home): boolean {
  return home.status === 'under-construction' || home.status === 'under-contract'
}

export function currentStage(home: Home) {
  return home.construction?.stages.find((s) => s.status === 'current')
}

/**
 * The status a Home Owner sees for their own home. A home that belongs to someone is never for sale,
 * so "Available" and "Coming soon" (listing statuses) read as "Under contract" in the portal.
 */
export function ownerHomeStatus(home: Home): LabelDef {
  return home.status === 'available' || home.status === 'coming-soon' ? homeStatus['under-contract'] : homeStatus[home.status]
}

/** A spec the home publishes (listings may leave beds, baths or sq ft unpublished). */
export function hasSpec(home: Home, key: 'beds' | 'baths' | 'sqft'): boolean {
  return !home.unpublishedSpecs?.includes(key) && home[key] > 0
}

export interface WarrantyInfo {
  /** End of the one-year workmanship warranty. */
  workmanshipEnds?: string
  workmanshipActive: boolean
  /** Structural coverage runs ten years from closing. */
  structuralEnds?: string
  structuralActive: boolean
}

/** Warranty coverage for a finished home: one-year workmanship (warrantyEnds) and ten-year structural (closing + 10 years). */
export function warrantyInfo(home: Home, today = toIsoDate(new Date())): WarrantyInfo {
  const structuralEnds = home.closingDate ? toIsoDate(addYears(parseISO(home.closingDate), 10)) : undefined
  return {
    workmanshipEnds: home.warrantyEnds,
    workmanshipActive: !!home.warrantyEnds && home.warrantyEnds >= today,
    structuralEnds,
    structuralActive: !!structuralEnds && structuralEnds >= today,
  }
}

/** Construction progress (homes being built) or closing and warranty coverage (finished homes). */
export function HomeStatusSummary({ home, className }: { home: Home; className?: string }) {
  if (isBuilding(home) && home.construction) {
    const stage = currentStage(home)
    return (
      <div className={className}>
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-ink-600">
            Current stage: <span className="font-semibold text-ink-900">{stage?.label ?? 'Getting started'}</span>
          </span>
          <span className="font-semibold text-brand-900 tabular-nums">{home.construction.progress}% complete</span>
        </div>
        <ProgressBar value={home.construction.progress} className="mt-2.5" label={`${home.title}: construction ${home.construction.progress}% complete`} />
        {home.construction.estCompletion && (
          <p className="mt-2.5 flex items-center gap-1.5 text-sm text-ink-600">
            <CalendarCheck className="size-4 text-ink-400" aria-hidden />
            Estimated completion <span className="font-medium text-ink-900">{formatDate(home.construction.estCompletion)}</span>
          </p>
        )}
      </div>
    )
  }
  const w = warrantyInfo(home)
  return (
    <div className={cn('grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2', className)}>
      {home.closingDate && (
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-500">Closing date</p>
          <p className="mt-0.5 font-semibold text-ink-900">{formatDate(home.closingDate)}</p>
        </div>
      )}
      {(w.workmanshipEnds || w.structuralEnds) && (
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-500">Warranty</p>
          <WarrantyLines info={w} className="mt-0.5" />
        </div>
      )}
      {!home.closingDate && !home.warrantyEnds && <p className="text-ink-600">Dates will appear here once your closing is scheduled.</p>}
    </div>
  )
}

/** "Structural coverage until Feb 10, 2035" + "1-year workmanship ended Feb 10, 2026". */
export function WarrantyLines({ info, className }: { info: WarrantyInfo; className?: string }) {
  const lines = [
    info.structuralEnds && {
      key: 'structural',
      active: info.structuralActive,
      text: info.structuralActive ? `Structural coverage until ${formatDate(info.structuralEnds)}` : `Structural coverage ended ${formatDate(info.structuralEnds)}`,
    },
    info.workmanshipEnds && {
      key: 'workmanship',
      active: info.workmanshipActive,
      text: info.workmanshipActive ? `1-year workmanship until ${formatDate(info.workmanshipEnds)}` : `1-year workmanship ended ${formatDate(info.workmanshipEnds)}`,
    },
  ].filter((l): l is { key: string; active: boolean; text: string } => !!l)
  return (
    <ul className={cn('space-y-1', className)}>
      {lines.map((l) => (
        <li key={l.key} className={cn('flex items-start gap-1.5', l.active ? 'font-semibold text-emerald-800' : 'text-ink-600')}>
          <ShieldCheck className={cn('mt-0.5 size-4 shrink-0', l.active ? 'text-emerald-600' : 'text-ink-400')} aria-hidden />
          {l.text}
        </li>
      ))}
    </ul>
  )
}

/** Side panel for the 3D viewer dialog. */
export function Home3DDetails({ home }: { home: Home }) {
  const model = getModel(home.modelId)
  const facts = [
    { label: 'Plan', value: model?.name ?? '—' },
    { label: 'Size', value: hasSpec(home, 'sqft') ? `${formatNumber(home.sqft)} sq ft` : '—' },
    { label: 'Bedrooms', value: hasSpec(home, 'beds') ? String(home.beds) : '—' },
    { label: 'Bathrooms', value: hasSpec(home, 'baths') ? String(home.baths) : '—' },
  ]
  return (
    <div className="space-y-5">
      <StatusBadge def={ownerHomeStatus(home)} />
      <dl className="grid grid-cols-2 gap-4 text-sm">
        {facts.map((f) => (
          <div key={f.label}>
            <dt className="text-xs text-ink-500">{f.label}</dt>
            <dd className="font-semibold text-ink-900">{f.value}</dd>
          </div>
        ))}
      </dl>
      <ColorSwatches colors={home.view3d.config.colors} showShutters={home.view3d.config.shutters} />
      <p className="text-xs leading-5 text-ink-500">
        The 3D model shows the exterior of {model ? `the ${planName(model.name)} plan` : 'your home'} with your selected colors. Final construction may differ in detail.
      </p>
    </div>
  )
}

const swatchLabels: { key: keyof HouseColors; label: string }[] = [
  { key: 'siding', label: 'Siding' },
  { key: 'trim', label: 'Trim' },
  { key: 'roof', label: 'Roof' },
  { key: 'door', label: 'Front door' },
  { key: 'shutters', label: 'Shutters' },
]

/** The exterior color selections from the home's 3D configuration. */
export function ColorSwatches({ colors, showShutters = true, className }: { colors: HouseColors; showShutters?: boolean; className?: string }) {
  const items = swatchLabels.filter((s) => s.key !== 'shutters' || showShutters)
  return (
    <div className={className}>
      <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Exterior colors</p>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-3">
        {items.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm text-ink-700">
            <span className="size-6 shrink-0 rounded-full shadow-inner ring-1 ring-black/10" style={{ backgroundColor: colors[s.key] }} aria-hidden />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
