import { useId, type ReactNode } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import type { GaragePosition, HouseColors, HouseConfig, HouseStyle, PorchType, RoofType, SidingType } from '@/types'
import { colorPalettes, houseStyleLabels, makeHouse } from '@/data/housePresets'
import { cn } from '@/lib/cn'
import { Button, Field, Segmented, Select, Switch } from '@/components/ui'

const roofLabels: Record<RoofType, string> = { gable: 'Gable', hip: 'Hip', 'cross-gable': 'Cross gable' }
const sidingLabels: Record<SidingType, string> = { lap: 'Lap siding', 'board-batten': 'Board & batten', shingle: 'Cedar shingle', brick: 'Brick' }
const porchLabels: Record<PorchType, string> = { none: 'No porch', front: 'Front porch', wrap: 'Wrap-around porch', portico: 'Portico' }
const garageLabels: Record<GaragePosition, string> = { left: 'Left side', right: 'Right side', courtyard: 'Courtyard (side-load)', none: 'No garage' }

const colorFields: { key: keyof HouseColors; label: string }[] = [
  { key: 'siding', label: 'Siding' },
  { key: 'trim', label: 'Trim' },
  { key: 'roof', label: 'Roof' },
  { key: 'door', label: 'Front door' },
  { key: 'shutters', label: 'Shutters' },
]

function sameColors(a: HouseColors, b: HouseColors) {
  return (Object.keys(b) as (keyof HouseColors)[]).every((k) => a[k]?.toLowerCase() === b[k]?.toLowerCase())
}

function Group({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="mb-3 text-xs font-semibold tracking-wider text-ink-500 uppercase">{title}</legend>
      {children}
    </fieldset>
  )
}

/** Labelled segmented control (Segmented is a radiogroup; the visible label names it). */
function SegmentedField<T extends string>({ label, value, onChange, items, disabled }: { label: string; value: T; onChange: (v: T) => void; items: { value: T; label: string }[]; disabled?: boolean }) {
  const id = useId()
  return (
    <div className={cn('space-y-1.5', disabled && 'pointer-events-none opacity-60')}>
      <p id={id} className="text-sm font-medium text-ink-800">
        {label}
      </p>
      <Segmented items={items} value={value} onChange={onChange} ariaLabel={label} className="w-full [&>button]:flex-1 [&>button]:justify-center" />
    </div>
  )
}

function RangeField({ label, value, min, max, step, onChange, format, disabled }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string; disabled?: boolean }) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink-800">
          {label}
        </label>
        <span className="text-sm font-medium text-ink-600 tabular-nums">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 w-full cursor-pointer accent-brand-800 disabled:cursor-not-allowed"
        aria-valuetext={format(value)}
      />
    </div>
  )
}

/**
 * Controls for the procedural 3D house. Every change calls onChange with a complete HouseConfig,
 * so a live <Viewer3D config={…}> preview next to it updates as staff edit.
 */
export function HouseConfigurator({ config, onChange, onReset, resetLabel = 'Reset to plan default', disabled }: { config: HouseConfig; onChange: (c: HouseConfig) => void; onReset?: () => void; resetLabel?: string; disabled?: boolean }) {
  const set = <K extends keyof HouseConfig>(key: K, value: HouseConfig[K]) => onChange({ ...config, [key]: value })
  const setColor = (key: keyof HouseColors, value: string) => onChange({ ...config, colors: { ...config.colors, [key]: value } })

  const changeStyle = (style: HouseStyle) => {
    // Apply the style's structural defaults, keep the current size and colors.
    const preset = makeHouse(style, 'classic-white')
    onChange({ ...preset, width: config.width, depth: config.depth, stories: config.stories, colors: config.colors })
  }

  return (
    // Container queries: the controls adapt to their column (full width, or the narrow side column next to a sticky preview).
    <div className="@container space-y-8">
      <Group title="Architecture">
        <div className="grid grid-cols-1 gap-4 @md:grid-cols-2">
          <Field label="House style" hint="Applies the style’s roof, porch and details.">
            {(id) => (
              <Select id={id} value={config.style} disabled={disabled} onChange={(e) => changeStyle(e.target.value as HouseStyle)}>
                {(Object.keys(houseStyleLabels) as HouseStyle[]).map((s) => (
                  <option key={s} value={s}>
                    {houseStyleLabels[s]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <SegmentedField
            label="Stories"
            value={String(config.stories) as '2' | '3'}
            onChange={(v) => set('stories', Number(v) as 2 | 3)}
            items={[
              { value: '2', label: '2 stories' },
              { value: '3', label: '3 stories' },
            ]}
            disabled={disabled}
          />
          <Field label="Roof">
            {(id) => (
              <Select id={id} value={config.roof} disabled={disabled} onChange={(e) => set('roof', e.target.value as RoofType)}>
                {(Object.keys(roofLabels) as RoofType[]).map((r) => (
                  <option key={r} value={r}>
                    {roofLabels[r]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <RangeField label="Roof pitch" value={config.roofPitch} min={0.35} max={1} step={0.05} onChange={(v) => set('roofPitch', v)} format={(v) => (v < 0.5 ? 'Low' : v < 0.75 ? 'Medium' : 'Steep') + ` · ${Math.round(v * 12)}/12`} disabled={disabled} />
          <Field label="Siding">
            {(id) => (
              <Select id={id} value={config.siding} disabled={disabled} onChange={(e) => set('siding', e.target.value as SidingType)}>
                {(Object.keys(sidingLabels) as SidingType[]).map((s) => (
                  <option key={s} value={s}>
                    {sidingLabels[s]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Porch">
            {(id) => (
              <Select id={id} value={config.porch} disabled={disabled} onChange={(e) => set('porch', e.target.value as PorchType)}>
                {(Object.keys(porchLabels) as PorchType[]).map((p) => (
                  <option key={p} value={p}>
                    {porchLabels[p]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Group>

      <Group title="Garage, dormers & windows">
        <div className="grid grid-cols-1 gap-4 @md:grid-cols-2">
          <SegmentedField
            label="Garage bays"
            value={String(config.garageBays) as '0' | '1' | '2' | '3'}
            onChange={(v) => {
              const bays = Number(v) as 0 | 1 | 2 | 3
              onChange({ ...config, garageBays: bays, garagePosition: bays === 0 ? 'none' : config.garagePosition === 'none' ? 'right' : config.garagePosition })
            }}
            items={[
              { value: '0', label: 'None' },
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
            ]}
            disabled={disabled}
          />
          <Field label="Garage position">
            {(id) => (
              <Select
                id={id}
                value={config.garagePosition}
                disabled={disabled}
                onChange={(e) => {
                  const pos = e.target.value as GaragePosition
                  onChange({ ...config, garagePosition: pos, garageBays: pos === 'none' ? 0 : config.garageBays === 0 ? 2 : config.garageBays })
                }}
              >
                {(Object.keys(garageLabels) as GaragePosition[]).map((g) => (
                  <option key={g} value={g}>
                    {garageLabels[g]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <SegmentedField
            label="Dormers"
            value={String(config.dormers) as '0' | '1' | '2' | '3'}
            onChange={(v) => set('dormers', Number(v) as 0 | 1 | 2 | 3)}
            items={[
              { value: '0', label: 'None' },
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
            ]}
            disabled={disabled}
          />
          <RangeField label="Windows per floor" value={config.windowsPerFloor} min={2} max={6} step={1} onChange={(v) => set('windowsPerFloor', v)} format={(v) => `${v} windows`} disabled={disabled} />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 rounded-xl bg-ink-50 p-4 @md:grid-cols-2">
          <Switch label="Chimney" checked={config.chimney} onChange={(v) => set('chimney', v)} disabled={disabled} />
          <Switch label="Shutters" checked={config.shutters} onChange={(v) => set('shutters', v)} disabled={disabled} />
          <Switch label="Stone base" checked={config.stoneBase} onChange={(v) => set('stoneBase', v)} disabled={disabled} />
          <Switch label="Screened porch" checked={config.screenPorch} onChange={(v) => set('screenPorch', v)} disabled={disabled} />
        </div>
      </Group>

      <Group title="Exterior colors">
        <p className="mb-3 text-sm text-ink-600">Start from a palette, then fine-tune any color.</p>
        <div className="grid grid-cols-1 gap-2 @2xs:grid-cols-2 @xl:grid-cols-3">
          {colorPalettes.map((p) => {
            const active = sameColors(config.colors, p.colors)
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => onChange({ ...config, colors: { ...p.colors } })}
                className={cn(
                  // Tighter in narrow columns (phones, the side column next to the preview) so names like "Farmhouse" fit.
                  'flex min-h-11 items-center gap-2 rounded-xl bg-white px-2.5 py-2 text-left text-sm font-medium ring-1 transition-colors ring-inset disabled:opacity-60 @md:gap-2.5 @md:px-3',
                  active ? 'text-brand-900 ring-2 ring-brand-700' : 'text-ink-700 ring-ink-200 hover:bg-ink-50 hover:ring-ink-300',
                )}
              >
                <span className="flex shrink-0 -space-x-2 @md:-space-x-1.5" aria-hidden>
                  {[p.colors.siding, p.colors.trim, p.colors.roof, p.colors.door].map((c, i) => (
                    <span key={i} className="size-4 rounded-full ring-2 ring-white @md:size-[18px]" style={{ background: c, boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.12)' }} />
                  ))}
                </span>
                <span className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-tight">{p.name}</span>
                {active && <Check className="size-4 shrink-0 text-brand-800" aria-hidden />}
              </button>
            )
          })}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 @lg:grid-cols-3 @3xl:grid-cols-5">
          {colorFields.map((f) => (
            <ColorInput key={f.key} label={f.label} value={config.colors[f.key]} onChange={(v) => setColor(f.key, v)} disabled={disabled} />
          ))}
        </div>
      </Group>

      {onReset && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5">
          <p className="text-sm text-ink-500">Changes preview instantly and are saved with the home.</p>
          <Button variant="secondary" onClick={onReset} disabled={disabled} leftIcon={<RotateCcw className="size-4" aria-hidden />}>
            {resetLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

function ColorInput({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const id = useId()
  const hex = normalizeHex(value)
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink-800">
        {label}
        <span className="sr-only"> color</span>
      </label>
      <div className="flex h-11 items-center gap-2 rounded-lg bg-white px-2 shadow-sm ring-1 ring-ink-200 ring-inset focus-within:ring-2 focus-within:ring-brand-500">
        <input
          id={id}
          type="color"
          value={hex}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-ink-200 [&::-webkit-color-swatch-wrapper]:p-0"
        />
        <span className="font-mono text-xs text-ink-600 uppercase">{hex}</span>
      </div>
    </div>
  )
}

/** <input type=color> only accepts #rrggbb. */
function normalizeHex(v: string): string {
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(v)) return ('#' + v.slice(1).split('').map((c) => c + c).join('')).toLowerCase()
  return '#ffffff'
}
